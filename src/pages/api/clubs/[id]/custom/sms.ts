import { prisma } from '@/lib/prisma';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  const clubId = parseInt(id as string);

  if (!clubId) {
    return res.status(400).json({ error: 'Invalid club ID' });
  }

  if (req.method === 'GET') {
    try {
      const settings = await prisma.clubCustomSettings.findUnique({
        where: { clubId },
        select: {
          smsRecipients: true,
        },
      });

      res.status(200).json(settings || {});
    } catch (error) {
      console.error('Error fetching SMS settings:', error);
      res.status(500).json({ error: 'Failed to fetch SMS settings' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { smsRecipients } = req.body;

      // 쉼표로 구분된 전화번호를 배열로 변환
      const smsRecipientsArray = smsRecipients
        .split(',')
        .map((phone: string) => phone.trim())
        .filter((phone: string) => phone.length > 0);

      const settings = await prisma.clubCustomSettings.upsert({
        where: { clubId },
        update: {
          smsRecipients: smsRecipientsArray,
        },
        create: {
          clubId,
          smsRecipients: smsRecipientsArray,
        },
      });

      res.status(200).json(settings);
    } catch (error) {
      console.error('Error updating SMS settings:', error);
      res.status(500).json({ error: 'Failed to update SMS settings' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
