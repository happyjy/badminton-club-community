import { requireClubAdmin } from '@/lib/clubAuth';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import {
  firstQueryValue,
  handleApiError,
  parseClubId,
} from '@/lib/tournament/apiHelpers';
import { CSV_HEADER, toCsvRows, toCsvString } from '@/lib/tournament/csv';

import type { NextApiRequest, NextApiResponse } from 'next';

export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res
      .status(405)
      .json({ error: '허용되지 않는 메소드입니다.', status: 405 });
  }

  const clubId = parseClubId(req.query.id);
  const tournamentId = firstQueryValue(req.query.tournamentId);
  if (!clubId || !tournamentId) {
    return res.status(400).json({ error: '잘못된 요청입니다.', status: 400 });
  }

  try {
    await requireClubAdmin(req.user.id, clubId);

    const tournament = await prisma.tournament.findFirst({
      where: { id: tournamentId, clubId },
      select: { title: true },
    });
    if (!tournament) {
      return res
        .status(404)
        .json({ error: '대회를 찾을 수 없습니다.', status: 404 });
    }

    const entries = await prisma.tournamentEntry.findMany({
      where: { tournamentId },
      orderBy: { createdAt: 'asc' },
      select: {
        depositorName: true,
        teamName: true,
        paymentStatus: true,
        entryEvents: {
          select: {
            status: true,
            fee: true,
            ageGroup: true,
            level: true,
            eventType: { select: { name: true } },
            eventPlayers: {
              select: {
                entryPlayer: {
                  select: {
                    name: true,
                    gender: true,
                    birthDate: true,
                    phoneNumber: true,
                    tshirtSize: true,
                    isClubMember: true,
                  },
                },
              },
            },
          },
          orderBy: { eventType: { order: 'asc' } },
        },
      },
    });

    const csv = toCsvString([CSV_HEADER, ...toCsvRows(entries)]);
    const filename = encodeURIComponent(`${tournament.title}_참가신청.csv`);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${filename}`
    );
    return res.status(200).send(csv);
  } catch (error) {
    return handleApiError(res, error);
  }
});
