import { ClubAuthError, requireClubAdmin } from '@/lib/clubAuth';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';

import type { NextApiRequest, NextApiResponse } from 'next';

const PARKING_FIELDS = {
  parkingEnabled: true,
  parkingWeekdayCapacity: true,
  parkingWeekendCapacity: true,
  parkingSmsEnabled: true,
} as const;

const DEFAULT_SETTINGS = {
  parkingEnabled: false,
  parkingWeekdayCapacity: 0,
  parkingWeekendCapacity: 0,
  parkingSmsEnabled: false,
};

/** 음수나 소수가 들어오지 않도록 정수로 다듬는다 */
function toCapacity(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
}

export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse
) {
  const clubId = Number(req.query.id);
  if (!Number.isInteger(clubId)) {
    return res.status(400).json({ error: '잘못된 클럽 ID입니다' });
  }

  if (req.method === 'GET') {
    try {
      const settings = await prisma.clubCustomSettings.findUnique({
        where: { clubId },
        select: PARKING_FIELDS,
      });
      return res.status(200).json(settings ?? DEFAULT_SETTINGS);
    } catch (error) {
      console.error('주차 설정 조회 중 오류 발생:', error);
      return res.status(500).json({ error: '주차 설정을 불러오지 못했습니다' });
    }
  }

  if (req.method === 'PUT') {
    try {
      await requireClubAdmin(req.user.id, clubId);

      const data = {
        parkingEnabled: Boolean(req.body.parkingEnabled),
        parkingWeekdayCapacity: toCapacity(req.body.parkingWeekdayCapacity),
        parkingWeekendCapacity: toCapacity(req.body.parkingWeekendCapacity),
        parkingSmsEnabled: Boolean(req.body.parkingSmsEnabled),
      };

      const settings = await prisma.clubCustomSettings.upsert({
        where: { clubId },
        update: data,
        create: { clubId, ...data },
        select: PARKING_FIELDS,
      });

      return res.status(200).json(settings);
    } catch (error) {
      if (error instanceof ClubAuthError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error('주차 설정 변경 중 오류 발생:', error);
      return res.status(500).json({ error: '주차 설정을 저장하지 못했습니다' });
    }
  }

  res.setHeader('Allow', ['GET', 'PUT']);
  return res.status(405).json({ error: '허용되지 않는 메소드입니다' });
});
