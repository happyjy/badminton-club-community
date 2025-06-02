import { GuestPost } from '@prisma/client';
import { NextApiRequest } from 'next';
import { createTransport } from 'nodemailer';

import { getBaseUrl } from '@/constants/urls';

import { generateGuestApplicationEmailTemplate } from './email/templates/guestApplication';

const transporter = createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export async function sendGuestApplicationEmail(
  req: NextApiRequest,
  application: GuestPost
) {
  const url = `${getBaseUrl(req.headers.host)}/clubs/1/guest/${application.id}`;

  // 유니크한 식별자 생성
  const timestamp = Date.now();
  const uniqueId = `${application.id}-${timestamp}`;

  // Gmail은 '+' 이후의 문자를 무시하므로 이를 활용
  const fromEmail = process.env.EMAIL_USER?.replace('@', `+guest${uniqueId}@`);

  const mailOptions = {
    from: `"배드민턴 클럽 커뮤니티" <${fromEmail}>`,
    // todo: DB로 관리할 필요 있음
    to: 'okwoyjy@gmail.com, Jongin.oh@gmail.com, sm831217@gmail.com',
    subject: `배드민턴 클럽 게스트 신청: ${application.name}님`,
    // 확실히 스레드가 끊어지도록 하기 위한 추가 헤더
    headers: {
      'X-Entity-Ref-ID': uniqueId,
      'X-Transaction-ID': uniqueId,
    },
    html: generateGuestApplicationEmailTemplate(application, url),
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('이메일 전송 중 오류 발생:', error);
    throw error;
  }
}
