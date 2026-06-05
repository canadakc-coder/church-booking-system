import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { copyFileSync, existsSync } from 'fs';

// recurrence_type CHECK 제약에 'daily'를 추가하는 마이그레이션.
// SQLite는 컬럼 CHECK를 직접 수정할 수 없어 테이블을 재생성한다.
// - 멱등: 이미 'daily'가 허용되면 아무것도 안 함
// - 데이터는 컬럼명 기준으로 복사(컬럼 순서 차이에 안전)
// - 실행 전 database.sqlite.bak-daily 백업 생성

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || join(__dirname, 'database.sqlite');

const db = new Database(dbPath);

const cur = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='reservations'").get();
if (!cur) {
  console.log('reservations 테이블이 없습니다 — 마이그레이션 스킵 (init.js를 먼저 실행하세요).');
  db.close();
  process.exit(0);
}
if (cur.sql.includes("'daily'")) {
  console.log("이미 'daily'가 허용되어 있습니다 — 스킵.");
  db.close();
  process.exit(0);
}

// 백업
const backup = dbPath + '.bak-daily';
if (!existsSync(backup)) {
  copyFileSync(dbPath, backup);
  console.log('백업 생성:', backup);
}

// 복사할 컬럼(현재 테이블에 실제 존재하는 컬럼만, 순서 무관)
const existingCols = db.prepare('PRAGMA table_info(reservations)').all().map((c) => c.name);
const colList = existingCols.join(', ');

const before = db.prepare('SELECT COUNT(*) c FROM reservations').get().c;

db.pragma('foreign_keys = OFF');
const migrate = db.transaction(() => {
  db.exec('ALTER TABLE reservations RENAME TO reservations_old');
  db.exec(`
    CREATE TABLE reservations (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      applicant_name TEXT NOT NULL,
      department TEXT NOT NULL,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      purpose TEXT NOT NULL,
      contact TEXT NOT NULL,
      applicant_email TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
      rejection_reason TEXT DEFAULT NULL,
      recurrence_type TEXT DEFAULT 'none' CHECK(recurrence_type IN ('none', 'daily', 'weekly', 'monthly')),
      recurrence_days TEXT DEFAULT NULL,
      recurrence_end_date TEXT DEFAULT NULL,
      recurrence_group_id TEXT DEFAULT NULL,
      approval_token TEXT,
      created_by TEXT DEFAULT 'user',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (room_id) REFERENCES rooms(id)
    )
  `);
  db.exec(`INSERT INTO reservations (${colList}) SELECT ${colList} FROM reservations_old`);
  db.exec('DROP TABLE reservations_old');
  // 인덱스 재생성
  db.exec('CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(date)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_reservations_room ON reservations(room_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_reservations_token ON reservations(approval_token)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_reservations_group ON reservations(recurrence_group_id)');
});
migrate();
db.pragma('foreign_keys = ON');

const after = db.prepare('SELECT COUNT(*) c FROM reservations').get().c;
const fkErrors = db.pragma('foreign_key_check');
console.log(`마이그레이션 완료: 행 ${before} → ${after}, FK 오류 ${Array.isArray(fkErrors) ? fkErrors.length : 0}건`);
if (before !== after) {
  console.error('⚠️ 행 수가 달라졌습니다! 백업으로 복구를 검토하세요:', backup);
  process.exit(1);
}
console.log("이제 recurrence_type에 'daily'를 넣을 수 있습니다.");
db.close();
