import { NextApiRequest, NextApiResponse } from 'next';

import { ClubAuthError, requireClubAdminRequest } from '@/lib/clubAuth';
import { prisma } from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  const clubId = parseInt(id as string);

  if (req.method === 'GET') {
    try {
      const [settings, activeFeeTypes] = await Promise.all([
        prisma.clubCustomSettings.findUnique({
          where: { clubId },
          select: {
            tournamentMenuEnabled: true,
          },
        }),
        // 회비를 앱으로 관리하는 클럽에만 회원 메뉴 "내 회비"를 보인다
        prisma.feeType.count({ where: { clubId, isActive: true } }),
      ]);

      // 설정 행이 없는 클럽은 기본값(메뉴 노출)으로 응답한다.
      res.status(200).json({
        tournamentMenuEnabled: settings?.tournamentMenuEnabled ?? true,
        feeMenuEnabled: activeFeeTypes > 0,
      });
    } catch (error) {
      console.error('Error fetching menu settings:', error);
      res.status(500).json({ error: 'Failed to fetch menu settings' });
    }
  } else if (req.method === 'PUT') {
    try {
      await requireClubAdminRequest(req, clubId);

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
      if (error instanceof ClubAuthError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error('Error updating menu settings:', error);
      res.status(500).json({ error: 'Failed to update menu settings' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
