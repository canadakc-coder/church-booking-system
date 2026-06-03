import { Router } from 'express';

const router = Router();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'kmcreservation@gmail.com';

// POST /api/auth/google — Google ID 토큰 검증
router.post('/google', async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ error: 'Google credential이 필요합니다.' });
  }

  try {
    // Google ID 토큰 디코딩 (JWT payload 추출)
    const payload = decodeGoogleToken(credential);

    if (!payload || !payload.email) {
      return res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
    }

    const isAdmin = payload.email === ADMIN_EMAIL;

    res.json({
      email: payload.email,
      name: payload.name || '',
      picture: payload.picture || '',
      isAdmin,
    });
  } catch (error) {
    console.error('Google auth error:', error.message);
    res.status(401).json({ error: '인증에 실패했습니다.' });
  }
});

// GET /api/auth/admin-email — 관리자 이메일 확인용 (클라이언트에서 Google Client ID와 함께 사용)
router.get('/config', (req, res) => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    adminEmail: ADMIN_EMAIL,
  });
});

// JWT 토큰 디코딩 (Google ID Token은 base64url 인코딩된 JWT)
function decodeGoogleToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = parts[1];
    // base64url → base64
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = Buffer.from(base64, 'base64').toString('utf-8');
    return JSON.parse(jsonStr);
  } catch (e) {
    return null;
  }
}

export default router;
