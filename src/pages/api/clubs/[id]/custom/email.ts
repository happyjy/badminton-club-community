import { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';

// 클럽 이메일 설정 관리
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  const clubId = parseInt(id as string);

  if (req.method === 'GET') {
    try {
      const settings = await prisma.clubCustomSettings.findUnique({
        where: { clubId },
        select: {
          emailRecipients: true,
        },
      });

      res.status(200).json(settings || {});
    } catch (error) {
      console.error('Error fetching email settings:', error);
      res.status(500).json({ error: 'Failed to fetch email settings' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { emailRecipients } = req.body;

      // 쉼표로 구분된 이메일 주소를 배열로 변환
      const emailRecipientsArray = emailRecipients
        .split(',')
        .map((email: string) => email.trim())
        .filter((email: string) => email.length > 0);

      const settings = await prisma.clubCustomSettings.upsert({
        where: { clubId },
        update: {
          emailRecipients: emailRecipientsArray,
        },
        create: {
          clubId,
          emailRecipients: emailRecipientsArray,
        },
      });

      res.status(200).json(settings);
    } catch (error) {
      console.error('Error updating email settings:', error);
      res.status(500).json({ error: 'Failed to update email settings' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
