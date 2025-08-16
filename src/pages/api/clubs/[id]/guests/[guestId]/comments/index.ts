import { NextApiRequest, NextApiResponse } from 'next';

import { sendCommentAddedSms } from '@/lib/sms-notification';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log(
    `🌸 ~ handler ~ src/pages/api/clubs/[clubId]/guests/[guestId]/comments/index.ts`
  );
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { id, guestId } = req.query;
    const { content, userId, clubMemberId, parentId } = req.body;

    if (!id || !guestId || !content) {
      return res.status(400).json({ message: 'Missing required parameters' });
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
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

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
      const commentUserId = userId || 0;
      if (commentUserId !== guestPost.userId) {
        try {
          await sendCommentAddedSms(
            guestId as string,
            guestPost.userId,
            commentUserId
          );
        } catch (smsError) {
          console.error('Failed to send SMS notification:', smsError);
          // SMS 전송 실패는 전체 요청을 실패시키지 않음
        }
      }
    }

    return res.status(201).json({
      message: 'Comment created successfully',
      data: newComment,
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
