import React, { useState, useMemo } from 'react';
import { createReservation } from '../api';

export default function ReservationForm({ buildings, rooms, onClose, onSuccess, isAdmin, adminEmail, editData, duplicateData, prefillData }) {
  const isEdit = !!editData;
  const isDuplicate = !!duplicateData;
  const isPrefill = !!prefillData;
  const isRecurringEdit = isEdit && !!editData.recurrence_group_id;
  // 묶음의 성격: 반복 일정인지(날짜 여러 개) 아니면 여러 공간 묶음인지
  const isRecurringType = isEdit && editData?.recurrence_type && editData.recurrence_type !== 'none';
  const source = editData || duplicateData || prefillData;

  // 날짜:
  // - 수정/prefill(드래그): source.date 그대로
  // - 복제: 오늘 (사용자가 새 날짜 선택해야 함)
  const initialDate = (isDuplicate && !isPrefill)
    ? new Date().toISOString().split('T')[0]
    : (source?.date || new Date().toISOString().split('T')[0]);

  // 초기 floor: source에 floor 있으면 사용, 없으면 source.room_id로부터 rooms에서 찾기
  const initialRoom = source?.room_id ? rooms.find((r) => r.id === source.room_id) : null;
  const initialFloor = source?.floor || initialRoom?.floor || '';

  // 수정 모드는 기존 한 건을 고치는 것이라 단일 공간, 그 외(신규/복제/prefill)는 여러 공간 선택 가능
  const isMultiRoom = !isEdit;

  const [form, setForm] = useState({
    // 관리자가 새로 등록할 때는 신청자 이름을 "관리자"로 기본 입력 (수정/복제는 원본 유지)
    applicant_name: source?.applicant_name || (isAdmin && !isEdit ? '관리자' : ''),
    department: source?.department || '',
    building_id: source?.building_id || '',
    floor: initialFloor,
    // 여러 공간 선택 지원: room_ids 배열로 관리 (단일이면 원소 1개)
    room_ids: source?.room_id ? [source.room_id] : [],
    date: initialDate,
    start_time: source?.start_time || '08:00',
    end_time: source?.end_time || '10:00',
    purpose: source?.purpose || '',
    contact: source?.contact || '',
    applicant_email: source?.applicant_email || '',
    notes: source?.notes || '',
    // 복제/prefill은 새 신청이므로 반복 없음으로 시작
    recurrence_type: (isDuplicate || isPrefill) ? 'none' : (source?.recurrence_type || 'none'),
    recurrence_days: (isDuplicate || isPrefill) ? '' : (source?.recurrence_days || ''),
    recurrence_end_date: (isDuplicate || isPrefill) ? '' : (source?.recurrence_end_date || ''),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // 반복 일정 일괄 수정 여부 (기본: false = 이 일정만 수정)
  const [updateGroup, setUpdateGroup] = useState(false);

  // 건물 → 층 목록
  const floorsForBuilding = useMemo(() => {
    if (!form.building_id) return [];
    const buildingRooms = rooms.filter((r) => r.building_id === form.building_id);
    const set = new Set(buildingRooms.map((r) => r.floor || ''));
    return Array.from(set).sort();
  }, [form.building_id, rooms]);

  // 층이 의미있는 건물인가? (빈 값만 있으면 다니엘홀 같은 케이스)
  const buildingHasFloors = floorsForBuilding.some((f) => f);

  // 건물 + 층 → 공간 목록
  const filteredRooms = useMemo(() => {
    if (!form.building_id) return [];
    return rooms.filter((r) => {
      if (r.building_id !== form.building_id) return false;
      if (!buildingHasFloors) return true;
      return (r.floor || '') === form.floor;
    });
  }, [form.building_id, form.floor, rooms, buildingHasFloors]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const updated = { ...prev, [name]: value };
      // 건물/층은 "어떤 공간 목록을 보여줄지" 거르는 필터일 뿐 — 이미 선택한 공간(room_ids)은 유지
      if (name === 'building_id') {
        updated.floor = '';
      }
      return updated;
    });
  };

  // 공간 체크박스 토글: 신규/복제는 누적 선택, 수정 모드는 단일(교체)
  const toggleRoom = (roomId) => {
    setForm((prev) => {
      if (!isMultiRoom) return { ...prev, room_ids: [roomId] };
      const has = prev.room_ids.includes(roomId);
      return {
        ...prev,
        room_ids: has ? prev.room_ids.filter((id) => id !== roomId) : [...prev.room_ids, roomId],
      };
    });
  };

  const removeRoom = (roomId) => {
    setForm((prev) => ({ ...prev, room_ids: prev.room_ids.filter((id) => id !== roomId) }));
  };

  // room_id → "건물 층 공간" 라벨 (선택 칩 표시용)
  const roomLabel = (roomId) => {
    const rm = rooms.find((r) => r.id === roomId);
    if (!rm) return roomId;
    const b = buildings.find((bd) => bd.id === rm.building_id);
    return [b?.name, rm.floor, rm.name].filter(Boolean).join(' ');
  };

  // 시간/분 변경 핸들러
  const updateTimePart = (field, part, value) => {
    setForm((prev) => {
      const [h, m] = (prev[field] || '08:00').split(':');
      const newTime = part === 'hour' ? `${value}:${m}` : `${h}:${value}`;
      return { ...prev, [field]: newTime };
    });
  };

  const startHour = (form.start_time || '08:00').split(':')[0];
  const startMinute = (form.start_time || '08:00').split(':')[1];
  const endHour = (form.end_time || '09:00').split(':')[0];
  const endMinute = (form.end_time || '09:00').split(':')[1];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.room_ids || form.room_ids.length === 0) {
      setError('공간을 한 곳 이상 선택해주세요.');
      return;
    }

    setLoading(true);

    try {
      if (isEdit) {
        // 관리자 수정 — 단일 건이므로 첫 공간만 반영
        const { updateReservation } = await import('../api.js');
        const payload = { ...form, room_id: form.room_ids[0] };
        const result = await updateReservation(editData.id, payload, adminEmail, updateGroup);
        onSuccess(result.message || '예약이 수정되었습니다.');
      } else {
        // 신규/복제/prefill — 여러 공간을 한 신청으로 전송
        const payload = { ...form, room_ids: form.room_ids };
        if (isAdmin) {
          payload.created_by = 'admin';
        }
        const result = await createReservation(payload);
        onSuccess(result.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 시 옵션: 07 ~ 23 (오전 7시 ~ 오후 11시)
  const hourOptions = Array.from({ length: 17 }, (_, i) => String(i + 7).padStart(2, '0'));
  // 분 옵션: 00, 05, 10, ..., 55 (5분 단위)
  const minuteOptions = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            {isEdit ? '일정 수정'
              : isDuplicate ? '일정 복제 (날짜만 바꿔서 새로 신청)'
              : isPrefill ? '공간 신청서 (선택한 시간)'
              : isAdmin ? '일정 등록 (관리자)'
              : '공간 신청서'}
          </h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div style={{ padding: '10px', background: '#fed7d7', color: '#9b2c2c', borderRadius: '6px', marginBottom: '16px', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            {isRecurringEdit && (
              <div style={{ padding: '12px', background: '#ebf8ff', border: '1px solid #90cdf4', borderRadius: '6px', marginBottom: '16px', fontSize: '0.85rem' }}>
                <p style={{ margin: '0 0 8px', fontWeight: '600', color: '#2c5282' }}>
                  {isRecurringType ? '🔁 반복 일정입니다' : '🧩 여러 공간 묶음 신청입니다'}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 'normal' }}>
                    <input type="radio" checked={!updateGroup} onChange={() => setUpdateGroup(false)} />
                    <span>이 일정만 수정</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 'normal' }}>
                    <input type="radio" checked={updateGroup} onChange={() => setUpdateGroup(true)} />
                    <span>{isRecurringType ? '반복 일정 전체 수정 (날짜는 각 일정 그대로 유지)' : '묶음 전체 수정 (선택한 모든 공간에 동일 적용)'}</span>
                  </label>
                </div>
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label>신청자 이름 <span className="required">*</span></label>
                <input type="text" name="applicant_name" value={form.applicant_name} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>소속 부서/단체 <span className="required">*</span></label>
                <input type="text" name="department" value={form.department} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-row-3">
              <div className="form-group">
                <label>건물 <span className="required">*</span></label>
                <select name="building_id" value={form.building_id} onChange={handleChange} required>
                  <option value="">선택</option>
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>층 {buildingHasFloors && <span className="required">*</span>}</label>
                <select
                  name="floor"
                  value={form.floor}
                  onChange={handleChange}
                  required={buildingHasFloors}
                  disabled={!form.building_id || !buildingHasFloors}
                >
                  {buildingHasFloors ? (
                    <>
                      <option value="">선택</option>
                      {floorsForBuilding.filter((f) => f).map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </>
                  ) : (
                    <option value="">{form.building_id ? '없음' : '-'}</option>
                  )}
                </select>
              </div>
              <div className="form-group">
                <label>
                  공간 <span className="required">*</span>
                  {isMultiRoom && <span className="room-multi-hint"> (여러 곳 선택 가능)</span>}
                </label>
                {(!form.building_id || (buildingHasFloors && !form.floor)) ? (
                  <div className="room-picker-empty">
                    {form.building_id ? '층을 선택하세요' : '건물을 선택하세요'}
                  </div>
                ) : (
                  <div className="room-checkbox-list">
                    {filteredRooms.map((r) => {
                      const checked = form.room_ids.includes(r.id);
                      return (
                        <label key={r.id} className={`room-checkbox ${checked ? 'checked' : ''}`}>
                          <input
                            type={isMultiRoom ? 'checkbox' : 'radio'}
                            checked={checked}
                            onChange={() => toggleRoom(r.id)}
                          />
                          <span>{r.name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* 선택한 공간 칩 (건물/층을 넘나들며 고른 것 모두 표시) */}
            {form.room_ids.length > 0 && (
              <div className="form-group selected-rooms">
                <label>선택한 공간 <span className="selected-rooms-count">{form.room_ids.length}곳</span></label>
                <div className="room-chips">
                  {form.room_ids.map((id) => (
                    <span key={id} className="room-chip">
                      {roomLabel(id)}
                      <button type="button" className="room-chip-remove" onClick={() => removeRoom(id)} aria-label="제거">&times;</button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="form-group">
              <label>날짜 <span className="required">*</span></label>
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
                required
              />
              {updateGroup && (
                <small style={{ color: '#3182ce', fontSize: '0.75rem' }}>
                  💡 날짜를 바꾸면 차이만큼 모든 반복 일정이 같이 이동합니다 (예: 월→화 변경 시 모든 일정 +1일)
                </small>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>시작 시간 <span className="required">*</span></label>
                <div className="time-picker">
                  <select
                    value={startHour}
                    onChange={(e) => updateTimePart('start_time', 'hour', e.target.value)}
                    required
                  >
                    {hourOptions.map((h) => (
                      <option key={h} value={h}>{h}시</option>
                    ))}
                  </select>
                  <select
                    value={startMinute}
                    onChange={(e) => updateTimePart('start_time', 'minute', e.target.value)}
                    required
                  >
                    {minuteOptions.map((m) => (
                      <option key={m} value={m}>{m}분</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>종료 시간 <span className="required">*</span></label>
                <div className="time-picker">
                  <select
                    value={endHour}
                    onChange={(e) => updateTimePart('end_time', 'hour', e.target.value)}
                    required
                  >
                    {hourOptions.map((h) => (
                      <option key={h} value={h}>{h}시</option>
                    ))}
                  </select>
                  <select
                    value={endMinute}
                    onChange={(e) => updateTimePart('end_time', 'minute', e.target.value)}
                    required
                  >
                    {minuteOptions.map((m) => (
                      <option key={m} value={m}>{m}분</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>용도 <span className="required">*</span></label>
              <input type="text" name="purpose" value={form.purpose} onChange={handleChange} placeholder="예: 찬양팀 연습, 성경공부 등" required />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>이메일 {!isAdmin && <span className="required">*</span>}</label>
                <input type="email" name="applicant_email" value={form.applicant_email} onChange={handleChange} placeholder="example@email.com" required={!isAdmin} />
                <small style={{ color: '#718096', fontSize: '0.75rem' }}>
                  {isAdmin ? '관리자 등록은 이메일 없이도 됩니다 (입력 시 승인/거절 알림 발송)' : '승인/거절 알림이 이 이메일로 발송됩니다'}
                </small>
              </div>
              <div className="form-group">
                <label>전화번호</label>
                <input type="tel" name="contact" value={form.contact} onChange={handleChange} placeholder="010-0000-0000 (선택)" />
              </div>
            </div>

            {isDuplicate && (
              <div style={{ padding: '12px', background: '#faf5ff', border: '1px solid #d6bcfa', borderRadius: '6px', marginBottom: '16px', fontSize: '0.85rem', color: '#553c9a' }}>
                📋 기존 일정의 내용을 복사해 왔어요. <strong>날짜만 새로 정해서 신청</strong>하시면 됩니다.
              </div>
            )}

            {isPrefill && (
              <div style={{ padding: '12px', background: '#ebf8ff', border: '1px solid #90cdf4', borderRadius: '6px', marginBottom: '16px', fontSize: '0.85rem', color: '#2c5282' }}>
                🕒 선택하신 시간 ({form.date} {form.start_time} ~ {form.end_time})으로 미리 채워졌어요. 나머지 항목을 입력해 신청해주세요.
              </div>
            )}

            {!isEdit && (
              <div className="form-group">
                <label>반복 설정</label>
                <div className="recurrence-pills">
                  {[
                    { value: 'none', label: '반복 없음' },
                    { value: 'weekly', label: '매주 반복' },
                    { value: 'monthly', label: '매월 반복' },
                  ].map((opt) => (
                    <button
                      type="button"
                      key={opt.value}
                      className={`pill ${form.recurrence_type === opt.value ? 'pill-active' : ''}`}
                      onClick={() => setForm((p) => ({ ...p, recurrence_type: opt.value }))}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {form.recurrence_type !== 'none' && (
                  <div style={{ marginTop: '10px' }}>
                    <label style={{ fontSize: '0.8rem', color: '#4a5568' }}>반복 종료일 (미입력 시 1년)</label>
                    <input type="date" name="recurrence_end_date" value={form.recurrence_end_date} onChange={handleChange} style={{ marginTop: '4px' }} />
                  </div>
                )}
              </div>
            )}

            <div className="form-group">
              <label>비고</label>
              <textarea name="notes" value={form.notes} onChange={handleChange} placeholder="추가 요청사항이 있으면 입력하세요" />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>취소</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '처리 중...' : isEdit ? '수정하기' : isAdmin ? '등록하기' : '신청하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
