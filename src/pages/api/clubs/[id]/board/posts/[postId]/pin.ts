import { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import { ClubMember } from '@/types';
import { canPinPost } from '@/utils/boardPermissions';

export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse<{ status: number; message: string; data?: any }>
) {
  const { id: clubId, postId } = req.query;

  if (
    !clubId ||
    !postId ||
    typeof clubId !== 'string' ||
    typeof postId !== 'string'
  ) {
    return res.status(400).json({
      status: 400,
      message: '클럽 ID와 게시글 ID가 필요합니다.',
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

    // 고정 권한 체크
    if (!canPinPost(typedClubMember)) {
      return res.status(403).json({
        status: 403,
        message: '게시글을 고정할 권한이 없습니다.',
      });
    }

    // 게시글 존재 확인
    const post = await prisma.post.findFirst({
      where: {
        id: postId,
        clubId: clubIdNumber,
      },
    });

    if (!post) {
      return res.status(404).json({
        status: 404,
        message: '게시글을 찾을 수 없습니다.',
      });
    }

    // PATCH: 게시글 고정/해제
    if (req.method === 'PATCH') {
      const { isPinned } = req.body;

      if (typeof isPinned !== 'boolean') {
        return res.status(400).json({
          status: 400,
          message: 'isPinned는 boolean 값이어야 합니다.',
        });
      }

      const updatedPost = await prisma.post.update({
        where: {
          id: postId,
        },
        data: {
          isPinned,
        },
        include: {
          category: true,
          author: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
          _count: {
            select: {
              comments: true,
            },
          },
        },
      });

      return res.status(200).json({
        status: 200,
        message: isPinned
          ? '게시글이 고정되었습니다.'
          : '게시글 고정이 해제되었습니다.',
        data: updatedPost,
      });
    }

    return res.status(405).json({
      status: 405,
      message: '허용되지 않는 메서드입니다.',
    });
  } catch (error) {
    console.error('게시글 고정 API 오류:', error);
    return res.status(500).json({
      status: 500,
      message: '서버 오류가 발생했습니다.',
    });
  }
});
