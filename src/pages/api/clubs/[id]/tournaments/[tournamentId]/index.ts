import { requireClubAdmin, requireClubMember } from '@/lib/clubAuth';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import {
  firstQueryValue,
  handleApiError,
  parseClubId,
} from '@/lib/tournament/apiHelpers';
import { resolveTournamentStatus } from '@/lib/tournament/status';
import { tournamentInputSchema } from '@/schemas/tournament.schema';

import type { NextApiRequest, NextApiResponse } from 'next';

export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse
) {
  const clubId = parseClubId(req.query.id);
  const tournamentId = firstQueryValue(req.query.tournamentId);
  if (!clubId || !tournamentId) {
    return res.status(400).json({ error: '잘못된 요청입니다.', status: 400 });
  }

  try {
    if (req.method === 'GET') {
      const member = await requireClubMember(req.user.id, clubId);

      const tournament = await prisma.tournament.findFirst({
        where: { id: tournamentId, clubId },
        include: { eventTypes: { orderBy: { order: 'asc' } } },
      });
      if (!tournament) {
        return res
          .status(404)
          .json({ error: '대회를 찾을 수 없습니다.', status: 404 });
      }

      const now = new Date();
      const effectiveStatus = resolveTournamentStatus(tournament, now);

      // DRAFT는 ADMIN만 볼 수 있다
      if (effectiveStatus === 'DRAFT' && member.role !== 'ADMIN') {
        return res
          .status(404)
          .json({ error: '대회를 찾을 수 없습니다.', status: 404 });
      }

      const myEntry = await prisma.tournamentEntry.findUnique({
        where: { tournamentId_userId: { tournamentId, userId: req.user.id } },
        select: { id: true, paymentStatus: true },
      });

      return res.status(200).json({
        data: {
          tournament,
          effectiveStatus,
          myEntryId: myEntry?.id ?? null,
          myEntryPaymentStatus: myEntry?.paymentStatus ?? null,
        },
        message: '대회 정보를 불러왔습니다.',
      });
    }

    if (req.method === 'PATCH') {
      await requireClubAdmin(req.user.id, clubId);

      const parsed = tournamentInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error:
            parsed.error.errors[0]?.message ?? '입력값이 올바르지 않습니다.',
          status: 400,
        });
      }
      const input = parsed.data;

      const existing = await prisma.tournament.findFirst({
        where: { id: tournamentId, clubId },
        include: {
          eventTypes: {
            include: { _count: { select: { entryEvents: true } } },
          },
        },
      });
      if (!existing) {
        return res
          .status(404)
          .json({ error: '대회를 찾을 수 없습니다.', status: 404 });
      }

      const keptIds = new Set(
        input.eventTypes
          .map((eventType) => eventType.id)
          .filter(Boolean) as string[]
      );

      // 신청이 있는 종목의 인원수 변경은 차단한다 (기존 배정이 무효화됨)
      for (const eventType of input.eventTypes) {
        if (!eventType.id) continue;
        const before = existing.eventTypes.find((e) => e.id === eventType.id);
        if (!before) continue;
        if (
          before._count.entryEvents > 0 &&
          before.playerCount !== eventType.playerCount
        ) {
          return res.status(400).json({
            error: `이미 신청이 있는 종목(${before.name})의 인원수는 변경할 수 없습니다.`,
            status: 400,
          });
        }
      }

      await prisma.$transaction(async (tx) => {
        await tx.tournament.update({
          where: { id: tournamentId },
          data: {
            title: input.title,
            hostName: input.hostName ?? null,
            description: input.description ?? null,
            applyNotice: input.applyNotice ?? null,
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
            ageGroups: input.ageGroups,
            levels: input.levels,
          },
        });

        // 목록에서 빠진 종목: 신청이 있으면 비활성화, 없으면 삭제
        for (const before of existing.eventTypes) {
          if (keptIds.has(before.id)) continue;
          if (before._count.entryEvents > 0) {
            await tx.tournamentEventType.update({
              where: { id: before.id },
              data: { isActive: false },
            });
          } else {
            await tx.tournamentEventType.delete({ where: { id: before.id } });
          }
        }

        // 기존 종목 수정 / 신규 종목 생성
        for (const [index, eventType] of input.eventTypes.entries()) {
          const data = {
            name: eventType.name,
            playerCount: eventType.playerCount,
            fee: eventType.fee,
            order: eventType.order ?? index,
            isActive: true,
          };
          if (eventType.id) {
            await tx.tournamentEventType.update({
              where: { id: eventType.id },
              data,
            });
          } else {
            await tx.tournamentEventType.create({
              data: { ...data, tournamentId },
            });
          }
        }
      });

      const updated = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: { eventTypes: { orderBy: { order: 'asc' } } },
      });

      return res.status(200).json({
        data: { tournament: updated },
        message: '대회를 수정했습니다.',
      });
    }

    if (req.method === 'DELETE') {
      await requireClubAdmin(req.user.id, clubId);

      const existing = await prisma.tournament.findFirst({
        where: { id: tournamentId, clubId },
        select: { id: true },
      });
      if (!existing) {
        return res
          .status(404)
          .json({ error: '대회를 찾을 수 없습니다.', status: 404 });
      }

      // Cascade로 종목 옵션·신청서·선수·신청 종목이 모두 함께 삭제된다.
      // EntryEvent → TournamentEventOption 관계에도 Cascade가 있어야
      // 신청이 있는 대회를 지울 때 FK 위반이 나지 않는다.
      await prisma.tournament.delete({ where: { id: tournamentId } });

      return res
        .status(200)
        .json({ data: { id: tournamentId }, message: '대회를 삭제했습니다.' });
    }

    return res
      .status(405)
      .json({ error: '허용되지 않는 메소드입니다.', status: 405 });
  } catch (error) {
    return handleApiError(res, error);
  }
});
