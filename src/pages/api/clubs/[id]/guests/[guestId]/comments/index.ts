import { PrismaClient } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

import { sendCommentAddedSms } from '@/lib/sms-notification';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id, guestId } = req.query;

  if (!id || !guestId) {
    return res.status(400).json({ message: 'Missing required parameters' });
  }

  try {
    const prisma = new PrismaClient();

    switch (req.method) {
      case 'GET': {
        // 댓글 목록 조회
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
            createdAt: 'asc',
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
      }

      case 'POST': {
        const { content, userId, clubMemberId, parentId } = req.body;

        if (!content) {
          return res.status(400).json({ message: 'Content is required' });
        }

        if (!userId && !clubMemberId) {
          return res
            .status(400)
            .json({ message: 'Either userId or clubMemberId is required' });
        }

        // TODO: 인증 및 권한 확인 로직 추가
        // const user = await getAuthenticatedUser(req);
        // if (!user) {
        //   return res.status(401).json({ message: 'Unauthorized' });
        // }

        // 댓글 생성
        const newComment = await prisma.guestComment.create({
          data: {
            postId: guestId as string,
            userId: userId || null,
            clubMemberId: clubMemberId || null,
            content,
            parentId: parentId || null,
          },
          select: {
            id: true,
            postId: true,
            userId: true,
            clubMemberId: true,
            content: true,
            parentId: true,
            createdAt: true,
          },
        });

        // 게스트 신청 게시글 정보 조회
        const guestPost = await prisma.guestPost.findUnique({
          where: { id: guestId as string },
          select: { userId: true },
        });

        if (guestPost) {
          // 댓글 작성자가 게시글 작성자와 다른 경우 SMS 전송
          const commentUserId = userId || clubMemberId;
          if (commentUserId && commentUserId !== guestPost.userId) {
            try {
              await sendCommentAddedSms(
                guestId as string,
                guestPost.userId,
                commentUserId
              );
              console.log(
                `SMS notification sent for comment on guest post ${guestId}`
              );
            } catch (smsError) {
              // SMS 전송 실패는 전체 요청을 실패시키지 않음
              console.error('Failed to send SMS notification:', smsError);
            }
          }
        }

        return res.status(201).json({
          message: 'Comment created successfully',
          comment: newComment,
        });
      }

      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in comments API:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
