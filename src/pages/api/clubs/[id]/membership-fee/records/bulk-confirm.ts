import { FeePeriod } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

import { getFirstObligationMonth } from '@/lib/membership-fee/feeObligation';
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
        },
      },
    });

    const regularType = feeTypes.find((t) => t.name === '일반');
    const coupleType = feeTypes.find((t) => t.name === '부부');

    const regularMonthlyRate = regularType?.rates.find(
      (r) => r.period === FeePeriod.MONTHLY
    );
    const coupleMonthlyRate = coupleType?.rates.find(
      (r) => r.period === FeePeriod.MONTHLY
    );

    if (!regularMonthlyRate) {
      return res.status(400).json({
        error: `${year}년 회비 설정이 없습니다`,
        status: 400,
      });
    }

    const feeSettings = {
      regularAmount: regularMonthlyRate.amount,
      coupleAmount: coupleMonthlyRate?.amount || regularMonthlyRate.amount,
    };

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

    // 레코드 조회 (다중 매칭 회원 포함)
    const records = await prisma.paymentRecord.findMany({
      where: {
        id: { in: recordIds },
        clubId: clubIdNumber,
        status: 'MATCHED',
        OR: [
          { matchedMemberId: { not: null } },
          { matchedMembers: { some: {} } },
        ],
      },
      include: {
        matchedMembers: {
          include: {
            clubMember: { select: { id: true } },
          },
        },
      },
    });

    if (records.length === 0) {
      return res.status(400).json({
        error: '확정 가능한 레코드가 없습니다',
        status: 400,
      });
    }

    const allMemberIds = [
      ...new Set(
        records.flatMap((r) =>
          r.matchedMembers?.length > 0
            ? r.matchedMembers.map((m) => m.clubMemberId)
            : r.matchedMemberId
              ? [r.matchedMemberId]
              : []
        )
      ),
    ];
    const memberStartAtMap = new Map<number, Date | null>();
    if (allMemberIds.length > 0) {
      const members = await prisma.clubMember.findMany({
        where: { id: { in: allMemberIds } },
        select: { id: true, feeObligationStartAt: true },
      });
      members.forEach((m) =>
        memberStartAtMap.set(m.id, m.feeObligationStartAt)
      );
    }

    const results = {
      success: [] as string[],
      failed: [] as { recordId: string; reason: string }[],
    };

    // 각 레코드 처리
    for (const record of records) {
      try {
        const memberIds =
          record.matchedMembers?.length > 0
            ? record.matchedMembers.map((m) => m.clubMemberId)
            : record.matchedMemberId
              ? [record.matchedMemberId]
              : [];

        if (memberIds.length === 0) {
          results.failed.push({
            recordId: record.id,
            reason: '매칭된 회원이 없습니다',
          });
          continue;
        }

        /**
         * 부부 회비(coupleAmount)는 세대당 월 금액(예: 45,000원 한 번 입금).
         * 매칭이 부부 그룹 전원(보통 2명)이면 totalPerMonth는 coupleAmount 한 번만 더함.
         * 그렇지 않으면 기존처럼 인원별 일반/부부 단가 합산.
         */
        const firstGroup = findCoupleGroup(memberIds[0], coupleGroups);
        const memberIdSet = new Set(memberIds);
        const isFullCoupleMatch =
          firstGroup != null &&
          firstGroup.members.length === memberIds.length &&
          firstGroup.members.every((m) => memberIdSet.has(m.clubMemberId));

        let amountPerMemberPerMonth: number[];
        let totalPerMonth: number;
        if (isFullCoupleMatch && firstGroup.members.length > 0) {
          totalPerMonth = feeSettings.coupleAmount;
          const n = firstGroup.members.length;
          const base = Math.floor(feeSettings.coupleAmount / n);
          const remainder = feeSettings.coupleAmount - base * n;
          amountPerMemberPerMonth = memberIds.map((_, i) =>
            i < remainder ? base + 1 : base
          );
        } else {
          amountPerMemberPerMonth = memberIds.map((mid) => {
            const coupleGroup = findCoupleGroup(mid, coupleGroups);
            return coupleGroup
              ? feeSettings.coupleAmount
              : feeSettings.regularAmount;
          });
          totalPerMonth = amountPerMemberPerMonth.reduce((a, b) => a + b, 0);
        }
        if (record.amount % totalPerMonth !== 0) {
          const isPartialPayment =
            record.amount > 0 && record.amount < totalPerMonth;
          results.failed.push({
            recordId: record.id,
            reason: isPartialPayment
              ? `입금 부족 (${record.amount.toLocaleString()}원) - 개별 확정에서 월 선택 후 부족 확정해주세요`
              : `금액이 인원·월 단위와 맞지 않습니다 (${record.amount.toLocaleString()}원)`,
          });
          continue;
        }
        const monthCount = record.amount / totalPerMonth;

        const existingPayments = await prisma.membershipPayment.findMany({
          where: {
            clubMemberId: { in: memberIds },
            year,
          },
          select: { month: true },
        });
        const paidMonthsForSuggestion = [
          ...new Set(existingPayments.map((p) => p.month)),
        ].map((month) => ({ month }));

        // 회원별 의무 시작월 중 가장 늦은 달(부부 시 둘 다 의무인 구간)만 후보로 사용
        const firstMonths = memberIds
          .map((mid) =>
            getFirstObligationMonth(year, memberStartAtMap.get(mid) ?? null)
          )
          .filter((m): m is number => m != null);
        const effectiveFirst =
          firstMonths.length > 0 ? Math.max(...firstMonths) : 1;
        const eligibleMonths = Array.from(
          { length: 13 - effectiveFirst },
          (_, i) => effectiveFirst + i
        );

        const transactionMonth =
          new Date(record.transactionDate).getMonth() + 1;

        const suggestedMonths = suggestMonths(
          monthCount,
          paidMonthsForSuggestion,
          transactionMonth,
          eligibleMonths
        );

        if (suggestedMonths.length < monthCount) {
          results.failed.push({
            recordId: record.id,
            reason: '납부 가능한 월이 부족합니다',
          });
          continue;
        }

        await prisma.$transaction(async (tx) => {
          for (let i = 0; i < memberIds.length; i++) {
            const clubMemberId = memberIds[i];
            const amountPerMonth = amountPerMemberPerMonth[i];
            await Promise.all(
              suggestedMonths.map((month) =>
                tx.membershipPayment.create({
                  data: {
                    clubMemberId,
                    paymentRecordId: record.id,
                    year,
                    month,
                    amount: amountPerMonth,
                    confirmedById: adminMember.id,
                  },
                })
              )
            );
          }
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
