// 공간 색상 — 건물 + 층 단위 5분류
// 웨슬리홀 1F / 웨슬리홀 2F / 비전홀 1F / 비전홀 2F / 다니엘홀
// 건물 정체성(웨슬리=파랑, 비전=주황)은 유지하면서 층을 밝기로 구분
const SPACE_COLORS = {
  'wesley|1F': { bg: '#4299e1', border: '#2b6cb0', label: '웨슬리홀 1F' }, // 밝은 파랑
  'wesley|2F': { bg: '#2b6cb0', border: '#1a4971', label: '웨슬리홀 2F' }, // 진한 파랑
  'vision|1F': { bg: '#ed8936', border: '#c05621', label: '비전홀 1F' },   // 밝은 주황
  'vision|2F': { bg: '#c05621', border: '#9c4221', label: '비전홀 2F' },   // 진한 주황
  'daniel|':   { bg: '#38a169', border: '#2f855a', label: '다니엘홀' },     // 녹색
};

const FALLBACK = { bg: '#718096', border: '#4a5568', label: '기타' };

// (건물 id, 층) → 색상. 층이 없거나(다니엘) 매칭 실패 시 건물 단위로 fallback
export function getSpaceColor(buildingId, floor) {
  const key = `${buildingId}|${floor || ''}`;
  if (SPACE_COLORS[key]) return SPACE_COLORS[key];
  const byBuilding = Object.entries(SPACE_COLORS).find(([k]) => k.startsWith(`${buildingId}|`));
  return byBuilding ? byBuilding[1] : FALLBACK;
}

// 범례용 5분류 목록 (정의 순서 = 표시 순서)
export const SPACE_LEGEND = Object.values(SPACE_COLORS);
