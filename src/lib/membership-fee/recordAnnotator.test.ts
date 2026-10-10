import { describe, expect, it } from '@jest/globals';

import { annotateRecords, attachPlans } from './recordAnnotator';

import type { PlannerContext } from './confirmPlanner';

const rates = {
  regularMonthly: 25000,
  coupleMonthly: 45000,
  regularAnnual: 275000,
  coupleAnnual: 495000,
  joiningFeeAmounts: [100000],
};
const start = new Date(2025, 0, 1);

/** 1번 회원: 2026년 1~4월 납부 */
const ctx = (): PlannerContext => ({
  ratesByYear: new Map([
    [2026, rates],
    [2027, rates],
  ]),
  coupleHistories: [],
  coupleGroups: [],
  memberStartAtMap: new Map<number, Date | null>([[1, start]]),
  memberLeftAtMap: new Map<number, Date | null>([[1, null]]),
  leaveMap: new Map(),
  paidByMember: new Map([
    [1, [1, 2, 3, 4].map((month) => ({ year: 2026, month, amount: 25000 }))],
  ]),
  exemptByYear: new Map(),
});

/** 2026년 5월 10일, 1번 회원에 매칭된 회비 25,000원 */
const record = (over: Record<string, unknown> = {}) => ({
  id: 'r1',
  status: 'MATCHED',
  kind: 'FEE',
  transactionDate: new Date(2026, 4, 10),
  amount: 25000,
  nonFeeAmount: 0,
  monthHints: null as unknown,
  needsReview: false,
  matchedMemberId: 1 as number | null,
  matchedMembers: [{ clubMemberId: 1 }],
  ...over,
});

describe('attachPlans', () => {
  it('매칭된 회비 건에 배정할 납부월을 붙인다', () => {
    const [annotated] = attachPlans(ctx(), [record()]);

    expect(annotated).toMatchObject({
      id: 'r1',
      suggestedSelections: [{ year: 2026, month: 5 }],
      needsReview: false,
      reviewReasons: [],
      suggestedStartMonth: null,
      ratesFallbackYear: null,
      partialPaidMonth: null,
    });
  });

  it('저장해 둔 검토 사유가 있으면 그 사유를, 없으면 회원 확인 사유를 보인다', () => {
    const homonym = '같은 이름의 회원이 2명 있습니다 — 회원을 확인해주세요';

    const [withReason, withoutReason] = attachPlans(ctx(), [
      record({ needsReview: true, reviewReason: homonym }),
      record({ id: 'r2', needsReview: true, reviewReason: null }),
    ]);

    expect(withReason.reviewReasons).toEqual([homonym]);
    expect(withoutReason.reviewReasons).toEqual([
      '이름이 비슷한 회원으로 자동 매칭됨 — 회원을 확인해주세요',
    ]);
  });

  it('최종 납부월과 차기 의무월을 붙인다', () => {
    const [annotated] = attachPlans(ctx(), [record()]);

    expect(annotated.lastPaidYearMonth).toEqual({ year: 2026, month: 4 });
    expect(annotated.nextSuggestedYearMonth).toEqual({ year: 2026, month: 5 });
    expect(annotated.nextSuggestedReasons).toEqual([]);
  });

  it('차기 의무월이 휴회로 밀리면 그 사유를 함께 싣는다', () => {
    const context = ctx();
    context.leaveMap = new Map([
      [1, [{ startYear: 2026, startMonth: 5, endYear: 2026, endMonth: 6 }]],
    ]);

    const [annotated] = attachPlans(context, [record()]);

    expect(annotated.nextSuggestedYearMonth).toEqual({ year: 2026, month: 7 });
    expect(annotated.nextSuggestedReasons.join()).toContain('휴회');
    expect(annotated.suggestedSelections).toEqual([{ year: 2026, month: 7 }]);
  });

  it('저장된 월 힌트로 배정한다', () => {
    const [annotated] = attachPlans(ctx(), [
      record({
        amount: 50000,
        monthHints: {
          source: 'depositorName',
          months: [
            { year: 2026, month: 6 },
            { year: 2026, month: 7 },
          ],
        },
      }),
    ]);

    expect(annotated.suggestedSelections).toEqual([
      { year: 2026, month: 6 },
      { year: 2026, month: 7 },
    ]);
  });

  it('검토 필요는 저장된 값이 아니라 지금의 금액·의무·납부로 다시 판정한다', () => {
    const [shortfall] = attachPlans(ctx(), [record({ amount: 20000 })]);
    expect(shortfall.needsReview).toBe(true);
    expect(shortfall.reviewReasons[0]).toContain('입금 부족');

    // 재무가 회비가 아닌 금액을 떼어 내 단가에 맞게 된 건
    const [resolved] = attachPlans(ctx(), [
      record({ amount: 49500, nonFeeAmount: 24500 }),
    ]);
    expect(resolved.needsReview).toBe(false);
    expect(resolved.reviewReasons).toEqual([]);
  });

  it('자동 매칭이 불확실하다고 저장된 건은 회원을 확인할 때까지 검토로 둔다', () => {
    const [annotated] = attachPlans(ctx(), [record({ needsReview: true })]);

    expect(annotated.needsReview).toBe(true);
    expect(annotated.reviewReasons.join()).toContain('회원을 확인');
    expect(annotated.suggestedSelections).toEqual([{ year: 2026, month: 5 }]);
  });

  it.each([
    ['확정된 건', { status: 'CONFIRMED' }],
    ['건너뛴 건', { status: 'SKIPPED' }],
    ['회비가 아닌 건', { kind: 'EVENT', status: 'SKIPPED' }],
  ])('%s에는 배정도 검토 사유도 붙이지 않는다', (_label, over) => {
    const [annotated] = attachPlans(ctx(), [
      record({ ...over, amount: 20000, needsReview: true }),
    ]);

    expect(annotated.suggestedSelections).toEqual([]);
    expect(annotated.needsReview).toBe(false);
    expect(annotated.reviewReasons).toEqual([]);
  });

  it('매칭 회원이 없으면 배정하지 않는다', () => {
    const [annotated] = attachPlans(ctx(), [
      record({ status: 'PENDING', matchedMemberId: null, matchedMembers: [] }),
    ]);

    expect(annotated.suggestedSelections).toEqual([]);
    expect(annotated.lastPaidYearMonth).toBeNull();
    expect(annotated.nextSuggestedYearMonth).toBeNull();
  });

  it('매칭 회원 목록이 비어 있으면 하위 호환 필드(matchedMemberId)를 쓴다', () => {
    const [annotated] = attachPlans(ctx(), [record({ matchedMembers: [] })]);

    expect(annotated.suggestedSelections).toEqual([{ year: 2026, month: 5 }]);
  });

  it('저장된 월 힌트의 모양이 이상하면 무시한다', () => {
    const [annotated] = attachPlans(ctx(), [
      record({ monthHints: { months: 'x' } }),
    ]);

    expect(annotated.suggestedSelections).toEqual([{ year: 2026, month: 5 }]);
  });

  it('처리할 수 없는 건(단가 설정 없음)은 그 사유를 검토 사유로 싣는다', () => {
    const context = ctx();
    context.ratesByYear = new Map();

    const [annotated] = attachPlans(context, [record()]);

    expect(annotated.needsReview).toBe(true);
    expect(annotated.reviewReasons).toEqual(['2026년 회비 설정이 없습니다']);
  });
});

describe('attachPlans — 같은 회원의 입금이 여러 건일 때', () => {
  const early = { id: 'early', transactionDate: new Date(2026, 4, 3) };
  const late = { id: 'late', transactionDate: new Date(2026, 4, 20) };

  it('거래일이 이른 건부터 달을 차례로 배정한다 (일괄 확정과 같은 결과를 미리 보여 준다)', () => {
    // 응답 순서(거래일 내림차순)로 넘겨도 배정은 거래일 순이다
    const [lateResult, earlyResult] = attachPlans(ctx(), [
      record(late),
      record(early),
    ]);

    expect(earlyResult.id).toBe('early');
    expect(earlyResult.suggestedSelections).toEqual([{ year: 2026, month: 5 }]);
    expect(lateResult.suggestedSelections).toEqual([{ year: 2026, month: 6 }]);
  });

  it('검토가 필요한 건은 달을 차지하지 않는다 (일괄 확정에서 빠지므로)', () => {
    const [lateResult, earlyResult] = attachPlans(ctx(), [
      record(late),
      record({ ...early, amount: 20000 }),
    ]);

    expect(earlyResult.needsReview).toBe(true);
    expect(lateResult.suggestedSelections).toEqual([{ year: 2026, month: 5 }]);
  });

  it('넘겨받은 납부 이력은 바꾸지 않는다', () => {
    const context = ctx();

    attachPlans(context, [record(early), record(late)]);

    expect(context.paidByMember.get(1)).toHaveLength(4);
  });
});

describe('annotateRecords', () => {
  it('클럽의 레코드를 조건으로 읽어 배정을 붙여 돌려준다', async () => {
    const calls: unknown[] = [];
    const empty = { findMany: async () => [] };
    const fakePrisma = {
      paymentRecord: {
        findMany: async (args: unknown) => {
          calls.push(args);
          return [record()];
        },
      },
      feeType: {
        findMany: async () => [
          {
            name: '일반',
            rates: [{ year: 2026, period: 'MONTHLY', amount: 25000 }],
          },
        ],
      },
      coupleHistory: empty,
      coupleGroup: empty,
      clubMember: {
        findMany: async () => [
          { id: 1, feeObligationStartAt: start, leftAt: null },
        ],
      },
      memberLeave: empty,
      membershipPayment: empty,
      feeExemption: empty,
    };

    const annotated = await annotateRecords(fakePrisma as never, 7, {
      batchId: 'b1',
    });

    expect(calls[0]).toMatchObject({ where: { batchId: 'b1', clubId: 7 } });
    expect(annotated[0].suggestedSelections).toEqual([
      { year: 2026, month: 1 },
    ]);
  });
});
