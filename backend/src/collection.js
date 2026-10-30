import { query, parseRow } from './db.js';
import { sanitizeCollectionData } from './schema.js';

export const collectionTables = {
  products: 'products',
  mixing_station: 'mixing_station',
  stations: 'stations',
  construction_log: 'construction_log',
  construction_log_summary: 'construction_log_summary',
  users: 'users',
  notifications: 'notifications',
  banners: 'banners',
  stats: 'stats',
  output_record: 'output_record',
  output_list: 'output_list',
  diesel_entry: 'diesel_entry',
  diesel_out: 'diesel_out',
  diesel_delivery: 'diesel_delivery',
  equipment_maintenance: 'equipment_maintenance',
  mixing_tower_maintenance: 'mixing_tower_maintenance',
  price_board: 'price_board',
  TJform: 'tj_form',
  form_registry: 'form_registry',
  messages: 'messages'
};

const allowedCollections = new Set(Object.keys(collectionTables));
export const businessCollections = [
  'construction_log',
  'output_record',
  'diesel_entry',
  'diesel_out',
  'diesel_delivery',
  'price_board',
  'TJform',
  'construction_log_summary',
  'equipment_maintenance',
  'mixing_tower_maintenance'
];
const businessCollectionSet = new Set(businessCollections);
const approvalFields = {
  construction_log: 'status'
};
const approvalStatusValues = new Set(['pending', 'approved', 'rejected', 'deleted']);

export function assertCollection(name) {
  if (!allowedCollections.has(name)) {
    const err = new Error(`不支持的集合：${name}`);
    err.statusCode = 400;
    throw err;
  }
}

function tableFor(collection) {
  assertCollection(collection);
  return collectionTables[collection];
}

function parseCollectionRow(collection, row) {
  return normalizeApprovalFields(collection, parseRow({ ...row, collection_name: collection }));
}

function approvalFieldFor(collection) {
  return approvalFields[collection] || 'approvalStatus';
}

function normalizeApprovalFields(collection, doc) {
  if (!doc || !businessCollectionSet.has(collection)) return doc;
  const field = approvalFieldFor(collection);
  const approvalValue = doc.approvalStatus && doc.approvalStatus !== 'pending'
    ? doc.approvalStatus
    : (doc[field] && doc[field] !== 'pending'
      ? doc[field]
      : (collection === 'construction_log' && doc.status && doc.status !== 'pending'
        ? doc.status
        : (doc.approvalStatus || doc[field] || (collection === 'construction_log' ? doc.status : ''))));
  if (!approvalValue) return doc;
  const next = { ...doc, approvalStatus: approvalValue, [field]: approvalValue };
  if (collection === 'construction_log') next.status = approvalValue;
  else if (approvalStatusValues.has(String(next.status || ''))) delete next.status;
  return next;
}

function syncExplicitApprovalPatch(collection, data) {
  if (!data || !businessCollectionSet.has(collection)) return data;
  const field = approvalFieldFor(collection);
  if (field in data && data[field] !== undefined && data[field] !== '') {
    const patch = { ...data, approvalStatus: data[field] };
    if (collection === 'construction_log') patch.status = data[field];
    return patch;
  }
  if ('approvalStatus' in data && data.approvalStatus !== undefined && data.approvalStatus !== '') {
    const patch = { ...data, [field]: data.approvalStatus };
    if (collection === 'construction_log') patch.status = data.approvalStatus;
    return patch;
  }
  return data;
}

function enabledValue(value) {
  return value === true || value === 1 || value === '1' || value === 'true' || value === '是' || value === '启用' || value === undefined;
}

function normalizeParticipantList(value) {
  if (!Array.isArray(value)) return [];
  return value.map(item => {
    if (!item) return null;
    if (typeof item === 'string') return { openid: item, name: item, role: '参与人' };
    const openid = item.openid || item.approverOpenid || item.userId || item._id || item.id || '';
    const name = item.name || item.approverName || item.nickName || item.username || item.approver || openid;
    return openid ? { ...item, openid, name } : null;
  }).filter(Boolean);
}

function appendParticipant(map, item, fallback = {}) {
  const [participant] = normalizeParticipantList([{ ...fallback, ...item }]);
  if (!participant) return;
  map.set(participant.openid, { ...(map.get(participant.openid) || {}), ...participant });
}

function isVisibleOnlyParticipant(item = {}) {
  const role = String(item.role || '');
  const action = String(item.action || '');
  return role === '参与人' || role === '额外可见人' || action === 'visible';
}

function withParticipants(data) {
  if (!data || typeof data !== 'object') return data;
  const map = new Map();
  normalizeParticipantList(data.participants)
    .filter(item => !isVisibleOnlyParticipant(item))
    .forEach(item => map.set(item.openid, item));
  normalizeParticipantList(data.visibleUsers || data.extraVisibleUsers).forEach(item => appendParticipant(map, {
    ...item,
    role: item.role || '额外可见人',
    action: item.action || 'visible',
    time: data.createTime || data.updateTime
  }));
  appendParticipant(map, {
    openid: data.submitterOpenid,
    name: data.submitterName || data.submitter,
    role: '提交人',
    action: 'submit',
    time: data.submitTime || data.createTime
  });
  normalizeParticipantList(data.currentApprovers).forEach(item => appendParticipant(map, {
    ...item,
    role: data.currentApprovalStep ? `第${Number(data.currentApprovalStep) + 1}级审批人` : '审批人',
    action: 'assigned',
    time: data.updateTime || data.createTime
  }));
  appendParticipant(map, {
    openid: data.approverOpenid,
    name: data.approverName || data.approver,
    role: '审批人',
    action: 'approve',
    time: data.approvalTime || data.updateTime
  });
  normalizeParticipantList(data.approvalHistory).forEach(item => appendParticipant(map, {
    ...item,
    role: item.role || '审批人',
    action: item.action || item.status || 'approve',
    time: item.time || item.approvalTime || data.updateTime
  }));
  const participants = Array.from(map.values());
  if (!participants.length) return data;
  return {
    ...data,
    participants,
    participantOpenids: participants.map(item => item.openid)
  };
}

export async function getFormSetting(collection) {
  if (!businessCollectionSet.has(collection)) return { approvalRequired: false };
  const rows = await query(
    `SELECT * FROM \`${collectionTables.form_registry}\`
     WHERE JSON_UNQUOTE(JSON_EXTRACT(data, '$.collectionName')) = :collection
     LIMIT 1`,
    { collection }
  );
  const setting = rows[0] ? parseCollectionRow('form_registry', rows[0]) : {};
  return {
    ...setting,
    approvalRequired: enabledValue(setting.approvalRequired)
  };
}

export function isBusinessCollection(collection) {
  return businessCollectionSet.has(collection);
}

function normalizePayload(collection, payload) {
  let next = payload;
  if (collection === 'users' && next.role === 'approver') {
    next = { ...next, role: 'submitter' };
  }
  return sanitizeCollectionData(collection, next);
}

export function approvalPatch(collection, action, adminName = '网页管理员', remark = '', adminOpenid = '') {
  const status = action === 'reject' ? 'rejected' : 'approved';
  const field = approvalFieldFor(collection);
  const now = new Date().toISOString();
  const patch = {
    [field]: status,
    approvalStatus: status,
    approver: adminName,
    approverName: adminName,
    approverOpenid: adminOpenid,
    approvalTime: now,
    approvalRemark: remark
  };
  if (collection === 'construction_log') patch.status = status;
  return patch;
}

function deletionPatch(collection, operator = '管理员', reason = '') {
  const now = new Date().toISOString();
  const patch = {
    deletedBy: operator,
    deletedTime: now,
    deleteReason: reason
  };
  if (businessCollectionSet.has(collection)) {
    patch.approvalStatus = 'deleted';
    patch[approvalFieldFor(collection)] = 'deleted';
  } else if (collection === 'users') {
    patch.status = 'deleted';
  } else {
    patch.status = 0;
  }
  if (collection === 'construction_log') patch.status = 'deleted';
  return patch;
}

export async function listDocuments(collection, options = {}) {
  const table = tableFor(collection);
  const where = options.where || {};
  const filters = Object.entries(where).filter(([, value]) => value !== undefined && value !== '');
  const clauses = ['1 = 1'];
  const params = {};

  if (businessCollectionSet.has(collection) && !options.includeDeleted) {
    clauses.push(`COALESCE(
      JSON_UNQUOTE(JSON_EXTRACT(data, '$.approvalStatus')),
      JSON_UNQUOTE(JSON_EXTRACT(data, '$.${approvalFieldFor(collection)}')),
      ''
    ) <> 'deleted'`);
  }
  if (collection === 'users' && !options.includeDeleted) {
    clauses.push(`COALESCE(JSON_UNQUOTE(JSON_EXTRACT(data, '$.status')), '1') NOT IN ('0', 'deleted', 'inactive')`);
  }

  filters.forEach(([key, value], index) => {
    const param = `w${index}`;
    clauses.push(`JSON_UNQUOTE(JSON_EXTRACT(data, '$.${key}')) = :${param}`);
    params[param] = String(value);
  });

  const orderField = options.orderBy || 'created_at';
  const direction = String(options.order || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const orderSql = orderField === 'created_at' || orderField === 'updated_at'
    ? orderField
    : `JSON_UNQUOTE(JSON_EXTRACT(data, '$.${orderField}'))`;

  const limit = Math.min(Math.max(Number(options.limit || 100), 1), 500);
  const offset = Math.max(Number(options.offset || 0), 0);

  const rows = await query(
    `SELECT * FROM \`${table}\`
     WHERE ${clauses.join(' AND ')}
     ORDER BY ${orderSql} ${direction}
     LIMIT ${limit} OFFSET ${offset}`,
    params
  );
  const countRows = await query(
    `SELECT COUNT(*) AS total FROM \`${table}\` WHERE ${clauses.join(' AND ')}`,
    params
  );
  return { data: rows.map(row => parseCollectionRow(collection, row)), total: Number(countRows[0]?.total || 0) };
}

export async function getDocument(collection, id) {
  const table = tableFor(collection);
  const rows = await query(
    `SELECT * FROM \`${table}\` WHERE id = :id LIMIT 1`,
    { id: Number(id) }
  );
  return rows[0] ? parseCollectionRow(collection, rows[0]) : null;
}

export async function createDocument(collection, data) {
  const table = tableFor(collection);
  const now = new Date().toISOString();
  let payload = { ...data, createTime: data.createTime || now, updateTime: now };
  if (businessCollectionSet.has(collection)) {
    const setting = await getFormSetting(collection);
    const field = approvalFieldFor(collection);
    const defaultStatus = setting.approvalRequired
      ? (payload[field] || payload.approvalStatus || (collection === 'construction_log' ? payload.status : '') || 'pending')
      : 'approved';
    payload = {
      ...payload,
      [field]: defaultStatus
    };
    if (collection === 'construction_log' && payload.status === undefined) payload.status = payload[field];
    if (payload.approvalStatus === undefined) payload.approvalStatus = payload[field];
    payload = withParticipants(payload);
  }
  payload = normalizePayload(collection, payload);
  const result = await query(
    `INSERT INTO \`${table}\` (data) VALUES (:data)`,
    { data: JSON.stringify(payload) }
  );
  return getDocument(collection, result.insertId);
}

export async function updateDocument(collection, id, data) {
  assertCollection(collection);
  const current = await getDocument(collection, id);
  if (!current) return null;
  const { _id, id: dataId, collection: _collection, ...rest } = current;
  const patch = syncExplicitApprovalPatch(collection, data);
  const payload = normalizePayload(
    collection,
    withParticipants(normalizeApprovalFields(collection, { ...rest, ...patch, updateTime: new Date().toISOString() }))
  );
  const table = tableFor(collection);
  await query(
    `UPDATE \`${table}\` SET data = :data WHERE id = :id`,
    { id: Number(id), data: JSON.stringify(payload) }
  );
  return getDocument(collection, id);
}

export async function deleteDocument(collection, id, options = {}) {
  return updateDocument(
    collection,
    id,
    deletionPatch(collection, options.operator || '管理员', options.reason || '')
  );
}
