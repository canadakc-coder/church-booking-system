# 카나다광림교회 공간 신청 시스템

교회 건물 3개, 장소 22개의 공간 예약/관리 웹앱입니다.

## 빠른 시작

### 1. 서버 설정

```bash
cd server
npm install
cp .env.example .env  # 환경변수 설정
npm run db:init       # 데이터베이스 초기화
npm run dev           # 서버 실행 (port 3001)
```

### 2. 클라이언트 설정

```bash
cd client
npm install
npm run dev           # 개발서버 실행 (port 5173)
```

### 3. Gmail SMTP 설정

`.env` 파일에 Gmail App Password를 설정하세요:
1. Google 계정 → 보안 → 2단계 인증 활성화
2. 앱 비밀번호 생성
3. `.env`의 `SMTP_PASS`에 입력

## 주요 기능

- 캘린더 뷰 (월/주 보기, 건물·장소 필터)
- 공간 신청 폼 (반복 일정 지원)
- 이메일 알림 (Gmail → 관리자)
- 이메일 내 승인/거절 버튼
- 상태 표시 (대기중/승인/거절)
