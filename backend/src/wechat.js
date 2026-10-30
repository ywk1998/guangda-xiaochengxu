// wechat.js - 微信小程序服务端能力：登录(code2session) 与 订阅消息推送
// 说明：本模块所有能力都依赖 .env 中的 WX_APPID / WX_APPSECRET。
//      未配置时所有函数自动降级为“不生效”，不会影响现有业务流程。

const API_BASE = 'https://api.weixin.qq.com';

function config() {
  return {
    appid: process.env.WX_APPID || '',
    secret: process.env.WX_APPSECRET || '',
    // 推送总开关，默认关闭；只有显式配置成 1 才真正发微信消息
    pushEnabled: process.env.WX_PUSH_ENABLED === '1',
    templates: {
      // 审批结果通知（发给提交人）
      approvalResult: process.env.WX_TMPL_APPROVAL_RESULT || '',
      // 新待办通知（发给审批人）
      approvalPending: process.env.WX_TMPL_APPROVAL_PENDING || ''
    },
    // 模板字段 key 映射：不同模板的字段编号不同（thing1/thing2/time3...），可用环境变量覆盖
    keys: {
      // 默认对齐后台已有模板「审批结果通知」：
      // 审批人 name2 / 审批日期 date3 / 项目名称 thing8 / 审批结果 phrase1
      result: parseKeys(process.env.WX_TMPL_RESULT_KEYS, {
        reviewer: 'name2', date: 'date3', project: 'thing8', result: 'phrase1'
      }),
      // 默认对齐后台已有模板「待审批通知」：
      // 申请人 name1 / 申请项目 thing4 / 申请时间 time2 / 审核状态 phrase16
      pending: parseKeys(process.env.WX_TMPL_PENDING_KEYS, {
        submitter: 'name1', form: 'thing4', time: 'time2', status: 'phrase16'
      })
    }
  };
}

function parseKeys(raw, fallback) {
  if (!raw) return fallback;
  try {
    return { ...fallback, ...JSON.parse(raw) };
  } catch (err) {
    console.warn('[wechat] 模板字段配置解析失败，使用默认值:', err.message);
    return fallback;
  }
}

function configured() {
  const { appid, secret } = config();
  return Boolean(appid && secret);
}

async function getJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`微信接口 HTTP ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------- access_token
// access_token 有效期 7200 秒，且有每日获取次数限制，必须缓存复用
let tokenCache = { token: '', expireAt: 0 };

export async function getAccessToken(force = false) {
  const { appid, secret } = config();
  if (!appid || !secret) throw new Error('未配置 WX_APPID / WX_APPSECRET');
  if (!force && tokenCache.token && Date.now() < tokenCache.expireAt) {
    return tokenCache.token;
  }
  const url = `${API_BASE}/cgi-bin/token?grant_type=client_credential`
    + `&appid=${encodeURIComponent(appid)}&secret=${encodeURIComponent(secret)}`;
  const body = await getJson(url);
  if (body.errcode) {
    throw new Error(`获取 access_token 失败：${body.errcode} ${body.errmsg || ''}`);
  }
  // 提前 5 分钟过期，避免边界失效
  tokenCache = {
    token: body.access_token || '',
    expireAt: Date.now() + Math.max((Number(body.expires_in) || 7200) - 300, 60) * 1000
  };
  return tokenCache.token;
}

// ---------------------------------------------------------------- code2session
// 用 wx.login() 拿到的 code 换取用户真实 openid（订阅消息推送必须使用真实 openid）
export async function code2Session(code) {
  if (!configured() || !code) return null;
  const { appid, secret } = config();
  const url = `${API_BASE}/sns/jscode2session`
    + `?appid=${encodeURIComponent(appid)}&secret=${encodeURIComponent(secret)}`
    + `&js_code=${encodeURIComponent(code)}&grant_type=authorization_code`;
  try {
    const body = await getJson(url);
    if (!body || body.errcode || !body.openid) {
      console.warn('[wechat] code2session 失败:', body?.errcode, body?.errmsg || '无 openid');
      return null;
    }
    return { openid: body.openid, unionid: body.unionid || '', sessionKey: body.session_key || '' };
  } catch (err) {
    console.warn('[wechat] code2session 异常:', err.message);
    return null;
  }
}

// ------------------------------------------------------------ 订阅消息发送
// 订阅消息各字段有长度限制（thing 类型最多 20 个字符），超长会直接发送失败
export function clip(value, max = 20) {
  const text = String(value === undefined || value === null ? '' : value)
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return '无';
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/**
 * 发送订阅消息
 * @param {Object} params
 * @param {string} params.toOpenid     接收人 openid（必须是真实 openid）
 * @param {string} params.templateId   模板 ID
 * @param {Object} params.data         模板字段，如 { thing1: { value: '已通过' } }
 * @param {string} [params.page]       点击消息跳转的小程序页面，如 pages/log-detail/log-detail?id=xxx
 * @returns {Promise<boolean>} 是否发送成功
 */
export async function sendSubscribeMessage({ toOpenid, templateId, data = {}, page = '', lang = 'zh_CN', miniprogramState = 'formal' }) {
  if (!toOpenid || !templateId) return false;
  if (!configured() || !config().pushEnabled) return false;
  // 本地/测试环境生成的假 openid 直接跳过，避免无意义报错
  if (/^local-/.test(toOpenid)) return false;

  const payload = {
    touser: toOpenid,
    template_id: templateId,
    page,
    lang,
    miniprogram_state: miniprogramState,
    data
  };

  const post = async (token) => {
    const res = await fetch(`${API_BASE}/cgi-bin/message/subscribe/send?access_token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000)
    });
    return res.json();
  };

  try {
    let token = await getAccessToken();
    let body = await post(token);
    // token 失效时强制刷新重试一次
    if (body.errcode === 40001) {
      token = await getAccessToken(true);
      body = await post(token);
    }
    if (body.errcode) {
      // 43101 = 用户拒绝接收/未授权，属正常情况，不打 error
      const level = body.errcode === 43101 ? 'warn' : 'error';
      console[level]('[wechat] 订阅消息发送失败:', body.errcode, body.errmsg, '->', toOpenid);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[wechat] 订阅消息发送异常:', err.message);
    return false;
  }
}

// 微信 time 类型要求格式：2026-10-29 15:30
function nowStr() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 审批结果通知（发给提交人） */
export async function pushApprovalResult({ toOpenid, reviewer = '', project = '', result = '', page = '' }) {
  const { templates, keys, pushEnabled } = config();
  if (!pushEnabled || !templates.approvalResult || !toOpenid) return false;
  const k = keys.result;
  return sendSubscribeMessage({
    toOpenid,
    templateId: templates.approvalResult,
    page,
    data: {
      [k.reviewer]: { value: clip(reviewer || '管理员', 10) },
      [k.date]: { value: nowStr() },
      [k.project]: { value: clip(project || '表单') },
      [k.result]: { value: clip(result || '已通过') }
    }
  });
}

/** 新待办通知（发给审批人） */
export async function pushApprovalPending({ toOpenid, submitter = '', form = '', status = '待审批', page = '' }) {
  const { templates, keys, pushEnabled } = config();
  if (!pushEnabled || !templates.approvalPending || !toOpenid) return false;
  const k = keys.pending;
  return sendSubscribeMessage({
    toOpenid,
    templateId: templates.approvalPending,
    page,
    data: {
      [k.submitter]: { value: clip(submitter || '提交人', 10) },
      [k.form]: { value: clip(form || '表单') },
      [k.time]: { value: nowStr() },
      [k.status]: { value: clip(status || '待审批') }
    }
  });
}

export const wechatConfig = config;
export const isConfigured = configured;
