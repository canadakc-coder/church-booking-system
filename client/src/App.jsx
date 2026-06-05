import React, { useState, useEffect, useCallback, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { fetchBuildings, fetchRooms, fetchReservations, fetchAuthConfig, verifyGoogleToken } from './api';
import ReservationForm from './components/ReservationForm';
import ReservationDetail from './components/ReservationDetail';
import DailyRoomView from './components/DailyRoomView';

// 건물별 색상 매핑
const BUILDING_COLORS = {
  wesley: { bg: '#3182ce', border: '#2c5282', label: '웨슬리홀' },   // 파란 계열
  vision: { bg: '#dd6b20', border: '#c05621', label: '비전홀' },     // 주황 계열
  daniel: { bg: '#38a169', border: '#2f855a', label: '다니엘홀' },   // 녹색 계열
};

const PENDING_OPACITY = '0.6';

export default function App() {
  const [buildings, setBuildings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [editData, setEditData] = useState(null);
  const [duplicateData, setDuplicateData] = useState(null);
  const [prefillData, setPrefillData] = useState(null);
  const [toast, setToast] = useState('');
  const [dateRange, setDateRange] = useState({ start: null, end: null });

  // 관리자 인증 상태
  const [admin, setAdmin] = useState(null); // { email, name, picture, isAdmin }
  const [authConfig, setAuthConfig] = useState(null);
  const googleBtnRef = useRef(null);
  // 관리자 로그인 버튼(구석)을 눌렀을 때만 실제 Google 로그인 버튼을 노출
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [gsiReady, setGsiReady] = useState(false);

  // 모바일 감지
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 모바일에서는 주 뷰가 없음 → 자동으로 일 뷰로 전환
  useEffect(() => {
    if (isMobile && currentView === 'week') {
      setCurrentView('daily');
    }
  }, [isMobile]);

  // 캘린더 ref (뷰 전환에 사용)
  const calendarRef = useRef(null);

  // 통합 뷰 상태: 'list' | 'month' | 'week' | 'daily'
  const [currentView, setCurrentView] = useState('list');
  // viewMode는 currentView에서 파생 ('calendar' | 'daily')
  const viewMode = currentView === 'daily' ? 'daily' : 'calendar';
  const [dailyInitialDate, setDailyInitialDate] = useState(null);
  // 일 뷰 새로고침 트리거
  const [dailyRefreshKey, setDailyRefreshKey] = useState(0);

  // currentView 변경 시 FullCalendar 동기화
  useEffect(() => {
    if (currentView !== 'daily' && calendarRef.current) {
      const viewMap = {
        list: 'listWeek',
        month: 'dayGridMonth',
        week: 'timeGridWeek',
      };
      const targetView = viewMap[currentView];
      if (targetView) {
        const api = calendarRef.current.getApi();
        if (api.view.type !== targetView) {
          api.changeView(targetView);
        }
      }
    }
  }, [currentView]);

  // 목록 뷰의 날짜 헤더 클릭 시 일 뷰로 전환 (PC/모바일 동일)
  useEffect(() => {
    const handler = (e) => {
      const dayRow = e.target.closest('.fc-list-day');
      if (!dayRow || currentView !== 'list') return;
      const dateStr = dayRow.getAttribute('data-date');
      if (dateStr) {
        setDailyInitialDate(dateStr);
        setCurrentView('daily');
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [currentView]);

  useEffect(() => {
    fetchBuildings().then(setBuildings);
    fetchRooms().then(setRooms);
    fetchAuthConfig().then(setAuthConfig).catch(() => {});
  }, []);

  // Google Sign-In 초기화
  useEffect(() => {
    if (!authConfig?.googleClientId) return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: authConfig.googleClientId,
          callback: handleGoogleResponse,
        });
        setGsiReady(true);
      }
    };
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, [authConfig]);

  // "관리자 로그인"을 눌러 노출했을 때만 실제 Google 버튼을 렌더 (숨김 상태 렌더 이슈 방지)
  useEffect(() => {
    if (!googleBtnRef.current) return;
    if (showAdminLogin && gsiReady && window.google) {
      googleBtnRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'medium',
        text: 'signin_with',
        locale: 'ko',
      });
    } else {
      googleBtnRef.current.innerHTML = '';
    }
  }, [showAdminLogin, gsiReady]);

  const handleGoogleResponse = async (response) => {
    try {
      const user = await verifyGoogleToken(response.credential);
      if (user.isAdmin) {
        setAdmin(user);
        showToast(`${user.name || user.email} 관리자로 로그인되었습니다.`);
      } else {
        showToast('관리자 계정이 아닙니다.');
      }
    } catch (err) {
      showToast('로그인에 실패했습니다.');
    }
  };

  const handleLogout = () => {
    setAdmin(null);
    if (window.google) {
      window.google.accounts.id.disableAutoSelect();
    }
    showToast('로그아웃되었습니다.');
  };

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(''), 3000);
  };

  const loadReservations = useCallback(async () => {
    if (!dateRange.start) return;
    const data = await fetchReservations({
      startDate: dateRange.start,
      endDate: dateRange.end,
      buildingId: selectedBuilding || undefined,
      roomId: selectedRoom || undefined,
    });

    // 거절된 예약은 관리자만 볼 수 있음 (일반 사용자에게는 숨김)
    let filtered = admin?.isAdmin ? data : data.filter((r) => r.status !== 'rejected');
    // 층 필터 (클라이언트 사이드)
    if (selectedFloor) {
      filtered = filtered.filter((r) => (r.floor || '') === selectedFloor);
    }

    const calendarEvents = filtered.map((r) => {
      const buildingColor = BUILDING_COLORS[r.building_id] || { bg: '#718096', border: '#4a5568' };
      const isPending = r.status === 'pending';
      const isRejected = r.status === 'rejected';

      // 제목: "건물 [층] 장소 — 용도"
      // 예: "비전홀 1F 사랑채플 — 찬양팀 연습", "다니엘홀 소그룹실 — 성경공부"
      const placeParts = [r.building_name];
      if (r.floor) placeParts.push(r.floor);
      placeParts.push(r.room_name);
      const place = placeParts.join(' ');
      const title = r.purpose ? `${place} — ${r.purpose}` : place;

      return {
        id: r.id,
        title,
        start: `${r.date}T${r.start_time}`,
        end: `${r.date}T${r.end_time}`,
        backgroundColor: isRejected ? '#e53e3e' : buildingColor.bg,
        borderColor: isRejected ? '#c53030' : (isPending ? '#fbd38d' : buildingColor.border),
        textColor: 'white',
        classNames: [
          `building-${r.building_id}`,
          `status-${r.status}`,
        ],
        extendedProps: r,
      };
    });

    setEvents(calendarEvents);
  }, [dateRange, selectedBuilding, selectedFloor, selectedRoom, admin]);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  const handleDatesSet = (arg) => {
    const start = arg.start.toISOString().split('T')[0];
    const end = arg.end.toISOString().split('T')[0];
    setDateRange({ start, end });
  };

  const handleEventClick = (info) => {
    const view = info.view.type;
    // 목록 뷰에서 일정 클릭: PC → 주 뷰, 모바일 → 일 뷰
    if (view.startsWith('list')) {
      const startDate = info.event.start;
      if (startDate) {
        if (isMobile) {
          const y = startDate.getFullYear();
          const m = String(startDate.getMonth() + 1).padStart(2, '0');
          const d = String(startDate.getDate()).padStart(2, '0');
          setDailyInitialDate(`${y}-${m}-${d}`);
          setCurrentView('daily');
        } else if (calendarRef.current) {
          calendarRef.current.getApi().changeView('timeGridWeek', startDate);
          setCurrentView('week');
        }
        return;
      }
    }
    // 그 외 뷰: 상세 모달
    setShowDetail(info.event.extendedProps);
  };

  const handleFormSuccess = (message) => {
    setShowForm(false);
    setEditData(null);
    setDuplicateData(null);
    setPrefillData(null);
    showToast(message);
    loadReservations();
    setDailyRefreshKey((k) => k + 1);
  };

  const handleDetailAction = (message) => {
    setShowDetail(null);
    showToast(message);
    loadReservations();
    setDailyRefreshKey((k) => k + 1);
  };

  const handleEdit = (reservation) => {
    setShowDetail(null);
    setEditData(reservation);
    setDuplicateData(null);
    setShowForm(true);
  };

  const handleDuplicate = (reservation) => {
    setShowDetail(null);
    setEditData(null);
    setDuplicateData(reservation);
    setShowForm(true);
  };

  // 외부 필터: 건물 선택 시 그 건물의 층 목록
  const floorsForFilter = selectedBuilding
    ? Array.from(new Set(
        rooms.filter((r) => r.building_id === selectedBuilding).map((r) => r.floor || '')
      )).sort()
    : [];
  const filterBuildingHasFloors = floorsForFilter.some((f) => f);

  // 외부 필터: 공간 드랍다운에 보일 후보
  const filteredRooms = (() => {
    let list = selectedBuilding ? rooms.filter((r) => r.building_id === selectedBuilding) : rooms;
    if (selectedFloor) {
      list = list.filter((r) => (r.floor || '') === selectedFloor);
    }
    return list;
  })();

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>카나다광림교회 공간 신청</h1>
        <p>Canada Kwanglim Church Room Reservation</p>
        <div className="auth-area">
          {admin ? (
            <div className="admin-bar">
              <span className="admin-badge">관리자</span>
              <span className="admin-name">{admin.name || admin.email}</span>
              <button className="btn btn-secondary btn-sm" onClick={handleLogout}>로그아웃</button>
            </div>
          ) : (
            <div className="admin-login-wrap">
              <button
                className="admin-login-btn"
                onClick={() => setShowAdminLogin((s) => !s)}
                aria-expanded={showAdminLogin}
              >
                관리자 로그인
              </button>
              <div ref={googleBtnRef} className="google-login-btn" style={{ display: showAdminLogin ? 'flex' : 'none' }}></div>
            </div>
          )}
        </div>
      </header>

      <div className="filters">
        <select
          value={selectedBuilding}
          onChange={(e) => {
            setSelectedBuilding(e.target.value);
            setSelectedFloor('');
            setSelectedRoom('');
          }}
        >
          <option value="">전체 건물</option>
          {buildings.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>

        <select
          value={selectedFloor}
          onChange={(e) => {
            setSelectedFloor(e.target.value);
            setSelectedRoom('');
          }}
          disabled={!selectedBuilding || !filterBuildingHasFloors}
        >
          <option value="">{filterBuildingHasFloors ? '전체 층' : (selectedBuilding ? '(층 없음)' : '전체 층')}</option>
          {floorsForFilter.filter((f) => f).map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>

        <select
          value={selectedRoom}
          onChange={(e) => setSelectedRoom(e.target.value)}
        >
          <option value="">전체 장소</option>
          {filteredRooms.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>

        {/* 통합 뷰 토글: 목록 / 월 / [주(PC만)] / 일 */}
        <div className="view-mode-toggle">
          <button
            className={`view-toggle-btn ${currentView === 'list' ? 'active' : ''}`}
            onClick={() => setCurrentView('list')}
          >
            목록
          </button>
          <button
            className={`view-toggle-btn ${currentView === 'month' ? 'active' : ''}`}
            onClick={() => setCurrentView('month')}
          >
            월
          </button>
          {!isMobile && (
            <button
              className={`view-toggle-btn ${currentView === 'week' ? 'active' : ''}`}
              onClick={() => setCurrentView('week')}
            >
              주
            </button>
          )}
          <button
            className={`view-toggle-btn ${currentView === 'daily' ? 'active' : ''}`}
            onClick={() => {
              const api = calendarRef.current?.getApi();
              const dateStr = api?.getDate().toISOString().split('T')[0] || null;
              setDailyInitialDate(dateStr);
              setCurrentView('daily');
            }}
          >
            일
          </button>
        </div>
      </div>

      {viewMode === 'daily' ? (
        <DailyRoomView
          rooms={rooms}
          isAdmin={admin?.isAdmin}
          onEventClick={(r) => setShowDetail(r)}
          refreshKey={dailyRefreshKey}
          initialDate={dailyInitialDate}
          selectedBuilding={selectedBuilding}
          selectedFloor={selectedFloor}
          selectedRoom={selectedRoom}
          onSelectTime={({ date, room, start_time, end_time }) => {
            setPrefillData({
              date,
              start_time,
              end_time,
              building_id: room.building_id,
              room_id: room.id,
            });
            setEditData(null);
            setDuplicateData(null);
            setShowForm(true);
          }}
        />
      ) : (
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        initialView={
          currentView === 'month' ? 'dayGridMonth'
          : currentView === 'week' ? 'timeGridWeek'
          : 'listWeek'
        }
        locale="ko"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: '',
        }}
        buttonText={{
          today: '오늘',
          month: '월',
          week: '주',
          list: '목록',
        }}
        slotMinTime="07:00:00"
        slotMaxTime="23:00:00"
        events={events}
        datesSet={handleDatesSet}
        eventClick={handleEventClick}
        height="auto"
        // 클릭 동작: 월 → 일, 주 → 일 (PC 주 뷰만)
        dateClick={(info) => {
          const api = calendarRef.current?.getApi();
          if (!api) return;
          const view = info.view.type;
          // dateStr은 "YYYY-MM-DD" 또는 "YYYY-MM-DDTHH:MM:SS" 형태 → 날짜만 추출
          const dateOnly = (info.dateStr || '').split('T')[0];
          if (!dateOnly) return;
          if (view === 'dayGridMonth') {
            // 월 뷰 빈 셀 클릭 → 일 뷰로 (PC/모바일 동일)
            setDailyInitialDate(dateOnly);
            setCurrentView('daily');
          } else if (view === 'timeGridWeek') {
            // 주 뷰는 PC만 존재 → 일 뷰로
            setDailyInitialDate(dateOnly);
            setCurrentView('daily');
          }
        }}
        // 날짜 숫자/헤더 클릭 시 (월 뷰에서 날짜 숫자, 주 뷰에서 요일 헤더)
        navLinks={true}
        navLinkDayClick={(date) => {
          // 로컬 시간대 보정 후 YYYY-MM-DD 추출
          const localY = date.getFullYear();
          const localM = String(date.getMonth() + 1).padStart(2, '0');
          const localD = String(date.getDate()).padStart(2, '0');
          const dateStr = `${localY}-${localM}-${localD}`;
          // 모바일/PC 동일: 날짜 숫자 또는 요일 헤더 클릭 → 일 뷰
          setDailyInitialDate(dateStr);
          setCurrentView('daily');
        }}
        // 드래그로 시간 범위 선택 → 그 시간대로 신청 폼 열기 (주 뷰에서만)
        selectable={true}
        selectMirror={true}
        // 10픽셀 이상 드래그해야 select 발동 (짧은 클릭은 dateClick으로만 처리됨)
        selectMinDistance={10}
        select={(info) => {
          const view = info.view.type;
          // 주 뷰(timeGrid)에서만 select 신청 활성화
          if (view !== 'timeGridWeek' && view !== 'timeGridDay') {
            calendarRef.current?.getApi().unselect();
            return;
          }
          // 너무 짧은 시간(30분 미만)이면 무시
          const minutes = (info.end - info.start) / 60000;
          if (minutes < 30) {
            calendarRef.current?.getApi().unselect();
            return;
          }
          let startTime = '08:00';
          let endTime = '09:00';
          if (info.startStr.includes('T')) {
            startTime = info.startStr.split('T')[1].substring(0, 5);
          }
          if (info.endStr.includes('T')) {
            endTime = info.endStr.split('T')[1].substring(0, 5);
          }
          const dateStr = info.startStr.split('T')[0];
          setPrefillData({
            date: dateStr,
            start_time: startTime,
            end_time: endTime,
          });
          setEditData(null);
          setDuplicateData(null);
          setShowForm(true);
          calendarRef.current?.getApi().unselect();
        }}
        // 월 뷰에서 셀당 더 많은 이벤트 보이게
        dayMaxEvents={isMobile ? 3 : 6}
        views={{
          dayGridMonth: {
            // 월 뷰 비율: 세로로 더 길게
            aspectRatio: isMobile ? 0.7 : 1.2,
          },
        }}
        eventDisplay="block"
        displayEventTime={true}
        eventTimeFormat={{
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }}
        noEventsText="해당 기간에 예약이 없습니다."
        listDayFormat={(arg) => {
          const d = new Date(arg.date.year, arg.date.month, arg.date.day);
          const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
          return `${arg.date.year}년 ${arg.date.month + 1}월 ${arg.date.day}일 (${weekdays[d.getDay()]})`;
        }}
        listDaySideFormat={false}
        eventContent={(arg) => {
          const view = arg.view.type;
          const r = arg.event.extendedProps;
          const placeParts = [r.building_name];
          if (r.floor) placeParts.push(r.floor);
          placeParts.push(r.room_name);
          const place = placeParts.join(' ');

          // 주/일 뷰: 3줄 (시간 / 장소 / 용도)
          if (view === 'timeGridWeek' || view === 'timeGridDay') {
            return (
              <div className="fc-custom-event">
                <div className="fc-custom-time">{arg.timeText}</div>
                <div className="fc-custom-place">{place}</div>
                {r.purpose && <div className="fc-custom-purpose">{r.purpose}</div>}
              </div>
            );
          }

          // 목록 뷰: 장소 + 용도 (시간은 list view 자체 컬럼에 따로 표시됨)
          if (view.startsWith('list')) {
            return (
              <div className="fc-list-custom-title">
                <span className="fc-list-place">{place}</span>
                {r.purpose && <span className="fc-list-purpose"> — {r.purpose}</span>}
              </div>
            );
          }

          // 월 뷰는 기본 렌더링 사용
          return undefined;
        }}
      />
      )}

      {viewMode === 'calendar' && (
      <div className="legend">
        <span className="legend-item"><span className="legend-dot" style={{ background: BUILDING_COLORS.wesley.bg }}></span>웨슬리홀</span>
        <span className="legend-item"><span className="legend-dot" style={{ background: BUILDING_COLORS.vision.bg }}></span>비전홀</span>
        <span className="legend-item"><span className="legend-dot" style={{ background: BUILDING_COLORS.daniel.bg }}></span>다니엘홀</span>
        <span className="legend-divider">|</span>
        <span className="legend-item"><span className="legend-dot" style={{ background: '#fbd38d', border: '2px solid #ed8936' }}></span>대기중</span>
        {admin?.isAdmin && (
          <span className="legend-item"><span className="legend-dot" style={{ background: '#e53e3e' }}></span>거절</span>
        )}
      </div>
      )}

      <button className="btn btn-primary btn-add" onClick={() => { setEditData(null); setShowForm(true); }}>
        + {admin?.isAdmin ? '일정 등록' : '공간 신청하기'}
      </button>

      {showForm && (
        <ReservationForm
          buildings={buildings}
          rooms={rooms}
          onClose={() => { setShowForm(false); setEditData(null); setDuplicateData(null); setPrefillData(null); }}
          onSuccess={handleFormSuccess}
          isAdmin={admin?.isAdmin}
          adminEmail={admin?.email}
          editData={editData}
          duplicateData={duplicateData}
          prefillData={prefillData}
        />
      )}

      {showDetail && (
        <ReservationDetail
          reservation={showDetail}
          onClose={() => setShowDetail(null)}
          isAdmin={admin?.isAdmin}
          adminEmail={admin?.email}
          onAction={handleDetailAction}
          onEdit={handleEdit}
          onDuplicate={handleDuplicate}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
