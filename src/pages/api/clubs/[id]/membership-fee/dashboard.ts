import { FeePeriod } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

import { APPROVED_STATUS } from '@/lib/clubAuth';
import { buildMemberYearStatus } from '@/lib/membership-fee/memberYearStatus';
import { loadMemberYearData } from '@/lib/membership-fee/memberYearStatusLoader';
import { loadPendingWork } from '@/lib/membership-fee/recordAnnotator';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import { Role } from '@/types/enums';

export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: '허용되지 않는 메소드입니다',
      status: 405,
    });
  }

  const { id: clubId, year: yearQuery } = req.query;

  if (!clubId || typeof clubId !== 'string') {
    return res.status(400).json({
      error: '클럽 ID가 필요합니다',
      status: 400,
    });
  }

  const clubIdNumber = Number(clubId);
  const year = yearQuery ? Number(yearQuery) : new Date().getFullYear();

  // ADMIN 권한 확인
  const adminMember = await prisma.clubMember.findFirst({
    where: {
      userId: req.user.id,
      clubId: clubIdNumber,
      role: Role.ADMIN,
      status: APPROVED_STATUS,
    },
  });

  if (!adminMember) {
    return res.status(403).json({
      error: '권한이 없습니다',
      status: 403,
    });
  }

  try {
    // 회비 유형 및 금액 조회
    const feeTypes = await prisma.feeType.findMany({
      where: {
        clubId: clubIdNumber,
        isActive: true,
      },
      include: {
        rates: {
          where: {
            year,
          },
          orderBy: {
            period: 'asc',
          },
        },
      },
      orderBy: {
        sortOrder: 'asc',
      },
    });

    // 하위 호환성을 위한 간단한 설정 추출
    const regularType = feeTypes.find((t) => t.name === '일반');
    const coupleType = feeTypes.find((t) => t.name === '부부');

    const regularMonthlyRate = regularType?.rates.find(
      (r) => r.period === FeePeriod.MONTHLY
    );
    const coupleMonthlyRate = coupleType?.rates.find(
      (r) => r.period === FeePeriod.MONTHLY
    );

    const feeSettings = {
      year,
      regularAmount: regularMonthlyRate?.amount || 0,
      coupleAmount: coupleMonthlyRate?.amount || 0,
      feeTypes,
    };

    // 회원별 현황은 내보내기와 같은 함수로 계산한다
    const {
      members: memberInputs,
      amountsByMonth,
      coupleGroupCount,
      exemptMemberCount,
    } = await loadMemberYearData(prisma, clubIdNumber, year);
    const members = memberInputs.map((member) =>
      buildMemberYearStatus(year, member)
    );

    // 월별 통계: 해당 월에 의무 있는 회원 수 기준 (휴회 월 제외)
    const monthlyStats = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      let paidCount = 0;
      let totalCount = 0;

      members.forEach((m) => {
        if (m.type === 'exempt') return;
        const isObligated = m.obligationMonths
          ? m.obligationMonths.includes(month)
          : (m.firstObligationMonth ?? 1) <= month;
        if (isObligated) {
          totalCount++;
          if (m.payments[month]) paidCount++;
        }
      });

      return {
        month,
        paidCount,
        totalCount,
        amount: amountsByMonth.get(month) || 0,
      };
    });

    const yearTotal = Array.from(amountsByMonth.values()).reduce(
      (sum, amount) => sum + amount,
      0
    );

    // 최근 업로드 배치 + 최신 거래일 조회 (연도 무관, 클럽 전체)
    const [lastBatchRaw, latestTx, pendingWork] = await Promise.all([
      prisma.paymentUploadBatch.findFirst({
        where: { clubId: clubIdNumber },
        orderBy: { uploadedAt: 'desc' },
        include: { uploadedBy: { select: { name: true } } },
      }),
      prisma.paymentRecord.aggregate({
        where: { clubId: clubIdNumber },
        _max: { transactionDate: true },
      }),
      loadPendingWork(prisma, clubIdNumber),
    ]);

    const latestUpload = {
      lastBatch: lastBatchRaw
        ? {
            id: lastBatchRaw.id,
            uploadedAt: lastBatchRaw.uploadedAt.toISOString(),
            fileName: lastBatchRaw.fileName,
            recordCount: lastBatchRaw.recordCount,
            uploadedByName: lastBatchRaw.uploadedBy.name,
          }
        : null,
      latestTransactionDate:
        latestTx._max.transactionDate?.toISOString() ?? null,
      pendingWork,
    };

    return res.status(200).json({
      data: {
        year,
        feeSettings,
        members,
        summary: {
          totalMembers: members.length,
          exemptMembers: exemptMemberCount,
          coupleGroups: coupleGroupCount,
          monthlyStats,
          yearTotal,
        },
        latestUpload,
      },
      status: 200,
      message: '대시보드 데이터를 불러왔습니다',
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    return res.status(500).json({
      error: '대시보드 데이터 조회 중 오류가 발생했습니다',
      status: 500,
    });
  }
});
