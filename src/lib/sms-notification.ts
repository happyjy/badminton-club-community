import { PrismaClient } from '@prisma/client';

import { NotificationType } from '@/types/sms.types';

import { sendSMS } from './sms';

const prisma = new PrismaClient();

/**
 * SMS 알림 전송 여부 확인
 */
export async function checkSmsNotificationSent(
  guestPostId: string,
  userId: number,
  notificationType: NotificationType
): Promise<boolean> {
  // 스키마에 맞게 쿼리 수정: 복합 인덱스 대신 개별 필드로 조회
  const existingLog = await prisma.smsNotificationLog.findFirst({
    where: {
      guestPostId,
      userId,
      notificationType,
    },
  });

  return !!existingLog;
}

/**
 * SMS 알림 로그 생성
 */
export async function createSmsNotificationLog(
  guestPostId: string,
  userId: number,
  notificationType: NotificationType
): Promise<void> {
  await prisma.smsNotificationLog.create({
    data: {
      guestPostId,
      userId,
      notificationType,
    },
  });
}

/**
 * 게스트 신청 상태 업데이트 시 SMS 전송
 */
export async function sendStatusUpdateSms(
  guestPostId: string,
  userId: number,
  status: 'APPROVED' | 'REJECTED'
): Promise<boolean> {
  try {
    // 이미 전송된 경우 스킵
    const alreadySent = await checkSmsNotificationSent(
      guestPostId,
      userId,
      NotificationType.STATUS_UPDATE
    );

    if (alreadySent) {
      console.log('Status update SMS already sent for this guest post');
      return false;
    }

    // 사용자 정보 조회
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { phoneNumber: true },
    });

    if (!user?.phoneNumber) {
      console.log('User phone number not found');
      return false;
    }

    // SMS 메시지 생성
    const statusText = status === 'APPROVED' ? '승인' : '거절';
    const message = `[배드민턴 클럽] 게스트 신청이 ${statusText}되었습니다.`;

    // SMS 전송
    await sendSMS(user.phoneNumber, message);

    // 전송 로그 생성
    await createSmsNotificationLog(
      guestPostId,
      userId,
      NotificationType.STATUS_UPDATE
    );

    console.log(`Status update SMS sent successfully to user ${userId}`);
    return true;
  } catch (error) {
    console.error('Failed to send status update SMS:', error);
    return false;
  }
}

/**
 * 댓글 추가 시 SMS 전송
 */
export async function sendCommentAddedSms(
  guestPostId: string,
  postUserId: number,
  commentUserId: number
): Promise<boolean> {
  try {
    // 본인이 댓글을 단 경우 스킵
    if (postUserId === commentUserId) {
      return false;
    }

    // 이미 전송된 경우 스킵
    const alreadySent = await checkSmsNotificationSent(
      guestPostId,
      postUserId,
      NotificationType.COMMENT_ADDED
    );

    if (alreadySent) {
      console.log('Comment added SMS already sent for this guest post');
      return false;
    }

    // 게시글 작성자 정보 조회
    const user = await prisma.user.findUnique({
      where: { id: postUserId },
      select: { phoneNumber: true },
    });

    if (!user?.phoneNumber) {
      console.log('User phone number not found');
      return false;
    }

    // SMS 메시지 생성
    const message =
      '[배드민턴 클럽] 게스트 신청 게시글에 새로운 댓글이 작성되었습니다.';

    // SMS 전송
    await sendSMS(user.phoneNumber, message);

    // 전송 로그 생성
    await createSmsNotificationLog(
      guestPostId,
      postUserId,
      NotificationType.COMMENT_ADDED
    );

    console.log(`Comment added SMS sent successfully to user ${postUserId}`);
    return true;
  } catch (error) {
    console.error('Failed to send comment added SMS:', error);
    return false;
  }
}

/**
 * SMS 전송 상태 조회
 */
export async function getSmsNotificationStatus(
  guestPostId: string,
  userId: number
): Promise<{
  statusUpdateSmsSent: boolean;
  commentAddedSmsSent: boolean;
}> {
  const [statusUpdateLog, commentAddedLog] = await Promise.all([
    prisma.smsNotificationLog.findFirst({
      where: {
        guestPostId,
        userId,
        notificationType: NotificationType.STATUS_UPDATE,
      },
    }),
    prisma.smsNotificationLog.findFirst({
      where: {
        guestPostId,
        userId,
        notificationType: NotificationType.COMMENT_ADDED,
      },
    }),
  ]);

  return {
    statusUpdateSmsSent: !!statusUpdateLog,
    commentAddedSmsSent: !!commentAddedLog,
  };
}
