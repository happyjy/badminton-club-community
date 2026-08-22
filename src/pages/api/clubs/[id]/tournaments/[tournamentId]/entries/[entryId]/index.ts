import { requireClubMember } from '@/lib/clubAuth';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import {
  firstQueryValue,
  handleApiError,
  parseClubId,
} from '@/lib/tournament/apiHelpers';
import { calculateEventFee, calculateTotalFee } from '@/lib/tournament/fee';
import { isAcceptingEntries } from '@/lib/tournament/status';
import { validateEntrySubmission } from '@/lib/tournament/validation';
import { entrySubmissionSchema } from '@/schemas/tournament.schema';

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
  if (!clubId || !tournamentId || !entryId) {
    return res.status(400).json({ error: '잘못된 요청입니다.', status: 400 });
  }

  try {
    await requireClubMember(req.user.id, clubId);

    const parsed = entrySubmissionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.errors[0]?.message ?? '입력값이 올바르지 않습니다.',
        status: 400,
      });
    }
    const input = { ...parsed.data, privacyAgreed: true as const };

    const entry = await prisma.tournamentEntry.findFirst({
      where: { id: entryId, tournamentId, tournament: { clubId } },
      include: {
        tournament: { include: { eventTypes: true } },
        entryEvents: true,
      },
    });
    if (!entry) {
      return res
        .status(404)
        .json({ error: '신청 내역을 찾을 수 없습니다.', status: 404 });
    }
    // 본인만 수정할 수 있다 (임원도 수정 불가)
    if (entry.userId !== req.user.id) {
      return res.status(403).json({ error: '권한이 없습니다.', status: 403 });
    }
    if (!isAcceptingEntries(entry.tournament, new Date())) {
      return res
        .status(400)
        .json({ error: '신청이 마감되었습니다.', status: 400 });
    }

    const validation = validateEntrySubmission(input, entry.tournament);
    if (!validation.ok) {
      return res.status(400).json({ error: validation.error, status: 400 });
    }

    const feeById = new Map(
      entry.tournament.eventTypes.map((e) => [e.id, e.fee])
    );
    // 추가금을 쓰지 않는 대회면 모든 선수를 회원으로 취급해 추가금을 0으로 만든다
    const useSurcharge = entry.tournament.nonMemberSurcharge > 0;
    const surchargePlayers = input.players.map((player) => ({
      key: player.key,
      isLocalMember: useSurcharge ? player.isLocalMember : true,
    }));

    // 수정된 선수 구성으로 종목별 금액을 다시 계산한다.
    // 회원 여부를 바꾸면 금액도 함께 갱신되어야 한다.
    const feeByEventIndex = input.events.map((event) =>
      calculateEventFee({
        baseFee: feeById.get(event.eventTypeId) ?? 0,
        surcharge: entry.tournament.nonMemberSurcharge,
        playerKeys: event.playerKeys,
        players: surchargePlayers,
      })
    );
    const canceledEvents = entry.entryEvents.filter(
      (event) => event.status === 'CANCELED'
    );
    const totalFee = calculateTotalFee([
      ...feeByEventIndex.map((fee) => ({ fee, status: 'ACTIVE' as const })),
      ...canceledEvents,
    ]);

    await prisma.$transaction(async (tx) => {
      // 선수는 전체 교체 (이력 불필요)
      await tx.entryPlayer.deleteMany({ where: { entryId } });
      // ACTIVE 종목만 교체하고 CANCELED는 보존한다
      await tx.entryEvent.deleteMany({ where: { entryId, status: 'ACTIVE' } });

      const keyToPlayerId = new Map<string, string>();
      for (const player of input.players) {
        const createdPlayer = await tx.entryPlayer.create({
          data: {
            entryId,
            name: player.name,
            gender: player.gender,
            birthDate: player.birthDate,
            phoneNumber: player.phoneNumber,
            tshirtSize:
              entry.tournament.tshirtSizes.length > 0
                ? (player.tshirtSize ?? null)
                : null,
            isLocalMember: useSurcharge ? player.isLocalMember : true,
            isClubMember: player.isClubMember,
            order: player.order,
          },
        });
        keyToPlayerId.set(player.key, createdPlayer.id);
      }

      for (const [index, event] of input.events.entries()) {
        const entryEvent = await tx.entryEvent.create({
          data: {
            entryId,
            eventTypeId: event.eventTypeId,
            ageGroup: event.ageGroup,
            level: event.level,
            // 추가금이 반영된 최종 금액을 스냅샷으로 남긴다
            fee: feeByEventIndex[index],
          },
        });
        await tx.entryEventPlayer.createMany({
          data: event.playerKeys.map((key) => ({
            entryEventId: entryEvent.id,
            entryPlayerId: keyToPlayerId.get(key) as string,
          })),
        });
      }

      await tx.tournamentEntry.update({
        where: { id: entryId },
        data: {
          depositorName: input.depositorName,
          teamName: entry.tournament.useTeamName
            ? (input.teamName ?? null)
            : null,
          totalFee,
          // 수정 시 취소 상태였다면 다시 대기로 되돌린다
          paymentStatus:
            entry.paymentStatus === 'CANCELED'
              ? 'PENDING'
              : entry.paymentStatus,
        },
      });
    });

    return res
      .status(200)
      .json({ data: { entryId }, message: '신청 내역을 수정했습니다.' });
  } catch (error) {
    return handleApiError(res, error);
  }
});
