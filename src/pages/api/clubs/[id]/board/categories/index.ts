import { NextApiRequest, NextApiResponse } from 'next';

import { PrismaClient } from '@prisma/client';
import { withAuth } from '@/lib/session';
import { PostCategoryListResponse, CreatePostCategoryRequest } from '@/types/board.types';
import { canManageCategory } from '@/utils/boardPermissions';
import { ClubMember } from '@/types';

const prisma = new PrismaClient();

export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse<PostCategoryListResponse | { status: number; message: string }>
) {
  const { id: clubId } = req.query;

  if (!clubId || typeof clubId !== 'string') {
    return res.status(400).json({
      status: 400,
      message: '클럽 ID가 필요합니다.',
    });
  }

  const clubIdNumber = Number(clubId);

  try {
    // 클럽 멤버 정보 가져오기
    const clubMember = await prisma.clubMember.findFirst({
      where: {
        userId: req.user.id,
        clubId: clubIdNumber,
      },
    });

    if (!clubMember) {
      return res.status(403).json({
        status: 403,
        message: '클럽 멤버가 아닙니다.',
      });
    }

    const typedClubMember = clubMember as unknown as ClubMember;

    // GET: 카테고리 목록 조회
    if (req.method === 'GET') {
      const categories = await prisma.postCategory.findMany({
        where: {
          clubId: clubIdNumber,
          isActive: true,
        },
        include: {
          club: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              posts: true,
            },
          },
        },
        orderBy: {
          order: 'asc',
        },
      });

      return res.status(200).json({
        data: categories,
        status: 200,
        message: '카테고리 목록을 성공적으로 조회했습니다.',
      });
    }

    // POST: 카테고리 생성
    if (req.method === 'POST') {
      // 관리자 권한 체크
      if (!canManageCategory(typedClubMember)) {
        return res.status(403).json({
          status: 403,
          message: '카테고리 관리 권한이 없습니다.',
        });
      }

      const { name, description, allowedRoles, order, isActive }: CreatePostCategoryRequest =
        req.body;

      if (!name || !allowedRoles || !Array.isArray(allowedRoles)) {
        return res.status(400).json({
          status: 400,
          message: '카테고리 이름과 허용된 역할이 필요합니다.',
        });
      }

      // order가 없으면 가장 큰 order 값 + 1로 설정
      let categoryOrder = order;
      if (categoryOrder === undefined) {
        const maxOrderCategory = await prisma.postCategory.findFirst({
          where: {
            clubId: clubIdNumber,
          },
          orderBy: {
            order: 'desc',
          },
        });
        categoryOrder = maxOrderCategory ? maxOrderCategory.order + 1 : 0;
      }

      const category = await prisma.postCategory.create({
        data: {
          clubId: clubIdNumber,
          name,
          description: description || null,
          allowedRoles,
          order: categoryOrder,
          isActive: isActive !== undefined ? isActive : true,
        },
        include: {
          club: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              posts: true,
            },
          },
        },
      });

      return res.status(201).json({
        data: [category],
        status: 201,
        message: '카테고리가 성공적으로 생성되었습니다.',
      });
    }

    return res.status(405).json({
      status: 405,
      message: '허용되지 않는 메서드입니다.',
    });
  } catch (error) {
    console.error('카테고리 API 오류:', error);
    return res.status(500).json({
      status: 500,
      message: '서버 오류가 발생했습니다.',
    });
  }
});
