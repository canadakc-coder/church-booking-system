import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { buildings, rooms } from './seed.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || join(__dirname, 'database.sqlite');

const db = new Database(dbPath);
try { db.pragma('journal_mode = WAL'); } catch (e) { /* fallback for some filesystems */ }

// Create tables
const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
db.exec(schema);

// Seed buildings
const insertBuilding = db.prepare(
  'INSERT OR REPLACE INTO buildings (id, name, name_en) VALUES (?, ?, ?)'
);
for (const b of buildings) {
  insertBuilding.run(b.id, b.name, b.name_en);
}

// Seed rooms
const insertRoom = db.prepare(
  'INSERT OR REPLACE INTO rooms (id, building_id, floor, name, name_en) VALUES (?, ?, ?, ?, ?)'
);
for (const r of rooms) {
  insertRoom.run(r.id, r.building_id, r.floor, r.name, r.name_en);
}

console.log('Database initialized with', buildings.length, 'buildings and', rooms.length, 'rooms.');
db.close();
