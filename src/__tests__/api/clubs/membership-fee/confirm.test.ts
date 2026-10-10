import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import {
  applyPlan,
  type RecordPlan,
} from '@/lib/membership-fee/confirmPlanner';
import confirmHandler from '@/pages/api/clubs/[id]/membership-fee/records/[recordId]/confirm';
import unconfirmHandler from '@/pages/api/clubs/[id]/membership-fee/records/[recordId]/unconfirm';
import bulkConfirmHandler from '@/pages/api/clubs/[id]/membership-fee/records/bulk-confirm';
import bulkUnconfirmHandler from '@/pages/api/clubs/[id]/membership-fee/records/bulk-unconfirm';

import { ADMIN_MEMBER_ID, buildRes, CLUB_ID, fakeDb } from './fakeFeeDb';

import type { Prisma } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';

jest.mock('@/lib/prisma', () => ({
  prisma:
    jest.requireActual<typeof import('./fakeFeeDb')>('./fakeFeeDb').fakeDb
      .prisma,
}));

jest.mock('@/lib/session', () => ({
  withAuth:
    (inner: (req: unknown, res: unknown) => unknown) =>
    (req: Record<string, unknown>, res: unknown) => {
      req.user = { id: 7 };
      return inner(req, res);
    },
}));

type Handler = (req: NextApiRequest, res: NextApiResponse) => unknown;
interface BulkBody {
  results: {
    success: string[];
    failed: { recordId: string; reason: string }[];
  };
  summary: {
    total: number;
    processed: number;
    success: number;
    failed: number;
  };
}

async function call(
  handler: Handler,
  query: Record<string, string>,
  body?: unknown
) {
  const res = buildRes();
  await handler(
    {
      method: 'POST',
      query: { id: String(CLUB_ID), ...query },
      body,
    } as unknown as NextApiRequest,
    res as unknown as NextApiResponse
  );
  return res as {
    statusCode: number;
    body: { error?: string; data: unknown };
  };
}

const bulkConfirm = async (
  recordIds: string[],
  selections?: { year: number; months: number[] }[]
) => {
  const res = await call(
    bulkConfirmHandler,
    {},
    { recordIds, year: 2026, selections }
  );
  return { ...res, data: res.body.data as BulkBody };
};

const confirm = (recordId: string, body: unknown) =>
  call(confirmHandler, { recordId }, body);

const paymentsOf = (clubMemberId: number) =>
  fakeDb.state.payments
    .filter(
      (p) => p.clubMemberId === clubMemberId && p.paymentRecordId !== 'rec-seed'
    )
    .map((p) => ({
      year: p.year,
      month: p.month,
      amount: p.amount,
      period: p.period,
    }));

const failure = (data: BulkBody, recordId: string) =>
  data.results.failed.find((f) => f.recordId === recordId)?.reason;

/**
 * 1 가나다·2 마바사: 2026년 1~4월 납부한 일반 회원
 * 3 아자차 + 4 카타파: 부부, 1~4월 납부
 */
beforeEach(() => {
  fakeDb.reset();
  fakeDb.addMember({ id: 1, name: '가나다' });
  fakeDb.addMember({ id: 2, name: '마바사' });
  fakeDb.addMember({ id: 3, name: '아자차' });
  fakeDb.addMember({ id: 4, name: '카타파' });
  fakeDb.addCouple(3, 4);
  for (const clubMemberId of [1, 2, 3, 4]) {
    for (const month of [1, 2, 3, 4]) {
      fakeDb.addPayment({ clubMemberId, year: 2026, month });
    }
  }
});

const matched = (
  over: Record<string, unknown> & { memberIds?: number[] } = {}
) => fakeDb.addRecord({ status: 'MATCHED', memberIds: [1], ...over });

describe('POST records/bulk-confirm — 자동 배정', () => {
  it('검토할 것이 없는 매칭 건을 밀린 달부터 확정한다', async () => {
    const a = matched({ memberIds: [1] });
    const b = matched({ memberIds: [2], depositorName: '마바사' });

    const { statusCode, data } = await bulkConfirm([a, b]);

    expect(statusCode).toBe(200);
    expect(data.results.success).toEqual([a, b]);
    expect(data.summary).toEqual({
      total: 2,
      processed: 2,
      success: 2,
      failed: 0,
    });
    expect(paymentsOf(1)).toEqual([
      { year: 2026, month: 5, amount: 25000, period: 'MONTHLY' },
    ]);
    expect(fakeDb.record(a)).toMatchObject({
      status: 'CONFIRMED',
      errorReason: null,
    });
    expect(
      fakeDb.state.payments.find((p) => p.paymentRecordId === a)
    ).toMatchObject({ confirmedById: ADMIN_MEMBER_ID });
  });

  it('부부 두 명에게 세대 단가를 반씩 확정한다', async () => {
    const id = matched({ memberIds: [3, 4], amount: 45000 });

    await bulkConfirm([id]);

    expect(paymentsOf(3)).toEqual([
      { year: 2026, month: 5, amount: 22500, period: 'MONTHLY' },
    ]);
    expect(paymentsOf(4)).toEqual([
      { year: 2026, month: 5, amount: 22500, period: 'MONTHLY' },
    ]);
  });

  it('연납은 12개월로 확정하고, 12로 나누어떨어지지 않는 금액은 첫 달에 더한다', async () => {
    const id = matched({ amount: 275000 });

    await bulkConfirm([id]);

    const payments = paymentsOf(1);
    expect(payments).toHaveLength(12);
    expect(payments[0]).toEqual({
      year: 2026,
      month: 5,
      amount: 22924,
      period: 'ANNUAL',
    });
    expect(payments[11]).toEqual({
      year: 2027,
      month: 4,
      amount: 22916,
      period: 'ANNUAL',
    });
    expect(payments.reduce((sum, p) => sum + (p.amount as number), 0)).toBe(
      275000
    );
  });

  it('회비가 아닌 금액을 뗀 나머지로 확정한다', async () => {
    const id = matched({
      amount: 125000,
      nonFeeAmount: 100000,
      nonFeeKind: 'JOINING_FEE',
    });

    await bulkConfirm([id]);

    expect(paymentsOf(1)).toEqual([
      { year: 2026, month: 5, amount: 25000, period: 'MONTHLY' },
    ]);
  });

  it('한 회원의 입금이 여러 건이면 거래일이 이른 건부터 달을 차례로 준다', async () => {
    const late = matched({ transactionDate: new Date(2026, 4, 20) });
    const early = matched({ transactionDate: new Date(2026, 4, 3) });

    await bulkConfirm([late, early]);

    const monthOf = (recordId: string) =>
      fakeDb.state.payments.find((p) => p.paymentRecordId === recordId)?.month;
    expect(monthOf(early)).toBe(5);
    expect(monthOf(late)).toBe(6);
  });

  it('저장된 사유가 아니라 지금의 데이터로 판정한다', async () => {
    // 업로드 때는 부족이었지만 그 뒤 회비가 아닌 금액을 떼어 단가에 맞게 된 건
    const id = matched({
      amount: 49500,
      nonFeeAmount: 24500,
      nonFeeKind: 'OTHER',
      errorReason: '초과 입금 24,500원',
    });

    const { data } = await bulkConfirm([id]);

    expect(data.results.success).toEqual([id]);
  });

  describe('확정하지 않는 건', () => {
    it('입금 부족은 검토 사유와 함께 실패로 돌려준다', async () => {
      const id = matched({ amount: 20000 });

      const { data } = await bulkConfirm([id]);

      expect(failure(data, id)).toContain('입금 부족');
      expect(paymentsOf(1)).toEqual([]);
      expect(fakeDb.record(id).status).toBe('MATCHED');
    });

    it('회원 확인이 필요한 자동 매칭은 확정하지 않는다', async () => {
      const id = matched({ needsReview: true });

      const { data } = await bulkConfirm([id]);

      expect(failure(data, id)).toContain('회원을 확인');
    });

    it.each([
      [
        '회비가 아닌 입금',
        { kind: 'EVENT', status: 'MATCHED' },
        '회비가 아닌 입금입니다',
      ],
      [
        '이미 확정된 건',
        { status: 'CONFIRMED' },
        '이미 확정된 입금 내역입니다',
      ],
      ['대기 중인 건', { status: 'PENDING' }, '매칭 상태가 아닙니다'],
      ['매칭 회원이 없는 건', { memberIds: [] }, '매칭된 회원이 없습니다'],
    ])('%s', async (_label, over, reason) => {
      const id = matched(over);

      const { data } = await bulkConfirm([id]);

      expect(failure(data, id)).toBe(reason);
      expect(paymentsOf(1)).toEqual([]);
    });

    it('저장해 둔 검토 사유가 있으면 그 사유로 거부한다', async () => {
      const reason = '같은 이름의 회원이 2명 있습니다 — 회원을 확인해주세요';
      const id = matched({ needsReview: true, reviewReason: reason });

      const { data } = await bulkConfirm([id]);

      expect(failure(data, id)).toBe(reason);
    });

    it('없는 입금 내역은 실패로 돌려준다', async () => {
      const { data } = await bulkConfirm(['nope']);

      expect(failure(data, 'nope')).toBe('입금 내역을 찾을 수 없습니다');
      expect(data.summary).toMatchObject({ total: 1, processed: 0, failed: 1 });
    });

    it('판정한 뒤 다른 요청이 먼저 확정했으면 납부를 만들지 않는다', async () => {
      const id = matched();
      const realTransaction = fakeDb.prisma.$transaction;
      const spy = jest
        .spyOn(fakeDb.prisma, '$transaction')
        .mockImplementation(async (run) => {
          // 트랜잭션이 시작되기 직전에 다른 요청이 확정을 끝냈다
          fakeDb.record(id).status = 'CONFIRMED';
          return realTransaction(run);
        });

      const { data } = await bulkConfirm([id]);
      spy.mockRestore();

      expect(failure(data, id)).toBe('이미 처리된 입금 내역입니다');
      expect(paymentsOf(1)).toEqual([]);
    });
  });
});

describe('POST records/bulk-confirm — 달을 지정했을 때', () => {
  it('지정한 달로 확정한다', async () => {
    const id = matched();

    const { data } = await bulkConfirm([id], [{ year: 2026, months: [6] }]);

    expect(data.results.success).toEqual([id]);
    expect(paymentsOf(1)).toEqual([
      { year: 2026, month: 6, amount: 25000, period: 'MONTHLY' },
    ]);
  });

  it('지정한 달 수가 금액과 맞지 않으면 실패로 돌려준다', async () => {
    const id = matched();

    const { data } = await bulkConfirm([id], [{ year: 2026, months: [6, 7] }]);

    expect(failure(data, id)).toBe(
      '지정한 월 수(2)가 입금 금액 기준 월 수(1)와 다릅니다'
    );
  });

  it('의무월이 아닌 달이나 이미 납부한 달은 실패로 돌려준다', async () => {
    fakeDb.state.leaves.push({
      clubMemberId: 1,
      startYear: 2026,
      startMonth: 7,
      endYear: 2026,
      endMonth: 7,
    });
    const onLeave = matched();
    const paid = matched({ memberIds: [2], depositorName: '마바사' });

    const leave = await bulkConfirm([onLeave], [{ year: 2026, months: [7] }]);
    const dup = await bulkConfirm([paid], [{ year: 2026, months: [4] }]);

    expect(failure(leave.data, onLeave)).toContain('의무월이 아닌 월');
    expect(failure(dup.data, paid)).toContain('이미 납부된 월');
  });
});

describe('POST records/bulk-confirm — 달을 지정해도 막는 건', () => {
  it('면제 회원에 매칭된 건은 달을 지정해도 확정하지 않는다 (대납이 면제 회원의 납부로 잡히지 않게)', async () => {
    fakeDb.state.exemptions.push({ clubMemberId: 1, year: 2026 });
    const id = matched();

    const { data } = await bulkConfirm([id], [{ year: 2026, months: [5] }]);

    expect(failure(data, id)).toBe(
      '면제 회원입니다 — 대납이면 회원을 바꾸고, 본인이 낸 것이면 개별 확정하세요'
    );
    expect(paymentsOf(1)).toEqual([]);
  });
});

describe('applyPlan — 같은 회원·같은 달의 중복 납부', () => {
  const MAY = { year: 2026, month: 5 };
  const resolve = {
    perMemberPerMonth: [25000],
    firstMonthExtraPerMember: [0],
    totalPerMonth: 25000,
    monthCount: 1,
    period: 'MONTHLY',
    isCoupleRate: false,
    shortfall: false,
    overpay: 0,
  } as RecordPlan['resolve'];
  const apply = (recordId: string, over: Record<string, unknown> = {}) =>
    fakeDb.prisma.$transaction((tx) =>
      applyPlan(tx as unknown as Prisma.TransactionClient, {
        recordId,
        memberIds: [1],
        selections: [MAY],
        resolve,
        confirmedById: ADMIN_MEMBER_ID,
        ...over,
      })
    );

  it('판정한 뒤 다른 입금이 그 달을 먼저 확정했으면 던지고 아무것도 남기지 않는다', async () => {
    // 두 건 모두 "5월이 비어 있다"는 같은 판정을 들고 저장하러 온다
    const first = matched();
    const second = matched();

    await apply(first);
    await expect(apply(second)).rejects.toThrow(
      '그사이 이미 납부된 월이 있습니다: 2026년 5월'
    );

    expect(paymentsOf(1)).toEqual([
      { year: 2026, month: 5, amount: 25000, period: 'MONTHLY' },
    ]);
    expect(fakeDb.record(second).status).toBe('MATCHED');
  });

  it('부족분을 채우는 납부는 단가를 넘지 않는 한 같은 달에 둘 수 있다', async () => {
    fakeDb.addPayment({ clubMemberId: 1, ...MAY, amount: 20000 });
    const topUp = matched({ amount: 5000 });

    await apply(topUp, { distributeAmount: 5000, allowTopUp: true });

    expect(
      fakeDb.state.payments.filter((p) => p.clubMemberId === 1 && p.month === 5)
    ).toHaveLength(2);
  });

  it('부족분을 채우다 단가를 넘게 되면 던진다 (같은 부족분을 두 건이 동시에 채우는 경우)', async () => {
    fakeDb.addPayment({ clubMemberId: 1, ...MAY, amount: 20000 });
    const first = matched({ amount: 5000 });
    const second = matched({ amount: 5000 });

    await apply(first, { distributeAmount: 5000, allowTopUp: true });
    await expect(
      apply(second, { distributeAmount: 5000, allowTopUp: true })
    ).rejects.toThrow('그사이 이미 납부된 월이 있습니다: 2026년 5월');
  });
});

describe('POST records/[recordId]/confirm — 판정과 저장 사이에 바뀐 경우', () => {
  it('그사이 다른 입금이 그 달을 확정했으면 400으로 사유를 알린다', async () => {
    const id = matched();
    const realTransaction = fakeDb.prisma.$transaction;
    const spy = jest
      .spyOn(fakeDb.prisma, '$transaction')
      .mockImplementation(async (run) => {
        // 트랜잭션이 시작되기 직전에 다른 입금이 5월을 확정했다
        fakeDb.addPayment({ clubMemberId: 1, year: 2026, month: 5 });
        return realTransaction(run);
      });

    const res = await confirm(id, { year: 2026, months: [5] });
    spy.mockRestore();

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('그사이 이미 납부된 월이 있습니다: 2026년 5월');
    expect(fakeDb.record(id).status).toBe('MATCHED');
  });

  it('그사이 다른 요청이 이 건을 확정했으면 400으로 알린다', async () => {
    const id = matched();
    const realTransaction = fakeDb.prisma.$transaction;
    const spy = jest
      .spyOn(fakeDb.prisma, '$transaction')
      .mockImplementation(async (run) => {
        fakeDb.record(id).status = 'CONFIRMED';
        return realTransaction(run);
      });

    const res = await confirm(id, { year: 2026, months: [5] });
    spy.mockRestore();

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('이미 처리된 입금 내역입니다');
  });
});

describe('POST records/[recordId]/confirm', () => {
  it('고른 달로 확정한다', async () => {
    const id = matched();

    const res = await confirm(id, { year: 2026, months: [5] });

    expect(res.statusCode).toBe(200);
    expect(paymentsOf(1)).toEqual([
      { year: 2026, month: 5, amount: 25000, period: 'MONTHLY' },
    ]);
    expect(fakeDb.record(id).status).toBe('CONFIRMED');
  });

  it('여러 해에 걸친 달을 한 번에 확정한다', async () => {
    fakeDb.state.payments.length = 0;
    const id = matched({ amount: 50000 });

    const res = await confirm(id, {
      selections: [
        { year: 2025, months: [12] },
        { year: 2026, months: [1] },
      ],
    });

    expect(res.statusCode).toBe(200);
    expect(paymentsOf(1)).toEqual([
      { year: 2025, month: 12, amount: 25000, period: 'MONTHLY' },
      { year: 2026, month: 1, amount: 25000, period: 'MONTHLY' },
    ]);
  });

  it('부족한 입금은 받은 금액을 고른 달에 나눠 확정한다', async () => {
    const id = matched({ amount: 20000 });

    const res = await confirm(id, { year: 2026, months: [5] });

    expect(res.statusCode).toBe(200);
    expect(paymentsOf(1)).toEqual([
      { year: 2026, month: 5, amount: 20000, period: 'MONTHLY' },
    ]);
  });

  describe('부족분 충당', () => {
    beforeEach(() => {
      fakeDb.addPayment({
        clubMemberId: 1,
        year: 2026,
        month: 5,
        amount: 20000,
      });
    });

    it('덜 낸 달에 나머지를 더 확정할 수 있다', async () => {
      const id = matched({ amount: 5000 });

      const res = await confirm(id, { year: 2026, months: [5] });

      expect(res.statusCode).toBe(200);
      const may = fakeDb.state.payments.filter(
        (p) => p.clubMemberId === 1 && p.year === 2026 && p.month === 5
      );
      expect(may.map((p) => p.amount)).toEqual([20000, 5000]);
    });

    it('단가를 넘게 되면 이미 납부된 달로 보고 거부한다', async () => {
      const id = matched({ amount: 10000 });

      const res = await confirm(id, { year: 2026, months: [5] });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('이미 납부된 월이 있습니다: 2026년 5월');
      expect(fakeDb.record(id).status).toBe('MATCHED');
    });
  });

  it('고른 달보다 많이 들어온 금액은 초과 입금으로 남긴다', async () => {
    const id = matched({ amount: 50000 });

    await confirm(id, { year: 2026, months: [5] });

    expect(paymentsOf(1)).toEqual([
      { year: 2026, month: 5, amount: 25000, period: 'MONTHLY' },
    ]);
    expect(fakeDb.record(id)).toMatchObject({
      nonFeeAmount: 25000,
      nonFeeKind: 'OVERPAY',
    });
  });

  it('연납 금액을 12개월로 확정하면 연납으로 기록한다', async () => {
    const id = matched({ amount: 275000 });
    const months = (year: number, list: number[]) => ({ year, months: list });

    await confirm(id, {
      selections: [
        months(2026, [5, 6, 7, 8, 9, 10, 11, 12]),
        months(2027, [1, 2, 3, 4]),
      ],
    });

    const payments = paymentsOf(1);
    expect(payments).toHaveLength(12);
    expect(payments.every((p) => p.period === 'ANNUAL')).toBe(true);
    expect(payments.reduce((sum, p) => sum + (p.amount as number), 0)).toBe(
      275000
    );
  });

  it.each([
    [
      '의무 기간이 아닌 달',
      {},
      { year: 2024, months: [5] },
      '의무 기간이 아닙니다',
    ],
    [
      '이미 납부한 달',
      {},
      { year: 2026, months: [4] },
      '이미 납부된 월이 있습니다: 2026년 4월',
    ],
    [
      '회비가 아닌 입금',
      { kind: 'EVENT' },
      { year: 2026, months: [5] },
      '회비가 아닌 입금입니다',
    ],
    [
      '이미 확정된 건',
      { status: 'CONFIRMED' },
      { year: 2026, months: [5] },
      '이미 확정된 입금 내역입니다',
    ],
    [
      '건너뛴 건',
      { status: 'SKIPPED' },
      { year: 2026, months: [5] },
      '건너뛴 입금 내역입니다',
    ],
    [
      '매칭 회원이 없는 건',
      { memberIds: [] },
      { year: 2026, months: [5] },
      '매칭된 회원이 없습니다',
    ],
  ])('%s은(는) 거부한다', async (_label, over, body, message) => {
    const id = matched(over);

    const res = await confirm(id, body);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain(message);
    expect(paymentsOf(1)).toEqual([]);
  });

  it('없는 입금 내역은 404다', async () => {
    const res = await confirm('nope', { year: 2026, months: [5] });

    expect(res.statusCode).toBe(404);
  });
});

describe('확정 취소', () => {
  it('확정하며 남긴 초과 입금 표시를 되돌린다', async () => {
    const id = matched({ amount: 50000 });
    await confirm(id, { year: 2026, months: [5] });

    const res = await call(unconfirmHandler, { recordId: id });

    expect(res.statusCode).toBe(200);
    expect(fakeDb.record(id)).toMatchObject({
      status: 'MATCHED',
      nonFeeAmount: 0,
      nonFeeKind: null,
    });
    expect(paymentsOf(1)).toEqual([]);
  });

  it('재무가 떼어 둔 가입비는 그대로 둔다', async () => {
    const id = matched({
      amount: 125000,
      nonFeeAmount: 100000,
      nonFeeKind: 'JOINING_FEE',
    });
    await confirm(id, { year: 2026, months: [5] });

    await call(unconfirmHandler, { recordId: id });

    expect(fakeDb.record(id)).toMatchObject({
      nonFeeAmount: 100000,
      nonFeeKind: 'JOINING_FEE',
    });
  });

  it('일괄 확정 취소도 초과 입금 표시를 되돌린다', async () => {
    const id = matched({ amount: 50000 });
    await confirm(id, { year: 2026, months: [5] });

    await call(bulkUnconfirmHandler, {}, { recordIds: [id] });

    expect(fakeDb.record(id)).toMatchObject({
      status: 'MATCHED',
      nonFeeAmount: 0,
      nonFeeKind: null,
    });
  });
});
