import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import handler from '@/pages/api/clubs/[id]/membership-fee/payments/shift';

import { ADMIN_USER_ID, buildRes, CLUB_ID, fakeDb } from './fakeFeeDb';

import type { NextApiRequest, NextApiResponse } from 'next';

jest.mock('@/lib/prisma', () => ({
  prisma:
    jest.requireActual<typeof import('./fakeFeeDb')>('./fakeFeeDb').fakeDb
      .prisma,
}));

let mockUserId = 7;
jest.mock('@/lib/session', () => ({
  withAuth:
    (inner: (req: unknown, res: unknown) => unknown) =>
    (req: Record<string, unknown>, res: unknown) => {
      req.user = { id: mockUserId };
      return inner(req, res);
    },
}));

async function shift(body: unknown, method = 'POST') {
  const res = buildRes();
  await handler(
    {
      method,
      query: { id: String(CLUB_ID) },
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
        results: {
          success: string[];
          failed: { recordId: string; reason: string }[];
        };
        summary: Record<string, number>;
      };
    };
  };
}

const APRIL = { year: 2026, month: 4 };

/** 1 가나다: 1~4월 납부. 4월 회비를 낸 뒤 4월이 휴회가 됐다 */
let aprilPayment: string;
beforeEach(() => {
  mockUserId = ADMIN_USER_ID;
  fakeDb.reset();
  fakeDb.addMember({ id: 1, name: '가나다' });
  for (const month of [1, 2, 3]) {
    fakeDb.addPayment({ clubMemberId: 1, year: 2026, month });
  }
  aprilPayment = fakeDb.addPayment({
    clubMemberId: 1,
    ...APRIL,
    paymentRecordId: 'rec-april',
    amount: 25000,
  });
  fakeDb.addLeave(1, APRIL);
});

describe('POST /api/clubs/[id]/membership-fee/payments/shift', () => {
  it('휴회가 된 달의 납부를 다음 미납 의무월로 옮긴다', async () => {
    const res = await shift({ paymentIds: [aprilPayment] });

    expect(res.statusCode).toBe(200);
    // 연·월만 바뀐다. 어느 입금에서 나온 납부인지와 금액은 그대로다.
    expect(fakeDb.payment(aprilPayment)).toMatchObject({
      year: 2026,
      month: 5,
      paymentRecordId: 'rec-april',
      amount: 25000,
    });
    expect(res.body.data.results).toEqual({
      success: [aprilPayment],
      failed: [],
    });
    expect(res.body.data.summary).toEqual({
      total: 1,
      processed: 1,
      success: 1,
      failed: 0,
    });
    expect(res.body.message).toBe('1건 이월, 0건 실패');
  });

  it('여러 달을 쉬면 쉬는 달의 납부를 앞에서부터 차례로 옮긴다', async () => {
    fakeDb.state.leaves.length = 0;
    fakeDb.addLeave(1, { year: 2026, month: 3 }, APRIL);
    const march = fakeDb.state.payments.find((p) => p.month === 3)!
      .id as string;

    await shift({ paymentIds: [aprilPayment, march] });

    expect(fakeDb.payment(march)).toMatchObject({ year: 2026, month: 5 });
    expect(fakeDb.payment(aprilPayment)).toMatchObject({
      year: 2026,
      month: 6,
    });
  });

  it('의무가 있는 달의 납부는 그대로 두고 실패로 돌려준다', async () => {
    const march = fakeDb.state.payments.find((p) => p.month === 3)!
      .id as string;

    const res = await shift({ paymentIds: [march, aprilPayment] });

    expect(res.statusCode).toBe(200);
    expect(fakeDb.payment(march)).toMatchObject({ year: 2026, month: 3 });
    expect(res.body.data.results).toEqual({
      success: [aprilPayment],
      failed: [
        { recordId: march, reason: '의무가 있는 달의 납부는 옮길 수 없습니다' },
      ],
    });
    expect(res.body.message).toBe('1건 이월, 1건 실패');
  });

  it('탈퇴해 옮길 의무월이 없으면 실패로 돌려준다', async () => {
    fakeDb.state.leaves.length = 0;
    fakeDb.state.members.find((m) => m.id === 1)!.leftAt = new Date(
      2026,
      2,
      31
    );

    const res = await shift({ paymentIds: [aprilPayment] });

    expect(fakeDb.payment(aprilPayment)).toMatchObject(APRIL);
    expect(res.body.data.results.failed).toEqual([
      { recordId: aprilPayment, reason: '옮길 의무월이 없습니다' },
    ]);
  });

  it('없는 납부는 실패로 돌려준다', async () => {
    const res = await shift({ paymentIds: ['nope'] });

    expect(res.body.data.results.failed).toEqual([
      { recordId: 'nope', reason: '납부 내역을 찾을 수 없습니다' },
    ]);
    expect(res.body.data.summary).toMatchObject({ total: 1, processed: 0 });
  });

  it('납부를 고르지 않으면 거부한다', async () => {
    const res = await shift({ paymentIds: [] });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('최소 1개의 납부 내역을 선택해야 합니다');
  });

  it('POST가 아니면 거부한다', async () => {
    expect((await shift({}, 'GET')).statusCode).toBe(405);
  });

  it('관리자가 아니면 거부한다', async () => {
    mockUserId = 12345;

    const res = await shift({ paymentIds: [aprilPayment] });

    expect(res.statusCode).toBe(403);
    expect(fakeDb.payment(aprilPayment)).toMatchObject(APRIL);
  });
});
