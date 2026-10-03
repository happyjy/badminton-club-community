import { NextApiRequest, NextApiResponse } from 'next';

import { canViewGuestPost } from '@/lib/guestAccess';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import { sendCommentAddedSms } from '@/lib/sms-notification';

// 게스트 신청 게시글의 댓글 목록을 조회하고 생성(SMS 전송)하는 API
// 신청서를 볼 수 있는 사람(작성자 본인·클럽 임원)만 댓글을 보고 쓸 수 있다.
export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse
) {
  const { id, guestId } = req.query;

  if (!id || !guestId) {
    return res.status(400).json({ message: 'Missing required parameters' });
  }

  try {
    const guestPost = await prisma.guestPost.findUnique({
      where: { id: guestId as string },
      select: { clubId: true, userId: true },
    });

    // 다른 클럽의 신청서를 이 클럽 경로로 다루지 못하게 한다.
    if (!guestPost || guestPost.clubId !== Number(id)) {
      return res.status(404).json({ message: 'Guest post not found' });
    }

    if (!(await canViewGuestPost(req.user.id, guestPost))) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    switch (req.method) {
      // 댓글 목록 조회
      case 'GET': {
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

      // 댓글 생성 & SMS 전송
      case 'POST': {
        const { content, parentId } = req.body;

        if (!content) {
          return res.status(400).json({ message: 'Content is required' });
        }

        // 작성자는 요청 body가 아니라 로그인 세션으로 정한다.
        // body의 userId를 믿으면 다른 사람(임원)을 사칭해 댓글과 문자를 보낼 수 있다.
        const userId = req.user.id;

        const newComment = await prisma.guestComment.create({
          data: {
            postId: guestId as string,
            userId,
            clubMemberId: null,
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

        // 댓글 작성자가 게시글 작성자와 다른 경우 SMS 전송
        if (userId !== guestPost.userId) {
          try {
            await sendCommentAddedSms(
              guestId as string,
              guestPost.userId,
              userId
            );
            console.log(
              `SMS notification sent for comment on guest post ${guestId}`
            );
          } catch (smsError) {
            // SMS 전송 실패는 전체 요청을 실패시키지 않음
            console.error('Failed to send SMS notification:', smsError);
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
});
