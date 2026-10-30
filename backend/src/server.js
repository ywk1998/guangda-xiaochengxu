import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { query, parseRow } from './db.js';
import {
  signToken,
  verifyAdmin,
  requireAdmin,
  verifyToken,
  registerUserByPassword,
  loginUserByPassword,
  resetUserPassword,
  findUserByLoginName
} from './auth.js';
import {
  approvalPatch,
  businessCollections,
  listDocuments,
  getDocument,
  getFormSetting,
  isBusinessCollection,
  createDocument,
  updateDocument,
  deleteDocument
} from './collection.js';
import { code2Session, pushApprovalResult, pushApprovalPending, wechatConfig } from './wechat.js';

dotenv.config();

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '../public/uploads');

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '') || '.jpg';
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext.toLowerCase()}`;
    cb(null, safeName);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const extOk = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext);
    const mimeOk = Boolean(file.mimetype && file.mimetype.startsWith('image/'));
    if (mimeOk || extOk) {
      cb(null, true);
      return;
    }
    cb(new Error('只能上传图片文件'));
  }
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});

function ok(res, data = null, message = 'ok') {
  res.json({ code: 0, message, data });
}

function parseQuery(req) {
  const where = req.query.where ? JSON.parse(req.query.where) : {};
  return {
    where,
    orderBy: req.query.orderBy,
    order: req.query.order,
    limit: req.query.limit,
    offset: req.query.offset || req.query.skip,
    includeDeleted: req.query.includeDeleted === '1' || req.query.includeDeleted === 'true'
  };
}

function getBearerPayload(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

async function getSubmitterFromRequest(req) {
  const payload = getBearerPayload(req);
  if (!payload?.openid) return null;
  const user = (await listDocuments('users', { where: { openid: payload.openid }, limit: 1 })).data[0];
  if (!user || user.status === 0 || user.status === '0' || user.status === 'deleted' || user.status === 'inactive') {
    return null;
  }
  return {
    openid: payload.openid,
    name: user?.name || user?.nickName || payload.openid
  };
}

async function getBusinessActorFromRequest(req) {
  const payload = getBearerPayload(req);
  if (!payload) return null;
  if (payload.role === 'admin') {
    return {
      role: 'admin',
      name: payload.username || payload.name || '管理员'
    };
  }
  if (!payload.openid) return null;
  const submitter = await getSubmitterFromRequest(req);
  return submitter ? { ...submitter, role: 'user' } : null;
}

async function requireBusinessActor(req, res, collection) {
  if (!isBusinessCollection(collection)) return { role: 'system' };
  const actor = await getBusinessActorFromRequest(req);
  if (!actor) {
    res.status(401).json({ code: 401, message: '请先使用有效账号登录' });
    return null;
  }
  return actor;
}

function bindSubmitter(data, actor) {
  if (!actor) return data;
  const now = new Date().toISOString();
  if (actor.openid) {
    return {
      ...data,
      submitterOpenid: actor.openid,
      submitterName: actor.name,
      submitter: actor.name,
      submitTime: data.submitTime || now
    };
  }
  return {
    ...data,
    submitterName: data.submitterName || data.submitter || actor.name,
    submitter: data.submitter || data.submitterName || actor.name,
    submitTime: data.submitTime || now
  };
}

function getTodayString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function normalizeDateString(value) {
  return String(value || '').slice(0, 10);
}

const businessCollectionLabels = {
  construction_log: '施工日志',
  output_record: '拌站出料表',
  diesel_entry: '拌站油料入库表',
  diesel_out: '站点油料领用表',
  diesel_delivery: '加油送油记录表',
  price_board: '今日挂牌价',
  TJform: '产品调价表',
  construction_log_summary: '施工日志汇总',
  equipment_maintenance: '机械设备保养',
  mixing_tower_maintenance: '拌合楼保养'
};

function getBusinessDocTitle(collection, doc) {
  if (collection === 'construction_log') return doc.projectName || '施工日志';
  if (collection === 'output_record') return doc.projectName || '拌站出料表';
  if (collection === 'diesel_entry') return doc.station || '拌站油料入库表';
  if (collection === 'diesel_out') return doc.projectLocation || '站点油料领用表';
  if (collection === 'diesel_delivery') return doc.projectLocation || '加油送油记录表';
  if (collection === 'TJform') return [doc.stationName, doc.productName].filter(Boolean).join(' ') || '产品调价表';
  if (collection === 'construction_log_summary') return doc.projectName || '施工日志汇总';
  if (collection === 'equipment_maintenance') return doc.equipmentName || '机械设备保养';
  if (collection === 'mixing_tower_maintenance') return doc.stationName || '拌合楼保养';
  return businessCollectionLabels[collection] || '表单';
}

async function createApprovalNotification(collection, doc, action, remark = '') {
  if (!doc?.submitterOpenid) return;
  const approved = action !== 'reject';
  const formName = businessCollectionLabels[collection] || '表单';
  const statusText = approved ? '已通过' : '已拒绝';
  const title = `${formName}${statusText}`;
  const contentParts = [`${getBusinessDocTitle(collection, doc)} ${statusText}`];
  if (!approved && remark) contentParts.push(`原因：${remark}`);
  await createDocument('notifications', {
    type: approved ? 'approval_approved' : 'approval_rejected',
    title,
    content: contentParts.join('，'),
    collectionName: collection,
    recordId: doc._id,
    logId: doc._id,
    toOpenid: doc.submitterOpenid,
    submitterOpenid: doc.submitterOpenid,
    isRead: 0
  });

  // 微信订阅消息推送（失败不影响审批流程与站内消息）
  // 取最后一位审批人姓名，取不到则用「管理员」
  const historyList = Array.isArray(doc.approvalHistory) ? doc.approvalHistory : [];
  const lastOperator = historyList.length ? historyList[historyList.length - 1] : {};
  pushApprovalResult({
    toOpenid: doc.submitterOpenid,
    reviewer: lastOperator.name || lastOperator.operatorName || '管理员',
    project: getBusinessDocTitle(collection, doc),
    result: statusText,
    page: `pages/log-detail/log-detail?id=${doc._id}&collection=${collection}`
  }).catch(() => {});
}

function normalizeApprovers(value) {
  if (!Array.isArray(value)) return [];
  return value.map(item => {
    if (!item) return null;
    if (typeof item === 'string') return { openid: item, name: item };
    const openid = item.openid || item.userId || item._id || item.id || '';
    const name = item.name || item.nickName || item.username || openid;
    return openid ? { openid, name } : null;
  }).filter(Boolean);
}

function normalizeApprovalLevels(value) {
  if (!Array.isArray(value)) return [];
  return value.map(level => ({
    type: level.type === '联合审批' || level.type === 'joint' ? '联合审批' : '单人审批',
    approvers: normalizeApprovers(level.approvers || level.users || level.approvalUsers || [])
  })).filter(level => level.approvers.length);
}

function pendingText(approvers) {
  const names = normalizeApprovers(approvers).map(item => item.name).filter(Boolean);
  if (!names.length) return '待审批';
  return `待${names.join('、')}审批`;
}

async function syncVisibleUsersToExistingRecords(setting = {}) {
  const collection = setting.collectionName;
  if (!collection || !isBusinessCollection(collection)) return;
  const visibleUsers = normalizeApprovers(setting.visibleUsers || setting.extraVisibleUsers || []);
  let offset = 0;
  const limit = 200;
  while (true) {
    const result = await listDocuments(collection, { limit, offset, includeDeleted: true });
    const list = result.data || [];
    if (!list.length) break;
    await Promise.all(list
      .filter(doc => (doc.approvalStatus || doc.status) !== 'deleted')
      .map(doc => updateDocument(collection, doc._id, { visibleUsers })));
    offset += limit;
    if (list.length < limit) break;
  }
}

async function addRecordParticipants(collection, doc, users, role = '审批人', action = 'assigned') {
  if (!doc?._id || !isBusinessCollection(collection)) return doc;
  const participants = Array.isArray(doc.participants) ? doc.participants : [];
  const now = new Date().toISOString();
  const nextParticipants = participants.concat(normalizeApprovers(users).map(user => ({
    openid: user.openid,
    name: user.name,
    role,
    action,
    time: now
  })));
  return updateDocument(collection, doc._id, { participants: nextParticipants });
}

async function createPendingNotificationsForApprovers(collection, doc, approvers) {
  const targets = normalizeApprovers(approvers);
  if (!targets.length) return;
  await addRecordParticipants(collection, doc, targets, '审批人', 'assigned');
  const formName = businessCollectionLabels[collection] || '表单';
  const title = `${formName}待审批`;
  const content = `${doc.submitterName || doc.submitter || '提交人'}提交了${getBusinessDocTitle(collection, doc)}，请及时审批`;
  await Promise.all(targets.map(user => createDocument('notifications', {
    type: 'approval_pending',
    title,
    content,
    collectionName: collection,
    recordId: doc._id,
    logId: doc._id,
    toOpenid: user.openid,
    submitterOpenid: doc.submitterOpenid || '',
    submitterName: doc.submitterName || doc.submitter || '',
    isRead: 0
  })));

  // 微信订阅消息推送：通知审批人有新的待审批记录
  const submitter = doc.submitterName || doc.submitter || '提交人';
  await Promise.all(targets.map(user => pushApprovalPending({
    toOpenid: user.openid,
    submitter,
    form: `${formName}：${getBusinessDocTitle(collection, doc)}`,
    status: '待审批',
    page: 'pages/approval-list/approval-list'
  }).catch(() => {})));
}

async function createPendingApprovalNotifications(collection, doc) {
  const status = doc?.approvalStatus || doc?.status || '';
  if (!isBusinessCollection(collection) || status !== 'pending') return;

  const approvers = normalizeApprovers(doc.currentApprovers);
  if (approvers.length) {
    await createPendingNotificationsForApprovers(collection, doc, approvers);
  }
}

async function approveBusinessRecord(collection, id, req) {
  const current = await getDocument(collection, id);
  if (!current) return null;
  const action = req.body?.action === 'reject' ? 'reject' : 'approve';
  const now = new Date().toISOString();
  const operatorOpenid = req.admin?.openid || '';
  const operatorName = req.admin?.username || '网页管理员';
  const history = Array.isArray(current.approvalHistory) ? current.approvalHistory : [];
  const stepIndex = Math.max(Number(current.currentApprovalStep || 0), 0);
  const flow = normalizeApprovalLevels(current.approvalFlowSnapshot || current.approvalLevels);
  if (!flow.length) {
    const doc = await updateDocument(
      collection,
      id,
      approvalPatch(collection, action, operatorName, req.body?.remark || '', operatorOpenid)
    );
    await createApprovalNotification(collection, doc, action, req.body?.remark || '');
    return doc;
  }
  const currentLevel = flow[stepIndex] || {};
  const currentApprovers = normalizeApprovers(current.currentApprovers);
  const nextHistory = history.concat([{
    stepIndex,
    type: currentLevel.type || '单人审批',
    action,
    approverOpenid: operatorOpenid,
    approverName: operatorName,
    remark: req.body?.remark || '',
    time: now
  }]);

  if (action === 'reject') {
    const doc = await updateDocument(collection, id, {
      approvalStatus: 'rejected',
      approvalStatusText: '已拒绝',
      currentApprovers: [],
      currentApproverOpenids: [],
      currentApproverNames: [],
      approvalHistory: nextHistory,
      approvalTime: now,
      approvalRemark: req.body?.remark || '',
      approverName: operatorName,
      approverOpenid: operatorOpenid
    });
    await createApprovalNotification(collection, doc, 'reject', req.body?.remark || '');
    return doc;
  }

  if ((currentLevel.type || '单人审批') === '联合审批' && currentApprovers.length > 1 && operatorOpenid) {
    const remaining = currentApprovers.filter(user => user.openid !== operatorOpenid);
    if (remaining.length && remaining.length !== currentApprovers.length) {
      return updateDocument(collection, id, {
        approvalStatus: 'pending',
        approvalStatusText: pendingText(remaining),
        currentApprovers: remaining,
        currentApproverOpenids: remaining.map(user => user.openid),
        currentApproverNames: remaining.map(user => user.name),
        approvalHistory: nextHistory
      });
    }
  }

  const nextStepIndex = stepIndex + 1;
  const nextLevel = flow[nextStepIndex];
  if (nextLevel) {
    const allowed = new Set(nextLevel.approvers.map(user => user.openid));
    let selected = normalizeApprovers(req.body?.nextApprovers || [])
      .filter(user => allowed.has(user.openid));
    if (!selected.length && !operatorOpenid) selected = nextLevel.approvers;
    if (!selected.length) {
      const err = new Error('请选择下一级审批人');
      err.statusCode = 400;
      throw err;
    }
    const doc = await updateDocument(collection, id, {
      approvalStatus: 'pending',
      approvalStatusText: pendingText(selected),
      currentApprovalStep: nextStepIndex,
      currentApprovalType: nextLevel.type,
      currentApprovers: selected,
      currentApproverOpenids: selected.map(user => user.openid),
      currentApproverNames: selected.map(user => user.name),
      approvalHistory: nextHistory
    });
    await createPendingNotificationsForApprovers(collection, doc, selected);
    return doc;
  }

  const doc = await updateDocument(collection, id, {
    approvalStatus: 'approved',
    approvalStatusText: '已通过',
    currentApprovers: [],
    currentApproverOpenids: [],
    currentApproverNames: [],
    approvalHistory: nextHistory,
    approvalTime: now,
    approvalRemark: req.body?.remark || '',
    approverName: operatorName,
    approverOpenid: operatorOpenid
  });
  await createApprovalNotification(collection, doc, 'approve', req.body?.remark || '');
  return doc;
}

async function syncApprovedPriceBoard(doc) {
  if (!doc?.stationName || !doc?.productName) return;
  const boardRows = await listDocuments('price_board', {
    where: { stationName: doc.stationName, productName: doc.productName },
    includeDeleted: true,
    limit: 1
  });
  const boardDoc = boardRows.data?.[0];
  if (doc.boardSyncedAt && boardDoc?._id) return;
  if (boardDoc?._id) {
    const currentPrice = boardDoc.NewPrice ?? boardDoc.OldPrice ?? doc.OldPrice ?? '';
    await updateDocument('price_board', boardDoc._id, {
      OldPrice: currentPrice,
      NewPrice: doc.NewPrice ?? currentPrice
    });
  } else {
    await createDocument('price_board', {
      stationName: doc.stationName,
      productName: doc.productName,
      OldPrice: doc.OldPrice ?? '',
      NewPrice: doc.NewPrice ?? doc.OldPrice ?? '',
      unit: doc.unit || '元/吨',
      status: 1,
      approvalStatus: 'approved'
    });
  }
  await updateDocument('TJform', doc._id, {
    boardSyncedAt: new Date().toISOString()
  });
}

async function syncEffectiveApprovedTJForms() {
  const today = getTodayString();
  const rows = await query(
    `SELECT * FROM \`tj_form\`
     WHERE JSON_UNQUOTE(JSON_EXTRACT(data, '$.approvalStatus')) = 'approved'
     ORDER BY JSON_UNQUOTE(JSON_EXTRACT(data, '$.TJtime')) ASC, created_at ASC`
  );

  for (const row of rows) {
    const doc = parseRow(row);
    if (!doc?._id) continue;
    const effectiveDate = normalizeDateString(doc.TJtime || doc.approvalTime || doc.createTime);
    if (!effectiveDate || effectiveDate > today) continue;
    await syncApprovedPriceBoard(doc);
  }
}

app.get('/api/health', (req, res) => ok(res, { status: 'ok' }));

app.post('/api/upload/image', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ code: 400, message: '请选择图片' });
  ok(res, {
    url: `/uploads/${req.file.filename}`,
    filename: req.file.filename,
    originalName: req.file.originalname
  });
});

app.post('/api/auth/admin/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    const admin = await verifyAdmin(username, password);
    if (!admin) return res.status(401).json({ code: 401, message: '账号或密码错误' });
    ok(res, {
      token: signToken({ id: admin.id, username: admin.username, role: 'admin' }),
      userInfo: { id: admin.id, username: admin.username, name: admin.name, role: 'admin' }
    });
  } catch (err) {
    next(err);
  }
});

function authUserResponse(user) {
  return {
    token: signToken({
      role: user.role === 'admin' ? 'admin' : 'user',
      openid: user.openid,
      username: user.name || user.nickName || user.openid
    }),
    openid: user.openid,
    userInfo: {
      openid: user.openid,
      nickName: user.nickName || user.name,
      name: user.name || user.nickName,
      avatarUrl: user.avatarUrl || '',
      phone: user.phone || '',
      role: user.role || 'submitter',
      status: user.status ?? 1
    }
  };
}

app.post('/api/auth/register', async (req, res, next) => {
  try {
    ok(res, authUserResponse(await registerUserByPassword(req.body || {})), 'registered');
  } catch (err) {
    next(err);
  }
});

// 把 wx.login 换来的真实 openid 绑定给用户
// 仅当当前 openid 是本地生成的假值（local- / user- 开头或为空）时才更新，避免误改已有绑定
async function bindRealOpenid(user, code) {
  if (!user?._id || !code) return user;
  const current = user.openid || '';
  if (current && !/^(local-|user-)/.test(current)) return user;
  const session = await code2Session(code);
  const realOpenid = session?.openid || '';
  if (!realOpenid || realOpenid === current) return user;
  // 真实 openid 已被其它账号占用则跳过，避免重复绑定
  const exists = (await listDocuments('users', { where: { openid: realOpenid }, limit: 1 })).data[0];
  if (exists && String(exists._id) !== String(user._id)) return user;
  const updated = await updateDocument('users', user._id, { openid: realOpenid });
  user.openid = updated?.openid || realOpenid;
  return user;
}

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const user = await loginUserByPassword(req.body || {});
    if (!user) {
      // 存量账号（早期用 wxlogin / 本地 openid 建号）没有密码，给出可操作的提示而不是笼统报错
      const probe = await findUserByLoginName(req.body?.name || '');
      const message = probe && !probe.passwordHash
        ? '该账号尚未设置密码，请先「注册账号」设置密码'
        : '姓名或密码错误';
      return res.status(401).json({ code: 401, message });
    }
    // 用 wx.login 的 code 换取真实 openid（订阅消息推送必须依赖真实 openid）
    await bindRealOpenid(user, req.body?.code || '');
    ok(res, authUserResponse(user));
  } catch (err) {
    next(err);
  }
});

app.post('/api/auth/reset-password', async (req, res, next) => {
  try {
    const user = await resetUserPassword(req.body || {});
    if (!user) return res.status(404).json({ code: 404, message: '未找到该用户' });
    ok(res, true, 'password reset');
  } catch (err) {
    next(err);
  }
});

app.post('/api/auth/wxlogin', async (req, res) => {
  const { code, openid, userInfo: profile = {} } = req.body || {};
  // 1) 优先用 wx.login 的 code 换取真实 openid（订阅消息推送必须依赖真实 openid）
  const session = await code2Session(code || '');
  const realOpenid = session?.openid || '';
  const legacyOpenid = openid || '';
  const userOpenid = realOpenid || legacyOpenid || code || 'local-openid';
  const now = new Date().toISOString();

  // 2) 真实 openid 查不到用户时，尝试把旧账号（本地生成的 local-xxx 假 openid）迁移过来，
  //    避免老用户换新设备登录后产生重复账号、丢失角色与历史数据
  let existing = (await listDocuments('users', { where: { openid: userOpenid }, limit: 1 })).data[0];
  if (!existing && realOpenid && legacyOpenid && legacyOpenid !== realOpenid) {
    const legacy = (await listDocuments('users', { where: { openid: legacyOpenid }, limit: 1 })).data[0];
    if (legacy) {
      existing = await updateDocument('users', legacy._id, { openid: realOpenid });
    }
  }
  const userPayload = {
    openid: userOpenid,
    nickName: profile.nickName || existing?.nickName || '微信用户',
    name: profile.nickName || existing?.name || existing?.nickName || '微信用户',
    avatarUrl: profile.avatarUrl || existing?.avatarUrl || '',
    phone: existing?.phone || profile.phone || '',
    role: existing?.role || 'submitter',
    status: existing?.status ?? 1,
    lastLoginTime: now
  };
  const user = existing
    ? await updateDocument('users', existing._id, userPayload)
    : await createDocument('users', userPayload);

  ok(res, {
    token: signToken({ role: user.role === 'admin' ? 'admin' : 'user', openid: userOpenid, username: user.name || user.nickName || userOpenid }),
    openid: userOpenid,
    userInfo: {
      openid: user.openid,
      nickName: user.nickName,
      name: user.name,
      avatarUrl: user.avatarUrl,
      phone: user.phone || '',
      role: user.role || 'submitter',
      status: user.status ?? 1
    }
  });
});

// 下发小程序订阅消息所需的前端配置（只含模板 ID，不含 AppSecret）
app.get('/api/config/wechat', (req, res) => {
  const cfg = wechatConfig();
  ok(res, {
    appid: cfg.appid,
    pushEnabled: cfg.pushEnabled,
    templates: cfg.templates
  });
});

app.get('/api/collections/:collection', async (req, res, next) => {
  try {
    if (req.params.collection === 'price_board') {
      await syncEffectiveApprovedTJForms();
    }
    ok(res, await listDocuments(req.params.collection, parseQuery(req)));
  } catch (err) {
    next(err);
  }
});

app.post('/api/collections/:collection', async (req, res, next) => {
  try {
    const actor = await requireBusinessActor(req, res, req.params.collection);
    if (!actor) return;
    const doc = await createDocument(req.params.collection, bindSubmitter(req.body || {}, actor));
    await createPendingApprovalNotifications(req.params.collection, doc);
    ok(res, doc, 'created');
  } catch (err) {
    next(err);
  }
});

app.get('/api/collections/:collection/:id', async (req, res, next) => {
  try {
    if (req.params.collection === 'price_board') {
      await syncEffectiveApprovedTJForms();
    }
    const doc = await getDocument(req.params.collection, req.params.id);
    if (!doc) return res.status(404).json({ code: 404, message: '记录不存在' });
    ok(res, doc);
  } catch (err) {
    next(err);
  }
});

app.put('/api/collections/:collection/:id', async (req, res, next) => {
  try {
    const actor = await requireBusinessActor(req, res, req.params.collection);
    if (!actor) return;
    if (isBusinessCollection(req.params.collection) && actor.openid) {
      const current = await getDocument(req.params.collection, req.params.id);
      if (!current) return res.status(404).json({ code: 404, message: '记录不存在' });
      if (current.submitterOpenid && current.submitterOpenid !== actor.openid) {
        return res.status(403).json({ code: 403, message: '只有提交人可以修改该表单' });
      }
    }
    const doc = await updateDocument(req.params.collection, req.params.id, req.body || {});
    if (!doc) return res.status(404).json({ code: 404, message: '记录不存在' });
    if (req.params.collection === 'form_registry') {
      await syncVisibleUsersToExistingRecords(doc);
    }
    if (
      isBusinessCollection(req.params.collection) &&
      (doc.approvalStatus || doc.status) === 'pending' &&
      Array.isArray(req.body?.currentApprovers)
    ) {
      await createPendingApprovalNotifications(req.params.collection, doc);
    }
    ok(res, doc);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/collections/:collection/:id', async (req, res, next) => {
  try {
    const actor = await requireBusinessActor(req, res, req.params.collection);
    if (!actor) return;
    if (isBusinessCollection(req.params.collection) && actor.openid) {
      const current = await getDocument(req.params.collection, req.params.id);
      if (!current) return res.status(404).json({ code: 404, message: '记录不存在' });
      if (current.submitterOpenid && current.submitterOpenid !== actor.openid) {
        return res.status(403).json({ code: 403, message: '只有提交人可以删除该表单' });
      }
    }
    const payload = getBearerPayload(req);
    const operator = req.body?.operator || payload?.username || '管理员';
    await deleteDocument(req.params.collection, req.params.id, {
      operator,
      reason: req.body?.reason || req.body?.deleteReason || ''
    });
    ok(res, true);
  } catch (err) {
    next(err);
  }
});

app.post('/api/admin/collections/:collection/:id/approval', requireAdmin, async (req, res, next) => {
  try {
    const { collection, id } = req.params;
    if (!isBusinessCollection(collection)) {
      return res.status(400).json({ code: 400, message: '该数据表不支持审批' });
    }
    const action = req.body?.action === 'reject' ? 'reject' : 'approve';
    const doc = await approveBusinessRecord(collection, id, req);
    if (!doc) return res.status(404).json({ code: 404, message: '记录不存在' });
    if (collection === 'TJform' && action === 'approve' && doc.approvalStatus === 'approved') {
      await syncEffectiveApprovedTJForms();
    }
    ok(res, doc);
  } catch (err) {
    next(err);
  }
});

app.get('/api/admin/form-settings', requireAdmin, async (req, res, next) => {
  try {
    const settings = await Promise.all(businessCollections.map(name => getFormSetting(name)));
    ok(res, settings);
  } catch (err) {
    next(err);
  }
});

app.get('/api/admin/summary', requireAdmin, async (req, res, next) => {
  try {
    const result = {};
    await Promise.all(businessCollections.map(async name => {
      result[name] = (await listDocuments(name, { limit: 1 })).total;
    }));
    ok(res, result);
  } catch (err) {
    next(err);
  }
});

app.get('/banner/list', async (req, res, next) => {
  try {
    ok(res, (await listDocuments('banners', { where: { status: 1 }, orderBy: 'sort', order: 'asc' })).data);
  } catch (err) {
    next(err);
  }
});

app.get('/company/stats', async (req, res, next) => {
  try {
    ok(res, (await listDocuments('stats', { where: { status: 1 }, orderBy: 'sort', order: 'asc' })).data);
  } catch (err) {
    next(err);
  }
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.statusCode || 500).json({ code: err.statusCode || 500, message: err.message || '服务器错误' });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`Guangda backend listening on http://127.0.0.1:${port}`);
});
