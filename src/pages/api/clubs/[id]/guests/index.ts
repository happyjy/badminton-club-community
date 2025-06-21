import { PrismaClient, GuestStatus, GuestPostType } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { id: clubId } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const statusParam = req.query.status as string | undefined;
    const postTypeParam = req.query.postType as string | undefined;

    if (!clubId) {
      return res.status(400).json({ message: '클럽 ID가 필요합니다.' });
    }

    const skip = (page - 1) * limit;

    // postType 값이 GuestPostType enum에 있는지 확인
    let postTypeFilter: GuestPostType | undefined = undefined;
    if (postTypeParam) {
      if (Object.values(GuestPostType).includes(postTypeParam as any)) {
        postTypeFilter = postTypeParam as GuestPostType;
      } else {
        return res
          .status(400)
          .json({ message: '유효하지 않은 postType 값입니다.' });
      }
    }

    // status 값이 GuestStatus enum에 있는지 확인
    let statusFilter: GuestStatus | undefined = undefined;
    if (statusParam) {
      if (Object.values(GuestStatus).includes(statusParam as any)) {
        statusFilter = statusParam as GuestStatus;
      } else {
        return res
          .status(400)
          .json({ message: '유효하지 않은 status 값입니다.' });
      }
    }

    const where = {
      clubId: Number(clubId),
      ...(postTypeFilter && { postType: postTypeFilter }),
      ...(statusFilter && { status: statusFilter }),
    };

    const [guests, total] = await Promise.all([
      prisma.guestPost.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          clubMember: true, // createdBy 관계를 통해 작성자 정보 포함
        },
        skip,
        take: limit,
      }),
      prisma.guestPost.count({ where }),
    ]);

    const response = {
      data: {
        items: guests || [],
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
