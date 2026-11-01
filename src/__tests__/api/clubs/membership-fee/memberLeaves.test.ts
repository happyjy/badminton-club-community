import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import leaveHandler from '@/pages/api/clubs/[id]/members/[userId]/leaves/[leaveId]';
import leavesHandler from '@/pages/api/clubs/[id]/members/[userId]/leaves/index';

import { buildRes, CLUB_ID, fakeDb } from './fakeFeeDb';

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
type Payment = { id: string; year: number; month: number; amount: number };

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
      data: {
        leave: Record<string, unknown>;
        leaves: unknown[];
        paymentsInRange: Payment[];
        orphanPayments: Payment[];
      };
    };
  };
}

/** 1 가나다(userId 1001): 2026년 3~5월 납부 */
let paymentOf: Record<number, string>;
beforeEach(() => {
  fakeDb.reset();
  fakeDb.addMember({ id: 1, name: '가나다' });
  paymentOf = Object.fromEntries(
    [3, 4, 5].map((month) => [
      month,
      fakeDb.addPayment({ clubMemberId: 1, year: 2026, month }),
    ])
  );
});

describe('휴회 기간 저장 — 그 기간에 걸린 납부', () => {
  it('등록하면 휴회 기간 안의 납부를 함께 돌려준다', async () => {
    const res = await call(leavesHandler, 'POST', {
      startYear: 2026,
      startMonth: 4,
      endYear: 2026,
      endMonth: 4,
      reason: '병가',
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.leave).toMatchObject({
      startMonth: 4,
      reason: '병가',
    });
    expect(res.body.data.paymentsInRange).toMatchObject([
      { id: paymentOf[4], year: 2026, month: 4, amount: 25000 },
    ]);
  });

  it('끝을 정하지 않은 휴회는 시작한 달부터의 납부를 모두 돌려준다', async () => {
    const res = await call(leavesHandler, 'POST', {
      startYear: 2026,
      startMonth: 4,
    });

    expect(res.body.data.paymentsInRange.map((p) => p.month)).toEqual([4, 5]);
  });

  it('겹치는 납부가 없으면 빈 목록을 돌려준다', async () => {
    const res = await call(leavesHandler, 'POST', {
      startYear: 2026,
      startMonth: 7,
      endYear: 2026,
      endMonth: 8,
    });

    expect(res.body.data.paymentsInRange).toEqual([]);
  });

  it('수정해도 바뀐 기간 안의 납부를 돌려준다', async () => {
    fakeDb.addLeave(1, { year: 2026, month: 7 });

    const res = await call(
      leaveHandler,
      'PATCH',
      { startYear: 2026, startMonth: 5, endYear: 2026, endMonth: 5 },
      { leaveId: '1' }
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.data.paymentsInRange).toMatchObject([
      { id: paymentOf[5], year: 2026, month: 5, amount: 25000 },
    ]);
  });
});

describe('휴회 기간 목록 — 의무가 없는 달의 납부', () => {
  it('휴회한 달에 걸려 있는 납부를 함께 돌려준다', async () => {
    fakeDb.addLeave(1, { year: 2026, month: 4 });

    const res = await call(leavesHandler, 'GET');

    expect(res.body.data.leaves).toHaveLength(1);
    expect(res.body.data.orphanPayments).toMatchObject([
      { id: paymentOf[4], year: 2026, month: 4, amount: 25000 },
    ]);
  });

  it('탈퇴한 뒤의 달에 걸려 있는 납부도 돌려준다', async () => {
    fakeDb.state.members.find((m) => m.id === 1)!.leftAt = new Date(
      2026,
      2,
      31
    );

    const res = await call(leavesHandler, 'GET');

    expect(res.body.data.orphanPayments.map((p) => p.month)).toEqual([4, 5]);
  });

  it('모두 의무가 있는 달이면 빈 목록이다', async () => {
    const res = await call(leavesHandler, 'GET');

    expect(res.body.data.orphanPayments).toEqual([]);
  });
});
