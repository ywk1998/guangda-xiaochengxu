import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'ywk101520..',
  database: process.env.DB_NAME || 'guangda',
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true
};

export const pool = mysql.createPool(dbConfig);

export async function query(sql, params = {}) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export function parseRow(row) {
  if (!row) return null;
  const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data || {};
  return {
    ...data,
    _id: String(row.id),
    id: String(row.id),
    collection: row.collection_name,
    createTime: data.createTime || row.created_at,
    updateTime: data.updateTime || row.updated_at
  };
}
