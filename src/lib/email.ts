import { GuestPost, PrismaClient } from '@prisma/client';
import { NextApiRequest } from 'next';
import { createTransport } from 'nodemailer';

import { getBaseUrl } from '@/constants/urls';

import { generateGuestApplicationEmailTemplate } from './email/templates/guestApplication';

const prisma = new PrismaClient();

const transporter = createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export async function sendGuestApplicationEmail({
  req,
  application,
  writer,
}: {
  req: NextApiRequest;
  application: GuestPost;
  writer: string | null;
}) {
  const url = `${getBaseUrl(req.headers.host)}/clubs/${application.clubId}/guest/${application.id}`;

  // 유니크한 식별자 생성
  const timestamp = Date.now();
  const uniqueId = `${application.id}-${timestamp}`;

  // Gmail은 '+' 이후의 문자를 무시하므로 이를 활용
  const fromEmail = process.env.EMAIL_USER?.replace('@', `+guest${uniqueId}@`);

  // 클럽의 이메일 수신자 목록 가져오기
  const clubSettings = await prisma.clubCustomSettings.findUnique({
    where: {
      clubId: application.clubId,
    },
    select: {
      emailRecipients: true,
    },
  });

  // 이메일 수신자 목록이 없는 경우 기본 이메일 사용
  const recipients = clubSettings?.emailRecipients;

  if (!recipients) return;

  const mailOptions = {
    from: `"배드민턴 클럽 커뮤니티" <${fromEmail}>`,
    to: recipients.join(', '),
    subject:
      `배드민턴 클럽 게스트 신청: ` +
      (writer
        ? `${writer}님이 ${application.name}님을 게스트로 초대합니다.`
        : `${application.name}님을 게스트로 초대합니다.`),
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
