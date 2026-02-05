import { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import { paymentRecordUpdateSchema } from '@/schemas/membership-fee.schema';
import { Role } from '@/types/enums';

export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse
) {
  const { id: clubId, recordId } = req.query;

  if (!clubId || typeof clubId !== 'string') {
    return res.status(400).json({
      error: '클럽 ID가 필요합니다',
      status: 400,
    });
  }

  if (!recordId || typeof recordId !== 'string') {
    return res.status(400).json({
      error: '레코드 ID가 필요합니다',
      status: 400,
    });
  }

  const clubIdNumber = Number(clubId);

  // ADMIN 권한 확인
  const adminMember = await prisma.clubMember.findFirst({
    where: {
      userId: req.user.id,
      clubId: clubIdNumber,
      role: Role.ADMIN,
    },
  });

  if (!adminMember) {
    return res.status(403).json({
      error: '권한이 없습니다',
      status: 403,
    });
  }

  try {
    // 레코드 존재 여부 확인
    const existingRecord = await prisma.paymentRecord.findFirst({
      where: {
        id: recordId,
        clubId: clubIdNumber,
      },
    });

    if (!existingRecord) {
      return res.status(404).json({
        error: '입금 내역을 찾을 수 없습니다',
        status: 404,
      });
    }

    if (req.method === 'GET') {
      const record = await prisma.paymentRecord.findUnique({
        where: { id: recordId },
        include: {
          matchedMember: {
            select: { id: true, name: true },
          },
          batch: {
            select: { id: true, fileName: true, uploadedAt: true },
          },
          payments: {
            select: { id: true, month: true, year: true, amount: true },
          },
        },
      });

      return res.status(200).json({
        data: { record },
        status: 200,
        message: '입금 내역을 불러왔습니다',
      });
    }

    if (req.method === 'PUT') {
      // 이미 확정된 레코드는 수정 불가
      if (existingRecord.status === 'CONFIRMED') {
        return res.status(400).json({
          error: '이미 확정된 입금 내역은 수정할 수 없습니다',
          status: 400,
        });
      }

      const parseResult = paymentRecordUpdateSchema.safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({
          error: parseResult.error.errors[0].message,
          status: 400,
        });
      }

      const { matchedMemberId, status } = parseResult.data;

      const updateData: any = {};

      if (matchedMemberId !== undefined) {
        // 회원이 해당 클럽 소속인지 확인
        if (matchedMemberId !== null) {
          const member = await prisma.clubMember.findFirst({
            where: {
              id: matchedMemberId,
              clubId: clubIdNumber,
            },
          });

          if (!member) {
            return res.status(400).json({
              error: '해당 클럽에 속하지 않은 회원입니다',
              status: 400,
            });
          }
        }

        updateData.matchedMemberId = matchedMemberId;

        // 회원이 매칭되면 상태를 MATCHED로 변경
        if (matchedMemberId !== null) {
          updateData.status = 'MATCHED';
          updateData.errorReason = null;
        }
      }

      if (status) {
        updateData.status = status;
      }

      const record = await prisma.paymentRecord.update({
        where: { id: recordId },
        data: updateData,
        include: {
          matchedMember: {
            select: { id: true, name: true },
          },
        },
      });

      return res.status(200).json({
        data: { record },
        status: 200,
        message: '입금 내역이 수정되었습니다',
      });
    }

    return res.status(405).json({
      error: '허용되지 않는 메소드입니다',
      status: 405,
    });
  } catch (error) {
    console.error('Error in payment record:', error);
    return res.status(500).json({
      error: '입금 내역 처리 중 오류가 발생했습니다',
      status: 500,
    });
  }
});
