import { NextApiRequest, NextApiResponse } from 'next';

import { validateAmount } from '@/lib/membership-fee/amountValidator';
import { findCoupleGroup } from '@/lib/membership-fee/memberMatcher';
import { suggestMonths } from '@/lib/membership-fee/monthSuggester';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import { bulkConfirmSchema } from '@/schemas/membership-fee.schema';
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

  const { id: clubId } = req.query;

  if (!clubId || typeof clubId !== 'string') {
    return res.status(400).json({
      error: '클럽 ID가 필요합니다',
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
    const parseResult = bulkConfirmSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({
        error: parseResult.error.errors[0].message,
        status: 400,
      });
    }

    const { recordIds, year } = parseResult.data;

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

    // 부부 그룹 조회
    const coupleGroups = await prisma.coupleGroup.findMany({
      where: { clubId: clubIdNumber },
      include: {
        members: {
          include: {
            clubMember: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    // 레코드 조회
    const records = await prisma.paymentRecord.findMany({
      where: {
        id: { in: recordIds },
        clubId: clubIdNumber,
        status: 'MATCHED',
        matchedMemberId: { not: null },
      },
    });

    if (records.length === 0) {
      return res.status(400).json({
        error: '확정 가능한 레코드가 없습니다',
        status: 400,
      });
    }

    const results = {
      success: [] as string[],
      failed: [] as { recordId: string; reason: string }[],
    };

    // 각 레코드 처리
    for (const record of records) {
      try {
        // 부부 여부 확인
        const coupleGroup = findCoupleGroup(
          record.matchedMemberId!,
          coupleGroups
        );
        const memberType = coupleGroup ? 'couple' : 'regular';

        // 금액 검증
        const validation = validateAmount(
          record.amount,
          {
            regularAmount: feeSettings.regularAmount,
            coupleAmount: feeSettings.coupleAmount,
          },
          memberType
        );

        if (!validation.isValid) {
          results.failed.push({
            recordId: record.id,
            reason: validation.error || '금액 검증 실패',
          });
          continue;
        }

        // 이미 납부된 월 조회
        const existingPayments = await prisma.membershipPayment.findMany({
          where: {
            clubMemberId: record.matchedMemberId!,
            year,
          },
          select: { month: true },
        });

        // 납부할 월 제안
        const suggestedMonths = suggestMonths(
          validation.monthCount,
          existingPayments
        );

        if (suggestedMonths.length < validation.monthCount) {
          results.failed.push({
            recordId: record.id,
            reason: '납부 가능한 월이 부족합니다',
          });
          continue;
        }

        const amountPerMonth =
          memberType === 'couple'
            ? feeSettings.coupleAmount
            : feeSettings.regularAmount;

        // 트랜잭션으로 처리
        await prisma.$transaction(async (tx) => {
          // 납부 내역 생성
          await Promise.all(
            suggestedMonths.map((month) =>
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
          await tx.paymentRecord.update({
            where: { id: record.id },
            data: {
              status: 'CONFIRMED',
              errorReason: null,
            },
          });
        });

        results.success.push(record.id);
      } catch (error: any) {
        results.failed.push({
          recordId: record.id,
          reason: error.message || '처리 중 오류',
        });
      }
    }

    return res.status(200).json({
      data: {
        results,
        summary: {
          total: recordIds.length,
          processed: records.length,
          success: results.success.length,
          failed: results.failed.length,
        },
      },
      status: 200,
      message: `${results.success.length}건 확정, ${results.failed.length}건 실패`,
    });
  } catch (error) {
    console.error('Error in bulk confirm:', error);
    return res.status(500).json({
      error: '일괄 확정 처리 중 오류가 발생했습니다',
      status: 500,
    });
  }
});
