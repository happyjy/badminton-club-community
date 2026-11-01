import { NextApiRequest, NextApiResponse } from 'next';

import { APPROVED_STATUS } from '@/lib/clubAuth';
import {
  yearMonthToEndedAt,
  yearMonthToStartedAt,
} from '@/lib/membership-fee/coupleHistory';
import {
  assertNoConflictingActive,
  ensureGroupForActivePair,
  removeGroupIfNoActivePair,
} from '@/lib/membership-fee/coupleHistorySync';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import { coupleHistoryUpsertSchema } from '@/schemas/membership-fee.schema';
import { Role } from '@/types/enums';

/**
 * 부부 관계 이력 단건 수정 / 삭제.
 *
 * active(endedAt=null) 상태 변화에 따라 CoupleGroup을 자동 동기화한다.
 * - active → active (멤버 변경 포함): 옛 그룹 정리 + 새 그룹 ensure
 * - active → 종료: 그 멤버 쌍의 그룹 제거 (다른 active row 없을 때만)
 * - 종료 → active: 새 멤버 쌍에 그룹 ensure
 * - 종료 → 종료: 그룹 영향 없음
 */
export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse
) {
  const { id: clubId, historyId } = req.query;

  if (!clubId || typeof clubId !== 'string') {
    return res.status(400).json({
      error: '클럽 ID가 필요합니다',
      status: 400,
    });
  }
  if (!historyId || typeof historyId !== 'string') {
    return res.status(400).json({
      error: '이력 ID가 필요합니다',
      status: 400,
    });
  }

  const clubIdNumber = Number(clubId);
  const historyIdNumber = Number(historyId);

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
    const existing = await prisma.coupleHistory.findFirst({
      where: { id: historyIdNumber, clubId: clubIdNumber },
    });
    if (!existing) {
      return res.status(404).json({
        error: '부부 관계 이력을 찾을 수 없습니다',
        status: 404,
      });
    }

    if (req.method === 'PATCH') {
      const parseResult = coupleHistoryUpsertSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: parseResult.error.errors[0].message,
          status: 400,
        });
      }

      const { clubMemberId, partnerClubMemberId, started, ended } =
        parseResult.data;

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

      const wasActive = existing.endedAt == null;
      const willBeActive = endedAt == null;

      try {
        const history = await prisma.$transaction(async (tx) => {
          // active로 가는 변경이라면 다른 active 관계 충돌 검사 (자기 자신 제외)
          if (willBeActive) {
            await assertNoConflictingActive(tx, {
              clubId: clubIdNumber,
              clubMemberId,
              partnerClubMemberId,
              ignoreHistoryId: historyIdNumber,
            });
          }

          const updated = await tx.coupleHistory.update({
            where: { id: historyIdNumber },
            data: {
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

          // 옛 active 멤버 쌍이 더 이상 active가 아니면 그룹 정리
          if (wasActive) {
            await removeGroupIfNoActivePair(tx, {
              clubId: clubIdNumber,
              memberA: existing.clubMemberId,
              memberB: existing.partnerClubMemberId,
            });
          }
          // 새 active 멤버 쌍에 그룹 ensure
          if (willBeActive) {
            await ensureGroupForActivePair(tx, {
              clubId: clubIdNumber,
              memberA: clubMemberId,
              memberB: partnerClubMemberId,
            });
          }

          return updated;
        });

        return res.status(200).json({
          data: { history },
          status: 200,
          message: '부부 관계 이력이 수정되었습니다',
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

    if (req.method === 'DELETE') {
      const wasActive = existing.endedAt == null;

      await prisma.$transaction(async (tx) => {
        await tx.coupleHistory.delete({
          where: { id: historyIdNumber },
        });
        // 삭제로 인해 active 짝이 더 이상 없으면 그룹도 정리
        if (wasActive) {
          await removeGroupIfNoActivePair(tx, {
            clubId: clubIdNumber,
            memberA: existing.clubMemberId,
            memberB: existing.partnerClubMemberId,
          });
        }
      });

      return res.status(200).json({
        data: null,
        status: 200,
        message: '부부 관계 이력이 삭제되었습니다',
      });
    }

    return res.status(405).json({
      error: '허용되지 않는 메소드입니다',
      status: 405,
    });
  } catch (error) {
    console.error('Error in couple-histories [historyId]:', error);
    return res.status(500).json({
      error: '부부 관계 이력 처리 중 오류가 발생했습니다',
      status: 500,
    });
  }
});
