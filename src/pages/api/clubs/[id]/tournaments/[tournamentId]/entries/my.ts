import { requireClubMember } from '@/lib/clubAuth';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import {
  firstQueryValue,
  handleApiError,
  parseClubId,
} from '@/lib/tournament/apiHelpers';

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
    await requireClubMember(req.user.id, clubId);

    // 본인 신청서이므로 민감정보를 포함해 반환한다
    const entry = await prisma.tournamentEntry.findUnique({
      where: { tournamentId_userId: { tournamentId, userId: req.user.id } },
      include: {
        players: { orderBy: { order: 'asc' } },
        entryEvents: {
          include: {
            eventOption: true,
            eventPlayers: { select: { entryPlayerId: true } },
          },
        },
      },
    });

    return res.status(200).json({
      data: { entry },
      message: entry ? '신청 내역을 불러왔습니다.' : '신청 내역이 없습니다.',
    });
  } catch (error) {
    return handleApiError(res, error);
  }
});
