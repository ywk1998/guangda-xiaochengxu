// utils/subscribe.js - 微信订阅消息授权封装
// 订阅消息是「一次性」的：用户授权一次，后端只能推送一条。
// 引导用户勾选弹窗底部的「总是保持以上选择」，才能持续收到通知。

const { request } = require('./request');

let configCache = null;

/**
 * 获取后端下发的小程序订阅配置（模板 ID 等），失败时静默返回 null
 */
function getWechatConfig(force = false) {
  if (configCache && !force) return Promise.resolve(configCache);
  return request({ url: '/config/wechat' })
    .then((data) => {
      configCache = data || null;
      return configCache;
    })
    .catch(() => null);
}

/**
 * 申请订阅消息授权
 * @param {string} kind 'result'=审批结果通知（提交人） | 'pending'=新待办通知（审批人）
 * @returns {Promise<boolean>} 是否已授权（未配置模板时返回 false，不打扰用户）
 */
function requestSubscribe(kind = 'result') {
  return getWechatConfig()
    .then((cfg) => {
      const templateId = cfg && cfg.templates
        ? (kind === 'pending' ? cfg.templates.approvalPending : cfg.templates.approvalResult)
        : '';
      if (!cfg || !cfg.pushEnabled || !templateId) return false;

      return new Promise((resolve) => {
        wx.requestSubscribeMessage({
          tmplIds: [templateId],
          success: (res) => resolve(res[templateId] === 'accept'),
          fail: () => resolve(false)
        });
      });
    })
    .catch(() => false);
}

module.exports = { getWechatConfig, requestSubscribe };
