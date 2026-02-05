import { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import { paymentConfirmSchema } from '@/schemas/membership-fee.schema';
import { Role } from '@/types/enums';

export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: '허용되지 않는 메소드입니다',
      status: 405,
    });
  }

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
    const parseResult = paymentConfirmSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({
        error: parseResult.error.errors[0].message,
        status: 400,
      });
    }

    const { year, months } = parseResult.data;

    // 레코드 조회
    const record = await prisma.paymentRecord.findFirst({
      where: {
        id: recordId,
        clubId: clubIdNumber,
      },
    });

    if (!record) {
      return res.status(404).json({
        error: '입금 내역을 찾을 수 없습니다',
        status: 404,
      });
    }

    if (!record.matchedMemberId) {
      return res.status(400).json({
        error: '매칭된 회원이 없습니다',
        status: 400,
      });
    }

    if (record.status === 'CONFIRMED') {
      return res.status(400).json({
        error: '이미 확정된 입금 내역입니다',
        status: 400,
      });
    }

    // 회비 설정 조회
    const feeSettings = await prisma.membershipFee.findUnique({
      where: {
        clubId_year: {
          clubId: clubIdNumber,
          year,
        },
      },
    });

    if (!feeSettings) {
      return res.status(400).json({
        error: `${year}년 회비 설정이 없습니다`,
        status: 400,
      });
    }

    // 부부 그룹 여부 확인
    const coupleGroup = await prisma.coupleGroup.findFirst({
      where: {
        clubId: clubIdNumber,
        members: {
          some: {
            clubMemberId: record.matchedMemberId,
          },
        },
      },
    });

    const amountPerMonth = coupleGroup
      ? feeSettings.coupleAmount
      : feeSettings.regularAmount;

    // 금액 검증
    const expectedAmount = amountPerMonth * months.length;
    if (record.amount !== expectedAmount) {
      return res.status(400).json({
        error: `입금액(${record.amount.toLocaleString()}원)과 선택한 월 수(${months.length}개월, ${expectedAmount.toLocaleString()}원)가 일치하지 않습니다`,
        status: 400,
      });
    }

    // 이미 납부된 월 확인
    const existingPayments = await prisma.membershipPayment.findMany({
      where: {
        clubMemberId: record.matchedMemberId,
        year,
        month: { in: months },
      },
    });

    if (existingPayments.length > 0) {
      const paidMonths = existingPayments.map((p) => `${p.month}월`).join(', ');
      return res.status(400).json({
        error: `이미 납부된 월이 있습니다: ${paidMonths}`,
        status: 400,
      });
    }

    // 트랜잭션으로 처리
    const result = await prisma.$transaction(async (tx) => {
      // 납부 내역 생성
      const payments = await Promise.all(
        months.map((month) =>
          tx.membershipPayment.create({
            data: {
              clubMemberId: record.matchedMemberId!,
              paymentRecordId: record.id,
              year,
              month,
              amount: amountPerMonth,
              confirmedById: adminMember.id,
            },
          })
        )
      );

      // 레코드 상태 업데이트
      const updatedRecord = await tx.paymentRecord.update({
        where: { id: record.id },
        data: {
          status: 'CONFIRMED',
          errorReason: null,
        },
        include: {
          matchedMember: {
            select: { id: true, name: true },
          },
          payments: true,
        },
      });

      return { record: updatedRecord, payments };
    });

    return res.status(200).json({
      data: result,
      status: 200,
      message: '입금이 확정되었습니다',
    });
  } catch (error) {
    console.error('Error confirming payment:', error);
    return res.status(500).json({
      error: '입금 확정 처리 중 오류가 발생했습니다',
      status: 500,
    });
  }
});
