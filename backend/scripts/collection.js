import { query, parseRow } from './db.js';

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
  return next;
}

function enabledValue(value) {
  return value === true || value === 1 || value === '1' || value === 'true' || value === '是' || value === '启用' || value === undefined;
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
  if (collection === 'users' && payload.role === 'approver') {
    return { ...payload, role: 'submitter' };
  }
  return payload;
}

export function approvalPatch(collection, action, adminName = '网页管理员', remark = '') {
  const status = action === 'reject' ? 'rejected' : 'approved';
  const field = approvalFieldFor(collection);
  const now = new Date().toISOString();
  const patch = {
    [field]: status,
    approvalStatus: status,
    approver: adminName,
    approverName: adminName,
    approvalTime: now,
    approvalRemark: remark
  };
  if (collection === 'construction_log') patch.status = status;
  return patch;
}

export async function listDocuments(collection, options = {}) {
  const table = tableFor(collection);
  const where = options.where || {};
  const filters = Object.entries(where).filter(([, value]) => value !== undefined && value !== '');
  const clauses = ['1 = 1'];
  const params = {};

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
  const payload = normalizePayload(
    collection,
    normalizeApprovalFields(collection, { ...rest, ...data, updateTime: new Date().toISOString() })
  );
  const table = tableFor(collection);
  await query(
    `UPDATE \`${table}\` SET data = :data WHERE id = :id`,
    { id: Number(id), data: JSON.stringify(payload) }
  );
  return getDocument(collection, id);
}

export async function deleteDocument(collection, id) {
  const table = tableFor(collection);
  await query(
    `DELETE FROM \`${table}\` WHERE id = :id`,
    { id: Number(id) }
  );
}
