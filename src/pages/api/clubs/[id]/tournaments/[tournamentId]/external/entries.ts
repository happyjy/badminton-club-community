import { prisma } from '@/lib/prisma';
import { consumeAttempt, getClientIp } from '@/lib/rateLimit';
import {
  firstQueryValue,
  handleApiError,
  parseClubId,
} from '@/lib/tournament/apiHelpers';
import { normalizeContactName } from '@/lib/tournament/externalEntry';
import { calculateEventFee, calculateTotalFee } from '@/lib/tournament/fee';
import { isAcceptingEntries } from '@/lib/tournament/status';
import { validateEntrySubmission } from '@/lib/tournament/validation';
import { externalEntrySubmissionSchema } from '@/schemas/tournament.schema';

import type { NextApiRequest, NextApiResponse } from 'next';

// 트랜잭션 안에서 마감을 감지했을 때 롤백시키기 위한 신호용 에러
class EntryClosedError extends Error {}

/**
 * 로그인 없이 대회에 신청한다.
 * 회원 신청(entries/index.ts)과 같은 계산·검증 함수를 쓰되,
 * 선수 전원을 비회원으로 고정하고 최소 소속 인원 검증을 면제한다.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res
      .status(405)
      .json({ error: '허용되지 않는 메소드입니다.', status: 405 });
  }

  const clubId = parseClubId(req.query.id);
  const tournamentId = firstQueryValue(req.query.tournamentId);
  if (!clubId || !tournamentId) {
    return res.status(400).json({ error: '잘못된 요청입니다.', status: 400 });
  }

  // 로그인 없이 이름·생년월일·전화번호를 받아 저장하는 공개 쓰기 endpoint다.
  // 본문 파싱·DB 조회 전에 IP당 시도 횟수를 제한해 개인정보를 대량으로
  // 쌓아 넣는 스크립트를 막는다. lookup.ts와 키 접두사를 분리해 서로
  // 예산을 나눠 쓰지 않게 한다.
  const ip = getClientIp({ 'x-forwarded-for': req.headers['x-forwarded-for'] });
  const { allowed } = consumeAttempt(`external-entry:${tournamentId}:${ip}`, {
    limit: 10,
  });
  if (!allowed) {
    return res.status(429).json({
      error: '신청 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.',
      status: 429,
    });
  }

  try {
    const parsed = externalEntrySubmissionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.errors[0]?.message ?? '입력값이 올바르지 않습니다.',
        status: 400,
      });
    }
    const input = { ...parsed.data, privacyAgreed: true as const };

    const tournament = await prisma.tournament.findFirst({
      where: { id: tournamentId, clubId, allowExternalEntry: true },
      include: { eventTypes: true },
    });
    if (!tournament) {
      return res
        .status(404)
        .json({ error: '대회를 찾을 수 없습니다.', status: 404 });
    }

    // 외부 신청서는 선수 전원이 비회원이다. 클라이언트가 보낸 값을 믿지 않는다.
    const players = input.players.map((player) => ({
      ...player,
      isClubMember: false,
    }));

    const validation = validateEntrySubmission(
      { ...input, players },
      tournament,
      { isExternal: true }
    );
    if (!validation.ok) {
      return res.status(400).json({ error: validation.error, status: 400 });
    }

    const feeById = new Map(
      tournament.eventTypes.map((eventType) => [eventType.id, eventType.fee])
    );
    const useSurcharge = tournament.nonMemberSurcharge > 0;
    const surchargePlayers = players.map((player) => ({
      key: player.key,
      // 추가금을 쓰지 않는 대회면 추가금이 0이 되도록 소속으로 취급한다
      isClubMember: useSurcharge ? false : true,
    }));

    const feeByEventIndex = input.events.map((event) =>
      calculateEventFee({
        baseFee: feeById.get(event.eventTypeId) ?? 0,
        surcharge: tournament.nonMemberSurcharge,
        unit: tournament.surchargeUnit,
        playerKeys: event.playerKeys,
        players: surchargePlayers,
      })
    );
    const totalFee = calculateTotalFee(
      feeByEventIndex.map((fee) => ({ fee, status: 'ACTIVE' as const }))
    );

    const created = await prisma.$transaction(async (tx) => {
      // 폼을 열어둔 채 마감이 지나는 경우를 잡는다
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
          isExternal: true,
          // 조회 키는 저장할 때와 찾을 때 같은 정규화를 거쳐야 한다
          contactName: normalizeContactName(input.contactName),
          contactPhone: input.contactPhone,
          depositorName: input.depositorName,
          teamName: tournament.useTeamName ? (input.teamName ?? null) : null,
          totalFee,
          privacyAgreedAt: new Date(),
        },
      });

      const keyToPlayerId = new Map<string, string>();
      for (const player of players) {
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
            isClubMember: false,
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

    return res.status(201).json({
      data: { entryId: created.id },
      message: '신청이 완료되었습니다.',
    });
  } catch (error) {
    if (error instanceof EntryClosedError) {
      return res
        .status(400)
        .json({ error: '신청이 마감되었습니다.', status: 400 });
    }
    // 같은 이름+연락처로 두 번 제출한 경우 (부분 유니크 인덱스 위반)
    if (
      typeof error === 'object' &&
      error !== null &&
      (error as { code?: string }).code === 'P2002'
    ) {
      return res.status(409).json({
        error: '이미 신청하셨습니다. 신청 조회에서 확인해주세요.',
        status: 409,
      });
    }
    return handleApiError(res, error);
  }
}
