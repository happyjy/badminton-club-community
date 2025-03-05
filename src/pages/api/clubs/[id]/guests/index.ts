import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log(`🚨 ~ req.query:`, req.query);
    const { id: clubId } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string | undefined;

    if (!clubId) {
      return res.status(400).json({ message: '클럽 ID가 필요합니다.' });
    }

    const skip = (page - 1) * limit;

    const where = {
      clubId: Number(clubId),
      ...(status && { status }),
    };

    const [guests, total] = await Promise.all([
      prisma.guestPost.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
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
