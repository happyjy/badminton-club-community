import { PrismaClient } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

import { getSession } from '@/lib/session';

// 댓글 목록 조회 및 작성
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log(
    `🌸 ~ handler ~ src/pages/api/clubs/[id]/guests/[guestId]/comments/index.ts`
  );
  const session = await getSession(req);

  if (!session) {
    return res.status(401).json({ message: '로그인이 필요합니다' });
  }

  const { id: clubId, guestId } = req.query;

  if (!clubId || !guestId) {
    return res.status(400).json({ message: '필수 파라미터가 누락되었습니다' });
  }

  const prisma = new PrismaClient();

  switch (req.method) {
    case 'GET':
      try {
        const comments = await prisma.guestComment.findMany({
          where: {
            postId: guestId as string,
          },
          include: {
            user: {
              select: {
                id: true,
                nickname: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        const formattedComments = comments.map((comment) => ({
          id: comment.id,
          content: comment.content,
          createdAt: comment.createdAt.toISOString(),
          isDeleted: comment.isDeleted,
          author: comment.user
            ? {
                id: comment.user.id,
                name: comment.user.nickname,
              }
            : null,
        }));

        return res.status(200).json({ comments: formattedComments });
      } catch (error) {
        console.error('댓글 목록 조회 중 오류 발생:', error);
        return res.status(500).json({ message: '서버 오류가 발생했습니다' });
      }

    case 'POST':
      try {
        const { content } = req.body;

        if (!content || content.length > 1000) {
          return res
            .status(400)
            .json({ message: '댓글 내용이 유효하지 않습니다' });
        }

        const comment = await prisma.guestComment.create({
          data: {
            content,
            postId: guestId as string,
            userId: session.id,
          },
          include: {
            user: {
              select: {
                id: true,
                nickname: true,
              },
            },
          },
        });

        return res.status(201).json({
          comment: {
            id: comment.id,
            content: comment.content,
            createdAt: comment.createdAt.toISOString(),
            isDeleted: comment.isDeleted,
            author: comment.user
              ? {
                  id: comment.user.id,
                  name: comment.user.nickname,
                }
              : null,
          },
        });
      } catch (error) {
        console.error('댓글 작성 중 오류 발생:', error);
        return res.status(500).json({ message: '서버 오류가 발생했습니다' });
      }

    default:
      return res.status(405).json({ message: '허용되지 않는 메소드입니다' });
  }
}
