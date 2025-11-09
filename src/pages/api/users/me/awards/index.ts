import { PrismaClient } from '@prisma/client';
import { withAuth } from '@/lib/session';
import { createAwardSchema } from '@/schemas/award.schema';
import { ApiResponse, AwardResponse } from '@/types';

import type { NextApiRequest, NextApiResponse } from 'next';

const prisma = new PrismaClient();

async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse<
    | ApiResponse<'awards', AwardResponse[]>
    | ApiResponse<'award', AwardResponse>
    | { error: string; status: number }
  >
) {
  // GET: 내 입상 기록 조회
  if (req.method === 'GET') {
    try {
      const awards = await prisma.userAwardRecord.findMany({
        where: {
          userId: req.user.id,
        },
        orderBy: {
          eventDate: 'desc',
        },
      });

      const formattedAwards: AwardResponse[] = awards.map((award) => ({
        id: award.id,
        userId: award.userId,
        tournamentName: award.tournamentName,
        eventType: award.eventType as 'SINGLES' | 'MD' | 'WD' | 'XD',
        grade: award.grade as 'A' | 'B' | 'C' | 'D' | 'E' | 'F',
        eventDate: award.eventDate.toISOString().split('T')[0],
        images: award.images,
        note: award.note,
        createdAt: award.createdAt.toISOString(),
        updatedAt: award.updatedAt.toISOString(),
      }));

      return res.status(200).json({
        data: { awards: formattedAwards },
        status: 200,
      });
    } catch (error) {
      console.error('입상 기록 조회 중 오류 발생:', error);
      return res.status(500).json({
        error: '입상 기록 조회에 실패했습니다',
        status: 500,
      });
    }
  }

  // POST: 입상 기록 생성
  if (req.method === 'POST') {
    try {
      // 요청 데이터 검증
      const validationResult = createAwardSchema.safeParse(req.body);

      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        return res.status(400).json({
          error: firstError.message || '유효하지 않은 입력입니다',
          status: 400,
        });
      }

      const { tournamentName, eventDate, eventType, grade, images, note } =
        validationResult.data;

      // 중복 체크
      const existingAward = await prisma.userAwardRecord.findUnique({
        where: {
          unique_award_record: {
            userId: req.user.id,
            eventDate: new Date(eventDate),
            eventType,
            grade,
          },
        },
      });

      if (existingAward) {
        return res.status(409).json({
          error: '이미 등록된 입상 기록입니다',
          status: 409,
        });
      }

      // 입상 기록 생성
      const award = await prisma.userAwardRecord.create({
        data: {
          userId: req.user.id,
          tournamentName,
          eventDate: new Date(eventDate),
          eventType,
          grade,
          images: images || [],
          note: note || null,
        },
      });

      const formattedAward: AwardResponse = {
        id: award.id,
        userId: award.userId,
        tournamentName: award.tournamentName,
        eventType: award.eventType as 'SINGLES' | 'MD' | 'WD' | 'XD',
        grade: award.grade as 'A' | 'B' | 'C' | 'D' | 'E' | 'F',
        eventDate: award.eventDate.toISOString().split('T')[0],
        images: award.images,
        note: award.note,
        createdAt: award.createdAt.toISOString(),
        updatedAt: award.updatedAt.toISOString(),
      };

      return res.status(201).json({
        data: { award: formattedAward },
        status: 201,
        message: '입상 기록이 성공적으로 등록되었습니다',
      });
    } catch (error) {
      console.error('입상 기록 생성 중 오류 발생:', error);
      return res.status(500).json({
        error: '입상 기록 생성에 실패했습니다',
        status: 500,
      });
    }
  }

  return res.status(405).json({
    error: '허용되지 않는 메소드입니다',
    status: 405,
  });
}

export default withAuth(handler);

