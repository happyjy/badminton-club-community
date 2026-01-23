import { NextApiRequest, NextApiResponse } from 'next';

import { PrismaClient } from '@prisma/client';
import { withAuth } from '@/lib/session';

const prisma = new PrismaClient();

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

    // 게시글 존재 확인
    const post = await prisma.post.findFirst({
      where: {
        id: postId,
        clubId: clubIdNumber,
        isDeleted: false,
      },
    });

    if (!post) {
      return res.status(404).json({
        status: 404,
        message: '게시글을 찾을 수 없습니다.',
      });
    }

    // POST: 좋아요 토글
    if (req.method === 'POST') {
      // 좋아요는 간단하게 likeCount만 증가/감소시키는 방식으로 구현
      // 향후 PostLike 모델을 추가하여 사용자별 좋아요 상태를 관리할 수 있음
      const { action } = req.body; // 'like' or 'unlike'

      if (action === 'like') {
        const updatedPost = await prisma.post.update({
          where: {
            id: postId,
          },
          data: {
            likeCount: {
              increment: 1,
            },
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
          message: '좋아요가 추가되었습니다.',
          data: updatedPost,
        });
      } else if (action === 'unlike') {
        const updatedPost = await prisma.post.update({
          where: {
            id: postId,
          },
          data: {
            likeCount: {
              decrement: 1,
            },
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
          message: '좋아요가 취소되었습니다.',
          data: updatedPost,
        });
      } else {
        return res.status(400).json({
          status: 400,
          message: 'action은 "like" 또는 "unlike"여야 합니다.',
        });
      }
    }

    return res.status(405).json({
      status: 405,
      message: '허용되지 않는 메서드입니다.',
    });
  } catch (error) {
    console.error('게시글 좋아요 API 오류:', error);
    return res.status(500).json({
      status: 500,
      message: '서버 오류가 발생했습니다.',
    });
  }
});
