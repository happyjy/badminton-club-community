import { requireClubAdmin, requireClubMember } from '@/lib/clubAuth';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import { handleApiError, parseClubId } from '@/lib/tournament/apiHelpers';
import { resolveTournamentStatus } from '@/lib/tournament/status';
import { tournamentInputSchema } from '@/schemas/tournament.schema';

import type { NextApiRequest, NextApiResponse } from 'next';

export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse
) {
  const clubId = parseClubId(req.query.id);
  if (!clubId) {
    return res
      .status(400)
      .json({ error: '클럽 ID가 필요합니다.', status: 400 });
  }

  try {
    if (req.method === 'GET') {
      const member = await requireClubMember(req.user.id, clubId);
      const isAdmin = member.role === 'ADMIN';

      const tournaments = await prisma.tournament.findMany({
        // 일반 회원에게는 DRAFT 대회를 숨긴다
        where: {
          clubId,
          ...(isAdmin ? {} : { status: { not: 'DRAFT' } }),
        },
        orderBy: { applyDeadline: 'desc' },
        include: {
          eventOptions: { orderBy: { order: 'asc' } },
          _count: { select: { entries: true } },
        },
      });

      const now = new Date();
      const data = tournaments.map((tournament) => ({
        ...tournament,
        effectiveStatus: resolveTournamentStatus(tournament, now),
        entryCount: tournament._count.entries,
      }));

      return res.status(200).json({
        data: { tournaments: data },
        message: '대회 목록을 불러왔습니다.',
      });
    }

    if (req.method === 'POST') {
      const member = await requireClubAdmin(req.user.id, clubId);

      const parsed = tournamentInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error:
            parsed.error.errors[0]?.message ?? '입력값이 올바르지 않습니다.',
          status: 400,
        });
      }
      const input = parsed.data;

      const created = await prisma.tournament.create({
        data: {
          clubId,
          title: input.title,
          hostName: input.hostName ?? null,
          description: input.description ?? null,
          tournamentDate: input.tournamentDate ?? null,
          location: input.location ?? null,
          applyStartAt: input.applyStartAt
            ? new Date(input.applyStartAt)
            : null,
          applyDeadline: new Date(input.applyDeadline),
          status: input.status,
          useTeamName: input.useTeamName,
          tshirtSizes: input.tshirtSizes,
          bankAccount: input.bankAccount ?? null,
          createdBy: member.id,
          eventOptions: {
            create: input.eventOptions.map((option, index) => ({
              eventType: option.eventType,
              ageGroup: option.ageGroup,
              level: option.level,
              playerCount: option.playerCount,
              fee: option.fee,
              order: option.order ?? index,
            })),
          },
        },
        include: { eventOptions: { orderBy: { order: 'asc' } } },
      });

      return res.status(201).json({
        data: { tournament: created },
        message: '대회를 생성했습니다.',
      });
    }

    return res
      .status(405)
      .json({ error: '허용되지 않는 메소드입니다.', status: 405 });
  } catch (error) {
    return handleApiError(res, error);
  }
});
