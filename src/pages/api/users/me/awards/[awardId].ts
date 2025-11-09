import { PrismaClient } from '@prisma/client';
import { withAuth } from '@/lib/session';
import { updateAwardSchema } from '@/schemas/award.schema';
import { ApiResponse, AwardResponse } from '@/types';

import type { NextApiRequest, NextApiResponse } from 'next';

const prisma = new PrismaClient();

async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse<
    | ApiResponse<'award', AwardResponse>
    | ApiResponse<'success', { ok: boolean }>
    | { error: string; status: number }
  >
) {
  const { awardId } = req.query;

  if (!awardId || Array.isArray(awardId)) {
    return res.status(400).json({
      error: '유효하지 않은 입상 기록 ID입니다',
      status: 400,
    });
  }

  const parsedAwardId = parseInt(awardId, 10);

  if (isNaN(parsedAwardId)) {
    return res.status(400).json({
      error: '유효하지 않은 입상 기록 ID입니다',
      status: 400,
    });
  }

  // PATCH: 입상 기록 수정
  if (req.method === 'PATCH') {
    try {
      // 입상 기록 존재 및 권한 확인
      const existingAward = await prisma.userAwardRecord.findUnique({
        where: { id: parsedAwardId },
      });

      if (!existingAward) {
        return res.status(404).json({
          error: '입상 기록을 찾을 수 없습니다',
          status: 404,
        });
      }

      if (existingAward.userId !== req.user.id) {
        return res.status(403).json({
          error: '권한이 없습니다',
          status: 403,
        });
      }

      // 요청 데이터 검증
      const validationResult = updateAwardSchema.safeParse(req.body);

      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        return res.status(400).json({
          error: firstError.message || '유효하지 않은 입력입니다',
          status: 400,
        });
      }

      const updateData = validationResult.data;

      // 날짜 변환 (문자열인 경우)
      if (updateData.eventDate) {
        (updateData as any).eventDate = new Date(updateData.eventDate);
      }

      // 입상 기록 수정
      const updatedAward = await prisma.userAwardRecord.update({
        where: { id: parsedAwardId },
        data: updateData,
      });

      const formattedAward: AwardResponse = {
        id: updatedAward.id,
        userId: updatedAward.userId,
        tournamentName: updatedAward.tournamentName,
        eventType: updatedAward.eventType as 'SINGLES' | 'MD' | 'WD' | 'XD',
        grade: updatedAward.grade as 'A' | 'B' | 'C' | 'D' | 'E' | 'F',
        eventDate: updatedAward.eventDate.toISOString().split('T')[0],
        images: updatedAward.images,
        note: updatedAward.note,
        createdAt: updatedAward.createdAt.toISOString(),
        updatedAt: updatedAward.updatedAt.toISOString(),
      };

      return res.status(200).json({
        data: { award: formattedAward },
        status: 200,
        message: '입상 기록이 성공적으로 수정되었습니다',
      });
    } catch (error) {
      console.error('입상 기록 수정 중 오류 발생:', error);
      return res.status(500).json({
        error: '입상 기록 수정에 실패했습니다',
        status: 500,
      });
    }
  }

  // DELETE: 입상 기록 삭제
  if (req.method === 'DELETE') {
    try {
      // 입상 기록 존재 및 권한 확인
      const existingAward = await prisma.userAwardRecord.findUnique({
        where: { id: parsedAwardId },
      });

      if (!existingAward) {
        return res.status(404).json({
          error: '입상 기록을 찾을 수 없습니다',
          status: 404,
        });
      }

      if (existingAward.userId !== req.user.id) {
        return res.status(403).json({
          error: '권한이 없습니다',
          status: 403,
        });
      }

      // 입상 기록 삭제
      await prisma.userAwardRecord.delete({
        where: { id: parsedAwardId },
      });

      return res.status(200).json({
        data: { success: { ok: true } },
        status: 200,
        message: '입상 기록이 성공적으로 삭제되었습니다',
      });
    } catch (error) {
      console.error('입상 기록 삭제 중 오류 발생:', error);
      return res.status(500).json({
        error: '입상 기록 삭제에 실패했습니다',
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

