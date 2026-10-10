import { NextApiRequest, NextApiResponse } from 'next';

import { APPROVED_STATUS } from '@/lib/clubAuth';
import {
  applyPlan,
  ConfirmConflictError,
  isObligatedForAll,
  loadPlannerContext,
  planRecord,
} from '@/lib/membership-fee/confirmPlanner';
import { splitEvenly } from '@/lib/membership-fee/feeAmountResolver';
import { feeAmountOf } from '@/lib/membership-fee/transactionClassifier';
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
          : (firstError?.message ?? '입력값을 확인해주세요');
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

    if (record.status === 'SKIPPED') {
      return res.status(400).json({
        error: '건너뛴 입금 내역입니다. 건너뛰기를 해제한 뒤 확정해주세요',
        status: 400,
      });
    }

    if (record.kind !== 'FEE') {
      return res.status(400).json({
        error: '회비가 아닌 입금입니다. 분류를 회비로 바꾼 뒤 확정해주세요',
        status: 400,
      });
    }

    // 고른 연·월 (겹친 달은 한 번만, 이른 달부터)
    const requested = [
      ...new Map(
        selections
          .flatMap((selection) =>
            selection.months.map((month) => ({ year: selection.year, month }))
          )
          .map((ym) => [ym.year * 12 + ym.month, ym] as const)
      ).values(),
    ].sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month));

    const ctx = await loadPlannerContext(prisma, clubIdNumber);

    const notObligated = requested.find(
      (ym) => !isObligatedForAll(ctx, memberIds, ym)
    );
    if (notObligated) {
      return res.status(400).json({
        error: `${notObligated.year}년 ${notObligated.month}월은 해당 회원의 회비 의무 기간이 아닙니다 (가입 시기·휴회 확인)`,
        status: 400,
      });
    }

    // 단가와 개월 수는 업로드·일괄 확정과 같은 함수로 판정한다
    const plan = planRecord(ctx, {
      memberIds,
      transactionDate: record.transactionDate,
      amount: record.amount,
      nonFeeAmount: record.nonFeeAmount,
      monthHints: null,
      matchConfidence: null,
    });
    if (plan.error) {
      return res.status(400).json({ error: plan.error, status: 400 });
    }

    const feeAmount = feeAmountOf(record);
    const { resolve } = plan;

    /**
     * 이미 납부된 달은 다시 확정할 수 없다. 단, 앞서 덜 낸 달에 나머지를 채우는 경우
     * (한 달만 골랐고, 회원마다 기존 납부 + 이번 몫이 단가를 넘지 않음)는 허용한다.
     */
    const requestedIndexes = new Set(
      requested.map((ym) => ym.year * 12 + ym.month)
    );
    const alreadyPaid = memberIds.flatMap((memberId) =>
      (ctx.paidByMember.get(memberId) ?? [])
        .filter((paid) => requestedIndexes.has(paid.year * 12 + paid.month))
        .map((paid) => ({ ...paid, memberId }))
    );
    let allowTopUp = false;
    if (alreadyPaid.length > 0) {
      const shares = splitEvenly(feeAmount, memberIds.length);
      const paidSoFar = (memberId: number) =>
        alreadyPaid
          .filter((paid) => paid.memberId === memberId)
          .reduce((sum, paid) => sum + (paid.amount ?? Infinity), 0);
      const isTopUp =
        requested.length === 1 &&
        memberIds.every(
          (memberId, i) =>
            paidSoFar(memberId) + shares[i] <= resolve.perMemberPerMonth[i]
        );
      if (!isTopUp) {
        const months = [
          ...new Set(
            alreadyPaid.map((paid) => `${paid.year}년 ${paid.month}월`)
          ),
        ].join(', ');
        return res.status(400).json({
          error: `이미 납부된 월이 있습니다: ${months}`,
          status: 400,
        });
      }
      allowTopUp = true;
    }

    /**
     * 금액을 어떻게 나눌지:
     * - 연납 금액을 12개월로 확정 → 연납 단가 그대로
     * - 고른 달만큼의 단가에 못 미침(부족, 연납을 12개월이 아닌 달 수로 확정) → 받은 금액을 고르게 나눔
     * - 고른 달만큼의 단가를 넘음 → 단가대로 확정하고 남는 금액은 초과 입금으로 남김
     */
    const isAnnualAsPlanned =
      resolve.period === 'ANNUAL' && requested.length === resolve.monthCount;
    const expected = resolve.totalPerMonth * requested.length;
    const distributeAmount =
      !isAnnualAsPlanned &&
      (feeAmount < expected || resolve.period === 'ANNUAL')
        ? feeAmount
        : undefined;
    const overpay =
      distributeAmount === undefined && !isAnnualAsPlanned
        ? feeAmount - expected
        : 0;

    const result = await prisma.$transaction(async (tx) => {
      // 단건 확정은 대기·에러 상태에서도 할 수 있다 (사람이 회원과 달을 직접 골랐다)
      await tx.paymentRecord.updateMany({
        where: { id: record.id, status: { in: ['PENDING', 'ERROR'] } },
        data: { status: 'MATCHED' },
      });
      await applyPlan(tx, {
        recordId: record.id,
        memberIds,
        selections: requested,
        resolve,
        confirmedById: adminMember.id,
        distributeAmount,
        allowTopUp,
      });

      const updatedRecord = await tx.paymentRecord.update({
        where: { id: record.id },
        data:
          overpay > 0 && record.nonFeeAmount === 0
            ? { nonFeeAmount: overpay, nonFeeKind: 'OVERPAY' }
            : {},
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

      return { record: updatedRecord, payments: updatedRecord.payments };
    });

    return res.status(200).json({
      data: result,
      status: 200,
      message: '입금이 확정되었습니다',
    });
  } catch (error) {
    // 판정과 저장 사이에 다른 요청이 먼저 처리했다. 서버 오류가 아니다.
    if (error instanceof ConfirmConflictError) {
      return res.status(400).json({ error: error.message, status: 400 });
    }
    console.error('Error confirming payment:', error);
    return res.status(500).json({
      error: '입금 확정 처리 중 오류가 발생했습니다',
      status: 500,
    });
  }
});
