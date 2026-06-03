import 'dotenv/config';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

try {
  await transporter.verify();
  console.log('SMTP connection: OK');
  console.log('From:', process.env.SMTP_USER);
  console.log('To (admin):', process.env.ADMIN_EMAIL);

  const info = await transporter.sendMail({
    from: `"카나다광림교회 공간신청" <${process.env.SMTP_USER}>`,
    to: process.env.ADMIN_EMAIL,
    subject: '[테스트] 공간신청 시스템 이메일 발송 테스트',
    html: `<h2>이메일 발송 테스트</h2><p>이 메일이 도착했다면, 공간신청 시스템의 이메일 알림이 정상 작동합니다.</p><p>발송 시각: ${new Date().toLocaleString('ko-KR')}</p>`,
  });
  console.log('Test email sent. messageId:', info.messageId);
} catch (e) {
  console.error('Error:', e.message);
}
