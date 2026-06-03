# 프로젝트 컨텍스트

## 건물 및 장소 목록

### 웨슬리홀 (Wesley Hall)
| 층 | 장소명 | ID |
|---|---|---|
| 1F | 식당 | wesley-1f-dining |
| 1F | 주방 | wesley-1f-kitchen |
| 1F | 소그룹실 | wesley-1f-small-group |
| 2F | 본당 | wesley-2f-sanctuary |
| 2F | 자모실 | wesley-2f-mothers-room |
| 2F | 사무실 | wesley-2f-office |
| 2F | 방송실 | wesley-2f-broadcast |

### 비전홀 (Vision Hall)
| 층 | 장소명 | ID |
|---|---|---|
| 1F | 믿음채플 | vision-1f-faith-chapel |
| 1F | 소망채플 | vision-1f-hope-chapel |
| 1F | 사랑채플 | vision-1f-love-chapel |
| 1F | 소그룹실1 | vision-1f-small-group-1 |
| 1F | 소그룹실2 | vision-1f-small-group-2 |
| 1F | 소그룹실3 | vision-1f-small-group-3 |
| 1F | 재무부실 | vision-1f-finance |
| 2F | 비전채플 | vision-2f-vision-chapel |
| 2F | 글로리아실 | vision-2f-gloria |
| 2F | 소그룹실A | vision-2f-small-group-a |
| 2F | 소그룹실B | vision-2f-small-group-b |
| 2F | 친교실 | vision-2f-fellowship |
| 2F | 비전홀 방송실 | vision-2f-broadcast |
| 2F | 복사실 | vision-2f-copy-room |

### 다니엘홀 (Daniel Hall)
| 층 | 장소명 | ID |
|---|---|---|
| - | 소그룹실 | daniel-small-group |
| - | 중그룹실 | daniel-medium-group |

## 핵심 기능 요구사항
1. 캘린더 뷰 — 건물별/장소별 필터링, 월/주/일 뷰
2. 공간 신청 폼 — 신청자, 소속, 장소, 날짜/시간, 용도, 연락처
3. 반복 일정 — 매주(요일 선택) / 매월(날짜 선택) 반복
4. 이메일 알림 — 신청 시 canadakc@gmail.com 으로 발송
5. 이메일 승인/거절 — 관리자가 이메일 내 버튼 클릭으로 처리
6. 상태 표시 — 대기중(pending) / 승인(approved) / 거절(rejected)

## 관리자 이메일
- 받는 곳(관리자): canadakc@gmail.com
- 보내는 곳(시스템 발신 계정): kmcreservation@gmail.com (Gmail 앱 비밀번호 사용)

## 배포 고려사항
- Wix iframe 삽입 가능하도록 CORS 설정
- 모바일 반응형 필수

---

## 작업 일지

### 2026-05-05 (Day 1) — 초기 구축 완료

**완료된 작업**
- 프로젝트 기본 구조 생성 (`client/` + `server/`)
- 와이어프레임(WIREFRAMES.md) 작성
- 백엔드 API 개발 (Express + better-sqlite3)
  - `GET /api/buildings`, `GET /api/rooms`
  - `GET/POST /api/reservations`
  - `GET /api/reservations/:id/approve` / `reject` (이메일 토큰 인증)
- 프론트엔드 개발 (React + Vite + FullCalendar)
  - 메인 캘린더 뷰, 신청 폼 모달, 상세 보기 모달
  - 건물·장소 필터, 상태별 색상(대기/승인/거절)
- 이메일 알림 기능 (Nodemailer + Gmail SMTP)
  - 신청 시 관리자에게 HTML 메일 발송
  - 메일 안에서 ✓승인 / ✗거절 버튼 클릭 → 서버 즉시 반영
- 통합 테스트 통과 (DB → API → 이메일 → 승인/거절 전 과정)

**알게 된 환경 이슈 / 메모**
- Node 25(개발 버전) 사용 시 `better-sqlite3` 네이티브 모듈 호환 문제 발생 → `npm rebuild better-sqlite3`로 해결됨. 향후 Node 22 LTS 권장.
- `npm install` 후 Vite/Rollup의 플랫폼 모듈(@rollup/rollup-darwin-arm64) 누락 npm 버그 발생 → `node_modules`와 `package-lock.json` 삭제 후 재설치로 해결.
- 첫 실행 시 `npm run db:init`을 빠뜨리면 DB가 비어 드롭다운이 안 뜸. 셋업 가이드에 강조 필요.

**현재 상태**
- 로컬(맥미니) 개발 환경에서 정상 동작 확인
- 신청 → 이메일 수신 → 승인 → 캘린더 색상 반영 흐름 검증됨
- 아직 클라우드 배포 전 (개발/테스트 단계)

---

### 2026-05-06 (Day 2) — 관리자 기능 + 이메일 개선 + 캘린더 개선

**완료된 작업**
- DB 스키마 확장: `applicant_email`, `rejection_reason`, `created_by` 컬럼 추가
  - `server/db/migrate.js` 마이그레이션 스크립트 생성 (기존 DB 보존)
- 신청 폼 수정: 연락처를 전화번호(`contact`)와 이메일(`applicant_email`)로 분리
- 이메일 기능 보강
  - 관리자에게 보내는 알림 이메일의 Reply-To에 신청자 이메일 추가
  - 승인 시: 신청자 이메일로 "승인되었습니다" 이메일 자동 발송
  - 거절 시: 거절 사유 입력 폼 → 사유 포함 "거절되었습니다" 이메일 자동 발송
  - 이메일 링크 거절 시에도 사유 입력 폼 표시 (`renderRejectForm`)
- 관리자 Google OAuth 인증
  - `server/routes/auth.js` 생성 (Google ID 토큰 검증)
  - `canadakc@gmail.com`으로 로그인 시 관리자 모드 활성화
  - 헤더에 관리자 표시 + 로그아웃 기능
- 관리자 CRUD 기능
  - `PUT /api/reservations/:id` — 수정 (requireAdmin 미들웨어)
  - `DELETE /api/reservations/:id` — 삭제 (반복 일정 전체 삭제 옵션)
  - `POST /api/reservations/:id/approve` — 관리자 페이지에서 승인
  - `POST /api/reservations/:id/reject` — 관리자 페이지에서 거절 (사유 포함)
  - 관리자 등록 예약은 자동 승인 처리
  - 상세 모달에서 승인/거절/수정/삭제 버튼 표시
- 캘린더 개선
  - 건물별 색상 구분: 웨슬리홀(파란), 비전홀(주황), 다니엘홀(녹색)
  - 대기중(pending): 주황 점선 보더 + 투명도로 구분
  - 거절된 예약: 일반 사용자에게는 숨김, 관리자에게만 표시
  - 주간뷰 시간범위: 09:00~22:00 (slotMinTime/slotMaxTime)
  - 시간 선택 옵션: 09:00~22:00 (30분 단위)
  - 반복 일정 기본 종료일: 90일 → 365일(1년)로 확장
- 범례(legend) 업데이트: 건물별 색상 + 대기중 표시

**필요한 셋업 작업 (최초 1회)**
- 기존 DB에 새 컬럼 추가: `cd server && node db/migrate.js`
- Google Cloud Console에서 OAuth Client ID 생성 후 `.env`에 `GOOGLE_CLIENT_ID` 추가
- `.env`의 `SMTP_USER`를 `kmcreservation@gmail.com`으로 확인

**추가 변경 (Day 2 후반)**
- 사용 시간 시작을 09:00 → 08:00으로 변경 (시간 옵션 + 캘린더 slotMinTime)
- 이메일 ↔ 전화번호 역할 변경
  - 이메일: 필수 (승인/거절 알림 발송용)
  - 전화번호: 선택
  - 서버에서도 `applicant_email` 필수 검증 추가
- 환경 변수 분리
  - `ADMIN_EMAIL` = 관리자 Google 로그인 허용 이메일 (`kmcreservation@gmail.com`)
  - `NOTIFICATION_EMAIL` = 신청 알림 받는 곳 (`canadakc@gmail.com`)
- 반복 일정 일괄 수정 (PUT `/api/reservations/:id?update_group=true`)
  - 공통 필드 일괄 변경
  - **날짜 시프트**: 새 date를 입력하면 차이 일수만큼 모든 반복 일정 이동 (요일 변경 지원)
  - 폼 UI에 "이 일정만 수정 / 반복 전체 수정" 라디오 버튼
- 일정 복제 (Copy-Paste) 기능
  - 상세 모달에 "복제" / "복제 신청" 버튼
  - 같은 내용으로 새 신청 (날짜만 새로 입력)
  - 반복 설정은 비워진 상태로 시작
- 로컬 네트워크 공유
  - `client/package.json`의 dev 스크립트를 `vite --host`로 변경
  - 같은 와이파이의 다른 기기에서 `http://<맥미니IP>:5173`으로 접속 가능

**Google OAuth Client ID (발급 완료)**
- Project: `kwanglim-space`
- 발급 계정: `kmcreservation@gmail.com`
- Client ID는 `.env`에 저장됨 (커밋하지 않을 것)
- Authorized JavaScript origins: `http://localhost:5173`, `http://localhost:3001`
- 테스트 사용자: `kmcreservation@gmail.com`

---

### 2026-05-06 (Day 2 — 추가 작업, 저녁)

**UI/UX 대대적 개선**

- **시간 선택 분리**: 시 / 분 드랍다운으로 분리 (5분 단위)
- **장소 선택 3단**: 건물 / 층 / 공간 드랍다운 (다니엘홀처럼 층 없는 건물은 자동 비활성화)
- **외부 필터 3단**: 건물/층/공간 필터 추가 (캘린더 + 일 뷰에 모두 적용)
- **반복 설정 UI 개선**: 세로 라디오 → 가로 pill 버튼

**캘린더 뷰 시스템 정비**

- **통합 4뷰 토글**: `목록 / 월 / 주 / 일` (모바일은 주 빠지고 `목록 / 월 / 일`)
- **일 뷰 신규 컴포넌트** (`DailyRoomView.jsx`)
  - 시간(세로) × 공간(가로) 그리드
  - 컬럼 정렬: 웨슬리 1F → 웨슬리 2F → 비전 1F → 비전 2F → 다니엘
  - 외부 필터 적용 (건물/층/공간 선택 시 해당 컬럼만)
  - 시간 컬럼 sticky 좌측 고정
  - 공간 헤더 sticky 상단 고정
  - 컬럼 너비 동적 계산 (ResizeObserver) — 컬럼 적으면 늘려서 화면 채움, 많으면 가로 스크롤
  - max-height 적용으로 한 화면 안에서 가로/세로 스크롤
  - **셀 줌 기능**: zoom 0.4 ~ 2.0 범위 (1% 단위), 가로/세로 모두 적용
    - + / − 버튼 (20% 단위)
    - 핀치 제스처 (PINCH_SENSITIVITY=4.0, 매우 민감)
  - 헤더 드래그로 가로 스크롤 가능
  - 셀 드래그로 시간 선택 → 신청 폼 자동 채움 (날짜+시간+장소)
- **클릭 동작 정리**
  - 목록 뷰: 날짜 헤더 → 일 뷰, 일정 클릭 → 주 뷰(PC) / 일 뷰(모바일)
  - 월 뷰: 빈 셀 클릭 → 일 뷰, 날짜 숫자 클릭 → 일 뷰, 일정 클릭 → 상세 모달
  - 주 뷰(PC만): 빈 셀 클릭 → 일 뷰, 드래그(10px+, 30분+) → 신청 폼, 일정 클릭 → 상세 모달
- 월 뷰 셀 크기 확대 (PC 160px, 모바일 90px)
- 주 뷰 이벤트 3줄 표시 (시간/장소/용도)
- 목록 뷰 날짜 형식: "2026년 5월 10일 (일)"

**모바일 최적화**

- 기본 뷰: 목록 (PC도 동일)
- viewport: `maximum-scale=5.0, user-scalable=yes` (브라우저 핀치 줌 허용)
- 일 뷰 활성화 (가로 스크롤로 모든 컬럼 확인)

**버그 수정**

- 주 뷰 셀 클릭 시 `info.dateStr`이 시간 포함 → `.split('T')[0]`로 날짜만 추출
- 일 뷰 → 주 뷰 → 목록 가는 버그 (initialView를 currentView 기반 동적 설정)
- 시간 컬럼 sticky 떨림 → JS transform 제거, position: sticky로 복귀
- DailyRoomView Temporal Dead Zone 에러 (useEffect 순서 정리)
- date input 빈 값 시 NaN → 가드 추가

---

### 2026-05-08 (Day 3) — 배포 지시서 작성

**완료된 작업**
- Claude in Chrome 에이전트용 배포 지시서 작성: `20260508_배포_지시서_Chrome.md`
- 7단계 구성: GitHub → Oracle Cloud(ARM VM) → DNS → 서버세팅(SSH) → Google OAuth → Wix → 통합 테스트
- Chrome 가능 단계와 SSH 필요 단계를 명확히 구분 (4단계는 Cowork/터미널에서 실행할 체크리스트)
- 사전 정보(신용카드·도메인 로그인·앱 비밀번호 등)와 트러블슈팅 메모 포함

**다음**
- 사용자가 실제 배포 시작 → Chrome에 이 지시서 전달, 4단계는 별도 진행
- 배포 완료 후 운영 단계 TODO(시간 충돌 검증, 관리자 목록 페이지 등)로 이동

---

## 현재 진행 중

- 배포 지시서 작성 완료 (`20260508_배포_지시서_Chrome.md`) — 실제 배포 실행 대기 중
- Chrome 에이전트에 지시서 전달 후 7단계 순서대로 진행 예정

---

## 다음에 할 일 (TODO) — 클라우드 배포 실행

### 1. 배포 계획 (옵션)
- **백엔드**: Railway (가장 간단, SQLite 지원) 또는 Render (무료 플랜 있음)
- **프론트엔드**: Vercel (가장 빠름) 또는 Netlify
- **DB**: 일단 SQLite 그대로 (Railway는 디스크 영구 저장 가능). 트래픽 늘면 PostgreSQL 마이그레이션 검토

### 2. 배포 전 체크리스트
- [ ] `.env` 환경변수 백업 (특히 SMTP_PASS, GOOGLE_CLIENT_ID)
- [ ] `.gitignore`에 `.env`, `database.sqlite*` 포함 확인
- [ ] CORS 설정: 배포 도메인 `FRONTEND_URL` env로 추가
- [ ] `BASE_URL`을 배포 도메인으로 변경 (이메일 승인/거절 링크 작동)
- [ ] Google Cloud Console에서 Authorized JavaScript origins에 배포 URL 추가
- [ ] OAuth consent screen을 "테스트" → "프로덕션"으로 게시 (선택)

### 3. 배포 단계 (Railway + Vercel 기준)

**백엔드 (Railway)**
1. https://railway.app 가입 (GitHub 연동)
2. New Project → Deploy from GitHub
3. `server` 폴더 지정
4. 환경변수 추가 (SMTP, ADMIN_EMAIL, NOTIFICATION_EMAIL, BASE_URL, GOOGLE_CLIENT_ID 등)
5. 도메인 발급 (railway.app subdomain)
6. SQLite DB 영구 저장 위해 Volume 마운트

**프론트엔드 (Vercel)**
1. https://vercel.com 가입
2. New Project → GitHub repo
3. Root Directory: `client`
4. Build Command: `npm run build`
5. 환경변수 추가: API base URL을 백엔드 Railway URL로
   → 또는 `client/vite.config.js`의 proxy를 변경

### 4. Wix iframe 삽입 준비
- 배포 URL을 Wix iframe `src`에 입력
- X-Frame-Options 헤더 처리 (Express에 미들웨어 추가)
- CSP 헤더에 wix.com 허용

### 5. 추후 고려 사항
- 시간 충돌 검증 (같은 장소·시간 중복 신청 막기)
- 관리자 목록 페이지 (테이블 형태)
- 예약 통계 대시보드
- 이메일 알림 히스토리 로깅

---

## 배포 작업 계획 (내일)

### 0단계: GitHub 준비 (10분)
- github.com 계정 만들기
- 새 저장소: `church-booking-system` (Public)
- 맥미니에서 코드를 GitHub에 올리기

### 1단계: Oracle Cloud 가입 (15분)
- oracle.com/cloud/free 접속
- 무료 계정 생성 (신용카드 필요, 과금 안 됨)
- 지역 선택: US West (San Jose) 또는 Canada (Toronto)

### 2단계: ARM VM 생성 (10분)
- Ampere A1 (ARM) 선택
- CPU 4개, RAM 24GB
- OS: Ubuntu 22.04
- SSH 키 생성 및 보관

### 3단계: 서버 세팅 (1~1.5시간, 코워크에서)
- SSH 접속
- Node.js, Nginx, MySQL 설치
- 방화벽 설정 (포트 80, 443)
- GitHub에서 코드 가져오기
- PM2로 앱 자동 실행

### 4단계: 도메인 연결 (30분)
- kwanglim.ca DNS에서 booking.kwanglim.ca A 레코드 → Oracle 서버 IP
- Nginx 서브도메인 설정
- Let's Encrypt SSL 인증서

### 5단계: 테스트 + Wix 연결 (15분)
- booking.kwanglim.ca 접속 확인
- 신청→이메일→승인 전체 흐름 테스트
- Wix 메뉴에 "장소 예약" 링크 추가

### 준비물
- 신용카드 (Oracle 가입용)
- kwanglim.ca 도메인 관리 계정 로그인 정보
- GitHub 가입용 이메일
- canadakc@gmail.com 앱 비밀번호

### 장기 계획
- Oracle ARM 서버에 WordPress 블로그도 함께 운영 (월 $0)
- 멀티 교회 지원으로 확장 (SaaS 모델)
- 서브도메인 활용: booking.kwanglim.ca, qt.kwanglim.ca 등
