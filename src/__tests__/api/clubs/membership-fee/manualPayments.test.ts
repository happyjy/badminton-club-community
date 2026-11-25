import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import paymentHandler from '@/pages/api/clubs/[id]/members/[userId]/manual-payments/[paymentId]';
import paymentsHandler from '@/pages/api/clubs/[id]/members/[userId]/manual-payments/index';
import suggestHandler from '@/pages/api/clubs/[id]/members/[userId]/manual-payments/suggest';

import { ADMIN_MEMBER_ID, buildRes, CLUB_ID, fakeDb } from './fakeFeeDb';

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
type Item = {
  id: string;
  year: number;
  month: number;
  amount: number;
  reason: string;
  confirmedAt: string;
  confirmedByName: string | null;
};

const MEMBER_USER_ID = 1001;

async function call(
  handler: Handler,
  method: string,
  body?: unknown,
  query: Record<string, string> = {}
) {
  const res = buildRes();
  await handler(
    {
      method,
      query: { id: String(CLUB_ID), userId: String(MEMBER_USER_ID), ...query },
      body,
    } as unknown as NextApiRequest,
    res as unknown as NextApiResponse
  );
  return res as {
    statusCode: number;
    body: {
      error?: string;
      message?: string;
      data: {
        payments: Item[];
        payment: Item;
        amount: number | null;
        isCouple: boolean;
      };
    };
  };
}

const add = (body: Record<string, unknown>) =>
  call(paymentsHandler, 'POST', {
    year: 2026,
    month: 9,
    amount: 25000,
    reason: '다른 계좌로 보냄',
    ...body,
  });

/** 1 가나다(userId 1001): 2026년 1월부터 의무 */
beforeEach(() => {
  fakeDb.reset();
  fakeDb.addMember({
    id: 1,
    name: '가나다',
    feeObligationStartAt: new Date(2026, 0, 1),
  });
});

describe('직접 추가한 납부 목록', () => {
  it('직접 추가한 납부만 최근 달부터 돌려준다', async () => {
    fakeDb.addPayment({ clubMemberId: 1, year: 2026, month: 9 });
    fakeDb.addManualPayment({ clubMemberId: 1, year: 2026, month: 10 });
    fakeDb.addManualPayment({
      clubMemberId: 1,
      year: 2026,
      month: 11,
      manualReason: '재무 표 기준',
    });

    const res = await call(paymentsHandler, 'GET');

    expect(res.statusCode).toBe(200);
    expect(res.body.data.payments.map((p) => p.month)).toEqual([11, 10]);
    expect(res.body.data.payments[0]).toMatchObject({
      year: 2026,
      amount: 25000,
      reason: '재무 표 기준',
      confirmedByName: '관리자',
    });
    expect(res.body.data.payments[1].reason).toBe('다른 계좌로 보냄');
  });

  it('관리자가 아니면 403이다', async () => {
    const admin = fakeDb.state.members.find((m) => m.id === ADMIN_MEMBER_ID);
    if (admin) admin.role = 'MEMBER';

    const res = await call(paymentsHandler, 'GET');

    expect(res.statusCode).toBe(403);
  });
});

describe('납부 직접 추가', () => {
  it('넣으면 입금 없는 납부로 저장한다', async () => {
    const res = await add({});

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe('납부를 직접 추가했습니다');
    expect(res.body.data.payment).toMatchObject({
      year: 2026,
      month: 9,
      amount: 25000,
      reason: '다른 계좌로 보냄',
    });
    expect(fakeDb.state.payments).toEqual([
      expect.objectContaining({
        clubMemberId: 1,
        year: 2026,
        month: 9,
        amount: 25000,
        period: 'MONTHLY',
        paymentRecordId: null,
        manualReason: '다른 계좌로 보냄',
        confirmedById: ADMIN_MEMBER_ID,
      }),
    ]);
  });

  it('같은 달을 두 번 넣으면 두 번째는 막는다', async () => {
    await add({});
    const res = await add({});

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('이미 납부가 있는 달입니다');
    expect(fakeDb.state.payments).toHaveLength(1);
  });

  it('통장 입금으로 낸 달도 막는다', async () => {
    fakeDb.addPayment({ clubMemberId: 1, year: 2026, month: 9 });

    const res = await add({});

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('이미 납부가 있는 달입니다');
  });

  it('휴회·면제 달은 막는다', async () => {
    fakeDb.addLeave(1, { year: 2026, month: 9 });
    fakeDb.state.exemptions.push({
      id: 1,
      clubMemberId: 1,
      year: 2026,
      startMonth: 10,
      endMonth: 12,
      reason: '임원',
    });

    const leave = await add({ month: 9 });
    const exempt = await add({ month: 10 });

    expect(leave.statusCode).toBe(400);
    expect(leave.body.error).toBe('회비 의무가 없는 달입니다');
    expect(exempt.statusCode).toBe(400);
    expect(exempt.body.error).toBe('면제 기간인 달입니다');
    expect(fakeDb.state.payments).toHaveLength(0);
  });

  it('금액이 문자열·0·소수면 막는다', async () => {
    for (const amount of ['25,000', 0, 2500.5]) {
      const res = await add({ amount });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('금액을 확인해주세요');
    }
    expect(fakeDb.state.payments).toHaveLength(0);
  });

  it('사유가 비면 막는다', async () => {
    const res = await add({ reason: '  ' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('사유를 입력해주세요');
  });
});

describe('직접 추가한 납부 지우기', () => {
  it('직접 추가한 납부를 지운다', async () => {
    const id = fakeDb.addManualPayment({
      clubMemberId: 1,
      year: 2026,
      month: 9,
    });

    const res = await call(paymentHandler, 'DELETE', undefined, {
      paymentId: id,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('직접 추가한 납부를 지웠습니다');
    expect(fakeDb.state.payments).toHaveLength(0);
  });

  it('입금으로 확정된 납부는 지우지 않는다', async () => {
    const id = fakeDb.addPayment({ clubMemberId: 1, year: 2026, month: 9 });

    const res = await call(paymentHandler, 'DELETE', undefined, {
      paymentId: id,
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe(
      '입금으로 확정된 납부는 여기서 지울 수 없습니다'
    );
    expect(fakeDb.state.payments).toHaveLength(1);
  });

  it('다른 회원의 납부 id면 404다', async () => {
    fakeDb.addMember({ id: 2, name: '라마바' });
    const id = fakeDb.addManualPayment({
      clubMemberId: 2,
      year: 2026,
      month: 9,
    });

    const res = await call(paymentHandler, 'DELETE', undefined, {
      paymentId: id,
    });

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('납부를 찾을 수 없습니다');
    expect(fakeDb.state.payments).toHaveLength(1);
  });
});

describe('직접 추가의 기본 금액', () => {
  const suggest = (query: Record<string, string>) =>
    call(suggestHandler, 'GET', undefined, query);

  it('일반 회원은 일반 월 단가다', async () => {
    const res = await suggest({ year: '2026', month: '9' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual({ amount: 25000, isCouple: false });
  });

  it('그 달에 부부였으면 부부 월 단가의 반이다', async () => {
    fakeDb.addMember({ id: 2, name: '라마바' });
    fakeDb.addCouple(1, 2);

    const res = await suggest({ year: '2026', month: '9' });

    expect(res.body.data).toEqual({ amount: 22500, isCouple: true });
  });

  it('그 해 단가가 없으면 금액을 비운다', async () => {
    const res = await suggest({ year: '2030', month: '1' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.amount).toBeNull();
  });

  it('연월이 없으면 400이다', async () => {
    const res = await suggest({ month: '9' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('연월을 확인해주세요');
  });
});
