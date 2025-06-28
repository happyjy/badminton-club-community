import { GuestStatus, PrismaClient } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

import { sendGuestApplicationEmail } from '@/lib/email';
import { getSession } from '@/lib/session';
import { sendSMS, createGuestApplicationSMSMessage } from '@/lib/sms';

const prisma = new PrismaClient();

// 게스트 신청 처리(이메일 및 SMS 전송 기능 포함)
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res
      .status(405)
      .json({ success: false, message: '허용되지 않는 메소드입니다' });
  }

  try {
    const session = await getSession(req);

    // 세션이 없거나 세션 ID가 없는 경우 처리
    if (!session || !session.id) {
      return res
        .status(401)
        .json({ success: false, message: '인증이 필요합니다' });
    }

    const { id: clubId } = req.query;

    // clubId가 없는 경우 처리
    if (!clubId) {
      return res
        .status(400)
        .json({ success: false, message: '클럽 ID가 필요합니다' });
    }

    // req.body가 없는 경우 기본값 설정
    const {
      name,
      birthDate = null,
      phoneNumber,
      gender = null,
      localTournamentLevel = null,
      nationalTournamentLevel = null,
      lessonPeriod = null,
      playingPeriod = null,
      intendToJoin = false,
      visitDate = null,
      message = '',
      postType = 'GUEST_REQUEST', // postType 기본값 설정
    } = req.body || {};

    // 필수 데이터 검증
    if (!name || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: '이름과 연락처는 필수 항목입니다',
      });
    }

    // 클럽 정보 조회 (SMS 메시지용)
    const club = await prisma.club.findUnique({
      where: { id: parseInt(clubId as string) },
      select: { name: true },
    });

    // 사용자의 clubMember ID 조회 (있는 경우)
    const clubMember = await prisma.clubMember.findUnique({
      where: {
        clubId_userId: {
          clubId: parseInt(clubId as string),
          userId: session.id,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    // 게스트 신청 생성
    const application = await prisma.guestPost.create({
      data: {
        clubId: parseInt(clubId as string),
        userId: session.id,
        // 게스트 일반 정보
        name,
        birthDate,
        phoneNumber,
        gender,
        localTournamentLevel,
        nationalTournamentLevel,
        lessonPeriod,
        playingPeriod,
        status: GuestStatus.PENDING,
        intendToJoin, // 게스트 신청 타입
        visitDate,
        message,
        postType,
        // 작성자 ClubMember ID 추가 (있는 경우에만)
        createdBy: clubMember?.id || null,
      },
    });

    // 이메일 및 SMS 전송
    const notificationPromises = [];

    // 이메일 전송
    try {
      notificationPromises.push(
        sendGuestApplicationEmail({
          req,
          application,
          writer: clubMember?.name || null,
        })
      );
    } catch (emailError) {
      console.error('이메일 전송 실패:', emailError);
    }

    // SMS 전송
    try {
      if (club?.name) {
        const smsMessage = createGuestApplicationSMSMessage(name, club.name);
        notificationPromises.push(sendSMS(phoneNumber, smsMessage));
      }
    } catch (smsError) {
      console.error('SMS 전송 실패:', smsError);
    }

    // 모든 알림 전송 시도 (실패해도 전체 요청은 성공)
    try {
      await Promise.allSettled(notificationPromises);
    } catch (notificationError) {
      console.error('알림 전송 중 오류:', notificationError);
    }

    return res.status(201).json({
      success: true,
      data: application,
    });
  } catch (error) {
    console.error('게스트 신청 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
