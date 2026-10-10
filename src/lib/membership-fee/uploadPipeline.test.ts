import { describe, expect, it } from '@jest/globals';

import { judgeUploadRows, summarizeDrafts } from './uploadPipeline';

import type { PlannerContext } from './confirmPlanner';

const rates = {
  regularMonthly: 25000,
  coupleMonthly: 45000,
  regularAnnual: 275000,
  coupleAnnual: 495000,
  joiningFeeAmounts: [100000],
};
const established = new Date(2025, 0, 1);
const joinsInJune = new Date(2026, 5, 1);
const leftInMarch = new Date(2026, 2, 31);

/**
 * 1 가나다·2 마바사: 기존 회원 / 3 아자차 + 4 카타파: 부부
 * 5 하거너: 3월 탈퇴 / 6 더러머: 6월부터 의무인 신규 회원
 */
const MEMBERS = [
  {
    id: 1,
    name: '가나다',
    status: 'APPROVED',
    feeObligationStartAt: established,
    leftAt: null,
  },
  {
    id: 2,
    name: '마바사',
    status: 'APPROVED',
    feeObligationStartAt: established,
    leftAt: null,
  },
  {
    id: 3,
    name: '아자차',
    status: 'APPROVED',
    feeObligationStartAt: established,
    leftAt: null,
  },
  {
    id: 4,
    name: '카타파',
    status: 'APPROVED',
    feeObligationStartAt: established,
    leftAt: null,
  },
  {
    id: 5,
    name: '하거너',
    status: 'LEFT',
    feeObligationStartAt: established,
    leftAt: leftInMarch,
  },
  {
    id: 6,
    name: '더러머',
    status: 'APPROVED',
    feeObligationStartAt: joinsInJune,
    leftAt: null,
  },
];
const COUPLE_GROUPS = [
  {
    id: 1,
    members: [3, 4].map((id) => ({
      clubMemberId: id,
      clubMember: { ...MEMBERS[id - 1], leavePeriods: [] },
    })),
  },
];

const ctx = (): PlannerContext => ({
  ratesByYear: new Map([
    [2026, rates],
    [2027, rates],
  ]),
  coupleHistories: [
    {
      clubMemberId: 3,
      partnerClubMemberId: 4,
      startedAt: established,
      endedAt: null,
    },
    {
      clubMemberId: 4,
      partnerClubMemberId: 3,
      startedAt: established,
      endedAt: null,
    },
  ],
  coupleGroups: [{ members: [{ clubMemberId: 3 }, { clubMemberId: 4 }] }],
  memberStartAtMap: new Map(MEMBERS.map((m) => [m.id, m.feeObligationStartAt])),
  memberLeftAtMap: new Map(MEMBERS.map((m) => [m.id, m.leftAt])),
  leaveMap: new Map(),
  // 기존 회원은 1~4월을 이미 냈다
  paidByMember: new Map(
    [1, 2, 3, 4].map((id) => [
      id,
      [1, 2, 3, 4].map((month) => ({ year: 2026, month, amount: 25000 })),
    ])
  ),
  exemptByYear: new Map(),
});

const row = (
  depositorName: string,
  amount: number,
  over: { day?: number; memo?: string; transactionType?: string } = {}
) => ({
  transactionDate: new Date(2026, 4, over.day ?? 10, 10),
  depositorName,
  amount,
  memo: over.memo ?? null,
  transactionType: over.transactionType ?? '일반입금',
});

const judge = (...rows: ReturnType<typeof row>[]) =>
  judgeUploadRows(rows, {
    ctx: ctx(),
    members: MEMBERS,
    coupleGroups: COUPLE_GROUPS,
  });

describe('judgeUploadRows', () => {
  it('회비는 회원에 매칭하고 납부월을 계획한다', () => {
    const [draft] = judge(row('가나다5월', 25000));

    expect(draft).toMatchObject({
      kind: 'FEE',
      status: 'MATCHED',
      memberIds: [1],
      errorReason: null,
      needsReview: false,
      nonFeeAmount: 0,
      monthHints: {
        source: 'depositorName',
        months: [{ year: 2026, month: 5 }],
      },
    });
    expect(draft.plan?.selections).toEqual([{ year: 2026, month: 5 }]);
    expect(draft.plan?.needsReview).toBe(false);
  });

  it('새해 첫날 새벽(한국 시각)의 입금도 그 해의 단가로 판정한다', () => {
    // 서버(UTC)에서는 아직 전년 12월 31일이다. 전년 단가가 없는 클럽이어도 막히면 안 된다.
    const context = ctx();
    context.ratesByYear = new Map([[2026, rates]]);
    context.paidByMember = new Map();
    const newYear = {
      ...row('가나다', 25000),
      transactionDate: new Date('2026-01-01T00:30:00+09:00'),
    };

    const [draft] = judgeUploadRows([newYear], {
      ctx: context,
      members: MEMBERS,
      coupleGroups: COUPLE_GROUPS,
    });

    expect(draft).toMatchObject({ kind: 'FEE', status: 'MATCHED' });
    expect(draft.plan?.selections).toEqual([{ year: 2026, month: 1 }]);
  });

  it('같은 이름의 회원이 둘이면 한 명에 붙이되 회원을 확인받는다', () => {
    const twin = { ...MEMBERS[0], id: 7 };

    const [draft] = judgeUploadRows([row('가나다5월', 25000)], {
      ctx: ctx(),
      members: [...MEMBERS, twin],
      coupleGroups: COUPLE_GROUPS,
    });

    expect(draft).toMatchObject({
      status: 'MATCHED',
      memberIds: [1],
      needsReview: true,
      reviewReason: '같은 이름의 회원이 2명 있습니다 — 회원을 확인해주세요',
    });
  });

  it('이름이 한 글자 다른 매칭은 사유 없이 회원 확인 표시만 남긴다', () => {
    const [draft] = judge(row('가나라', 25000));

    expect(draft).toMatchObject({ needsReview: true, reviewReason: null });
  });

  it('행사가 몰린 기간에 부부 단가와 같은 금액이 표시 없이 들어오면 회비로 두되 확인받는다', () => {
    const party = ['가나다', '마바사', '하거너', '더러머', '가나다'].map(
      (name, index) => row(name, 15000, { day: 10 + (index % 3) })
    );
    const couple = row('아자차', 45000, { day: 11 });

    const drafts = judge(...party, couple);

    expect(drafts[5]).toMatchObject({
      kind: 'FEE',
      status: 'MATCHED',
      memberIds: [3, 4],
      needsReview: true,
      reviewReason:
        '몰려 들어온 15,000원의 3명 몫일 수 있습니다 — 행사비면 분류를 바꾸고, 회비면 개별 확정하세요',
    });
    expect(drafts.slice(0, 5).every((draft) => draft.kind === 'EVENT')).toBe(
      true
    );
  });

  it('행사 입금은 매칭하지 않고 건너뛴다', () => {
    const [draft] = judge(row('가나다단체티', 20000));

    expect(draft).toMatchObject({
      kind: 'EVENT',
      status: 'SKIPPED',
      memberIds: [],
      needsReview: false,
    });
    expect(draft.plan).toBeNull();
  });

  it('통장 이자는 건너뛴다', () => {
    const [draft] = judge(
      row('입출금통장 이자', 377, { transactionType: '예금이자' })
    );

    expect(draft).toMatchObject({ kind: 'INTEREST', status: 'SKIPPED' });
  });

  it('회원을 찾지 못한 회비는 대기로 둔다', () => {
    const [draft] = judge(row('모르는이', 25000));

    expect(draft).toMatchObject({
      kind: 'FEE',
      status: 'PENDING',
      memberIds: [],
      errorReason: '회원 매칭 실패',
    });
  });

  it('입금자명이 비어 있어도 대기로 둔다', () => {
    const [draft] = judge(row('(이름 없음)', 25000));

    expect(draft).toMatchObject({ kind: 'FEE', status: 'PENDING' });
  });

  it('거래일에 이미 탈퇴한 지 오래된 회원에게는 매칭하지 않는다', () => {
    const [draft] = judge(row('하거너5월', 25000));

    expect(draft).toMatchObject({ status: 'PENDING', memberIds: [] });
  });

  it('이름이 한 글자 다른 회원으로 매칭되면 회원 확인이 필요하다고 표시한다', () => {
    const [draft] = judge(row('가나라', 25000));

    expect(draft).toMatchObject({
      status: 'MATCHED',
      memberIds: [1],
      needsReview: true,
    });
  });

  describe('가입비', () => {
    it('신규 회원의 가입비 금액은 가입비로 건너뛰고, 누구의 가입비인지 남긴다', () => {
      const [draft] = judge(row('더러머', 100000, { day: 20 }));

      expect(draft).toMatchObject({
        kind: 'JOINING_FEE',
        status: 'SKIPPED',
        memberIds: [6],
      });
    });

    it('신규 회원이 가입비와 첫 달 회비를 함께 내면 가입비를 떼고 첫 의무월에 배정한다', () => {
      const [draft] = judge(row('더러머', 125000, { day: 20 }));

      expect(draft).toMatchObject({
        kind: 'FEE',
        status: 'MATCHED',
        memberIds: [6],
        nonFeeAmount: 100000,
        nonFeeKind: 'JOINING_FEE',
      });
      expect(draft.plan?.selections).toEqual([{ year: 2026, month: 6 }]);
    });

    it('기존 회원이 낸 가입비 금액은 넉 달 치 회비로 본다', () => {
      const [draft] = judge(row('가나다', 100000));

      expect(draft).toMatchObject({
        kind: 'FEE',
        status: 'MATCHED',
        memberIds: [1],
        nonFeeAmount: 0,
      });
      expect(draft.plan?.resolve.monthCount).toBe(4);
    });

    it('기존 회원이 다섯 달 치를 한 번에 내면 가입비를 떼지 않는다', () => {
      const [draft] = judge(row('가나다', 125000));

      expect(draft).toMatchObject({ kind: 'FEE', nonFeeAmount: 0 });
      expect(draft.plan?.resolve.monthCount).toBe(5);
    });

    it('회원을 찾지 못한 가입비 금액은 가입비로 둔다', () => {
      const [draft] = judge(row('새사람', 100000));

      expect(draft).toMatchObject({
        kind: 'JOINING_FEE',
        status: 'SKIPPED',
        memberIds: [],
      });
    });
  });

  describe('부부', () => {
    it('한 사람 이름으로 개인 단가를 내면 그 사람 몫으로만 본다', () => {
      const [draft] = judge(row('아자차', 25000));

      expect(draft).toMatchObject({ status: 'MATCHED', memberIds: [3] });
      expect(draft.plan?.needsReview).toBe(false);
    });

    it('한 사람 이름으로 부부 단가를 내면 두 사람 몫으로 본다', () => {
      const [draft] = judge(row('아자차', 45000));

      expect(draft).toMatchObject({ status: 'MATCHED', memberIds: [3, 4] });
      expect(draft.plan?.resolve.isCoupleRate).toBe(true);
    });
  });

  it('표시 없이 몰려 들어온 같은 금액은 행사로 건너뛴다', () => {
    const drafts = judge(
      row('가나다', 15000, { day: 4 }),
      row('마바사', 15000, { day: 4 }),
      row('아자차', 15000, { day: 5 }),
      row('카타파', 15000, { day: 6 }),
      row('더러머', 15000, { day: 7 }),
      row('가나다5월', 25000, { day: 5 })
    );

    expect(drafts.slice(0, 5).every((d) => d.kind === 'EVENT')).toBe(true);
    expect(drafts[0].kindReason).toContain('15,000원');
    expect(drafts[5]).toMatchObject({ kind: 'FEE', status: 'MATCHED' });
  });

  it('단가 설정이 없는 해의 입금은 에러로 둔다', () => {
    const context = ctx();
    context.ratesByYear = new Map();

    const [draft] = judgeUploadRows([row('가나다', 25000)], {
      ctx: context,
      members: MEMBERS,
      coupleGroups: COUPLE_GROUPS,
    });

    expect(draft).toMatchObject({
      status: 'ERROR',
      errorReason: '2026년 회비 설정이 없습니다',
    });
  });

  it('입력한 순서대로 돌려준다', () => {
    const drafts = judge(row('마바사', 25000), row('가나다', 25000));

    expect(drafts.map((d) => d.memberIds[0])).toEqual([2, 1]);
  });
});

describe('summarizeDrafts', () => {
  it('분류와 상태별 건수를 센다', () => {
    const drafts = judge(
      row('가나다5월', 25000),
      row('가나라', 25000),
      row('모르는이', 25000),
      row('가나다단체티', 20000),
      row('새사람', 100000),
      row('입출금통장 이자', 377, { transactionType: '예금이자' }),
      row('가나다 콕1', 26000)
    );

    expect(summarizeDrafts(drafts)).toEqual({
      total: 7,
      fee: 3,
      joiningFee: 1,
      event: 1,
      other: 1,
      interest: 1,
      matched: 2,
      pending: 1,
      error: 0,
    });
  });
});
