import { PrismaClient } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

import { getSession } from '@/lib/session';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession(req);
  if (!session || !session.id) {
    return res.status(401).json({ message: '로그인이 필요합니다' });
  }

  const { id: clubId, guestId } = req.query;

  if (
    !clubId ||
    !guestId ||
    typeof clubId !== 'string' ||
    typeof guestId !== 'string'
  ) {
    return res.status(400).json({ message: '올바르지 않은 요청입니다' });
  }

  // 먼저 요청한 게스트 신청 글이 존재하는지 확인
  const guestPost = await prisma.guestPost.findUnique({
    where: {
      id: guestId,
    },
  });

  if (!guestPost) {
    return res.status(404).json({ message: '게스트 신청을 찾을 수 없습니다' });
  }

  // 해당 게시물의 작성자인지 확인
  if (guestPost.userId !== session.id) {
    return res
      .status(403)
      .json({ message: '본인의 게시물만 수정/삭제할 수 있습니다' });
  }

  // HTTP 메서드에 따라 처리
  switch (req.method) {
    case 'GET':
      try {
        return res.status(200).json({
          message: '게스트 신청 조회 성공',
          data: { guestPost },
        });
      } catch (error) {
        console.error('게스트 신청 조회 실패:', error);
        return res.status(500).json({ message: '서버 오류가 발생했습니다' });
      }

    case 'PUT': // 수정된 게스트 신청 정보 업데이트
      try {
        const {
          name,
          birthDate,
          phoneNumber,
          gender,
          localTournamentLevel,
          nationalTournamentLevel,
          lessonPeriod,
          playingPeriod,
          intendToJoin,
          message,
          visitDate,
          postType,
        } = req.body;

        const updatedGuestPost = await prisma.guestPost.update({
          where: {
            id: guestId,
          },
          data: {
            name: name || guestPost.name,
            birthDate: birthDate || guestPost.birthDate,
            phoneNumber: phoneNumber || guestPost.phoneNumber,
            gender: gender || guestPost.gender,
            localTournamentLevel:
              localTournamentLevel || guestPost.localTournamentLevel,
            nationalTournamentLevel:
              nationalTournamentLevel || guestPost.nationalTournamentLevel,
            lessonPeriod: lessonPeriod || guestPost.lessonPeriod,
            playingPeriod: playingPeriod || guestPost.playingPeriod,
            intendToJoin:
              intendToJoin !== undefined
                ? intendToJoin
                : guestPost.intendToJoin,
            message: message || guestPost.message,
            visitDate: visitDate || guestPost.visitDate,
            postType: postType || guestPost.postType,
            updatedBy: session.id,
            updatedAt: new Date(),
          },
        });

        return res.status(200).json({
          message: '게스트 신청이 수정되었습니다',
          data: { guestPost: updatedGuestPost },
        });
      } catch (error) {
        console.error('게스트 신청 수정 실패:', error);
        return res.status(500).json({ message: '서버 오류가 발생했습니다' });
      }

    case 'DELETE': // 게스트 신청 삭제
      try {
        await prisma.guestPost.delete({
          where: {
            id: guestId,
          },
        });

        return res
          .status(200)
          .json({ message: '게스트 신청이 삭제되었습니다' });
      } catch (error) {
        console.error('게스트 신청 삭제 실패:', error);
        return res.status(500).json({ message: '서버 오류가 발생했습니다' });
      }

    default:
      return res
        .status(405)
        .json({ message: '허용되지 않는 요청 메서드입니다' });
  }
}
