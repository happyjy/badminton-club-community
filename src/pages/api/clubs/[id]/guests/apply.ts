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

    // 전화번호 인증 상태 확인
    const user = await prisma.user.findUnique({
      where: { id: session.id },
    });

    if (!user?.phoneVerifiedAt || user.phoneNumber !== phoneNumber) {
      return res.status(400).json({
        success: false,
        message:
          '전화번호 인증이 필요합니다. 인증되지 않은 전화번호로는 신청할 수 없습니다.',
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

    // ClubCustomSettings에서 SMS 수신자 목록 조회
    const clubCustomSettings = await prisma.clubCustomSettings.findUnique({
      where: { clubId: parseInt(clubId as string) },
      select: { smsRecipients: true },
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

    // # 이메일, SMS 전송 과정 start
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

    // SMS 전송 - ClubCustomSettings의 smsRecipients에 등록된 모든 수신자에게 전송
    try {
      if (
        club?.name &&
        Array.isArray(clubCustomSettings?.smsRecipients) &&
        clubCustomSettings.smsRecipients.length > 0
      ) {
        const smsMessage = createGuestApplicationSMSMessage(name, club.name);

        // 모든 SMS 수신자에게 문자 전송
        const smsPromises = clubCustomSettings.smsRecipients.map(
          async (recipientPhone) => {
            try {
              const smsResult = await sendSMS(recipientPhone, smsMessage);
              console.log(`SMS 전송 성공 (${recipientPhone}):`, smsResult);
              return {
                phone: recipientPhone,
                success: true,
                result: smsResult,
              };
            } catch (error) {
              console.error(`SMS 전송 실패 (${recipientPhone}):`, error);
              return { phone: recipientPhone, success: false, error };
            }
          }
        );

        const smsResults = await Promise.allSettled(smsPromises);
        console.log('SMS 전송 결과:', smsResults);
      } else {
        console.log('SMS 수신자가 설정되지 않았거나 클럽 정보가 없습니다.');
      }
    } catch (smsError) {
      console.error('SMS 전송 중 오류:', {
        error: smsError,
        clubName: club?.name,
        guestName: name,
        smsRecipients: clubCustomSettings?.smsRecipients,
      });

      // SMS 전송 실패 시에도 게스트 신청은 성공으로 처리
      console.warn(
        `게스트 신청은 성공했지만 SMS 전송에 실패했습니다. 게스트: ${name}`
      );
    }
    // # 이메일, SMS 전송 과정 end

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
