export const buildings = [
  { id: 'wesley', name: '웨슬리홀', name_en: 'Wesley Hall' },
  { id: 'vision', name: '비전홀', name_en: 'Vision Hall' },
  { id: 'daniel', name: '다니엘홀', name_en: 'Daniel Hall' },
];

export const rooms = [
  // 웨슬리홀 1층
  { id: 'wesley-1f-dining', building_id: 'wesley', floor: '1F', name: '식당', name_en: 'Dining Hall' },
  { id: 'wesley-1f-kitchen', building_id: 'wesley', floor: '1F', name: '주방', name_en: 'Kitchen' },
  { id: 'wesley-1f-small-group', building_id: 'wesley', floor: '1F', name: '소그룹실', name_en: 'Small Group Room' },
  // 웨슬리홀 2층
  { id: 'wesley-2f-sanctuary', building_id: 'wesley', floor: '2F', name: '본당', name_en: 'Sanctuary' },
  { id: 'wesley-2f-mothers-room', building_id: 'wesley', floor: '2F', name: '자모실', name_en: "Mothers' Room" },
  { id: 'wesley-2f-office', building_id: 'wesley', floor: '2F', name: '사무실', name_en: 'Office' },
  { id: 'wesley-2f-broadcast', building_id: 'wesley', floor: '2F', name: '방송실', name_en: 'Broadcast Room' },
  // 비전홀 1층
  { id: 'vision-1f-faith-chapel', building_id: 'vision', floor: '1F', name: '믿음채플', name_en: 'Faith Chapel' },
  { id: 'vision-1f-hope-chapel', building_id: 'vision', floor: '1F', name: '소망채플', name_en: 'Hope Chapel' },
  { id: 'vision-1f-love-chapel', building_id: 'vision', floor: '1F', name: '사랑채플', name_en: 'Love Chapel' },
  { id: 'vision-1f-small-group-1', building_id: 'vision', floor: '1F', name: '소그룹실1', name_en: 'Small Group Room 1' },
  { id: 'vision-1f-small-group-2', building_id: 'vision', floor: '1F', name: '소그룹실2', name_en: 'Small Group Room 2' },
  { id: 'vision-1f-small-group-3', building_id: 'vision', floor: '1F', name: '소그룹실3', name_en: 'Small Group Room 3' },
  { id: 'vision-1f-finance', building_id: 'vision', floor: '1F', name: '재무부실', name_en: 'Finance Office' },
  // 비전홀 2층
  { id: 'vision-2f-vision-chapel', building_id: 'vision', floor: '2F', name: '비전채플', name_en: 'Vision Chapel' },
  { id: 'vision-2f-gloria', building_id: 'vision', floor: '2F', name: '글로리아실', name_en: 'Gloria Room' },
  { id: 'vision-2f-small-group-a', building_id: 'vision', floor: '2F', name: '소그룹실A', name_en: 'Small Group Room A' },
  { id: 'vision-2f-small-group-b', building_id: 'vision', floor: '2F', name: '소그룹실B', name_en: 'Small Group Room B' },
  { id: 'vision-2f-fellowship', building_id: 'vision', floor: '2F', name: '친교실', name_en: 'Fellowship Room' },
  { id: 'vision-2f-broadcast', building_id: 'vision', floor: '2F', name: '비전홀 방송실', name_en: 'Vision Hall Broadcast' },
  { id: 'vision-2f-copy-room', building_id: 'vision', floor: '2F', name: '복사실', name_en: 'Copy Room' },
  // 다니엘홀
  { id: 'daniel-small-group', building_id: 'daniel', floor: null, name: '소그룹실', name_en: 'Small Group Room' },
  { id: 'daniel-medium-group', building_id: 'daniel', floor: null, name: '중그룹실', name_en: 'Medium Group Room' },
];
