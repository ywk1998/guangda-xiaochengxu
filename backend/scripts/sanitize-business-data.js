import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { collectionTables } from '../src/collection.js';
import { collectionFieldSchemas, sanitizeCollectionData } from '../src/schema.js';

dotenv.config();

const config = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'wyy13856370714',
  database: process.env.DB_NAME || 'guangda'
};

function parseData(data) {
  if (!data) return {};
  return typeof data === 'string' ? JSON.parse(data) : data;
}

async function main() {
  const conn = await mysql.createConnection(config);
  let totalChanged = 0;

  for (const collection of Object.keys(collectionFieldSchemas)) {
    const table = collectionTables[collection];
    if (!table) continue;

    const [rows] = await conn.execute(`SELECT id, data FROM \`${table}\``);
    let changed = 0;
    for (const row of rows) {
      const current = parseData(row.data);
      const sanitized = sanitizeCollectionData(collection, current);
      if (JSON.stringify(current) === JSON.stringify(sanitized)) continue;
      await conn.execute(
        `UPDATE \`${table}\` SET data = ? WHERE id = ?`,
        [JSON.stringify(sanitized), row.id]
      );
      changed += 1;
    }
    totalChanged += changed;
    console.log(`${collection}: scanned=${rows.length}, changed=${changed}`);
  }

  await conn.end();
  console.log(`业务表旧字段清理完成，更新记录数：${totalChanged}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
