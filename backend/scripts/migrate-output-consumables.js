import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { collectionTables } from '../src/collection.js';

dotenv.config();

const config = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'wyy13856370714',
  database: process.env.DB_NAME || 'guangda'
};

async function main() {
  const conn = await mysql.createConnection(config);
  const table = collectionTables.output_record;

  await conn.query(`
    UPDATE \`${table}\`
    SET data = JSON_SET(
      data,
      '$.water', COALESCE(JSON_EXTRACT(data, '$.water'), CAST('""' AS JSON)),
      '$.electricity', COALESCE(JSON_EXTRACT(data, '$.electricity'), CAST('""' AS JSON)),
      '$.coal', COALESCE(JSON_EXTRACT(data, '$.coal'), CAST('""' AS JSON)),
      '$.naturalGas', COALESCE(JSON_EXTRACT(data, '$.naturalGas'), CAST('""' AS JSON)),
      '$.otherConsumables', COALESCE(JSON_EXTRACT(data, '$.otherConsumables'), CAST('""' AS JSON))
    )
    WHERE JSON_EXTRACT(data, '$.water') IS NULL
       OR JSON_EXTRACT(data, '$.electricity') IS NULL
       OR JSON_EXTRACT(data, '$.coal') IS NULL
       OR JSON_EXTRACT(data, '$.naturalGas') IS NULL
       OR JSON_EXTRACT(data, '$.otherConsumables') IS NULL
  `);

  await conn.end();
  console.log('拌站出料表耗材字段迁移完成');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
