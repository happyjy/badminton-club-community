import { Prisma } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import { Role } from '@/types/enums';

interface MatchableMember {
  id: number;
  name: string | null;
  status: string;
  leftAt: string | null;
}

interface MatchableMembersResponse {
  data: { members: MatchableMember[] };
  status: number;
  message: string;
}

interface ErrorResponse {
  error: string;
  status: number;
}

export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse<MatchableMembersResponse | ErrorResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: '허용되지 않는 메소드입니다',
      status: 405,
    });
  }

  const { id: clubIdQuery, from, to } = req.query;

  if (!clubIdQuery || typeof clubIdQuery !== 'string') {
    return res.status(400).json({
      error: '클럽 ID가 필요합니다',
      status: 400,
    });
  }

  const clubId = Number(clubIdQuery);
  if (Number.isNaN(clubId)) {
    return res.status(400).json({
      error: '클럽 ID가 올바르지 않습니다',
      status: 400,
    });
  }

  const adminMember = await prisma.clubMember.findFirst({
    where: {
      userId: req.user.id,
      clubId,
      role: Role.ADMIN,
    },
  });

  if (!adminMember) {
    return res.status(403).json({
      error: '권한이 없습니다',
      status: 403,
    });
  }

  // 거래일 범위. from/to가 모두 있어야 시점 필터를 적용한다.
  // 둘 중 하나라도 없으면 status만으로 필터하고 leftAt/feeObligationStartAt 조건은 생략 (전체 보기 모드).
  const fromDate =
    typeof from === 'string' && from ? new Date(from) : undefined;
  const toDate = typeof to === 'string' && to ? new Date(to) : undefined;
  const hasValidRange =
    fromDate &&
    toDate &&
    !Number.isNaN(fromDate.getTime()) &&
    !Number.isNaN(toDate.getTime());

  try {
    const where: Prisma.ClubMemberWhereInput = {
      clubId,
      status: { in: ['APPROVED', 'LEFT'] },
    };

    if (hasValidRange) {
      // 거래일 범위 시작 이후에 탈퇴했거나 아직 활동 중인 회원
      where.OR = [{ leftAt: null }, { leftAt: { gte: fromDate } }];
      // 회비 의무 시작이 거래일 범위 끝 이전인 회원만 (의무 시작 전 매칭 방지)
      where.AND = [
        {
          OR: [
            { feeObligationStartAt: null },
            { feeObligationStartAt: { lte: toDate } },
          ],
        },
      ];
    }

    const members = await prisma.clubMember.findMany({
      where,
      select: {
        id: true,
        name: true,
        status: true,
        leftAt: true,
      },
    });

    const result: MatchableMember[] = members
      .map((m) => ({
        id: m.id,
        name: m.name,
        status: m.status,
        leftAt: m.leftAt ? m.leftAt.toISOString() : null,
      }))
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', 'ko-KR'));

    return res.status(200).json({
      data: { members: result },
      status: 200,
      message: '매칭 가능 회원을 불러왔습니다',
    });
  } catch (error) {
    console.error('Error fetching matchable members:', error);
    return res.status(500).json({
      error: '매칭 가능 회원 조회 중 오류가 발생했습니다',
      status: 500,
    });
  }
});
