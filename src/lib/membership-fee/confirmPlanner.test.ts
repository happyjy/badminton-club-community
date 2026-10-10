import { describe, expect, it } from '@jest/globals';

import {
  feeRateSettingsFromTypes,
  isObligatedForAll,
  loadPlannerContext,
  planRecord,
  type PlannerContext,
  ratesForYear,
} from './confirmPlanner';

const rates = {
  regularMonthly: 25000,
  coupleMonthly: 45000,
  regularAnnual: 275000,
  coupleAnnual: 495000,
  joiningFeeAmounts: [100000],
};
const start = new Date(2025, 0, 1);
const in2026 = (...months: number[]) =>
  months.map((month) => ({ year: 2026, month, amount: 25000 }));

/** 1번: 일반 회원, 2026년 1~4월 납부. 2·3번: 부부, 납부 없음 */
const ctx = (): PlannerContext => ({
  ratesByYear: new Map([
    [2025, rates],
    [2026, rates],
    [2027, rates],
  ]),
  coupleHistories: [
    {
      clubMemberId: 2,
      partnerClubMemberId: 3,
      startedAt: start,
      endedAt: null,
    },
    {
      clubMemberId: 3,
      partnerClubMemberId: 2,
      startedAt: start,
      endedAt: null,
    },
  ],
  coupleGroups: [{ members: [{ clubMemberId: 2 }, { clubMemberId: 3 }] }],
  memberStartAtMap: new Map<number, Date | null>([
    [1, start],
    [2, start],
    [3, start],
  ]),
  memberLeftAtMap: new Map<number, Date | null>([
    [1, null],
    [2, null],
    [3, null],
  ]),
  leaveMap: new Map(),
  paidByMember: new Map([[1, in2026(1, 2, 3, 4)]]),
  exemptByYear: new Map(),
});

type Input = Parameters<typeof planRecord>[1];
/** 2026년 5월 10일, 1번 회원의 25,000원 */
const input = (over: Partial<Input> = {}): Input => ({
  memberIds: [1],
  transactionDate: new Date(2026, 4, 10),
  amount: 25000,
  nonFeeAmount: 0,
  monthHints: null,
  matchConfidence: 1,
  ...over,
});

describe('planRecord', () => {
  it('한 달 치를 밀린 달부터 배정하고 검토 없이 확정할 수 있게 한다', () => {
    expect(planRecord(ctx(), input())).toMatchObject({
      selections: [{ year: 2026, month: 5 }],
      usedHints: false,
      needsReview: false,
      reviewReasons: [],
      error: null,
      ratesFallbackYear: null,
      suggestedStartMonth: null,
      partialPaidMonth: null,
    });
  });

  it('회비가 아닌 금액을 뺀 나머지로 개월 수를 센다', () => {
    const plan = planRecord(
      ctx(),
      input({ amount: 125000, nonFeeAmount: 100000 })
    );

    expect(plan.resolve.monthCount).toBe(1);
    expect(plan.selections).toEqual([{ year: 2026, month: 5 }]);
    expect(plan.needsReview).toBe(false);
  });

  it('월 힌트가 금액과 맞으면 힌트의 달로 배정한다', () => {
    const months = [6, 7, 8, 9].map((month) => ({ year: 2026, month }));

    const plan = planRecord(
      ctx(),
      input({ amount: 100000, monthHints: { source: 'depositorName', months } })
    );

    expect(plan.selections).toEqual(months);
    expect(plan.usedHints).toBe(true);
    expect(plan.needsReview).toBe(false);
  });

  it('전년의 밀린 달을 적은 힌트도 받아들인다', () => {
    const december = [{ year: 2025, month: 12 }];

    const plan = planRecord(
      ctx(),
      input({
        transactionDate: new Date(2026, 1, 13),
        monthHints: { source: 'memo', months: december },
      })
    );

    expect(plan.selections).toEqual(december);
    expect(plan.needsReview).toBe(false);
  });

  it('연납은 12개월을 미납 의무월부터 다음 해까지 이어 배정한다', () => {
    const plan = planRecord(ctx(), input({ amount: 275000 }));

    expect(plan.resolve.period).toBe('ANNUAL');
    expect(plan.selections).toHaveLength(12);
    expect(plan.selections[0]).toEqual({ year: 2026, month: 5 });
    expect(plan.selections[11]).toEqual({ year: 2027, month: 4 });
    expect(plan.needsReview).toBe(false);
  });

  it('부부 두 명의 입금은 둘 다 의무인 달에만 배정한다', () => {
    const context = ctx();
    context.leaveMap = new Map([
      [3, [{ startYear: 2026, startMonth: 1, endYear: 2026, endMonth: 5 }]],
    ]);

    const plan = planRecord(
      context,
      input({ memberIds: [2, 3], amount: 45000 })
    );

    expect(plan.resolve.isCoupleRate).toBe(true);
    expect(plan.selections).toEqual([{ year: 2026, month: 6 }]);
  });

  describe('검토가 필요한 경우', () => {
    it('한 달 단가에 못 미치면 부족으로 표시한다', () => {
      const plan = planRecord(ctx(), input({ amount: 20000 }));

      expect(plan.needsReview).toBe(true);
      expect(plan.reviewReasons).toContain('입금 부족 (20,000원 < 25,000원)');
    });

    it('개월 수를 채우고 남으면 초과로 표시한다', () => {
      expect(
        planRecord(ctx(), input({ amount: 30000 })).reviewReasons
      ).toContain('초과 입금 5,000원');
    });

    it('유사 매칭(신뢰도 0.7)은 검토하게 하고, 부분 일치(0.85)는 통과시킨다', () => {
      expect(
        planRecord(ctx(), input({ matchConfidence: 0.7 })).reviewReasons
      ).toContain('매칭 신뢰도 낮음 (70%)');
      expect(
        planRecord(ctx(), input({ matchConfidence: 0.85 })).needsReview
      ).toBe(false);
      expect(
        planRecord(ctx(), input({ matchConfidence: null })).needsReview
      ).toBe(false);
    });

    it('그 해 면제 회원에게 매칭되면 검토하게 한다', () => {
      const context = ctx();
      context.exemptByYear = new Map([[2026, new Set([1])]]);

      expect(planRecord(context, input()).reviewReasons).toContain(
        '면제 회원입니다 — 대납이면 회원을 바꾸고, 본인이 낸 것이면 개별 확정하세요'
      );
    });

    it('월 힌트를 쓰지 못한 사유를 함께 싣는다', () => {
      const plan = planRecord(
        ctx(),
        input({
          monthHints: {
            source: 'depositorName',
            months: [
              { year: 2026, month: 6 },
              { year: 2026, month: 7 },
            ],
          },
        })
      );

      expect(plan.needsReview).toBe(true);
      expect(plan.reviewReasons.join()).toContain('월 힌트');
      expect(plan.selections).toEqual([{ year: 2026, month: 5 }]);
    });
  });

  describe('의무 시작월 앞당기기 제안', () => {
    it('힌트의 달이 의무 시작 전이면 그 달을 시작월로 제안한다', () => {
      const context = ctx();
      context.memberStartAtMap.set(1, new Date(2026, 3, 1));
      context.paidByMember = new Map();

      const plan = planRecord(
        context,
        input({
          monthHints: {
            source: 'depositorName',
            months: [{ year: 2026, month: 3 }],
          },
        })
      );

      expect(plan.needsReview).toBe(true);
      expect(plan.suggestedStartMonth).toEqual({ year: 2026, month: 3 });
    });

    it('힌트의 달이 의무 구간 안이면 제안하지 않는다', () => {
      const plan = planRecord(
        ctx(),
        input({
          monthHints: {
            source: 'depositorName',
            months: [{ year: 2026, month: 5 }],
          },
        })
      );

      expect(plan.suggestedStartMonth).toBeNull();
    });
  });

  describe('부족분 충당', () => {
    it('앞서 덜 낸 달을 정확히 채우는 금액이면 그 달을 알려 준다', () => {
      const context = ctx();
      context.paidByMember = new Map([
        [1, [...in2026(1, 2, 3, 4), { year: 2026, month: 5, amount: 20000 }]],
      ]);

      const plan = planRecord(
        context,
        input({ amount: 5000, transactionDate: new Date(2026, 4, 23) })
      );

      expect(plan.partialPaidMonth).toEqual({ year: 2026, month: 5 });
      expect(plan.needsReview).toBe(true);
      expect(plan.reviewReasons.join()).toContain('2026년 5월 부족분');
    });

    it('덜 낸 달을 정확히 채우지 않는 금액이면 알려 주지 않는다', () => {
      const context = ctx();
      // 연납을 12로 나눈 22,916원은 부족 납부가 아니다
      context.paidByMember = new Map([
        [
          1,
          [1, 2, 3, 4].map((month) => ({ year: 2026, month, amount: 22916 })),
        ],
      ]);

      expect(
        planRecord(context, input({ amount: 5000 })).partialPaidMonth
      ).toBeNull();
    });
  });

  describe('단가 설정', () => {
    it('거래 연도의 단가가 없으면 직전 연도 단가로 판정하고 그 연도를 알린다', () => {
      const context = ctx();
      context.ratesByYear = new Map([[2025, rates]]);

      const plan = planRecord(context, input());

      expect(plan.error).toBeNull();
      expect(plan.ratesFallbackYear).toBe(2025);
      expect(plan.selections).toEqual([{ year: 2026, month: 5 }]);
    });

    it('어느 연도의 단가도 없으면 처리할 수 없다고 알린다', () => {
      const context = ctx();
      context.ratesByYear = new Map();

      const plan = planRecord(context, input());

      expect(plan.error).toBe('2026년 회비 설정이 없습니다');
      expect(plan.selections).toEqual([]);
      expect(plan.needsReview).toBe(true);
    });

    it('단가가 0원이면 처리할 수 없다고 알린다', () => {
      const context = ctx();
      context.ratesByYear = new Map([[2026, { ...rates, regularMonthly: 0 }]]);

      expect(planRecord(context, input()).error).toBe(
        '2026년 회비 단가가 0원입니다'
      );
    });
  });
});

describe('ratesForYear', () => {
  it('그 해 단가가 있으면 그대로, 없으면 가장 가까운 직전 연도를 쓴다', () => {
    const context = ctx();
    context.ratesByYear = new Map([
      [2024, { ...rates, regularMonthly: 20000 }],
      [2025, rates],
    ]);

    expect(ratesForYear(context, 2025)).toEqual({ rates, fallbackYear: null });
    expect(ratesForYear(context, 2027)).toEqual({ rates, fallbackYear: 2025 });
    expect(ratesForYear(context, 2023)).toBeNull();
  });
});

describe('isObligatedForAll', () => {
  it('매칭 인원 모두가 의무인 달만 참이다', () => {
    const context = ctx();
    context.leaveMap = new Map([
      [3, [{ startYear: 2026, startMonth: 5, endYear: 2026, endMonth: 5 }]],
    ]);

    expect(isObligatedForAll(context, [2, 3], { year: 2026, month: 4 })).toBe(
      true
    );
    expect(isObligatedForAll(context, [2, 3], { year: 2026, month: 5 })).toBe(
      false
    );
  });
});

describe('feeRateSettingsFromTypes', () => {
  const types = [
    {
      name: '일반',
      rates: [
        { year: 2026, period: 'MONTHLY' as const, amount: 25000 },
        { year: 2026, period: 'ANNUAL' as const, amount: 275000 },
      ],
    },
    {
      name: '부부',
      rates: [{ year: 2026, period: 'MONTHLY' as const, amount: 45000 }],
    },
    {
      name: '가입비',
      rates: [{ year: 2026, period: 'MONTHLY' as const, amount: 100000 }],
    },
  ];

  it("'일반'·'부부'·'가입비' 유형에서 그 해 단가를 읽는다", () => {
    expect(feeRateSettingsFromTypes(types, 2026)).toEqual({
      regularMonthly: 25000,
      coupleMonthly: 45000,
      regularAnnual: 275000,
      coupleAnnual: null,
      joiningFeeAmounts: [100000],
    });
  });

  it('일반 월납 단가가 없는 해는 설정이 없는 것으로 본다', () => {
    expect(feeRateSettingsFromTypes(types, 2025)).toBeNull();
  });

  it('부부 단가가 없으면 일반 단가를 쓴다', () => {
    expect(feeRateSettingsFromTypes([types[0]], 2026)?.coupleMonthly).toBe(
      25000
    );
  });
});

describe('loadPlannerContext', () => {
  it('클럽의 단가·부부·의무·납부·면제를 한 번에 읽어 온다', async () => {
    const fakePrisma = {
      feeType: {
        findMany: async () => [
          {
            name: '일반',
            rates: [{ year: 2026, period: 'MONTHLY', amount: 25000 }],
          },
        ],
      },
      coupleHistory: {
        findMany: async () => [
          {
            clubMemberId: 2,
            partnerClubMemberId: 3,
            startedAt: start,
            endedAt: null,
          },
        ],
      },
      coupleGroup: {
        findMany: async () => [
          { members: [{ clubMemberId: 2 }, { clubMemberId: 3 }] },
        ],
      },
      clubMember: {
        findMany: async () => [
          { id: 1, feeObligationStartAt: start, leftAt: null },
        ],
      },
      memberLeave: {
        findMany: async () => [
          {
            clubMemberId: 1,
            startYear: 2026,
            startMonth: 3,
            endYear: 2026,
            endMonth: 4,
          },
        ],
      },
      membershipPayment: {
        findMany: async () => [
          { clubMemberId: 1, year: 2026, month: 1, amount: 25000 },
          { clubMemberId: 1, year: 2026, month: 2, amount: 20000 },
        ],
      },
      feeExemption: {
        findMany: async () => [{ clubMemberId: 9, year: 2026 }],
      },
    };

    const context = await loadPlannerContext(fakePrisma as never, 1);

    expect(context.ratesByYear.get(2026)?.regularMonthly).toBe(25000);
    expect(context.coupleHistories).toHaveLength(1);
    expect(context.coupleGroups[0].members).toHaveLength(2);
    expect(context.memberStartAtMap.get(1)).toBe(start);
    expect(context.memberLeftAtMap.get(1)).toBeNull();
    expect(context.leaveMap.get(1)).toEqual([
      { startYear: 2026, startMonth: 3, endYear: 2026, endMonth: 4 },
    ]);
    expect(context.paidByMember.get(1)).toEqual([
      { year: 2026, month: 1, amount: 25000 },
      { year: 2026, month: 2, amount: 20000 },
    ]);
    expect(context.exemptByYear.get(2026)?.has(9)).toBe(true);
  });
});
