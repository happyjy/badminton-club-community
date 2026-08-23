import { prisma } from '@/lib/prisma';
import {
  firstQueryValue,
  handleApiError,
  parseClubId,
} from '@/lib/tournament/apiHelpers';

import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * 외부(비로그인) 신청자에게 보여줄 대회 정보.
 * 인증이 없으므로 대회 메타데이터만 돌려준다.
 * 신청 현황이나 타인의 선수 명단은 절대 포함하지 않는다.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res
      .status(405)
      .json({ error: '허용되지 않는 메소드입니다.', status: 405 });
  }

  const clubId = parseClubId(req.query.id);
  const tournamentId = firstQueryValue(req.query.tournamentId);
  if (!clubId || !tournamentId) {
    return res.status(400).json({ error: '잘못된 요청입니다.', status: 400 });
  }

  try {
    const tournament = await prisma.tournament.findFirst({
      where: { id: tournamentId, clubId, allowExternalEntry: true },
      select: {
        id: true,
        title: true,
        hostName: true,
        description: true,
        applyNotice: true,
        tournamentDate: true,
        location: true,
        applyStartAt: true,
        applyDeadline: true,
        status: true,
        useTeamName: true,
        tshirtSizes: true,
        bankAccount: true,
        memberLabel: true,
        nonMemberSurcharge: true,
        surchargeUnit: true,
        minClubMembersPerTeam: true,
        ageGroups: true,
        levels: true,
        eventTypes: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    // 외부 신청을 열지 않은 대회는 존재 자체를 알리지 않는다
    if (!tournament) {
      return res
        .status(404)
        .json({ error: '대회를 찾을 수 없습니다.', status: 404 });
    }

    return res
      .status(200)
      .json({ data: { tournament }, message: '대회 정보를 불러왔습니다.' });
  } catch (error) {
    return handleApiError(res, error);
  }
}
