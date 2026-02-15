import { FeePeriod } from '@prisma/client';
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
    const body = req.body;
    if (!body || typeof body !== 'object') {
      return res.status(400).json({
        error: '요청 본문(year, months)이 필요합니다',
        status: 400,
      });
    }

    const parseResult = paymentConfirmSchema.safeParse(body);

    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0];
      const message =
        firstError?.message === 'Required'
          ? 'year(연도)와 months(월 배열) 또는 selections를 입력해주세요'
          : firstError?.message ?? '입력값을 확인해주세요';
      return res.status(400).json({
        error: message,
        status: 400,
      });
    }

    const data = parseResult.data;
    const selections: { year: number; months: number[] }[] =
      'selections' in data &&
      Array.isArray(data.selections) &&
      data.selections.length > 0
        ? data.selections
        : [
            {
              year: (data as { year: number; months: number[] }).year,
              months: (data as { year: number; months: number[] }).months,
            },
          ];

    // 레코드 조회 (다중 매칭 회원 포함)
    const record = await prisma.paymentRecord.findFirst({
      where: {
        id: recordId,
        clubId: clubIdNumber,
      },
      include: {
        matchedMembers: {
          include: {
            clubMember: { select: { id: true } },
          },
        },
      },
    });

    if (!record) {
      return res.status(404).json({
        error: '입금 내역을 찾을 수 없습니다',
        status: 404,
      });
    }

    const memberIds =
      record.matchedMembers?.length > 0
        ? record.matchedMembers.map((m) => m.clubMemberId)
        : record.matchedMemberId
          ? [record.matchedMemberId]
          : [];

    if (memberIds.length === 0) {
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

    const coupleGroups = await prisma.coupleGroup.findMany({
      where: { clubId: clubIdNumber },
      include: {
        members: { select: { clubMemberId: true } },
      },
    });

    // 연도별 회비 금액 (amountPerMemberPerMonth per year)
    const amountPerYear = new Map<
      number,
      number[]
    >();
    const allYears = [...new Set(selections.map((s) => s.year))];
    for (const y of allYears) {
      const feeTypes = await prisma.feeType.findMany({
        where: {
          clubId: clubIdNumber,
          isActive: true,
        },
        include: {
          rates: { where: { year: y } },
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
          error: `${y}년 회비 설정이 없습니다`,
          status: 400,
        });
      }
      const perMember = memberIds.map((mid) => {
        const isCouple = coupleGroups.some((cg) =>
          cg.members.some((m) => m.clubMemberId === mid)
        );
        return isCouple
          ? (coupleMonthlyRate?.amount ?? regularMonthlyRate.amount)
          : regularMonthlyRate.amount;
      });
      amountPerYear.set(y, perMember);
    }

    let expectedAmount = 0;
    for (const sel of selections) {
      const perMember = amountPerYear.get(sel.year)!;
      expectedAmount += perMember.reduce(
        (sum, amt) => sum + amt * sel.months.length,
        0
      );
    }

    const totalSlots = selections.reduce(
      (acc, sel) => acc + memberIds.length * sel.months.length,
      0
    );
    const baseAmount = Math.floor(record.amount / totalSlots);
    const remainder = record.amount - baseAmount * totalSlots;
    const getAmountForSlot = (slotIndex: number) =>
      slotIndex < remainder ? baseAmount + 1 : baseAmount;

    // 이미 납부된 월 검사 (모든 selections에 대해)
    for (let i = 0; i < memberIds.length; i++) {
      for (const sel of selections) {
        const existingPayments = await prisma.membershipPayment.findMany({
          where: {
            clubMemberId: memberIds[i],
            year: sel.year,
            month: { in: sel.months },
          },
        });
        if (existingPayments.length > 0) {
          const paidMonths = existingPayments
            .map((p) => `${p.year}년 ${p.month}월`)
            .join(', ');
          return res.status(400).json({
            error: `이미 납부된 월이 있습니다: ${paidMonths}`,
            status: 400,
          });
        }
      }
    }

    // 트랜잭션: 모든 selections에 대해 회원별·월별 납부 생성
    const result = await prisma.$transaction(async (tx) => {
      const payments: Awaited<
        ReturnType<typeof tx.membershipPayment.create>
      >[] = [];
      let slotIndex = 0;

      for (const sel of selections) {
        const amountPerMemberPerMonth = amountPerYear.get(sel.year)!;
        for (let i = 0; i < memberIds.length; i++) {
          const clubMemberId = memberIds[i];
          const amountPerMonth = amountPerMemberPerMonth[i];
          for (const month of sel.months) {
            const amount =
              record.amount >= expectedAmount
                ? amountPerMonth
                : getAmountForSlot(slotIndex);
            const p = await tx.membershipPayment.create({
              data: {
                clubMemberId,
                paymentRecordId: record.id,
                year: sel.year,
                month,
                amount,
                confirmedById: adminMember.id,
              },
            });
            payments.push(p);
            slotIndex += 1;
          }
        }
      }

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
          matchedMembers: {
            include: {
              clubMember: { select: { id: true, name: true } },
            },
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
