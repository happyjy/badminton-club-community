import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getSession } from '@/lib/session';

const prisma = new PrismaClient();

// ApiResponse 타입이 정의되어 있지 않으므로 일반 NextApiResponse 사용
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // 요청 메소드 확인
  if (req.method !== 'GET') {
    return res.status(405).json({ message: '허용되지 않는 메소드입니다.' });
  }

  try {
    // 인증 세션 가져오기
    const session = await getSession(req);
    if (!session || !session.id) {
      return res.status(401).json({ message: '인증이 필요합니다.' });
    }

    const { id: clubId } = req.query;
    const userId = session.id;

    const applications = await prisma.guestPost.findMany({
      where: {
        clubId: Number(clubId),
        userId: userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      // select: {
      //   id: true,
      //   createdAt: true,
      //   status: true,
      //   visitDate: true,
      //   purpose: true,
      // },
    });

    // 일반 JSON 응답 형식으로 반환
    return res.status(200).json({
      data: { guestPost: applications },
      message: '게스트 신청 목록을 성공적으로 불러왔습니다.',
    });
  } catch (error) {
    console.error('게스트 신청 목록 조회 오류:', error);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
}
