import { PrismaClient } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

import { getSession } from '@/lib/session';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession(req);

  if (!session) {
    return res.status(401).json({ message: '로그인이 필요합니다' });
  }

  const { id: clubId, guestId, commentId } = req.query;

  if (!clubId || !guestId || !commentId) {
    return res.status(400).json({ message: '필수 파라미터가 누락되었습니다' });
  }

  const prisma = new PrismaClient();

  try {
    // 댓글 존재 여부 및 권한 확인
    const comment = await prisma.guestComment.findUnique({
      where: { id: commentId as string },
      include: {
        user: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!comment) {
      return res.status(404).json({ message: '댓글을 찾을 수 없습니다' });
    }

    if (!comment.user) {
      return res
        .status(404)
        .json({ message: '댓글 작성자 정보를 찾을 수 없습니다' });
    }

    if (comment.user.id !== session.id) {
      return res.status(403).json({ message: '권한이 없습니다' });
    }

    switch (req.method) {
      case 'PUT':
        try {
          const { content } = req.body;

          if (!content || content.length > 1000) {
            return res
              .status(400)
              .json({ message: '댓글 내용이 유효하지 않습니다' });
          }

          const updatedComment = await prisma.guestComment.update({
            where: { id: commentId as string },
            data: { content },
            include: {
              user: {
                select: {
                  id: true,
                  nickname: true,
                },
              },
            },
          });

          if (!updatedComment.user) {
            return res
              .status(404)
              .json({ message: '댓글 작성자 정보를 찾을 수 없습니다' });
          }

          return res.status(200).json({
            comment: {
              id: updatedComment.id,
              content: updatedComment.content,
              createdAt: updatedComment.createdAt.toISOString(),
              isDeleted: updatedComment.isDeleted,
              author: {
                id: updatedComment.user.id,
                name: updatedComment.user.nickname,
              },
            },
          });
        } catch (error) {
          console.error('댓글 수정 중 오류 발생:', error);
          return res.status(500).json({ message: '서버 오류가 발생했습니다' });
        }

      case 'DELETE':
        try {
          await prisma.guestComment.update({
            where: { id: commentId as string },
            data: { isDeleted: true },
          });

          return res.status(200).json({ message: '댓글이 삭제되었습니다' });
        } catch (error) {
          console.error('댓글 삭제 중 오류 발생:', error);
          return res.status(500).json({ message: '서버 오류가 발생했습니다' });
        }

      default:
        return res.status(405).json({ message: '허용되지 않는 메소드입니다' });
    }
  } finally {
    await prisma.$disconnect();
  }
}
