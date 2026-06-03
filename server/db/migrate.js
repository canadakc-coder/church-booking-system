import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || join(__dirname, 'database.sqlite');

const db = new Database(dbPath);

// 기존 테이블에 새 컬럼 추가 (없으면 추가, 있으면 무시)
const migrations = [
  `ALTER TABLE reservations ADD COLUMN applicant_email TEXT DEFAULT ''`,
  `ALTER TABLE reservations ADD COLUMN rejection_reason TEXT DEFAULT NULL`,
  `ALTER TABLE reservations ADD COLUMN created_by TEXT DEFAULT 'user'`,
];

for (const sql of migrations) {
  try {
    db.exec(sql);
    console.log('Migration applied:', sql.substring(0, 60) + '...');
  } catch (e) {
    if (e.message.includes('duplicate column')) {
      console.log('Already exists, skipping:', sql.substring(0, 60) + '...');
    } else {
      console.error('Migration error:', e.message);
    }
  }
}

console.log('Migration complete.');
db.close();
