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

### 2026-06-03 (Day 4) — 배포 1단계(GitHub) 완료

**완료된 작업**
- 루트 `.gitignore` 생성 — `.env`, SQLite(`-wal`/`-shm` 사이드카 포함), node_modules, `.claude/`, Vite 임시파일 차단
  - 기존 `server/.gitignore`는 `db/database.sqlite`만 막아 WAL/SHM 누출 위험 있었음 → 루트에서 `*.sqlite*` 전부 차단으로 보완
- `git init` → `main` 브랜치 → 초기 커밋 (34개 파일)
  - 커밋 전 `git check-ignore`로 `server/.env`·DB 3종 제외 검증 통과
  - node_modules·비밀키 미포함 확인
- GitHub 저장소 생성: **https://github.com/canadakc-coder/church-booking-system** (Public)
  - GitHub 계정: `canadakc-coder` (소유자 표시), 가입 이메일 추정 joseph.wang07@gmail.com
- `git remote add origin` + `git push -u origin main` 성공 (사용자가 터미널에서 직접 실행)
  - 인증: HTTPS + Personal Access Token (classic, `repo` scope). 비밀번호 방식 불가 → PAT 발급해서 푸시
  - **푸시 후 안전 검증 통과**: 원격에 `.env`/`.sqlite` 없음, `server/.env.example`만 포함

**배포 2단계 = Oracle Cloud 무료 가입 + VM 생성 — ✅ 완료!**
- Oracle 무료 계정 생성: 홈리전 **Canada Southeast (Toronto, ca-toronto-1)** / 클라우드계정 `josephwang07` / 로그인 joseph.wang07@gmail.com / MFA 등록됨
- ⚠️ **용량 전쟁**: ARM(A1.Flex 4코어/24GB → 1코어) 계속 "Out of capacity", AMD 마이크로(E2.1.Micro)도 한때 out → 토론토 무료 물량이 congested. 손 재시도 중 "Too many requests" rate limit도 발생.
  - **해결책**: 인스턴스 설정을 **"Save as stack"** 으로 Resource Manager 스택 저장(joseph-cloud-server) → 스택 **Apply** 재시도로 결국 잡힘. 앞으로 용량 재시도는 이 스택에서 **Actions → Apply** 한 번이면 됨(마법사 재작성 불필요).
- **생성된 서버**: 이름 `joseph-cloud-server`, **VM.Standard.E2.1.Micro (AMD, Always Free, 1 OCPU/1GB)**, Ubuntu 22.04, AD-1/FD-3
  - **Private IP**: 10.0.0.186
  - ⭐ **Public IP (Ephemeral): `40.233.84.235`** ⭐
  - VCN: vcn-20260603-1647 / 공개 서브넷 subnet-20260603-1647 (CIDR 10.0.0.0/24)
  - SSH 키페어: Oracle "Generate a key pair for me"로 생성, **private/public 키 진규님이 다운로드** (서버 접속 열쇠)
- 💡 메모: 1GB RAM이라 서버 세팅 시 **스왑 2GB 추가** 필요(특히 client `npm run build` OOM 방지). 나중에 ARM 4코어 잡히면 멀티사이트용으로 이전/확장 고려.

**배포 3단계(방화벽) + 4단계(서버 세팅) — ✅ 완료! 앱 라이브!**
- **방화벽**: VCN Default Security List에 Ingress TCP 80/443 (0.0.0.0/0) 추가 완료 (기존 22 SSH + ICMP에 더해)
- **SSH 접속**: 개인키 = `/Users/pastorwang/Documents/Oracle key/ssh-key-2026-06-03.key` (이 키로 접속 성공 확인). 접속: `ssh -i "<키경로>" ubuntu@40.233.84.235`
- **서버 세팅 완료** (에이전트가 SSH로 수행):
  - 스왑 2GB 생성(/swapfile, /etc/fstab 등록) — 1GB RAM 보완
  - Node.js 22.22.3, npm 10.9.8, PM2 7.0.1, Nginx 1.18, git, build-essential 설치
  - `git clone https://github.com/canadakc-coder/church-booking-system.git` → `~/church-booking-system`
  - server: `npm install` (better-sqlite3 컴파일 OK), client: `npm install` + `npm run build`(dist 생성)
  - **server/.env**: 로컬 .env를 scp로 복사 후 FRONTEND_URL/BASE_URL만 `http://40.233.84.235`로 수정 (SMTP_PASS·GOOGLE_CLIENT_ID 등 비밀값 그대로). chmod 600.
  - DB: `node db/init.js`(건물3·장소23) + `migrate.js` + `seed.js` 완료
  - PM2: `pm2 start index.js --name booking-api` + `pm2 save` + `pm2 startup systemd`(부팅 자동시작)
  - Nginx: `/etc/nginx/sites-available/booking` — dist 정적 서빙 + `/api` → localhost:3001 프록시. server_name에 IP·booking.kwanglim.ca 둘 다. default 사이트 제거.
  - OS 방화벽(iptables): INPUT에 80/443 ACCEPT 삽입 + netfilter-persistent save (Oracle Ubuntu는 ufw 아닌 iptables 사용)
- ✅ **외부 접속 검증**: `http://40.233.84.235/` → 200, `/api/buildings` → 정상 JSON. **앱 라이브!**

**배포 5단계(DNS) + 6단계(SSL) — ✅ 완료! 정식 주소 라이브!**
- ⚠️ **DNS는 HostPapa가 아니라 Wix가 관리** (네임서버 ns6/ns7.wixdns.net). HostPapa는 도메인 등록만(웹호스팅 없음). 교회 메인사이트도 Wix.
  - `dig NS kwanglim.ca` → wixdns / kwanglim.ca A → 185.230.63.x (Wix) / mail.kwanglim.ca → 45.56.219.122
- **A 레코드 추가**: Wix 대시보드(Kwanglim Church) → 설정 → 도메인 → kwanglim.ca → ⋯ → **DNS 레코드 관리** → A 레코드 추가:
  - **호스트명 `booking` → 값 `40.233.84.235`** (TTL 1시간). 기존 레코드는 안 건드림.
  - 전파 빠름 — 추가 직후 8.8.8.8에서 즉시 조회됨.
- **SSL**: 서버에서 `sudo certbot --nginx -d booking.kwanglim.ca --agree-tos -m kmcreservation@gmail.com --redirect` → Let's Encrypt 인증서 발급 성공(2026-09-03 만료, 자동갱신 설정됨). nginx에 HTTPS+HTTP→HTTPS 301 적용.
- **server/.env** FRONTEND_URL·BASE_URL을 `https://booking.kwanglim.ca`로 변경 → `pm2 restart booking-api --update-env`
- ✅ **최종 검증**: `https://booking.kwanglim.ca/` → 200, `/api/buildings` 정상, HTTP→HTTPS 301, 인증서 CN=booking.kwanglim.ca 확인.

## 🎉 배포 완료 — 앱 라이브: https://booking.kwanglim.ca

> ⚠️ **운영·접속 상세 정보는 `DEPLOYMENT_INFO.md`(gitignore, 비공개)에 갈무리됨.** 다음 작업 시 그 파일부터 읽을 것. (서버 IP·SSH키·계정·서버 내부구조·이전 절차·버그 디버그 출발점 포함)

### 2026-06-05 — 마무리 작업 + 버그 발견
- ✅ **관리자 로그인(Google OAuth) 완료·검증**: kwanglim-space 프로젝트 OAuth Client에 `https://booking.kwanglim.ca` Authorized JS origins 추가 → kmcreservation@gmail.com으로 "관리자" 모드 로그인 확인됨.
- ✅ **Wix 홈페이지 메뉴에 "장소 예약" 링크 추가·게시 완료** (→ https://booking.kwanglim.ca, 새 탭)
- 🐛 **버그 발견 (다음 세션에서 수정)**: 신청 폼("+ 일정 등록"/공간 신청서)의 **입력칸에 타이핑이 안 됨**.
  - 폼: `client/src/components/ReservationForm.jsx` (코드상 표준 controlled input, 명백한 결함은 안 보임)
  - 디버그 출발점: ① 라이브 사이트 브라우저 콘솔에서 JS 에러 확인 ② 로컬 dev에서 재현되는지 확인(재현=코드버그/미재현=빌드·환경) ③ state 미갱신 vs 클릭 가로채는 오버레이 점검
  - 수정 후 배포: git push → 서버 `git pull && cd client && npm run build` (+백엔드 변경시 `pm2 restart booking-api`)

### 2026-06-05 (저녁) — "타이핑 안 됨" 버그 조사 → ✅ 재현 불가, 코드 버그 아님 (CLOSED)
- **결론**: 일시적 환경 문제. 코드/빌드 결함 아님. (신고자도 재시도 시 정상 확인)
- **검증 경로**: ① 코드 리뷰 — ReservationForm은 깨끗한 controlled input(차단 로직·전역 키핸들러·오버레이 없음), App.jsx도 `key` 없이 렌더(리마운트 없음) → ② 로컬 dev 타이핑 정상 → ③ 로컬 프로덕션 빌드(`vite preview`) 정상, 그 번들 해시가 **라이브 서빙 해시와 바이트 동일** → ④ 라이브 헤더에 CSP/X-Frame 없음, GSI 설정 동일 → ⑤ **라이브 실제 키보드 타이핑(Chrome) 데스크톱·모바일 모두 정상**.
- **재발 시**: 기기/브라우저 + Google 로그인 여부부터 받기. 유력 가설(미확정) = 로그인 세션 있을 때 GSI/One Tap 포커스 가로채기. 상세는 `DEPLOYMENT_INFO.md` 버그 섹션.

### 2026-06-05 — ✨ 여러 공간 동시 신청 기능 추가
- **요청**: 기존엔 공간을 드롭다운으로 한 번에 하나만 선택 → 한 신청으로 여러 공간을 동시에 신청하도록.
- **설계 결정(사용자 확인)**: ① 승인 단위 = 고른 공간을 **한 신청으로 묶어 일괄 승인/거절/삭제** ② 선택 UI = **체크박스 + 선택 칩**.
- **저장 방식**: 기존 반복 일정 인프라 재사용 — 공간마다 1행 생성 후 `recurrence_group_id`로 묶음(승인/거절/삭제/이메일이 전부 그룹 기준 동작). 공간이 2개↑ 또는 반복이면 그룹 부여, 단일+비반복이면 그룹 없음(기존과 동일).
- **백엔드**(`server/routes/reservations.js`): POST가 `room_ids`(배열) 받음(하위호환: `room_id` 단일도 허용). 공간×날짜로 행 생성, 묶음은 **승인 토큰 공유**(이메일 링크 한 번으로 그룹 전체 승인). `getPlaceLabels()` 헬퍼로 승인/거절/신청 알림 메일에 **모든 공간 표기**. (부수 수정: `contact` NOT NULL 방어 `contact || ''`)
- **이메일**(`server/services/email.js`): 3개 알림 함수에 `places` 배열 인자 추가 → 여러 공간이면 "N개 공간" 목록 + 제목 "○○ 외 N곳".
- **프론트**(`ReservationForm.jsx`): 공간 `<select>` → 체크박스 목록 + "선택한 공간" 칩(× 제거). 건물/층은 목록 필터일 뿐 선택은 유지(건물·층 넘나들며 다중 선택 가능). 수정 모드는 단일(radio)로 동작. `styles.css`에 `.room-checkbox-list`/`.room-chip` 등 추가. 상세/수정 모달의 "반복" 문구를 묶음 성격(반복 vs 여러 공간)에 맞게 일반화.
- **검증**: 로컬에서 3공간→3행 그룹, 2공간×5주→10행 그룹, 단일→그룹없음, UI 제출 4공간(건물·층 혼합)→4행 1그룹 모두 정상. 프로덕션 빌드 OK.
- ⚠️ **미배포**: 코드 변경은 로컬에만 있음. 배포하려면 git push → 서버 `git pull && cd client && npm run build && pm2 restart booking-api`(백엔드도 바뀌었으므로 재시작 필수). **서버 DB 스키마 변경 없음**(마이그레이션 불필요).

### 2026-06-04 (Day 4 저녁) — 교회 명의 계정 이전 시도 (보류)
- **이유**: 현재 서버가 joseph 개인 Oracle 계정(josephwang07)에 종속. 교회 자산화하려면 교회 이메일로 새 계정 필요. (휴대폰·카드는 가입 후 변경 가능, **이메일만 영구 고정**이라 처음부터 교회 것이어야 함)
- **새 계정 생성 완료**: 교회 계정 = **canadakc** (compartment canadakc root), 홈리전 **US West (Phoenix, us-phoenix-1)** 선택 — Phoenix는 **AD 3개**라 토론토(1개)보다 용량 유리 + 밴쿠버에서 가까움. (데이터는 미국 보관)
- **⚠️ 용량 벽 (다시)**: Phoenix도 ARM/AMD 다 품절 상태 — 4코어 ARM(AD-2) fail, 1코어 ARM(AD-1) fail, AMD E2.1.Micro도 "현재 AD에서 불가". 토론토보다 나을 줄 알았으나 이날 밤 congested.
- **현재 상태**: 인스턴스 설정을 **스택으로 저장**(Resource Manager → Stacks, "canadakc01" = 4코어 ARM). 보류하고 토론토 운영 서버 유지.
- **다음에 이어갈 것 (이전 재개 시)**:
  - 새벽/이른 아침(밴쿠버) 등 한가한 시간에 재시도하면 잡힐 확률↑
  - 4코어 스택만 붙들지 말고 → **AMD(E2.1.Micro)** 또는 **1코어 ARM + AD를 AD-1/2/3 바꿔가며** 시도 (스택은 저장된 사양/AD 고정이라 변경하려면 Create 마법사 새로)
  - 서버 잡히면: 토론토에서 한 세팅 그대로 재실행(스왑·Node·Nginx·PM2·clone·.env scp·db·pm2 startup) → Wix DNS의 booking A레코드를 **새 IP로 변경** → certbot SSL 재발급 → 검증
  - **이전 완료 후** 토론토(joseph 계정) 인스턴스·VCN 정리(종료)
- 💡 급하지 않음: 앱은 https://booking.kwanglim.ca (토론토)에서 정상 운영 중. 이전은 부가 작업.

**남은 선택 작업 (운영 편의)**
- ⏭️ **Google OAuth (관리자 로그인용)**: console.cloud.google.com → 프로젝트 `kwanglim-space` → OAuth Client ID → Authorized JavaScript origins에 `https://booking.kwanglim.ca` 추가. (이거 해야 `kmcreservation@gmail.com` 관리자 로그인 작동. 일반 공간신청·이메일승인은 이미 작동)
- ⏭️ **Wix 메뉴 링크**: 교회 홈페이지 메뉴에 `장소 예약` → https://booking.kwanglim.ca (새 탭)
- ⏭️ (선택) 실패 시도로 생긴 빈 VCN 3개(vcn06031650 x2, vcn06031640) Oracle에서 삭제
- ⏭️ (선택) 통합 테스트: 신청 폼 제출 → canadakc@gmail.com 알림메일 → 승인/거절 링크 → 신청자 메일 수신 흐름 확인
- 💡 1GB RAM이라 추후 ARM 4코어 잡히면 이전/확장 고려 (joseph-cloud-server 스택 Actions→Apply 재시도)

---

## 현재 진행 중

- ✅ 배포 1단계(GitHub 푸시) 완료 — 코드 공개 저장소에 안전하게 업로드됨
- ⏸️ 배포 2단계(Oracle Cloud VM) 진행 중 — 결제검증 rate limit으로 일시 중단, 시간 두고 재시도 예정
- 이후 지시서(`20260508_배포_지시서_Chrome.md`) 3~7단계(DNS → SSH 서버세팅 → OAuth → Wix → 테스트) 순서대로

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
