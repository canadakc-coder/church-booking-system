import React, { useEffect, useState, useMemo, useRef } from 'react';
import { fetchReservations } from '../api';

const BUILDING_COLORS = {
  wesley: { bg: '#3182ce', border: '#2c5282' },
  vision: { bg: '#dd6b20', border: '#c05621' },
  daniel: { bg: '#38a169', border: '#2f855a' },
};

const BUILDING_ORDER = { wesley: 1, vision: 2, daniel: 3 };

const BASE_SLOT_HEIGHT = 40; // px per 30분 슬롯 (zoom=1)
const HEADER_HEIGHT = 56;
const TIME_COL_WIDTH = 60;
const ZOOM_MIN = 0.4;
const ZOOM_MAX = 2.0;
const ZOOM_STEP = 0.2;

export default function DailyRoomView({ rooms, onEventClick, onSelectTime, isAdmin, refreshKey, initialDate, selectedBuilding, selectedFloor, selectedRoom }) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(initialDate || today);

  // 셀 크기 줌 (사용자가 한 화면에 더 많이/적게 볼 수 있도록)
  const [zoom, setZoom] = useState(1.0);
  const SLOT_HEIGHT = BASE_SLOT_HEIGHT * zoom;
  const zoomIn = () => setZoom((z) => Math.min(ZOOM_MAX, Math.round((z + ZOOM_STEP) * 10) / 10));
  const zoomOut = () => setZoom((z) => Math.max(ZOOM_MIN, Math.round((z - ZOOM_STEP) * 10) / 10));
  const zoomReset = () => setZoom(1.0);

  // 부모가 initialDate를 변경하면 동기화
  useEffect(() => {
    if (initialDate) setDate(initialDate);
  }, [initialDate]);

  // 가로 드래그 스크롤
  const scrollRef = useRef(null);
  const dragScrollRef = useRef({ active: false, startX: 0, startScrollLeft: 0 });

  const handleHeaderMouseDown = (e) => {
    if (!scrollRef.current) return;
    dragScrollRef.current = {
      active: true,
      startX: e.pageX,
      startScrollLeft: scrollRef.current.scrollLeft,
    };
    scrollRef.current.style.cursor = 'grabbing';
    e.preventDefault();
  };

  useEffect(() => {
    const handleMove = (e) => {
      if (!dragScrollRef.current.active || !scrollRef.current) return;
      const dx = e.pageX - dragScrollRef.current.startX;
      scrollRef.current.scrollLeft = dragScrollRef.current.startScrollLeft - dx;
    };
    const handleUp = () => {
      if (!dragScrollRef.current.active) return;
      dragScrollRef.current.active = false;
      if (scrollRef.current) scrollRef.current.style.cursor = '';
    };
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
  }, []);

  // 핀치 제스처로 셀 줌 (모바일)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let initialDistance = null;
    let initialZoom = zoom;

    const getDistance = (touches) => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const onTouchStart = (e) => {
      if (e.touches.length === 2) {
        initialDistance = getDistance(e.touches);
        initialZoom = zoom;
      }
    };
    // 핀치 민감도: 손가락 움직임에 대한 줌 변화 배수
    // 4.0 = 매우 민감 (손가락 조금만 움직여도 줌 크게 변함)
    const PINCH_SENSITIVITY = 4.0;
    const onTouchMove = (e) => {
      if (e.touches.length === 2 && initialDistance) {
        e.preventDefault();
        const newDistance = getDistance(e.touches);
        const ratio = newDistance / initialDistance;
        // 지수를 적용해서 손가락 움직임을 증폭
        const adjustedRatio = Math.pow(ratio, PINCH_SENSITIVITY);
        const newZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, initialZoom * adjustedRatio));
        // 1% 단위로 부드럽게
        setZoom(Math.round(newZoom * 100) / 100);
      }
    };
    const onTouchEnd = () => {
      initialDistance = null;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [zoom]);

  // 드래그 선택 상태
  const [dragState, setDragState] = useState(null); // { roomId, startSlot, endSlot }

  // 슬롯 인덱스 → "HH:MM"
  const slotIndexToTime = (idx) => {
    const totalMinutes = 8 * 60 + idx * 30;
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const handleSlotMouseDown = (room, slotIdx, e) => {
    // 멀티터치(핀치 줌)는 드래그를 시작하지 않음 → 브라우저 기본 핀치 동작 허용
    if (e.touches && e.touches.length > 1) return;
    // 우클릭은 무시
    if (e.button && e.button !== 0) return;
    e.preventDefault();
    setDragState({ roomId: room.id, room, startSlot: slotIdx, endSlot: slotIdx });
  };

  const handleSlotMouseEnter = (room, slotIdx) => {
    setDragState((prev) => {
      if (!prev || prev.roomId !== room.id) return prev;
      return { ...prev, endSlot: slotIdx };
    });
  };

  // 마우스 업 시 처리
  useEffect(() => {
    const handleMouseUp = () => {
      if (!dragState) return;
      const startIdx = Math.min(dragState.startSlot, dragState.endSlot);
      const endIdxExclusive = Math.max(dragState.startSlot, dragState.endSlot) + 1;
      const startTime = slotIndexToTime(startIdx);
      const endTime = slotIndexToTime(endIdxExclusive);
      // 같은 슬롯 1개만 클릭 시 (드래그 아님)도 30분 단위로 신청 폼 띄움
      if (onSelectTime) {
        onSelectTime({
          date,
          room: dragState.room,
          start_time: startTime,
          end_time: endTime,
        });
      }
      setDragState(null);
    };
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [dragState, date, onSelectTime]);
  const [reservations, setReservations] = useState([]);

  useEffect(() => {
    fetchReservations({ startDate: date, endDate: date }).then((data) => {
      // 거절된 예약은 일반 사용자에게 숨김
      const filtered = isAdmin ? data : data.filter((r) => r.status !== 'rejected');
      setReservations(filtered);
    });
  }, [date, refreshKey, isAdmin]);

  // 시간 슬롯 (08:00 ~ 22:00, 30분 단위)
  const slots = useMemo(() => {
    const arr = [];
    for (let h = 8; h <= 21; h++) {
      arr.push(`${String(h).padStart(2, '0')}:00`);
      arr.push(`${String(h).padStart(2, '0')}:30`);
    }
    arr.push('22:00');
    return arr;
  }, []);

  // 컬럼 너비 동적 계산 (컬럼 적으면 늘려서 화면 채움, 많으면 110px 유지)
  const MIN_COL_WIDTH = 110;
  const [colWidth, setColWidth] = useState(MIN_COL_WIDTH);

  // 공간 필터 + 정렬: 웨슬리 1F → 웨슬리 2F → 비전 1F → 비전 2F → 다니엘
  const orderedRooms = useMemo(() => {
    let list = [...rooms];
    if (selectedBuilding) list = list.filter((r) => r.building_id === selectedBuilding);
    if (selectedFloor) list = list.filter((r) => (r.floor || '') === selectedFloor);
    if (selectedRoom) list = list.filter((r) => r.id === selectedRoom);
    return list.sort((a, b) => {
      const ob = (BUILDING_ORDER[a.building_id] || 99) - (BUILDING_ORDER[b.building_id] || 99);
      if (ob !== 0) return ob;
      return (a.floor || '').localeCompare(b.floor || '');
    });
  }, [rooms, selectedBuilding, selectedFloor, selectedRoom]);

  // 공간별 예약 그룹
  const reservationsByRoom = useMemo(() => {
    const grp = {};
    for (const r of reservations) {
      (grp[r.room_id] = grp[r.room_id] || []).push(r);
    }
    return grp;
  }, [reservations]);

  // 컨테이너 너비에 맞춰 colWidth 동적 계산 (zoom 영향 받음)
  useEffect(() => {
    if (orderedRooms.length === 0) return;
    const updateWidth = () => {
      if (!scrollRef.current) return;
      const cw = scrollRef.current.clientWidth;
      // 줌에 따라 컬럼 최소 너비 조정 (줌아웃 → 더 좁게 → 더 많은 컬럼 보임)
      const effectiveMin = Math.max(40, Math.floor(MIN_COL_WIDTH * zoom));
      const naturalTotal = TIME_COL_WIDTH + orderedRooms.length * effectiveMin;
      if (naturalTotal < cw) {
        // 화면을 채울 수 있을 때: 컬럼이 늘어나서 꽉 채움
        setColWidth(Math.floor((cw - TIME_COL_WIDTH) / orderedRooms.length));
      } else {
        // 컬럼이 화면보다 많으면 effective 너비 유지하고 가로 스크롤
        setColWidth(effectiveMin);
      }
    };
    updateWidth();
    if (typeof ResizeObserver !== 'undefined' && scrollRef.current) {
      const obs = new ResizeObserver(updateWidth);
      obs.observe(scrollRef.current);
      return () => obs.disconnect();
    }
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [orderedRooms.length, zoom]);

  // 시간 → 슬롯 인덱스 (30분 단위)
  const timeToSlotIndex = (time) => {
    const [h, m] = time.split(':').map(Number);
    return (h - 8) * 2 + Math.floor(m / 30);
  };

  // 날짜 이동
  const moveDate = (days) => {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + days);
    setDate(d.toISOString().split('T')[0]);
  };

  // 날짜 표시: "2026년 5월 10일 (일)"
  const dateLabel = (() => {
    if (!date) return '날짜를 선택하세요';
    const d = new Date(date + 'T00:00:00');
    if (isNaN(d.getTime())) return '날짜 오류';
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${weekdays[d.getDay()]})`;
  })();

  return (
    <div className="daily-view-wrapper">
      {/* 상단 네비게이션 */}
      <div className="daily-nav">
        <button className="btn btn-secondary btn-sm" onClick={() => moveDate(-1)}>← 이전</button>
        <button className="btn btn-secondary btn-sm" onClick={() => setDate(today)}>오늘</button>
        <button className="btn btn-secondary btn-sm" onClick={() => moveDate(1)}>다음 →</button>
        <input
          type="date"
          value={date}
          onChange={(e) => { if (e.target.value) setDate(e.target.value); }}
          style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.85rem' }}
        />
        <span className="daily-date-label">{dateLabel}</span>

        {/* 줌 컨트롤 */}
        <div className="daily-zoom-controls">
          <button className="zoom-btn" onClick={zoomOut} disabled={zoom <= ZOOM_MIN} title="셀 줄이기 (한 화면에 더 많이 보기)">−</button>
          <span className="zoom-label" onClick={zoomReset} title="100%로 초기화" style={{ cursor: 'pointer' }}>{Math.round(zoom * 100)}%</span>
          <button className="zoom-btn" onClick={zoomIn} disabled={zoom >= ZOOM_MAX} title="셀 늘리기">+</button>
        </div>
      </div>

      {/* 그리드 */}
      <div className="daily-grid-scroll" ref={scrollRef}>
        <div className="daily-grid">
          {/* 시간 컬럼 */}
          <div
            className="daily-time-col"
            style={{ width: TIME_COL_WIDTH, flex: `0 0 ${TIME_COL_WIDTH}px` }}
          >
            <div
              className="daily-room-header"
              style={{ height: HEADER_HEIGHT, cursor: 'grab' }}
              onMouseDown={handleHeaderMouseDown}
            >시간</div>
            {slots.slice(0, -1).map((time, i) => (
              <div key={time} className="daily-time-row" style={{ height: SLOT_HEIGHT }}>
                {time.endsWith(':00') ? <strong>{time}</strong> : <span style={{ color: '#a0aec0' }}>{time}</span>}
              </div>
            ))}
          </div>

          {/* 공간별 컬럼 */}
          {orderedRooms.map((room) => {
            const color = BUILDING_COLORS[room.building_id] || { bg: '#718096', border: '#4a5568' };
            const roomReservations = reservationsByRoom[room.id] || [];
            return (
              <div
                key={room.id}
                className="daily-room-col"
                style={{ width: colWidth, flex: `0 0 ${colWidth}px` }}
              >
                <div
                  className="daily-room-header"
                  style={{ height: HEADER_HEIGHT, borderTop: `3px solid ${color.bg}`, cursor: 'grab' }}
                  onMouseDown={handleHeaderMouseDown}
                >
                  <div className="daily-building-label" style={{ color: color.bg }}>
                    {room.building_name}{room.floor ? ` ${room.floor}` : ''}
                  </div>
                  <div className="daily-room-label">{room.name}</div>
                </div>
                <div className="daily-room-body" style={{ height: (slots.length - 1) * SLOT_HEIGHT }}>
                  {/* 30분 라인 */}
                  {slots.slice(0, -1).map((time, i) => (
                    <div
                      key={time}
                      className="daily-cell"
                      style={{
                        height: SLOT_HEIGHT,
                        borderTop: time.endsWith(':00') ? '1px solid #e2e8f0' : '1px dashed #f0f0f0',
                        cursor: 'pointer',
                      }}
                      onMouseDown={(e) => handleSlotMouseDown(room, i, e)}
                      onMouseEnter={() => handleSlotMouseEnter(room, i)}
                    ></div>
                  ))}
                  {/* 드래그 미리보기 */}
                  {dragState && dragState.roomId === room.id && (() => {
                    const s = Math.min(dragState.startSlot, dragState.endSlot);
                    const eIdx = Math.max(dragState.startSlot, dragState.endSlot) + 1;
                    const top = s * SLOT_HEIGHT;
                    const h = (eIdx - s) * SLOT_HEIGHT - 2;
                    return (
                      <div
                        className="daily-event"
                        style={{
                          top: `${top}px`,
                          height: `${h}px`,
                          backgroundColor: color.bg,
                          borderColor: color.border,
                          opacity: 0.4,
                          pointerEvents: 'none',
                          zIndex: 1,
                        }}
                      >
                        <div className="daily-event-time">{slotIndexToTime(s)}-{slotIndexToTime(eIdx)}</div>
                        <div className="daily-event-purpose">선택 중...</div>
                      </div>
                    );
                  })()}
                  {/* 예약들 */}
                  {roomReservations.map((r) => {
                    const startIdx = timeToSlotIndex(r.start_time);
                    const endIdx = timeToSlotIndex(r.end_time);
                    const top = startIdx * SLOT_HEIGHT;
                    const height = Math.max((endIdx - startIdx) * SLOT_HEIGHT - 2, 22);
                    const isPending = r.status === 'pending';
                    const isRejected = r.status === 'rejected';
                    return (
                      <div
                        key={r.id}
                        className="daily-event"
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          backgroundColor: isRejected ? '#e53e3e' : color.bg,
                          borderColor: isRejected ? '#c53030' : (isPending ? '#fbd38d' : color.border),
                          opacity: isRejected ? 0.5 : (isPending ? 0.7 : 1),
                          borderStyle: isPending ? 'dashed' : 'solid',
                          textDecoration: isRejected ? 'line-through' : 'none',
                        }}
                        onClick={() => onEventClick(r)}
                        title={`${r.start_time}-${r.end_time} ${r.applicant_name} (${r.purpose})`}
                      >
                        <div className="daily-event-time">{r.start_time}-{r.end_time}</div>
                        <div className="daily-event-purpose">{r.purpose}</div>
                        <div className="daily-event-applicant">{r.applicant_name}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 범례 */}
      <div className="legend" style={{ marginTop: '12px' }}>
        {Object.entries(BUILDING_COLORS).map(([id, c]) => {
          const labels = { wesley: '웨슬리홀', vision: '비전홀', daniel: '다니엘홀' };
          return (
            <span key={id} className="legend-item">
              <span className="legend-dot" style={{ background: c.bg }}></span>
              {labels[id]}
            </span>
          );
        })}
        <span className="legend-divider">|</span>
        <span className="legend-item">
          <span className="legend-dot" style={{ background: '#fbd38d', border: '2px dashed #ed8936' }}></span>
          대기중
        </span>
      </div>

      {reservations.length === 0 && (
        <p style={{ textAlign: 'center', color: '#a0aec0', padding: '20px', fontSize: '0.9rem' }}>
          이 날짜에는 예약이 없습니다.
        </p>
      )}
    </div>
  );
}
