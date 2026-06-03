# 카나다광림교회 공간 신청 시스템

> **세션 시작 시 필수**: `Second Brain/RULES.md`와 이 프로젝트의 `CONTEXT.md`를 먼저 Read한 뒤 작업 시작. Second Brain이 마운트되지 않았다면 사용자에게 마운트 요청.

## 프로젝트 개요
교회 건물 3개(웨슬리홀, 비전홀, 다니엘홀), 장소 22개의 공간 예약/관리 웹 애플리케이션

## 기술 스택
- **Frontend**: React (Vite) + FullCalendar
- **Backend**: Node.js + Express
- **Database**: SQLite (better-sqlite3)
- **Email**: Nodemailer (Gmail SMTP)
- **Hosting**: Vercel/Railway 배포 대상

## 디렉토리 구조
```
├── client/          # React 프론트엔드
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── App.jsx
│   └── package.json
├── server/          # Express 백엔드
│   ├── routes/
│   ├── db/
│   ├── services/
│   └── index.js
├── CLAUDE.md
├── CONTEXT.md
└── WIREFRAMES.md
```

## 명령어
- `cd client && npm run dev` — 프론트엔드 개발 서버
- `cd server && npm run dev` — 백엔드 개발 서버
- `cd server && npm run db:init` — DB 초기화

## 코딩 규칙
- UI 텍스트: 한국어
- 코드(변수/함수): 영어
- 컴포넌트 파일: PascalCase
- API 라우트: kebab-case
