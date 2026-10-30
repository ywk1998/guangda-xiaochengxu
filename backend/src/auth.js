import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, parseRow } from './db.js';

const jwtSecret = process.env.JWT_SECRET || 'guangda-local-secret';

export function signToken(payload) {
  return jwt.sign(payload, jwtSecret, { expiresIn: '7d' });
}

export function verifyToken(token) {
  return jwt.verify(token, jwtSecret);
}

export function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return res.status(401).json({ code: 401, message: '请先登录' });
  try {
    const payload = verifyToken(token);
    if (payload.role !== 'admin') throw new Error('not admin');
    req.admin = payload;
    next();
  } catch {
    res.status(401).json({ code: 401, message: '登录已过期' });
  }
}

export async function verifyAdmin(username, password) {
  const rows = await query(
    'SELECT * FROM admin_users WHERE username = :username AND status = 1 LIMIT 1',
    { username }
  );
  const admin = rows[0];
  if (!admin) return null;
  const ok = await bcrypt.compare(password, admin.password_hash);
  if (!ok) return null;
  return admin;
}

function publicUser(user) {
  if (!user) return null;
  const { passwordHash, password_hash: passwordHashLegacy, ...rest } = user;
  return rest;
}

async function findUserByName(name) {
  const rows = await query(
    `SELECT * FROM users
     WHERE JSON_UNQUOTE(JSON_EXTRACT(data, '$.name')) = :name
        OR JSON_UNQUOTE(JSON_EXTRACT(data, '$.nickName')) = :name
     ORDER BY id ASC
     LIMIT 1`,
    { name }
  );
  return rows[0] ? parseRow({ ...rows[0], collection_name: 'users' }) : null;
}

// 供登录接口判断“账号存在但未设置密码”的存量账号（早期由 wxlogin / 本地 openid 建号）
export function findUserByLoginName(name) {
  return findUserByName(String(name || '').trim());
}

async function saveUserPatch(id, patch) {
  const rows = await query('SELECT * FROM users WHERE id = :id LIMIT 1', { id: Number(id) });
  if (!rows[0]) return null;
  const current = parseRow({ ...rows[0], collection_name: 'users' });
  const { _id, id: userId, collection, ...rest } = current;
  const payload = { ...rest, ...patch, updateTime: new Date().toISOString() };
  await query(
    'UPDATE users SET data = :data WHERE id = :id',
    { id: Number(id), data: JSON.stringify(payload) }
  );
  return publicUser(parseRow({ id, data: payload, collection_name: 'users' }));
}

export async function registerUserByPassword({ name, password }) {
  const trimmedName = String(name || '').trim();
  if (!trimmedName) {
    const err = new Error('请填写姓名');
    err.statusCode = 400;
    throw err;
  }
  if (String(password || '').length < 6) {
    const err = new Error('密码至少 6 位');
    err.statusCode = 400;
    throw err;
  }
  const existing = await findUserByName(trimmedName);
  if (existing?.passwordHash) {
    const err = new Error('该姓名已注册，请直接登录');
    err.statusCode = 409;
    throw err;
  }

  const now = new Date().toISOString();
  const passwordHash = await bcrypt.hash(String(password), 10);
  if (existing?._id) {
    return saveUserPatch(existing._id, {
      name: trimmedName,
      nickName: trimmedName,
      passwordHash,
      role: existing.role || 'submitter',
      status: existing.status ?? 1,
      lastLoginTime: now
    });
  }

  const payload = {
    openid: `user-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    name: trimmedName,
    nickName: trimmedName,
    avatarUrl: '',
    passwordHash,
    role: 'submitter',
    status: 1,
    createTime: now,
    updateTime: now,
    lastLoginTime: now
  };
  const result = await query(
    'INSERT INTO users (data) VALUES (:data)',
    { data: JSON.stringify(payload) }
  );
  return publicUser({ ...payload, _id: String(result.insertId), id: String(result.insertId), collection: 'users' });
}

export async function loginUserByPassword({ name, password }) {
  const user = await findUserByName(String(name || '').trim());
  if (!user?.passwordHash || user.status === 0 || user.status === '0') return null;
  const ok = await bcrypt.compare(String(password || ''), user.passwordHash);
  if (!ok) return null;
  await saveUserPatch(user._id, { lastLoginTime: new Date().toISOString() });
  return publicUser(user);
}

export async function resetUserPassword({ name, newPassword }) {
  const user = await findUserByName(String(name || '').trim());
  if (!user?.passwordHash) return null;
  if (String(newPassword || '').length < 6) {
    const err = new Error('新密码至少 6 位');
    err.statusCode = 400;
    throw err;
  }
  return saveUserPatch(user._id, {
    passwordHash: await bcrypt.hash(String(newPassword), 10)
  });
}
