import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection.js';
import { sendReservationNotification, sendApprovalNotification, sendRejectionNotification } from '../services/email.js';

const router = Router();

// ── 관리자 인증 미들웨어 ──
function requireAdmin(req, res, next) {
  const adminEmail = req.headers['x-admin-email'];
  const allowedAdmin = process.env.ADMIN_EMAIL || 'kmcreservation@gmail.com';
  if (!adminEmail || adminEmail !== allowedAdmin) {
    return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
  }
  next();
}

// GET /api/reservations — 예약 목록 조회
router.get('/', (req, res) => {
  const { start_date, end_date, room_id, building_id, status } = req.query;

  let query = `
    SELECT r.*, rm.name as room_name, rm.floor, rm.building_id, b.name as building_name
    FROM reservations r
    JOIN rooms rm ON r.room_id = rm.id
    JOIN buildings b ON rm.building_id = b.id
    WHERE 1=1
  `;
  const params = [];

  if (start_date) {
    query += ' AND r.date >= ?';
    params.push(start_date);
  }
  if (end_date) {
    query += ' AND r.date <= ?';
    params.push(end_date);
  }
  if (room_id) {
    query += ' AND r.room_id = ?';
    params.push(room_id);
  }
  if (building_id) {
    query += ' AND rm.building_id = ?';
    params.push(building_id);
  }
  if (status) {
    query += ' AND r.status = ?';
    params.push(status);
  }

  query += ' ORDER BY r.date, r.start_time';

  const reservations = db.prepare(query).all(...params);
  res.json(reservations);
});

// POST /api/reservations — 새 예약 신청 (여러 공간 동시 신청 지원)
router.post('/', (req, res) => {
  const {
    room_id, room_ids, applicant_name, department, date, start_time, end_time,
    purpose, contact, applicant_email, notes,
    recurrence_type, recurrence_days, recurrence_end_date,
    created_by
  } = req.body;

  // 공간 목록 정규화: room_ids(배열) 우선, 없으면 room_id(단일) 하위호환
  const roomIdList = Array.isArray(room_ids) && room_ids.length > 0
    ? [...new Set(room_ids.filter(Boolean))]
    : (room_id ? [room_id] : []);

  // Validation — 이메일 필수 (승인/거절 알림 발송용), 전화번호는 선택
  if (roomIdList.length === 0 || !applicant_name || !department || !date || !start_time || !end_time || !purpose) {
    return res.status(400).json({ error: '필수 항목을 모두 입력해주세요. (공간을 한 곳 이상 선택해야 합니다)' });
  }
  // 이메일은 일반 신청자만 필수 (승인/거절 알림 발송용). 관리자 직접 등록은 생략 가능.
  if (!applicant_email && created_by !== 'admin') {
    return res.status(400).json({ error: '이메일은 필수 입력 항목입니다. (승인/거절 알림을 받기 위해 필요)' });
  }

  // 선택한 공간이 모두 존재하는지 확인
  const rooms = roomIdList.map((rid) => db.prepare('SELECT * FROM rooms WHERE id = ?').get(rid));
  if (rooms.some((rm) => !rm)) {
    return res.status(400).json({ error: '존재하지 않는 장소가 포함되어 있습니다.' });
  }

  const isAdmin = created_by === 'admin';
  const dates = generateDates(date, recurrence_type, recurrence_days, recurrence_end_date);
  // 공간이 여러 개이거나 반복 일정이면 한 신청으로 묶어서 처리 (승인/거절/삭제 일괄)
  const isGrouped = roomIdList.length > 1 || (recurrence_type && recurrence_type !== 'none');
  const groupId = isGrouped ? uuidv4() : null;

  const insertStmt = db.prepare(`
    INSERT INTO reservations (id, room_id, applicant_name, department, date, start_time, end_time, purpose, contact, applicant_email, notes, recurrence_type, recurrence_days, recurrence_end_date, recurrence_group_id, approval_token, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const createdReservations = [];
  // 묶음 신청은 같은 승인 토큰을 공유 (이메일 링크 한 번으로 그룹 전체 승인/거절)
  const sharedToken = uuidv4();

  const insertMany = db.transaction(() => {
    for (const rid of roomIdList) {
      for (const d of dates) {
        const id = uuidv4();
        const token = groupId ? sharedToken : uuidv4();
        // 관리자가 만든 예약은 자동 승인
        const initialStatus = isAdmin ? 'approved' : 'pending';
        insertStmt.run(
          id, rid, applicant_name, department, d, start_time, end_time,
          purpose, contact || '', applicant_email || '', notes || '',
          recurrence_type || 'none', recurrence_days || null, recurrence_end_date || null,
          groupId, token, initialStatus, isAdmin ? 'admin' : 'user'
        );
        createdReservations.push({ id, room_id: rid, date: d, approval_token: token });
      }
    }
  });

  insertMany();

  // 일반 사용자 신청만 관리자에게 이메일 발송 (한 통에 모든 공간 표기)
  if (!isAdmin) {
    const firstReservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(createdReservations[0].id);
    const firstRoom = rooms[0];
    const firstBuilding = db.prepare('SELECT * FROM buildings WHERE id = ?').get(firstRoom.building_id);
    const places = getPlaceLabels(firstReservation);
    sendReservationNotification(firstReservation, firstRoom, firstBuilding, places).catch(console.error);
  }

  const placeCount = roomIdList.length;
  const message = isAdmin
    ? `${placeCount}개 공간 · 총 ${createdReservations.length}건이 등록되었습니다.`
    : `${placeCount}개 공간 · 총 ${createdReservations.length}건이 신청되었습니다.`;

  res.status(201).json({
    message,
    reservations: createdReservations,
    recurrence_group_id: groupId,
  });
});

// PUT /api/reservations/:id — 관리자 예약 수정
router.put('/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { update_group } = req.query;
  const existing = db.prepare('SELECT * FROM reservations WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: '예약을 찾을 수 없습니다.' });
  }

  const {
    room_id, applicant_name, department, date, start_time, end_time,
    purpose, contact, applicant_email, notes, status
  } = req.body;

  // 반복 일정 일괄 수정: 같은 그룹의 모든 예약을 업데이트
  // - date를 변경하면 시프트 양만큼 모든 일정의 date를 이동시킴 (요일/날짜 변경 가능)
  if (update_group === 'true' && existing.recurrence_group_id) {
    // 날짜 시프트 계산
    let dayShift = 0;
    if (date && date !== existing.date) {
      const oldD = new Date(existing.date + 'T00:00:00Z');
      const newD = new Date(date + 'T00:00:00Z');
      dayShift = Math.round((newD - oldD) / (24 * 60 * 60 * 1000));
    }

    const txn = db.transaction(() => {
      // 공통 필드 일괄 업데이트
      db.prepare(`
        UPDATE reservations SET
          room_id = ?, applicant_name = ?, department = ?, start_time = ?, end_time = ?,
          purpose = ?, contact = ?, applicant_email = ?, notes = ?, status = ?, updated_at = datetime('now')
        WHERE recurrence_group_id = ?
      `).run(
        room_id || existing.room_id,
        applicant_name || existing.applicant_name,
        department || existing.department,
        start_time || existing.start_time,
        end_time || existing.end_time,
        purpose || existing.purpose,
        contact || existing.contact,
        applicant_email !== undefined ? applicant_email : existing.applicant_email,
        notes !== undefined ? notes : existing.notes,
        status || existing.status,
        existing.recurrence_group_id
      );

      // 날짜 시프트가 있으면 각 일정의 date를 그만큼 이동
      if (dayShift !== 0) {
        const allInGroup = db.prepare('SELECT id, date FROM reservations WHERE recurrence_group_id = ?')
          .all(existing.recurrence_group_id);
        const updateDate = db.prepare('UPDATE reservations SET date = ? WHERE id = ?');
        for (const r of allInGroup) {
          const d = new Date(r.date + 'T00:00:00Z');
          d.setUTCDate(d.getUTCDate() + dayShift);
          const newDate = d.toISOString().split('T')[0];
          updateDate.run(newDate, r.id);
        }
      }
    });

    txn();

    const count = db.prepare('SELECT COUNT(*) as c FROM reservations WHERE recurrence_group_id = ?')
      .get(existing.recurrence_group_id).c;
    const shiftMsg = dayShift !== 0 ? ` (날짜 ${dayShift > 0 ? '+' : ''}${dayShift}일 이동)` : '';
    return res.json({ message: `반복 일정 ${count}개가 수정되었습니다${shiftMsg}.`, count });
  }

  // 단일 예약 수정
  db.prepare(`
    UPDATE reservations SET
      room_id = ?, applicant_name = ?, department = ?, date = ?, start_time = ?, end_time = ?,
      purpose = ?, contact = ?, applicant_email = ?, notes = ?, status = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    room_id || existing.room_id,
    applicant_name || existing.applicant_name,
    department || existing.department,
    date || existing.date,
    start_time || existing.start_time,
    end_time || existing.end_time,
    purpose || existing.purpose,
    contact || existing.contact,
    applicant_email !== undefined ? applicant_email : existing.applicant_email,
    notes !== undefined ? notes : existing.notes,
    status || existing.status,
    id
  );

  const updated = db.prepare(`
    SELECT r.*, rm.name as room_name, rm.floor, rm.building_id, b.name as building_name
    FROM reservations r
    JOIN rooms rm ON r.room_id = rm.id
    JOIN buildings b ON rm.building_id = b.id
    WHERE r.id = ?
  `).get(id);

  res.json(updated);
});

// DELETE /api/reservations/:id — 관리자 예약 삭제
router.delete('/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { delete_group } = req.query;

  const existing = db.prepare('SELECT * FROM reservations WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: '예약을 찾을 수 없습니다.' });
  }

  if (delete_group === 'true' && existing.recurrence_group_id) {
    const info = db.prepare('DELETE FROM reservations WHERE recurrence_group_id = ?').run(existing.recurrence_group_id);
    res.json({ message: `반복 일정 ${info.changes}개가 삭제되었습니다.` });
  } else {
    db.prepare('DELETE FROM reservations WHERE id = ?').run(id);
    res.json({ message: '예약이 삭제되었습니다.' });
  }
});

// POST /api/reservations/:id/approve — 관리자 페이지에서 승인
router.post('/:id/approve', requireAdmin, (req, res) => {
  const reservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(req.params.id);
  if (!reservation) {
    return res.status(404).json({ error: '예약을 찾을 수 없습니다.' });
  }

  if (reservation.recurrence_group_id) {
    db.prepare('UPDATE reservations SET status = ?, updated_at = datetime(\'now\') WHERE recurrence_group_id = ?')
      .run('approved', reservation.recurrence_group_id);
  } else {
    db.prepare('UPDATE reservations SET status = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run('approved', req.params.id);
  }

  // 신청자에게 승인 알림 이메일 발송 (그룹이면 모든 공간 표기)
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(reservation.room_id);
  const building = db.prepare('SELECT * FROM buildings WHERE id = ?').get(room.building_id);
  sendApprovalNotification(reservation, room, building, getPlaceLabels(reservation)).catch(console.error);

  res.json({ message: '승인되었습니다.' });
});

// POST /api/reservations/:id/reject — 관리자 페이지에서 거절
router.post('/:id/reject', requireAdmin, (req, res) => {
  const { reason } = req.body;
  const reservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(req.params.id);
  if (!reservation) {
    return res.status(404).json({ error: '예약을 찾을 수 없습니다.' });
  }

  if (reservation.recurrence_group_id) {
    db.prepare('UPDATE reservations SET status = ?, rejection_reason = ?, updated_at = datetime(\'now\') WHERE recurrence_group_id = ?')
      .run('rejected', reason || '', reservation.recurrence_group_id);
  } else {
    db.prepare('UPDATE reservations SET status = ?, rejection_reason = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run('rejected', reason || '', req.params.id);
  }

  // 신청자에게 거절 알림 이메일 발송 (그룹이면 모든 공간 표기)
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(reservation.room_id);
  const building = db.prepare('SELECT * FROM buildings WHERE id = ?').get(room.building_id);
  sendRejectionNotification(reservation, room, building, reason, getPlaceLabels(reservation)).catch(console.error);

  res.json({ message: '거절되었습니다.' });
});

// GET /api/reservations/:id/approve — 이메일 링크에서 승인 처리
router.get('/:id/approve', (req, res) => {
  const { token } = req.query;
  const reservation = db.prepare('SELECT * FROM reservations WHERE id = ? AND approval_token = ?').get(req.params.id, token);

  if (!reservation) {
    return res.status(404).send(renderResultPage('오류', '유효하지 않은 요청입니다.', 'error'));
  }

  if (reservation.recurrence_group_id) {
    db.prepare('UPDATE reservations SET status = ?, updated_at = datetime(\'now\') WHERE recurrence_group_id = ?')
      .run('approved', reservation.recurrence_group_id);
  } else {
    db.prepare('UPDATE reservations SET status = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run('approved', req.params.id);
  }

  // 신청자에게 승인 알림 이메일 발송 (그룹이면 모든 공간 표기)
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(reservation.room_id);
  const building = db.prepare('SELECT * FROM buildings WHERE id = ?').get(room.building_id);
  sendApprovalNotification(reservation, room, building, getPlaceLabels(reservation)).catch(console.error);

  res.send(renderResultPage('승인 완료', `${reservation.applicant_name}님의 공간 신청이 승인되었습니다.`, 'success'));
});

// GET /api/reservations/:id/reject — 이메일 링크에서 거절 처리 (사유 입력 폼 표시)
router.get('/:id/reject', (req, res) => {
  const { token, reason } = req.query;
  const reservation = db.prepare('SELECT * FROM reservations WHERE id = ? AND approval_token = ?').get(req.params.id, token);

  if (!reservation) {
    return res.status(404).send(renderResultPage('오류', '유효하지 않은 요청입니다.', 'error'));
  }

  // reason 파라미터가 없으면 거절 사유 입력 폼을 표시
  if (!reason && reason !== '') {
    return res.send(renderRejectForm(req.params.id, token, reservation));
  }

  if (reservation.recurrence_group_id) {
    db.prepare('UPDATE reservations SET status = ?, rejection_reason = ?, updated_at = datetime(\'now\') WHERE recurrence_group_id = ?')
      .run('rejected', reason || '', reservation.recurrence_group_id);
  } else {
    db.prepare('UPDATE reservations SET status = ?, rejection_reason = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run('rejected', reason || '', req.params.id);
  }

  // 신청자에게 거절 알림 이메일 발송 (그룹이면 모든 공간 표기)
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(reservation.room_id);
  const building = db.prepare('SELECT * FROM buildings WHERE id = ?').get(room.building_id);
  sendRejectionNotification(reservation, room, building, reason, getPlaceLabels(reservation)).catch(console.error);

  res.send(renderResultPage('거절 완료', `${reservation.applicant_name}님의 공간 신청이 거절되었습니다.`, 'rejected'));
});

// Helper: 한 신청(그룹 또는 단일)에 포함된 공간 라벨 목록 ("건물 층 - 공간")
// - 그룹이면 그룹 내 모든 공간(중복 제거), 단일이면 그 공간 하나
function getPlaceLabels(reservation) {
  let rows;
  if (reservation.recurrence_group_id) {
    rows = db.prepare(`
      SELECT DISTINCT rm.id, rm.name, rm.floor, b.name AS building_name
      FROM reservations r
      JOIN rooms rm ON r.room_id = rm.id
      JOIN buildings b ON rm.building_id = b.id
      WHERE r.recurrence_group_id = ?
      ORDER BY b.name, rm.floor, rm.name
    `).all(reservation.recurrence_group_id);
  } else {
    rows = db.prepare(`
      SELECT rm.id, rm.name, rm.floor, b.name AS building_name
      FROM rooms rm JOIN buildings b ON rm.building_id = b.id
      WHERE rm.id = ?
    `).all(reservation.room_id);
  }
  return rows.map((x) => `${x.building_name} ${x.floor || ''} - ${x.name}`.replace(/\s+/g, ' ').trim());
}

// Helper: 반복 날짜 생성 (기본 1년으로 확장)
function generateDates(startDate, recurrenceType, recurrenceDays, endDate) {
  if (!recurrenceType || recurrenceType === 'none') {
    return [startDate];
  }

  const dates = [];
  const start = new Date(startDate);
  // 종료일 미지정 시 1년(365일)로 확장
  const end = endDate ? new Date(endDate) : new Date(start.getTime() + 365 * 24 * 60 * 60 * 1000);

  if (recurrenceType === 'weekly') {
    let current = new Date(start);
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 7);
    }
  } else if (recurrenceType === 'monthly') {
    let current = new Date(start);
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setMonth(current.getMonth() + 1);
    }
  }

  return dates;
}

// Helper: 거절 사유 입력 폼 HTML
function renderRejectForm(id, token, reservation) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
  return `
    <!DOCTYPE html>
    <html lang="ko">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>거절 사유 입력</title></head>
    <body style="font-family: 'Apple SD Gothic Neo', sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f7fafc;">
      <div style="text-align: center; padding: 40px; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 460px; width: 90%;">
        <div style="width: 60px; height: 60px; border-radius: 50%; background: #e53e3e; color: white; font-size: 28px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">✗</div>
        <h2 style="color: #e53e3e; margin-bottom: 8px;">공간 신청 거절</h2>
        <p style="color: #4a5568; margin-bottom: 20px;">${reservation.applicant_name}님의 신청을 거절합니다.</p>
        <form method="GET" action="${baseUrl}/api/reservations/${id}/reject">
          <input type="hidden" name="token" value="${token}" />
          <div style="text-align: left; margin-bottom: 16px;">
            <label style="display: block; font-size: 0.9rem; font-weight: 600; margin-bottom: 6px; color: #4a5568;">거절 사유</label>
            <textarea name="reason" rows="4" placeholder="거절 사유를 입력해주세요" style="width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 0.9rem; resize: vertical; font-family: inherit; box-sizing: border-box;"></textarea>
          </div>
          <button type="submit" style="width: 100%; padding: 12px; background: #e53e3e; color: white; border: none; border-radius: 6px; font-size: 1rem; font-weight: bold; cursor: pointer;">거절 확인</button>
        </form>
      </div>
    </body>
    </html>
  `;
}

// Helper: 승인/거절 결과 페이지 HTML
function renderResultPage(title, message, type) {
  const color = type === 'success' ? '#38a169' : type === 'rejected' ? '#e53e3e' : '#718096';
  const icon = type === 'success' ? '✓' : type === 'rejected' ? '✗' : '!';
  return `
    <!DOCTYPE html>
    <html lang="ko">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
    <body style="font-family: 'Apple SD Gothic Neo', sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f7fafc;">
      <div style="text-align: center; padding: 40px; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="width: 60px; height: 60px; border-radius: 50%; background: ${color}; color: white; font-size: 28px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">${icon}</div>
        <h1 style="color: ${color}; margin-bottom: 10px;">${title}</h1>
        <p style="color: #4a5568;">${message}</p>
        <p style="color: #a0aec0; font-size: 14px; margin-top: 20px;">이 창을 닫으셔도 됩니다.</p>
      </div>
    </body>
    </html>
  `;
}

export default router;
