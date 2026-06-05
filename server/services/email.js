import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ── 장소 표기 헬퍼: places 배열이 있으면 그대로, 없으면 단일 room/building에서 생성 ──
function formatPlaces(places, room, building) {
  const list = (Array.isArray(places) && places.length > 0)
    ? places
    : [`${building?.name || ''} ${room?.floor || ''} - ${room?.name || ''}`.replace(/\s+/g, ' ').trim()];
  return list;
}
function placesCellHtml(list) {
  if (list.length === 1) return list[0];
  return `<strong>${list.length}개 공간</strong><br>` + list.map((p) => `· ${p}`).join('<br>');
}
function placesSubject(list) {
  return list.length > 1 ? `${list[0]} 외 ${list.length - 1}곳` : (list[0] || '');
}

// ── 관리자에게 신규 신청 알림 ──
export async function sendReservationNotification(reservation, room, building, places) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
  const approveUrl = `${baseUrl}/api/reservations/${reservation.id}/approve?token=${reservation.approval_token}`;
  const rejectUrl = `${baseUrl}/api/reservations/${reservation.id}/reject?token=${reservation.approval_token}`;
  const placeList = formatPlaces(places, room, building);

  const recurrenceText = reservation.recurrence_type === 'weekly'
    ? `매주 반복 (종료: ${reservation.recurrence_end_date || '1년'})`
    : reservation.recurrence_type === 'monthly'
      ? `매월 반복 (종료: ${reservation.recurrence_end_date || '1년'})`
      : '반복 없음';

  const html = `
    <div style="font-family: 'Apple SD Gothic Neo', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1a365d; border-bottom: 2px solid #3182ce; padding-bottom: 10px;">
        [카나다광림교회] 공간 신청 알림
      </h2>
      <p>새로운 공간 신청이 접수되었습니다.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr><td style="padding: 8px; font-weight: bold; width: 120px;">신청자</td><td style="padding: 8px;">${reservation.applicant_name}</td></tr>
        <tr style="background: #f7fafc;"><td style="padding: 8px; font-weight: bold;">소속</td><td style="padding: 8px;">${reservation.department}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold; vertical-align: top;">장소</td><td style="padding: 8px;">${placesCellHtml(placeList)}</td></tr>
        <tr style="background: #f7fafc;"><td style="padding: 8px; font-weight: bold;">날짜</td><td style="padding: 8px;">${reservation.date}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">시간</td><td style="padding: 8px;">${reservation.start_time} ~ ${reservation.end_time}</td></tr>
        <tr style="background: #f7fafc;"><td style="padding: 8px; font-weight: bold;">용도</td><td style="padding: 8px;">${reservation.purpose}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">전화번호</td><td style="padding: 8px;">${reservation.contact}</td></tr>
        <tr style="background: #f7fafc;"><td style="padding: 8px; font-weight: bold;">이메일</td><td style="padding: 8px;">${reservation.applicant_email || '-'}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">반복</td><td style="padding: 8px;">${recurrenceText}</td></tr>
        ${reservation.notes ? `<tr style="background: #f7fafc;"><td style="padding: 8px; font-weight: bold;">비고</td><td style="padding: 8px;">${reservation.notes}</td></tr>` : ''}
      </table>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${approveUrl}" style="display: inline-block; padding: 12px 32px; background: #38a169; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin-right: 16px;">✓ 승인</a>
        <a href="${rejectUrl}" style="display: inline-block; padding: 12px 32px; background: #e53e3e; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">✗ 거절</a>
      </div>
      <p style="color: #718096; font-size: 12px; margin-top: 30px;">이 이메일은 카나다광림교회 공간 신청 시스템에서 자동 발송되었습니다.</p>
    </div>
  `;

  const mailOptions = {
    from: `"카나다광림교회 공간신청" <${process.env.SMTP_USER}>`,
    to: process.env.NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL || 'canadakc@gmail.com',
    replyTo: reservation.applicant_email || undefined,
    subject: `[공간신청] ${reservation.applicant_name} - ${placesSubject(placeList)} (${reservation.date})`,
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Notification email sent for reservation:', reservation.id);
  } catch (error) {
    console.error('Failed to send email:', error.message);
  }
}

// ── 신청자에게 승인 알림 ──
export async function sendApprovalNotification(reservation, room, building, places) {
  if (!reservation.applicant_email) {
    console.log('No applicant email, skipping approval notification.');
    return;
  }
  const placeList = formatPlaces(places, room, building);

  const html = `
    <div style="font-family: 'Apple SD Gothic Neo', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #38a169; border-bottom: 2px solid #38a169; padding-bottom: 10px;">
        [카나다광림교회] 공간 신청 승인
      </h2>
      <p>${reservation.applicant_name}님, 공간 신청이 <strong style="color: #38a169;">승인</strong>되었습니다.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr><td style="padding: 8px; font-weight: bold; width: 120px; vertical-align: top;">장소</td><td style="padding: 8px;">${placesCellHtml(placeList)}</td></tr>
        <tr style="background: #f7fafc;"><td style="padding: 8px; font-weight: bold;">날짜</td><td style="padding: 8px;">${reservation.date}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">시간</td><td style="padding: 8px;">${reservation.start_time} ~ ${reservation.end_time}</td></tr>
        <tr style="background: #f7fafc;"><td style="padding: 8px; font-weight: bold;">용도</td><td style="padding: 8px;">${reservation.purpose}</td></tr>
      </table>
      <div style="background: #c6f6d5; padding: 16px; border-radius: 8px; text-align: center; margin: 20px 0;">
        <p style="color: #276749; font-size: 1.1rem; font-weight: bold; margin: 0;">✓ 승인되었습니다</p>
        <p style="color: #276749; font-size: 0.85rem; margin: 4px 0 0;">예약하신 공간을 사용하실 수 있습니다.</p>
      </div>
      <p style="color: #718096; font-size: 12px; margin-top: 30px;">이 이메일은 카나다광림교회 공간 신청 시스템에서 자동 발송되었습니다.</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"카나다광림교회 공간신청" <${process.env.SMTP_USER}>`,
      to: reservation.applicant_email,
      subject: `[승인] ${placesSubject(placeList)} 공간 신청이 승인되었습니다 (${reservation.date})`,
      html,
    });
    console.log('Approval notification sent to:', reservation.applicant_email);
  } catch (error) {
    console.error('Failed to send approval email:', error.message);
  }
}

// ── 신청자에게 거절 알림 ──
export async function sendRejectionNotification(reservation, room, building, reason, places) {
  if (!reservation.applicant_email) {
    console.log('No applicant email, skipping rejection notification.');
    return;
  }
  const placeList = formatPlaces(places, room, building);

  const html = `
    <div style="font-family: 'Apple SD Gothic Neo', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #e53e3e; border-bottom: 2px solid #e53e3e; padding-bottom: 10px;">
        [카나다광림교회] 공간 신청 거절
      </h2>
      <p>${reservation.applicant_name}님, 공간 신청이 <strong style="color: #e53e3e;">거절</strong>되었습니다.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr><td style="padding: 8px; font-weight: bold; width: 120px; vertical-align: top;">장소</td><td style="padding: 8px;">${placesCellHtml(placeList)}</td></tr>
        <tr style="background: #f7fafc;"><td style="padding: 8px; font-weight: bold;">날짜</td><td style="padding: 8px;">${reservation.date}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">시간</td><td style="padding: 8px;">${reservation.start_time} ~ ${reservation.end_time}</td></tr>
        <tr style="background: #f7fafc;"><td style="padding: 8px; font-weight: bold;">용도</td><td style="padding: 8px;">${reservation.purpose}</td></tr>
      </table>
      <div style="background: #fed7d7; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <p style="color: #9b2c2c; font-size: 1.1rem; font-weight: bold; margin: 0;">✗ 거절되었습니다</p>
        ${reason ? `<p style="color: #9b2c2c; font-size: 0.9rem; margin: 8px 0 0;"><strong>사유:</strong> ${reason}</p>` : ''}
      </div>
      <p style="color: #4a5568; font-size: 0.9rem;">문의사항이 있으시면 교회 사무실로 연락해주세요.</p>
      <p style="color: #718096; font-size: 12px; margin-top: 30px;">이 이메일은 카나다광림교회 공간 신청 시스템에서 자동 발송되었습니다.</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"카나다광림교회 공간신청" <${process.env.SMTP_USER}>`,
      to: reservation.applicant_email,
      subject: `[거절] ${placesSubject(placeList)} 공간 신청이 거절되었습니다 (${reservation.date})`,
      html,
    });
    console.log('Rejection notification sent to:', reservation.applicant_email);
  } catch (error) {
    console.error('Failed to send rejection email:', error.message);
  }
}
