import { NextApiRequest, NextApiResponse } from 'next';

import { APPROVED_STATUS } from '@/lib/clubAuth';
import {
  yearMonthToEndedAt,
  yearMonthToStartedAt,
} from '@/lib/membership-fee/coupleHistory';
import {
  assertNoConflictingActive,
  ensureGroupForActivePair,
} from '@/lib/membership-fee/coupleHistorySync';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import { coupleHistoryUpsertSchema } from '@/schemas/membership-fee.schema';
import { Role } from '@/types/enums';

/**
 * 부부 관계 이력 목록 조회 / 신규 등록.
 *
 * 이력은 부부 관계를 시점으로 누적하는 정본 데이터. active(endedAt=null) row가
 * 곧 "현재 부부 그룹"을 의미하며, 트랜잭션 안에서 CoupleGroup이 자동 동기화된다.
 */
export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse
) {
  const { id: clubId } = req.query;

  if (!clubId || typeof clubId !== 'string') {
    return res.status(400).json({
      error: '클럽 ID가 필요합니다',
      status: 400,
    });
  }

  const clubIdNumber = Number(clubId);

  // ADMIN 권한 확인
  const adminMember = await prisma.clubMember.findFirst({
    where: {
      userId: req.user.id,
      clubId: clubIdNumber,
      role: Role.ADMIN,
      status: APPROVED_STATUS,
    },
  });

  if (!adminMember) {
    return res.status(403).json({
      error: '권한이 없습니다',
      status: 403,
    });
  }

  try {
    if (req.method === 'GET') {
      const histories = await prisma.coupleHistory.findMany({
        where: { clubId: clubIdNumber },
        include: {
          clubMember: { select: { id: true, name: true } },
          partnerMember: { select: { id: true, name: true } },
        },
        orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
      });

      return res.status(200).json({
        data: { histories },
        status: 200,
        message: '부부 관계 이력 목록을 불러왔습니다',
      });
    }

    if (req.method === 'POST') {
      const parseResult = coupleHistoryUpsertSchema.safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({
          error: parseResult.error.errors[0].message,
          status: 400,
        });
      }

      const { clubMemberId, partnerClubMemberId, started, ended } =
        parseResult.data;

      // 두 회원이 모두 해당 클럽 소속인지 확인
      const memberIds = [clubMemberId, partnerClubMemberId];
      const clubMembers = await prisma.clubMember.findMany({
        where: { id: { in: memberIds }, clubId: clubIdNumber },
        select: { id: true },
      });
      if (clubMembers.length !== memberIds.length) {
        return res.status(400).json({
          error: '해당 클럽에 속하지 않은 회원이 포함되어 있습니다',
          status: 400,
        });
      }

      const startedAt = yearMonthToStartedAt(started.year, started.month);
      const endedAt = ended
        ? yearMonthToEndedAt(ended.year, ended.month)
        : null;

      try {
        const history = await prisma.$transaction(async (tx) => {
          // active(endedAt=null) 등록이면, 두 회원 모두 다른 active 관계가 없는지 확인
          if (endedAt == null) {
            await assertNoConflictingActive(tx, {
              clubId: clubIdNumber,
              clubMemberId,
              partnerClubMemberId,
            });
          }

          const created = await tx.coupleHistory.create({
            data: {
              clubId: clubIdNumber,
              clubMemberId,
              partnerClubMemberId,
              startedAt,
              endedAt,
            },
            include: {
              clubMember: { select: { id: true, name: true } },
              partnerMember: { select: { id: true, name: true } },
            },
          });

          // active 신규면 CoupleGroup 동기화 (없으면 생성)
          if (endedAt == null) {
            await ensureGroupForActivePair(tx, {
              clubId: clubIdNumber,
              memberA: clubMemberId,
              memberB: partnerClubMemberId,
            });
          }

          return created;
        });

        return res.status(201).json({
          data: { history },
          status: 201,
          message: '부부 관계 이력이 등록되었습니다',
        });
      } catch (txError) {
        if (txError instanceof Error) {
          return res.status(400).json({
            error: txError.message,
            status: 400,
          });
        }
        throw txError;
      }
    }

    return res.status(405).json({
      error: '허용되지 않는 메소드입니다',
      status: 405,
    });
  } catch (error) {
    console.error('Error in couple-histories index:', error);
    return res.status(500).json({
      error: '부부 관계 이력 처리 중 오류가 발생했습니다',
      status: 500,
    });
  }
});
