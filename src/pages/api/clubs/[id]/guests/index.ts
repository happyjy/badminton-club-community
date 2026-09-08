import { GuestStatus, GuestPostType } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';
import { GuestListResponse } from '@/types/guest.types';
import { getTodayInKorea } from '@/utils/date';

// 게스트 신청 목록 조회 API
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GuestListResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      data: { items: [], total: 0, page: 1, limit: 10 },
      status: 405,
      message: 'Method not allowed',
    });
  }

  try {
    const { id: clubId } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const statusParam = req.query.status as string | undefined;
    const postTypeParam = req.query.postType as string | undefined;

    if (!clubId) {
      return res.status(400).json({
        data: { items: [], total: 0, page: 1, limit: 10 },
        status: 400,
        message: '클럽 ID가 필요합니다.',
      });
    }

    const skip = (page - 1) * limit;

    // postType 값이 GuestPostType enum에 있는지 확인
    let postTypeFilter: GuestPostType | undefined = undefined;
    if (postTypeParam) {
      if (Object.values(GuestPostType).includes(postTypeParam as any)) {
        postTypeFilter = postTypeParam as GuestPostType;
      } else {
        return res.status(400).json({
          data: { items: [], total: 0, page: 1, limit: 10 },
          status: 400,
          message: '유효하지 않은 postType 값입니다.',
        });
      }
    }

    // status 값이 GuestStatus enum에 있는지 확인
    let statusFilter: GuestStatus | undefined = undefined;
    if (statusParam) {
      if (Object.values(GuestStatus).includes(statusParam as any)) {
        statusFilter = statusParam as GuestStatus;
      } else {
        return res.status(400).json({
          data: { items: [], total: 0, page: 1, limit: 10 },
          status: 400,
          message: '유효하지 않은 status 값입니다.',
        });
      }
    }

    const where = {
      clubId: Number(clubId),
      ...(postTypeFilter && { postType: postTypeFilter }),
      ...(statusFilter && { status: statusFilter }),
    };

    // 방문 희망일 기준 정렬:
    // 다가오는 방문일(오늘 포함)을 가까운 순으로 먼저 보여주고,
    // 이미 지난 방문일은 그 뒤에 최근 순으로 붙인다.
    // visitDate는 'YYYY-MM-DD' 문자열이라 사전순 비교가 곧 날짜순 비교다.
    const today = getTodayInKorea();
    const upcomingWhere = { ...where, visitDate: { gte: today } };
    const pastWhere = { ...where, visitDate: { lt: today } };

    const guestSelect = {
      id: true,
      name: true,
      birthDate: true,
      phoneNumber: true,
      gender: true,
      postType: true,
      status: true,
      intendToJoin: true,
      visitDate: true,
      message: true,
      createdAt: true,
      updatedAt: true,
      userId: true,
      clubId: true,
      createdBy: true,
      updatedBy: true,
      localTournamentLevel: true,
      nationalTournamentLevel: true,
      lessonPeriod: true,
      playingPeriod: true,
      clubMember: {
        select: { name: true },
      },
    } as const;

    // 다가오는 건과 지난 건은 서로 겹치지 않으므로,
    // "다가오는 목록 뒤에 지난 목록을 이어 붙인 하나의 목록"으로 보고 페이지를 자른다.
    // 전체를 메모리에 올리지 않고 각 구간에서 필요한 만큼만 조회한다.
    const [upcomingTotal, pastTotal] = await Promise.all([
      prisma.guestPost.count({ where: upcomingWhere }),
      prisma.guestPost.count({ where: pastWhere }),
    ]);

    // 이번 페이지에서 다가오는 목록이 차지하는 구간
    const upcomingSkip = Math.min(skip, upcomingTotal);
    const upcomingTake = Math.max(
      0,
      Math.min(skip + limit, upcomingTotal) - upcomingSkip
    );
    // 남은 자리는 지난 목록으로 채운다
    const pastSkip = Math.max(0, skip - upcomingTotal);
    const pastTake = limit - upcomingTake;

    const [upcomingGuests, pastGuests] = await Promise.all([
      upcomingTake > 0
        ? prisma.guestPost.findMany({
            where: upcomingWhere,
            orderBy: [{ visitDate: 'asc' }, { createdAt: 'desc' }],
            select: guestSelect,
            skip: upcomingSkip,
            take: upcomingTake,
          })
        : [],
      pastTake > 0
        ? prisma.guestPost.findMany({
            where: pastWhere,
            orderBy: [{ visitDate: 'desc' }, { createdAt: 'desc' }],
            select: guestSelect,
            skip: pastSkip,
            take: pastTake,
          })
        : [],
    ]);

    const guests = [...upcomingGuests, ...pastGuests];
    const total = upcomingTotal + pastTotal;

    const response: GuestListResponse = {
      data: {
        items: guests,
        total: total || 0,
        page,
        limit,
      },
      status: 200,
      message: '게스트 목록을 불러오는데 성공했습니다.',
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching guest requests:', error);
    return res.status(500).json({
      data: {
        items: [],
        total: 0,
        page: 1,
        limit: 10,
      },
      status: 500,
      message: '게스트 목록을 불러오는데 실패했습니다.',
    });
  }
}
