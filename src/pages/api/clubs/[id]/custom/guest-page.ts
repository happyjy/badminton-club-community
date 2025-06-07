import { PrismaClient } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id: clubId } = req.query;

  if (!clubId || typeof clubId !== 'string') {
    return res.status(400).json({ message: '클럽 ID가 필요합니다.' });
  }

  // GET: 게스트 페이지 설정 조회
  if (req.method === 'GET') {
    try {
      const settings = await prisma.clubCustomSettings.findUnique({
        where: { clubId: parseInt(clubId) },
        select: {
          inquiryDescription: true,
          guestDescription: true,
        },
      });

      return res.status(200).json(settings);
    } catch (error) {
      console.error('Error fetching guest page settings:', error);
      return res
        .status(500)
        .json({ message: '설정을 불러오는데 실패했습니다.' });
    }
  }

  // PATCH: 게스트 페이지 설정 업데이트
  if (req.method === 'PATCH') {
    try {
      const { inquiryDescription, guestDescription } = req.body;

      const settings = await prisma.clubCustomSettings.upsert({
        where: { clubId: parseInt(clubId) },
        update: {
          inquiryDescription,
          guestDescription,
        },
        create: {
          clubId: parseInt(clubId),
          inquiryDescription,
          guestDescription,
        },
      });

      return res.status(200).json(settings);
    } catch (error) {
      console.error('Error updating guest page settings:', error);
      return res
        .status(500)
        .json({ message: '설정을 저장하는데 실패했습니다.' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
