import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getSession } from '@/lib/session';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: '허용되지 않는 메소드입니다' });
  }

  try {
    const session = await getSession(req);
    if (!session) {
      return res.status(401).json({ message: '인증이 필요합니다' });
    }

    const { id: clubId } = req.query;
    const { name, phoneNumber, message } = req.body;

    // 필수 데이터 검증
    if (!name || !phoneNumber) {
      return res
        .status(400)
        .json({ message: '이름과 연락처는 필수 항목입니다' });
    }

    // 중복 신청 확인
    // const existingApplication = await prisma.guestApplication.findFirst({
    //   where: {
    //     clubId: clubId as string,
    //     userId: session.user.id,
    //     status: 'PENDING',
    //   },
    // });

    // if (existingApplication) {
    //   return res.status(400).json({ message: '이미 신청한 게스트입니다' });
    // }

    // 게스트 신청 생성
    const application = await prisma.guestPost.create({
      data: {
        clubId: parseInt(clubId as string),
        userId: session.id,
        name,
        phoneNumber,
        message: message || '',
        status: 'PENDING',
      },
    });

    return res.status(201).json(application);
  } catch (error) {
    console.error('게스트 신청 오류:', error);
    return res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
}
