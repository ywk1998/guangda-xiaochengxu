import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { collectionTables } from '../src/collection.js';

dotenv.config();

const config = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'wyy13856370714',
  multipleStatements: true
};

const dbName = process.env.DB_NAME || 'guangda';
const adminUsername = process.env.ADMIN_USERNAME || 'admin';
const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456';

const seed = {
  banners: [
    { imageUrl: '/images/banner/4.jpg', title: '广东远大集团', link: '', sort: 1, status: 1 },
    { imageUrl: '/images/banner/5.jpg', title: '沥青混凝土生产施工一体化', link: '', sort: 2, status: 1 },
    { imageUrl: '/images/banner/6.jpg', title: '智慧化拌站与工程管理', link: '', sort: 3, status: 1 }
  ],
  stats: [
    { label: '成立年限', value: '10+', unit: '年', sort: 1, status: 1 },
    { label: '服务项目', value: '100+', unit: '个', sort: 2, status: 1 },
    { label: '专利技术', value: '100+', unit: '项', sort: 3, status: 1 },
    { label: '团队规模', value: '200+', unit: '人', sort: 4, status: 1 }
  ],
  products: [
    { name: '沥青混合料供应', category: 'material', icon: '', coverColor: '#1a6fc4', desc: '各规格沥青混合料生产供应', tags: ['AC级配', 'SMA', '稳定供应'], sort: 1, status: 1 },
    { name: '道路摊铺施工', category: 'paving', icon: '', coverColor: '#e67e22', desc: '市政道路、高速公路路面摊铺施工', tags: ['专业团队', '质量可控'], sort: 2, status: 1 },
    { name: '设备租赁', category: 'equipment', icon: '', coverColor: '#27ae60', desc: '摊铺机、压路机等路面施工设备租赁', tags: ['型号齐全', '灵活租期'], sort: 3, status: 1 },
    { name: '工程服务', category: 'service', icon: '', coverColor: '#c0392b', desc: '路面工程总包、养护和技术咨询服务', tags: ['一体化', '全流程'], sort: 4, status: 1 }
  ],
  mixing_station: [
    { name: '小金口拌站', stationName: '小金口拌站', address: '广东省惠州市惠城区小金口街道', latitude: 23.206944, longitude: 114.377222, capacity: '4000型', model: 'HRS-4000', tankSize: '4000kg', type: '沥青混合料', phone: '0752-8888888', status: 1, sort: 1, tags: ['24小时生产', '环保达标'] },
    { name: '龙门拌站', stationName: '龙门拌站', address: '广东省惠州市龙门县', latitude: 23.7285, longitude: 114.263, capacity: '3000型', model: 'LB-3000', tankSize: '3000kg', type: '改性沥青', phone: '0752-6666666', status: 1, sort: 2, tags: ['大型基地', '仓储充足'] }
  ],
  stations: [
    { name: '小金口拌站', stationName: '小金口拌站', sort: 1, status: 1 },
    { name: '龙门拌站', stationName: '龙门拌站', sort: 2, status: 1 }
  ],
  price_board: [
    { stationName: '小金口拌站', productName: 'AC-13', OldPrice: '420', NewPrice: '420', unit: '元/吨', status: 1 },
    { stationName: '小金口拌站', productName: 'AC-20', OldPrice: '405', NewPrice: '405', unit: '元/吨', status: 1 },
    { stationName: '龙门拌站', productName: 'SMA-13', OldPrice: '520', NewPrice: '520', unit: '元/吨', status: 1 }
  ],
  users: [
    { openid: 'local-admin', name: '管理员', role: 'admin', phone: '13800138000', status: 1 }
  ],
  form_registry: [
    { collectionName: 'construction_log', approvalRequired: true, sort: 1, status: 1 },
    { collectionName: 'output_record', approvalRequired: true, sort: 2, status: 1 },
    { collectionName: 'diesel_entry', approvalRequired: true, sort: 3, status: 1 },
    { collectionName: 'diesel_out', approvalRequired: true, sort: 4, status: 1 },
    { collectionName: 'diesel_delivery', approvalRequired: true, sort: 5, status: 1 },
    { collectionName: 'price_board', approvalRequired: false, sort: 6, status: 1 },
    { collectionName: 'TJform', approvalRequired: true, sort: 7, status: 1 },
    { collectionName: 'construction_log_summary', approvalRequired: true, sort: 8, status: 1 },
    { collectionName: 'equipment_maintenance', approvalRequired: true, sort: 9, status: 1 },
    { collectionName: 'mixing_tower_maintenance', approvalRequired: true, sort: 10, status: 1 }
  ]
};

function nowDoc(doc) {
  const now = new Date().toISOString();
  return { ...doc, createTime: doc.createTime || now, updateTime: now };
}

function createDocumentTableSql(table) {
  return `
    CREATE TABLE IF NOT EXISTS \`${table}\` (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      data JSON NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
}

async function main() {
  const conn = await mysql.createConnection(config);
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.query(`USE \`${dbName}\``);
  await conn.query(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(64) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(64) NOT NULL,
      status TINYINT NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  for (const table of Object.values(collectionTables)) {
    await conn.query(createDocumentTableSql(table));
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await conn.execute(
    `INSERT INTO admin_users (username, password_hash, name, status)
     VALUES (?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), name = VALUES(name), status = 1`,
    [adminUsername, passwordHash, '网页管理员']
  );

  const [legacyTables] = await conn.query("SHOW TABLES LIKE 'collection_documents'");
  if (legacyTables.length > 0) {
    for (const [collection, table] of Object.entries(collectionTables)) {
      const [legacyRows] = await conn.execute(
        'SELECT id, data, created_at, updated_at FROM collection_documents WHERE collection_name = ? ORDER BY id ASC',
        [collection]
      );
      for (const row of legacyRows) {
        await conn.execute(
          `INSERT IGNORE INTO \`${table}\` (id, data, created_at, updated_at) VALUES (?, ?, ?, ?)`,
          [row.id, JSON.stringify(row.data), row.created_at, row.updated_at]
        );
      }
    }
  }

  for (const [collection, docs] of Object.entries(seed)) {
    const table = collectionTables[collection];
    if (!table) continue;
    const [rows] = await conn.execute(`SELECT COUNT(*) AS total FROM \`${table}\``);
    if (Number(rows[0].total) > 0) continue;
    for (const doc of docs) {
      await conn.execute(
        `INSERT INTO \`${table}\` (data) VALUES (?)`,
        [JSON.stringify(nowDoc(doc))]
      );
    }
  }

  for (const doc of seed.form_registry) {
    await conn.execute(
      `UPDATE \`${collectionTables.form_registry}\`
       SET data = JSON_REMOVE(JSON_SET(data, '$.approvalRequired', ?, '$.sort', ?), '$.name')
       WHERE JSON_UNQUOTE(JSON_EXTRACT(data, '$.collectionName')) = ?`,
      [doc.approvalRequired, doc.sort, doc.collectionName]
    );
  }

  await conn.end();
  console.log(`数据库 ${dbName} 初始化完成`);
  console.log(`管理员账号：${adminUsername}`);
  console.log(`管理员密码：${adminPassword}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
