import { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';

export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse<{ status: number; message: string; data?: any }>
) {
  const { id: clubId, postId, commentId } = req.query;

  if (
    !clubId ||
    !postId ||
    !commentId ||
    typeof clubId !== 'string' ||
    typeof postId !== 'string' ||
    typeof commentId !== 'string'
  ) {
    return res.status(400).json({
      status: 400,
      message: '클럽 ID, 게시글 ID, 댓글 ID가 필요합니다.',
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

    // 댓글 존재 확인
    const comment = await prisma.postComment.findFirst({
      where: {
        id: commentId,
        postId,
        isDeleted: false,
      },
    });

    if (!comment) {
      return res.status(404).json({
        status: 404,
        message: '댓글을 찾을 수 없습니다.',
      });
    }

    // POST: 댓글 좋아요 토글
    if (req.method === 'POST') {
      const { action } = req.body; // 'like' or 'unlike'

      if (action === 'like') {
        const updatedComment = await prisma.postComment.update({
          where: {
            id: commentId,
          },
          data: {
            likeCount: {
              increment: 1,
            },
          },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
        });

        return res.status(200).json({
          status: 200,
          message: '좋아요가 추가되었습니다.',
          data: updatedComment,
        });
      } else if (action === 'unlike') {
        const updatedComment = await prisma.postComment.update({
          where: {
            id: commentId,
          },
          data: {
            likeCount: {
              decrement: 1,
            },
          },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
        });

        return res.status(200).json({
          status: 200,
          message: '좋아요가 취소되었습니다.',
          data: updatedComment,
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
    console.error('댓글 좋아요 API 오류:', error);
    return res.status(500).json({
      status: 500,
      message: '서버 오류가 발생했습니다.',
    });
  }
});
