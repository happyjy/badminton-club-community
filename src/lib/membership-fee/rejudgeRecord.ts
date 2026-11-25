import { planRecord, type PlannerContext } from './confirmPlanner';
import { parseStoredMonthHints } from './monthHintParser';

import type { PaymentRecordKind, PaymentRecordStatus } from '@prisma/client';

/**
 * 분류·매칭 회원·회비가 아닌 금액을 사람이 고친 뒤, 그 건을 어떤 상태로 둘지 정한다.
 * 업로드 때의 저장 규칙과 같다: 회비가 아니면 건너뜀, 회원이 없으면 대기,
 * 처리할 수 없으면 에러, 그 밖에는 매칭됨.
 */
export function judgeStoredState(
  ctx: PlannerContext,
  record: {
    kind: PaymentRecordKind;
    transactionDate: Date;
    amount: number;
    nonFeeAmount: number;
    monthHints: unknown;
  },
  memberIds: number[]
): { status: PaymentRecordStatus; errorReason: string | null } {
  if (record.kind !== 'FEE') return { status: 'SKIPPED', errorReason: null };
  if (memberIds.length === 0) {
    return { status: 'PENDING', errorReason: '회원 매칭 실패' };
  }
  const plan = planRecord(ctx, {
    memberIds,
    transactionDate: record.transactionDate,
    amount: record.amount,
    nonFeeAmount: record.nonFeeAmount,
    monthHints: parseStoredMonthHints(record.monthHints),
    matchConfidence: null,
  });
  return plan.error
    ? { status: 'ERROR', errorReason: plan.error }
    : { status: 'MATCHED', errorReason: null };
}
