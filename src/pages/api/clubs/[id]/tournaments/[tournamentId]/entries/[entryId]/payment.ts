import { z } from 'zod';

import { requireClubAdmin } from '@/lib/clubAuth';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import {
  firstQueryValue,
  handleApiError,
  parseClubId,
} from '@/lib/tournament/apiHelpers';

import type { NextApiRequest, NextApiResponse } from 'next';

const paymentSchema = z.object({
  paymentStatus: z.enum(['PENDING', 'CONFIRMED', 'CANCELED']),
});

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
  if (!clubId || !tournamentId || !entryId) {
    return res.status(400).json({ error: '잘못된 요청입니다.', status: 400 });
  }

  try {
    await requireClubAdmin(req.user.id, clubId);

    const parsed = paymentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: '입금 상태 값이 올바르지 않습니다.', status: 400 });
    }

    const entry = await prisma.tournamentEntry.findFirst({
      where: { id: entryId, tournamentId, tournament: { clubId } },
      select: { id: true },
    });
    if (!entry) {
      return res
        .status(404)
        .json({ error: '신청 내역을 찾을 수 없습니다.', status: 404 });
    }

    // 입금 상태는 마감 후에도 변경할 수 있다 (통장 확인이 늦어질 수 있음)
    const updated = await prisma.tournamentEntry.update({
      where: { id: entryId },
      data: { paymentStatus: parsed.data.paymentStatus },
      select: { id: true, paymentStatus: true },
    });

    return res
      .status(200)
      .json({ data: { entry: updated }, message: '입금 상태를 변경했습니다.' });
  } catch (error) {
    return handleApiError(res, error);
  }
});
