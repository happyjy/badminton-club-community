import { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';

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
          tournamentMenuEnabled: true,
        },
      });

      // 설정 행이 없는 클럽은 기본값(메뉴 노출)으로 응답한다.
      res.status(200).json(settings || { tournamentMenuEnabled: true });
    } catch (error) {
      console.error('Error fetching menu settings:', error);
      res.status(500).json({ error: 'Failed to fetch menu settings' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { tournamentMenuEnabled } = req.body;

      if (typeof tournamentMenuEnabled !== 'boolean') {
        return res
          .status(400)
          .json({ error: 'tournamentMenuEnabled must be a boolean' });
      }

      const settings = await prisma.clubCustomSettings.upsert({
        where: { clubId },
        update: {
          tournamentMenuEnabled,
        },
        create: {
          clubId,
          tournamentMenuEnabled,
        },
        select: {
          tournamentMenuEnabled: true,
        },
      });

      res.status(200).json(settings);
    } catch (error) {
      console.error('Error updating menu settings:', error);
      res.status(500).json({ error: 'Failed to update menu settings' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
