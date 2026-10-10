import { NextApiRequest, NextApiResponse } from 'next';

import { APPROVED_STATUS } from '@/lib/clubAuth';
import {
  applyPlan,
  isObligatedForAll,
  loadPlannerContext,
  planRecord,
} from '@/lib/membership-fee/confirmPlanner';
import { parseStoredMonthHints } from '@/lib/membership-fee/monthHintParser';
import { storedReviewReason } from '@/lib/membership-fee/paymentKind';
import { recordMemberIds } from '@/lib/membership-fee/recordAnnotator';
import { feeAmountOf } from '@/lib/membership-fee/transactionClassifier';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import { bulkConfirmSchema } from '@/schemas/membership-fee.schema';
import { Role } from '@/types/enums';

type YM = { year: number; month: number };

const label = (months: YM[]) =>
  months.map((ym) => `${ym.year}년 ${ym.month}월`).join(', ');

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
    const parseResult = bulkConfirmSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({
        error: parseResult.error.errors[0].message,
        status: 400,
      });
    }

    const { recordIds, selections } = parseResult.data;

    /**
     * 사용자가 달을 지정했으면 모든 건에 그 달을 적용한다.
     * 지정하지 않았으면 건마다 배정된 달(월 힌트 → 밀린 달 순)로 확정한다.
     */
    const userSelected: YM[] | null =
      selections && selections.length > 0
        ? selections.flatMap((selection) =>
            selection.months.map((month) => ({ year: selection.year, month }))
          )
        : null;

    const [found, ctx] = await Promise.all([
      prisma.paymentRecord.findMany({
        where: { id: { in: recordIds }, clubId: clubIdNumber },
        include: { matchedMembers: { select: { clubMemberId: true } } },
      }),
      loadPlannerContext(prisma, clubIdNumber),
    ]);

    const results = {
      success: [] as string[],
      failed: [] as { recordId: string; reason: string }[],
    };
    const fail = (recordId: string, reason: string) =>
      results.failed.push({ recordId, reason });

    const foundIds = new Set(found.map((record) => record.id));
    for (const id of recordIds) {
      if (!foundIds.has(id)) fail(id, '입금 내역을 찾을 수 없습니다');
    }

    // 거래일이 이른 건부터 확정한다. 한 회원의 입금이 여러 건이면 앞 건이 앞 달을 가져간다.
    const records = [...found].sort(
      (a, b) => a.transactionDate.getTime() - b.transactionDate.getTime()
    );

    for (const record of records) {
      if (record.status === 'CONFIRMED') {
        fail(record.id, '이미 확정된 입금 내역입니다');
        continue;
      }
      if (record.status !== 'MATCHED') {
        fail(record.id, '매칭 상태가 아닙니다');
        continue;
      }
      if (record.kind !== 'FEE') {
        fail(record.id, '회비가 아닌 입금입니다');
        continue;
      }
      const memberIds = recordMemberIds(record);
      if (memberIds.length === 0) {
        fail(record.id, '매칭된 회원이 없습니다');
        continue;
      }
      // 사람이 확인해야 풀리는 표시(불확실한 자동 매칭 등)는 달을 지정해도 막는다.
      // 달을 지정한 것은 회원이나 분류가 맞다는 확인이 아니다.
      const stored = storedReviewReason(record);
      if (stored) {
        fail(record.id, stored);
        continue;
      }

      // 저장된 사유를 믿지 않고 지금의 단가·의무·납부로 다시 판정한다.
      const plan = planRecord(ctx, {
        memberIds,
        transactionDate: record.transactionDate,
        amount: record.amount,
        nonFeeAmount: record.nonFeeAmount,
        monthHints: parseStoredMonthHints(record.monthHints),
        matchConfidence: null,
      });
      if (plan.error) {
        fail(record.id, plan.error);
        continue;
      }

      let targets = plan.selections;
      if (userSelected) {
        // 달을 지정하면 월 힌트·선납 같은 달에 관한 검토는 넘어가지만,
        // 누구의 돈인지에 관한 검토(면제 회원 = 대납 가능성)는 그대로 막는다.
        if (plan.exemptReason) {
          fail(record.id, plan.exemptReason);
          continue;
        }
        if (plan.resolve.shortfall) {
          fail(
            record.id,
            `입금 부족 (${feeAmountOf(record).toLocaleString('ko-KR')}원) - 개별 확정에서 월 선택 후 부족 확정해주세요`
          );
          continue;
        }
        if (plan.resolve.overpay > 0) {
          fail(
            record.id,
            `초과 입금 ${plan.resolve.overpay.toLocaleString('ko-KR')}원 - 개별 확정에서 회비가 아닌 금액을 나누거나 월을 골라주세요`
          );
          continue;
        }
        if (userSelected.length !== plan.resolve.monthCount) {
          fail(
            record.id,
            `지정한 월 수(${userSelected.length})가 입금 금액 기준 월 수(${plan.resolve.monthCount})와 다릅니다`
          );
          continue;
        }
        const notObligated = userSelected.filter(
          (ym) => !isObligatedForAll(ctx, memberIds, ym)
        );
        if (notObligated.length > 0) {
          fail(
            record.id,
            `의무월이 아닌 월이 포함됨 (${label(notObligated)}) — 휴회·가입 이전일 수 있습니다`
          );
          continue;
        }
        const paid = new Set(
          memberIds
            .flatMap((id) => ctx.paidByMember.get(id) ?? [])
            .map((ym) => ym.year * 12 + ym.month)
        );
        const alreadyPaid = userSelected.filter((ym) =>
          paid.has(ym.year * 12 + ym.month)
        );
        if (alreadyPaid.length > 0) {
          fail(record.id, `이미 납부된 월이 포함됨 (${label(alreadyPaid)})`);
          continue;
        }
        targets = userSelected;
      } else if (plan.needsReview) {
        fail(record.id, `검토 필요: ${plan.reviewReasons.join(' · ')}`);
        continue;
      }

      try {
        await prisma.$transaction((tx) =>
          applyPlan(tx, {
            recordId: record.id,
            memberIds,
            selections: targets,
            resolve: plan.resolve,
            confirmedById: adminMember.id,
          })
        );
        // 뒤의 건이 방금 확정한 달을 피하도록 납부 이력에 더한다.
        for (const memberId of memberIds) {
          ctx.paidByMember.set(memberId, [
            ...(ctx.paidByMember.get(memberId) ?? []),
            ...targets,
          ]);
        }
        results.success.push(record.id);
      } catch (error: any) {
        fail(record.id, error.message || '처리 중 오류');
      }
    }

    // 성공 목록은 요청한 순서로 돌려준다
    const successSet = new Set(results.success);
    results.success = recordIds.filter((id) => successSet.has(id));

    return res.status(200).json({
      data: {
        results,
        summary: {
          total: recordIds.length,
          processed: found.length,
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
