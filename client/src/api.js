const API_BASE = '/api';

export async function fetchBuildings() {
  const res = await fetch(`${API_BASE}/buildings`);
  return res.json();
}

export async function fetchRooms(buildingId) {
  const params = buildingId ? `?building_id=${buildingId}` : '';
  const res = await fetch(`${API_BASE}/rooms${params}`);
  return res.json();
}

export async function fetchReservations({ startDate, endDate, roomId, buildingId, status }) {
  const params = new URLSearchParams();
  if (startDate) params.set('start_date', startDate);
  if (endDate) params.set('end_date', endDate);
  if (roomId) params.set('room_id', roomId);
  if (buildingId) params.set('building_id', buildingId);
  if (status) params.set('status', status);

  const res = await fetch(`${API_BASE}/reservations?${params}`);
  return res.json();
}

export async function createReservation(data) {
  const res = await fetch(`${API_BASE}/reservations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || '신청에 실패했습니다.');
  }
  return res.json();
}

// ── 관리자 API ──

export async function updateReservation(id, data, adminEmail, updateGroup = false) {
  const params = updateGroup ? '?update_group=true' : '';
  const res = await fetch(`${API_BASE}/reservations/${id}${params}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Email': adminEmail,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || '수정에 실패했습니다.');
  }
  return res.json();
}

export async function deleteReservation(id, adminEmail, deleteGroup = false) {
  const params = deleteGroup ? '?delete_group=true' : '';
  const res = await fetch(`${API_BASE}/reservations/${id}${params}`, {
    method: 'DELETE',
    headers: { 'X-Admin-Email': adminEmail },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || '삭제에 실패했습니다.');
  }
  return res.json();
}

export async function approveReservation(id, adminEmail) {
  const res = await fetch(`${API_BASE}/reservations/${id}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Email': adminEmail,
    },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || '승인에 실패했습니다.');
  }
  return res.json();
}

export async function rejectReservation(id, reason, adminEmail) {
  const res = await fetch(`${API_BASE}/reservations/${id}/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Email': adminEmail,
    },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || '거절에 실패했습니다.');
  }
  return res.json();
}

// ── Google 인증 ──

export async function fetchAuthConfig() {
  const res = await fetch(`${API_BASE}/auth/config`);
  return res.json();
}

export async function verifyGoogleToken(credential) {
  const res = await fetch(`${API_BASE}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || '인증에 실패했습니다.');
  }
  return res.json();
}
