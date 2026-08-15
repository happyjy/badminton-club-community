import { requireClubMember } from '@/lib/clubAuth';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import {
  firstQueryValue,
  handleApiError,
  parseClubId,
} from '@/lib/tournament/apiHelpers';
import { resolveEntryStateAfterCancel } from '@/lib/tournament/cancel';
import { isAcceptingEntries } from '@/lib/tournament/status';

import type { NextApiRequest, NextApiResponse } from 'next';

export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse
) {
  if (req.method !== 'PATCH') {
    return res
      .status(405)
      .json({ error: '허용되지 않는 메소드입니다.', status: 405 });
  }

  const clubId = parseClubId(req.query.id);
  const tournamentId = firstQueryValue(req.query.tournamentId);
  const entryId = firstQueryValue(req.query.entryId);
  const entryEventId = firstQueryValue(req.query.entryEventId);
  if (!clubId || !tournamentId || !entryId || !entryEventId) {
    return res.status(400).json({ error: '잘못된 요청입니다.', status: 400 });
  }

  try {
    await requireClubMember(req.user.id, clubId);

    const entry = await prisma.tournamentEntry.findFirst({
      where: { id: entryId, tournamentId, tournament: { clubId } },
      include: { tournament: true, entryEvents: true },
    });
    if (!entry) {
      return res
        .status(404)
        .json({ error: '신청 내역을 찾을 수 없습니다.', status: 404 });
    }
    if (entry.userId !== req.user.id) {
      return res.status(403).json({ error: '권한이 없습니다.', status: 403 });
    }
    if (!isAcceptingEntries(entry.tournament, new Date())) {
      return res
        .status(400)
        .json({ error: '신청이 마감되었습니다.', status: 400 });
    }

    const target = entry.entryEvents.find((event) => event.id === entryEventId);
    if (!target) {
      return res
        .status(404)
        .json({ error: '신청 종목을 찾을 수 없습니다.', status: 404 });
    }
    if (target.status === 'CANCELED') {
      return res
        .status(400)
        .json({ error: '이미 취소된 종목입니다.', status: 400 });
    }

    const next = resolveEntryStateAfterCancel(
      entry.entryEvents,
      entry.paymentStatus,
      entryEventId
    );

    await prisma.$transaction([
      prisma.entryEvent.update({
        where: { id: entryEventId },
        data: { status: 'CANCELED', canceledAt: new Date() },
      }),
      prisma.tournamentEntry.update({
        where: { id: entryId },
        data: {
          totalFee: next.totalFee,
          paymentStatus: next.paymentStatus,
        },
      }),
    ]);

    return res.status(200).json({
      data: {
        entryEventId,
        totalFee: next.totalFee,
        allCanceled: next.allCanceled,
      },
      message: next.allCanceled
        ? '신청이 모두 취소되었습니다.'
        : '해당 종목 신청을 취소했습니다.',
    });
  } catch (error) {
    return handleApiError(res, error);
  }
});
