import { NextApiRequest, NextApiResponse } from 'next';

import { PrismaClient } from '@prisma/client';
import { withAuth } from '@/lib/session';
import { UpdatePostCategoryRequest } from '@/types/board.types';
import { canManageCategory } from '@/utils/boardPermissions';
import { ClubMember } from '@/types';

const prisma = new PrismaClient();

export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse<{ status: number; message: string; data?: any }>
) {
  const { id: clubId, categoryId } = req.query;

  if (
    !clubId ||
    !categoryId ||
    typeof clubId !== 'string' ||
    typeof categoryId !== 'string'
  ) {
    return res.status(400).json({
      status: 400,
      message: '클럽 ID와 카테고리 ID가 필요합니다.',
    });
  }

  const clubIdNumber = Number(clubId);
  const categoryIdNumber = Number(categoryId);

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

    // 관리자 권한 체크
    if (!canManageCategory(typedClubMember)) {
      return res.status(403).json({
        status: 403,
        message: '카테고리 관리 권한이 없습니다.',
      });
    }

    // 카테고리 존재 확인
    const category = await prisma.postCategory.findFirst({
      where: {
        id: categoryIdNumber,
        clubId: clubIdNumber,
      },
    });

    if (!category) {
      return res.status(404).json({
        status: 404,
        message: '카테고리를 찾을 수 없습니다.',
      });
    }

    // PUT: 카테고리 수정
    if (req.method === 'PUT') {
      const { name, description, allowedRoles, order, isActive }: UpdatePostCategoryRequest =
        req.body;

      const updateData: any = {};

      if (name !== undefined) {
        updateData.name = name;
      }
      if (description !== undefined) {
        updateData.description = description || null;
      }
      if (allowedRoles !== undefined) {
        if (!Array.isArray(allowedRoles)) {
          return res.status(400).json({
            status: 400,
            message: 'allowedRoles는 배열이어야 합니다.',
          });
        }
        updateData.allowedRoles = allowedRoles;
      }
      if (order !== undefined) {
        updateData.order = order;
      }
      if (isActive !== undefined) {
        updateData.isActive = isActive;
      }

      const updatedCategory = await prisma.postCategory.update({
        where: {
          id: categoryIdNumber,
        },
        data: updateData,
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

      return res.status(200).json({
        status: 200,
        message: '카테고리가 성공적으로 수정되었습니다.',
        data: updatedCategory,
      });
    }

    // DELETE: 카테고리 삭제
    if (req.method === 'DELETE') {
      // 카테고리에 게시글이 있는지 확인
      const postCount = await prisma.post.count({
        where: {
          categoryId: categoryIdNumber,
        },
      });

      if (postCount > 0) {
        return res.status(400).json({
          status: 400,
          message: '게시글이 있는 카테고리는 삭제할 수 없습니다. 먼저 게시글을 삭제하거나 다른 카테고리로 이동해주세요.',
        });
      }

      await prisma.postCategory.delete({
        where: {
          id: categoryIdNumber,
        },
      });

      return res.status(200).json({
        status: 200,
        message: '카테고리가 성공적으로 삭제되었습니다.',
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
