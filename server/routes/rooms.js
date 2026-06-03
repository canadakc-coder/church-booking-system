import { Router } from 'express';
import db from '../db/connection.js';

const router = Router();

// GET /api/buildings — 모든 건물 목록
router.get('/buildings', (req, res) => {
  const buildings = db.prepare('SELECT * FROM buildings').all();
  res.json(buildings);
});

// GET /api/rooms — 모든 장소 목록 (건물별 필터 가능)
router.get('/rooms', (req, res) => {
  const { building_id } = req.query;
  let rooms;
  if (building_id) {
    rooms = db.prepare('SELECT r.*, b.name as building_name FROM rooms r JOIN buildings b ON r.building_id = b.id WHERE r.building_id = ?').all(building_id);
  } else {
    rooms = db.prepare('SELECT r.*, b.name as building_name FROM rooms r JOIN buildings b ON r.building_id = b.id').all();
  }
  res.json(rooms);
});

export default router;
