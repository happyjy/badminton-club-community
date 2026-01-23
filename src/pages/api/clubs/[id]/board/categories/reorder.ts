import { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import { ReorderCategoriesRequest } from '@/types/board.types';
import { canManageCategory } from '@/utils/boardPermissions';
import { ClubMember } from '@/types';

export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse<{ status: number; message: string }>
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

    // 관리자 권한 체크
    if (!canManageCategory(typedClubMember)) {
      return res.status(403).json({
        status: 403,
        message: '카테고리 관리 권한이 없습니다.',
      });
    }

    // PATCH: 카테고리 순서 변경
    if (req.method === 'PATCH') {
      const { categoryIds }: ReorderCategoriesRequest = req.body;

      if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
        return res.status(400).json({
          status: 400,
          message: '카테고리 ID 배열이 필요합니다.',
        });
      }

      // 모든 카테고리가 해당 클럽에 속하는지 확인
      const categories = await prisma.postCategory.findMany({
        where: {
          id: {
            in: categoryIds.map((id) => Number(id)),
          },
          clubId: clubIdNumber,
        },
      });

      if (categories.length !== categoryIds.length) {
        return res.status(400).json({
          status: 400,
          message: '일부 카테고리를 찾을 수 없거나 다른 클럽의 카테고리입니다.',
        });
      }

      // 트랜잭션으로 순서 업데이트
      await prisma.$transaction(
        categoryIds.map((categoryId, index) =>
          prisma.postCategory.update({
            where: {
              id: Number(categoryId),
            },
            data: {
              order: index,
            },
          })
        )
      );

      return res.status(200).json({
        status: 200,
        message: '카테고리 순서가 성공적으로 변경되었습니다.',
      });
    }

    return res.status(405).json({
      status: 405,
      message: '허용되지 않는 메서드입니다.',
    });
  } catch (error) {
    console.error('카테고리 순서 변경 API 오류:', error);
    return res.status(500).json({
      status: 500,
      message: '서버 오류가 발생했습니다.',
    });
  }
});
