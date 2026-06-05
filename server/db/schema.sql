-- 건물 테이블
CREATE TABLE IF NOT EXISTS buildings (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT NOT NULL
);

-- 장소 테이블
CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  building_id TEXT NOT NULL,
  floor TEXT,
  name TEXT NOT NULL,
  name_en TEXT,
  FOREIGN KEY (building_id) REFERENCES buildings(id)
);

-- 예약 테이블
CREATE TABLE IF NOT EXISTS reservations (
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
  created_by TEXT DEFAULT 'user' CHECK(created_by IN ('user', 'admin')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (room_id) REFERENCES rooms(id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(date);
CREATE INDEX IF NOT EXISTS idx_reservations_room ON reservations(room_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_token ON reservations(approval_token);
CREATE INDEX IF NOT EXISTS idx_reservations_group ON reservations(recurrence_group_id);
