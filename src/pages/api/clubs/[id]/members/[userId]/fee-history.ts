import { PaymentRecordStatus } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

import { isActiveMemberStatus } from '@/constants/memberStatus';
import { APPROVED_STATUS } from '@/lib/clubAuth';
import { feeRateSettingsFromTypes } from '@/lib/membership-fee/confirmPlanner';
import {
  wasCoupleAt,
  yearMonthToStartedAt,
} from '@/lib/membership-fee/coupleHistory';
import { kstYearMonth } from '@/lib/membership-fee/kst';
import {
  buildFeeSummary,
  selectableYears,
  visibleManualReason,
} from '@/lib/membership-fee/memberFeeHistory';
import { buildMemberYearStatus } from '@/lib/membership-fee/memberYearStatus';
import { loadMemberYearData } from '@/lib/membership-fee/memberYearStatusLoader';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import { Role } from '@/types/enums';
import type {
  FeeHistoryMonth,
  MemberFeeHistory,
} from '@/types/membership-fee.types';

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/** 확인 중으로 보일 입금 상태 — 회원은 찾았지만 아직 확정하지 않은 것 */
const PENDING_STATUSES: PaymentRecordStatus[] = ['MATCHED', 'ERROR'];

/**
 * GET ?year=: 회원 한 명의 한 해 납부 이력.
 * 회원 상세(임원)와 내 회비(본인)가 같이 쓴다. 임원이거나 본인(승인·휴가)만 읽는다.
 */
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

  const clubId = Number(req.query.id);
  const userId = Number(req.query.userId);
  if (!Number.isFinite(clubId) || !Number.isFinite(userId)) {
    return res.status(400).json({
      error: '클럽 ID와 회원 ID가 필요합니다',
      status: 400,
    });
  }

  const currentYear = kstYearMonth(new Date()).year;
  const year =
    req.query.year === undefined ? currentYear : Number(req.query.year);
  if (!Number.isInteger(year) || year < 1) {
    return res.status(400).json({
      error: '연도를 확인해주세요',
      status: 400,
    });
  }

  const requester = await prisma.clubMember.findUnique({
    where: { clubId_userId: { clubId, userId: req.user.id } },
  });
  const isAdmin =
    requester?.role === Role.ADMIN && requester?.status === APPROVED_STATUS;
  const isSelf =
    req.user.id === userId && isActiveMemberStatus(requester?.status);
  if (!isAdmin && !isSelf) {
    return res.status(403).json({
      error: '권한이 없습니다',
      status: 403,
    });
  }

  try {
    const member = await prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId, userId } },
    });
    if (!member) {
      return res.status(404).json({
        error: '회원을 찾을 수 없습니다',
        status: 404,
      });
    }

    const [latestTx, allPayments, leaves] = await Promise.all([
      prisma.paymentRecord.aggregate({
        where: { clubId },
        _max: { transactionDate: true },
      }),
      prisma.membershipPayment.findMany({
        where: { clubMemberId: member.id },
        select: {
          year: true,
          month: true,
          amount: true,
          paymentRecordId: true,
          manualReason: true,
        },
      }),
      prisma.memberLeave.findMany({ where: { clubMemberId: member.id } }),
    ]);

    const base = {
      member: { name: member.name, feeExcluded: member.feeExcluded },
      year,
      years: selectableYears(
        member.feeObligationStartAt,
        allPayments.map((payment) => payment.year),
        currentYear
      ),
      asOf: latestTx._max.transactionDate?.toISOString() ?? null,
      leaves: leaves
        .filter(
          (leave) =>
            leave.startYear <= year &&
            (leave.endYear == null || leave.endYear >= year)
        )
        .sort(
          (a, b) => a.startYear - b.startYear || a.startMonth - b.startMonth
        )
        .map(({ startYear, startMonth, endYear, endMonth, reason }) => ({
          startYear,
          startMonth,
          endYear,
          endMonth,
          reason,
        })),
    };

    if (member.feeExcluded) {
      const data: MemberFeeHistory = {
        ...base,
        summary: { unpaidCount: 0, unpaidAmount: null, monthlyFee: [] },
        months: [],
        pendingDeposits: [],
      };
      return res.status(200).json({
        data,
        status: 200,
        message: '납부 이력을 불러왔습니다',
      });
    }

    const yearPayments = allPayments.filter((payment) => payment.year === year);
    const recordIds = [
      ...new Set(
        yearPayments
          .map((payment) => payment.paymentRecordId)
          .filter((id): id is string => id != null)
      ),
    ];
    const matched = await prisma.paymentRecordMatchedMember.findMany({
      where: { clubMemberId: member.id },
    });

    const [memberYearData, feeTypes, histories, records, pendingRecords] =
      await Promise.all([
        loadMemberYearData(prisma, clubId, year, { clubMemberId: member.id }),
        prisma.feeType.findMany({
          where: { clubId },
          include: { rates: true },
        }),
        prisma.coupleHistory.findMany({
          where: { clubId, clubMemberId: member.id },
          select: {
            clubMemberId: true,
            partnerClubMemberId: true,
            startedAt: true,
            endedAt: true,
          },
        }),
        recordIds.length
          ? prisma.paymentRecord.findMany({
              where: { id: { in: recordIds } },
            })
          : Promise.resolve([]),
        matched.length
          ? prisma.paymentRecord.findMany({
              where: {
                id: { in: matched.map((row) => row.paymentRecordId) },
                clubId,
                status: { in: PENDING_STATUSES },
                kind: 'FEE',
                needsReview: false,
              },
            })
          : Promise.resolve([]),
      ]);

    const status = buildMemberYearStatus(year, memberYearData.members[0]);
    const isCoupleAt = (month: number) =>
      wasCoupleAt(member.id, yearMonthToStartedAt(year, month), histories)
        .isCouple;
    const recordById = new Map(records.map((record) => [record.id, record]));
    const memberName = member.name?.trim() ?? '';

    const months: FeeHistoryMonth[] = MONTHS.map((month) => ({
      month,
      status: status.cells[month],
      leaveReason: status.leaveReasons[month] ?? null,
      isCouple: isCoupleAt(month),
      payments: yearPayments
        .filter((payment) => payment.month === month)
        .map((payment) => {
          const record = payment.paymentRecordId
            ? recordById.get(payment.paymentRecordId)
            : undefined;
          const depositor = record?.depositorName.trim() ?? null;
          return {
            amount: payment.amount,
            transactionDate: record?.transactionDate.toISOString() ?? null,
            depositorName:
              depositor && depositor !== memberName ? depositor : null,
            manualReason:
              payment.paymentRecordId == null
                ? visibleManualReason(payment.manualReason, isAdmin)
                : null,
          };
        }),
    }));

    const data: MemberFeeHistory = {
      ...base,
      summary: buildFeeSummary(
        status,
        feeRateSettingsFromTypes(feeTypes, year),
        isCoupleAt
      ),
      months,
      pendingDeposits: pendingRecords
        .sort(
          (a, b) => b.transactionDate.getTime() - a.transactionDate.getTime()
        )
        .map((record) => ({
          transactionDate: record.transactionDate.toISOString(),
          amount: record.amount,
        })),
    };

    return res.status(200).json({
      data,
      status: 200,
      message: '납부 이력을 불러왔습니다',
    });
  } catch (error) {
    console.error('Error in fee-history:', error);
    return res.status(500).json({
      error: '납부 이력을 불러오는 중 오류가 발생했습니다',
      status: 500,
    });
  }
});
