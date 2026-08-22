import { requireClubAdmin, requireClubMember } from '@/lib/clubAuth';
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

// 트랜잭션 안에서 마감을 감지했을 때 롤백시키기 위한 신호용 에러.
// 클래스 선언은 호이스팅되지 않으므로 반드시 사용처보다 위에 둔다.
class EntryClosedError extends Error {}

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
    // ---------- 관리자: 전체 신청 현황 ----------
    if (req.method === 'GET') {
      await requireClubAdmin(req.user.id, clubId);

      const entries = await prisma.tournamentEntry.findMany({
        where: { tournamentId, tournament: { clubId } },
        orderBy: { createdAt: 'asc' },
        include: {
          clubMember: { select: { id: true, name: true } },
          players: { orderBy: { order: 'asc' } },
          entryEvents: {
            include: {
              eventType: true,
              eventPlayers: { include: { entryPlayer: true } },
            },
          },
        },
      });

      return res
        .status(200)
        .json({ data: { entries }, message: '신청 현황을 불러왔습니다.' });
    }

    // ---------- 회원: 신청 제출 ----------
    if (req.method === 'POST') {
      const member = await requireClubMember(req.user.id, clubId);

      const parsed = entrySubmissionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error:
            parsed.error.errors[0]?.message ?? '입력값이 올바르지 않습니다.',
          status: 400,
        });
      }
      // privacyAgreed는 zod가 true만 통과시키므로 여기서 항상 true다
      const input = { ...parsed.data, privacyAgreed: true as const };

      const tournament = await prisma.tournament.findFirst({
        where: { id: tournamentId, clubId },
        include: { eventTypes: true },
      });
      if (!tournament) {
        return res
          .status(404)
          .json({ error: '대회를 찾을 수 없습니다.', status: 404 });
      }

      const validation = validateEntrySubmission(input, tournament);
      if (!validation.ok) {
        return res.status(400).json({ error: validation.error, status: 400 });
      }

      const feeById = new Map(
        tournament.eventTypes.map((eventType) => [eventType.id, eventType.fee])
      );
      // 추가금을 쓰지 않는 대회면 모든 선수를 회원으로 취급해 추가금을 0으로 만든다
      const useSurcharge = tournament.nonMemberSurcharge > 0;
      const surchargePlayers = input.players.map((player) => ({
        key: player.key,
        isLocalMember: useSurcharge ? player.isLocalMember : true,
      }));

      // 클라이언트가 보낸 금액은 무시하고 DB 값으로 종목별 금액을 계산한다.
      // 이 값이 EntryEvent.fee 스냅샷이자 totalFee의 재료가 된다.
      const feeByEventIndex = input.events.map((event) =>
        calculateEventFee({
          baseFee: feeById.get(event.eventTypeId) ?? 0,
          surcharge: tournament.nonMemberSurcharge,
          playerKeys: event.playerKeys,
          players: surchargePlayers,
        })
      );
      const totalFee = calculateTotalFee(
        feeByEventIndex.map((fee) => ({ fee, status: 'ACTIVE' as const }))
      );

      const created = await prisma.$transaction(async (tx) => {
        // 마감 여부를 트랜잭션 안에서 재확인한다.
        // 폼을 열어둔 채 마감이 지나는 경우를 잡는다.
        const fresh = await tx.tournament.findUnique({
          where: { id: tournamentId },
          select: { status: true, applyStartAt: true, applyDeadline: true },
        });
        if (!fresh || !isAcceptingEntries(fresh, new Date())) {
          throw new EntryClosedError();
        }

        const entry = await tx.tournamentEntry.create({
          data: {
            tournamentId,
            userId: req.user.id,
            clubMemberId: member.id,
            depositorName: input.depositorName,
            teamName: tournament.useTeamName ? (input.teamName ?? null) : null,
            totalFee,
            privacyAgreedAt: new Date(),
          },
        });

        // 선수를 먼저 만들고, 폼의 임시 key를 실제 id로 매핑한다
        const keyToPlayerId = new Map<string, string>();
        for (const player of input.players) {
          const createdPlayer = await tx.entryPlayer.create({
            data: {
              entryId: entry.id,
              name: player.name,
              gender: player.gender,
              birthDate: player.birthDate,
              phoneNumber: player.phoneNumber,
              tshirtSize:
                tournament.tshirtSizes.length > 0
                  ? (player.tshirtSize ?? null)
                  : null,
              isLocalMember: useSurcharge ? player.isLocalMember : true,
              order: player.order,
            },
          });
          keyToPlayerId.set(player.key, createdPlayer.id);
        }

        for (const [index, event] of input.events.entries()) {
          const entryEvent = await tx.entryEvent.create({
            data: {
              entryId: entry.id,
              eventTypeId: event.eventTypeId,
              ageGroup: event.ageGroup,
              level: event.level,
              // 추가금이 반영된 최종 금액을 스냅샷으로 남긴다.
              // 종목 취소 시 이 금액이 통째로 빠진다.
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

        return entry;
      });

      return res
        .status(201)
        .json({ data: { entry: created }, message: '신청이 완료되었습니다.' });
    }

    return res
      .status(405)
      .json({ error: '허용되지 않는 메소드입니다.', status: 405 });
  } catch (error) {
    if (error instanceof EntryClosedError) {
      return res
        .status(400)
        .json({ error: '신청이 마감되었습니다.', status: 400 });
    }
    // 같은 회원이 두 번 제출한 경우 (@@unique 위반)
    if (
      typeof error === 'object' &&
      error !== null &&
      (error as { code?: string }).code === 'P2002'
    ) {
      return res.status(409).json({
        error: '이미 신청하셨습니다. 내 신청에서 수정해주세요.',
        status: 409,
      });
    }
    return handleApiError(res, error);
  }
});
