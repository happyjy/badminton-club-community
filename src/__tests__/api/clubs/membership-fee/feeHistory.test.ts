import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

import handler from '@/pages/api/clubs/[id]/members/[userId]/fee-history';
import dashboardHandler from '@/pages/api/clubs/[id]/membership-fee/dashboard';
import type { MemberFeeHistory } from '@/types/membership-fee.types';

import { ADMIN_USER_ID, buildRes, CLUB_ID, fakeDb } from './fakeFeeDb';

import type { NextApiRequest, NextApiResponse } from 'next';

jest.mock('@/lib/prisma', () => ({
  prisma:
    jest.requireActual<typeof import('./fakeFeeDb')>('./fakeFeeDb').fakeDb
      .prisma,
}));

/** 요청한 사람. 기본은 임원(userId 7) */
let mockUserId = 7;
jest.mock('@/lib/session', () => ({
  withAuth:
    (inner: (req: unknown, res: unknown) => unknown) =>
    (req: Record<string, unknown>, res: unknown) => {
      req.user = { id: mockUserId };
      return inner(req, res);
    },
}));

type Body = { error?: string; data: MemberFeeHistory };

async function get(userId: number, query: Record<string, string> = {}) {
  const res = buildRes();
  await handler(
    {
      method: 'GET',
      query: { id: String(CLUB_ID), userId: String(userId), ...query },
    } as unknown as NextApiRequest,
    res as unknown as NextApiResponse
  );
  return res as unknown as { statusCode: number; body: Body };
}

/** 회원 1 가나다(userId 1001): 2026년 1월부터 의무 */
beforeEach(() => {
  fakeDb.reset();
  mockUserId = ADMIN_USER_ID;
  jest.useFakeTimers({ now: new Date('2026-11-20T03:00:00Z') });
  fakeDb.addMember({
    id: 1,
    name: '가나다',
    feeObligationStartAt: new Date(2026, 0, 1),
  });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('fee-history — 누가 읽는가', () => {
  it('본인은 자기 이력을 읽는다', async () => {
    mockUserId = 1001;
    const res = await get(1001);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.member.name).toBe('가나다');
  });

  it('다른 회원의 이력은 403', async () => {
    fakeDb.addMember({ id: 2, name: '라마바' });
    mockUserId = 1002;
    const res = await get(1001);
    expect(res.statusCode).toBe(403);
    expect(res.body.error).toBe('권한이 없습니다');
  });

  it('클럽 회원이 아닌 사람은 403', async () => {
    mockUserId = 5555;
    expect((await get(1001)).statusCode).toBe(403);
  });

  it('임원은 다른 회원의 이력을 읽는다', async () => {
    expect((await get(1001)).statusCode).toBe(200);
  });

  it('임원은 탈퇴 회원도 읽는다', async () => {
    fakeDb.addMember({
      id: 3,
      name: '사아자',
      status: 'LEFT',
      leftAt: new Date(2026, 4, 1),
      feeObligationStartAt: new Date(2026, 0, 1),
    });
    const res = await get(1003, { year: '2026' });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.months[0].status).toBe('UNPAID');
    expect(res.body.data.months[6].status).toBe('NONE');
  });

  it('휴가중 회원 본인은 읽고 칸도 계산된다', async () => {
    fakeDb.state.members.find((m) => m.id === 1)!.status = 'ON_LEAVE';
    fakeDb.addPayment({ clubMemberId: 1, year: 2026, month: 1 });
    mockUserId = 1001;
    const res = await get(1001);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.months[0].status).toBe('PAID');
    expect(res.body.data.months[1].status).toBe('UNPAID');
  });

  it('탈퇴·대기 회원 본인은 403', async () => {
    mockUserId = 1001;
    fakeDb.state.members.find((m) => m.id === 1)!.status = 'LEFT';
    expect((await get(1001)).statusCode).toBe(403);
    fakeDb.state.members.find((m) => m.id === 1)!.status = 'PENDING';
    expect((await get(1001)).statusCode).toBe(403);
  });

  it('없는 회원은 404', async () => {
    const res = await get(9999);
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('회원을 찾을 수 없습니다');
  });

  it('GET이 아니면 405', async () => {
    const res = buildRes();
    await handler(
      {
        method: 'POST',
        query: { id: String(CLUB_ID), userId: '1001' },
      } as unknown as NextApiRequest,
      res as unknown as NextApiResponse
    );
    expect(res.statusCode).toBe(405);
  });
});

describe('fee-history — 칸과 납부', () => {
  it('칸 상태가 대시보드와 같다', async () => {
    fakeDb.addPayment({ clubMemberId: 1, year: 2026, month: 1 });
    fakeDb.addPayment({ clubMemberId: 1, year: 2026, month: 4 });
    fakeDb.addLeave(1, { year: 2026, month: 3 }, { year: 2026, month: 4 });
    fakeDb.state.exemptions.push({
      id: 1,
      clubMemberId: 1,
      year: 2026,
      startMonth: 6,
      endMonth: 6,
      reason: '임원',
    });

    const res = await get(1001, { year: '2026' });
    const dashRes = buildRes();
    await dashboardHandler(
      {
        method: 'GET',
        query: { id: String(CLUB_ID), year: '2026' },
      } as unknown as NextApiRequest,
      dashRes as unknown as NextApiResponse
    );
    const dashMember = (
      dashRes.body as {
        data: { members: { id: number; cells: Record<number, string> }[] };
      }
    ).data.members.find((m) => m.id === 1)!;

    expect(res.body.data.months.map((m) => m.status)).toEqual(
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => dashMember.cells[m])
    );
    expect(res.body.data.months[2].status).toBe('LEAVE');
    expect(res.body.data.months[5].status).toBe('EXEMPT');
  });

  it('휴회 사유와 그 달 부부 여부를 싣는다', async () => {
    fakeDb.addLeave(1, { year: 2026, month: 3 });
    fakeDb.state.leaves[0].reason = '병가';
    fakeDb.addMember({ id: 2, name: '라마바' });
    fakeDb.addCouple(1, 2, new Date(2026, 4, 1));

    const { body } = await get(1001, { year: '2026' });
    expect(body.data.months[2].leaveReason).toBe('병가');
    expect(body.data.months[3].isCouple).toBe(false);
    expect(body.data.months[4].isCouple).toBe(true);
  });

  it('한 입금으로 낸 두 달은 같은 입금일, 입금자명이 다르면 이름을 싣는다', async () => {
    const recordId = fakeDb.addRecord({
      transactionDate: new Date(2026, 4, 1, 9, 30),
      depositorName: '라마바',
      amount: 50000,
      status: 'CONFIRMED',
    });
    fakeDb.addPayment({
      clubMemberId: 1,
      year: 2026,
      month: 5,
      paymentRecordId: recordId,
    });
    fakeDb.addPayment({
      clubMemberId: 1,
      year: 2026,
      month: 6,
      paymentRecordId: recordId,
    });

    const { body } = await get(1001, { year: '2026' });
    const may = body.data.months[4].payments;
    const june = body.data.months[5].payments;
    expect(may).toEqual([
      {
        amount: 25000,
        transactionDate: new Date(2026, 4, 1, 9, 30).toISOString(),
        depositorName: '라마바',
        manualReason: null,
      },
    ]);
    expect(june[0].transactionDate).toBe(may[0].transactionDate);
  });

  it('입금자명이 회원 이름과 같으면(앞뒤 공백 무시) 입금자명은 null', async () => {
    const recordId = fakeDb.addRecord({
      depositorName: '가나다 ',
      status: 'CONFIRMED',
    });
    fakeDb.addPayment({
      clubMemberId: 1,
      year: 2026,
      month: 2,
      paymentRecordId: recordId,
    });
    const { body } = await get(1001, { year: '2026' });
    expect(body.data.months[1].payments[0].depositorName).toBeNull();
  });

  it('한 달 두 건이면 두 건 모두 싣는다', async () => {
    fakeDb.addPayment({ clubMemberId: 1, year: 2026, month: 2, amount: 15000 });
    fakeDb.addPayment({ clubMemberId: 1, year: 2026, month: 2, amount: 10000 });
    const { body } = await get(1001, { year: '2026' });
    expect(body.data.months[1].payments.map((p) => p.amount)).toEqual([
      15000, 10000,
    ]);
  });

  it('직접 쓴 사유는 임원에게만 보이고 회원에게는 null', async () => {
    fakeDb.addManualPayment({
      clubMemberId: 1,
      year: 2026,
      month: 3,
      manualReason: '총무가 대신 받아 둠',
    });
    const admin = await get(1001, { year: '2026' });
    expect(admin.body.data.months[2].payments[0]).toEqual({
      amount: 25000,
      transactionDate: null,
      depositorName: null,
      manualReason: '총무가 대신 받아 둠',
    });

    mockUserId = 1001;
    const self = await get(1001, { year: '2026' });
    expect(self.body.data.months[2].payments[0].manualReason).toBeNull();
  });

  it('정해진 사유는 회원에게도 보인다', async () => {
    fakeDb.addManualPayment({ clubMemberId: 1, year: 2026, month: 3 });
    mockUserId = 1001;
    const { body } = await get(1001, { year: '2026' });
    expect(body.data.months[2].payments[0].manualReason).toBe(
      '다른 계좌로 보냄'
    );
  });

  it('고른 해와 겹치는 휴회만 싣는다', async () => {
    fakeDb.addLeave(1, { year: 2025, month: 3 }, { year: 2025, month: 4 });
    fakeDb.addLeave(1, { year: 2026, month: 3 }, { year: 2026, month: 4 });
    fakeDb.addLeave(1, { year: 2026, month: 12 }, null);
    const { body } = await get(1001, { year: '2026' });
    expect(body.data.leaves.map((l) => [l.startYear, l.startMonth])).toEqual([
      [2026, 3],
      [2026, 12],
    ]);
  });
});

describe('fee-history — 확인 중 입금과 반영 시각', () => {
  it('확인 중 입금은 MATCHED·ERROR이고 회비·확실한 매칭만, 거래일 최근 순', async () => {
    fakeDb.addMember({ id: 2, name: '라마바' });
    const at = (day: number) => new Date(2026, 10, day, 10);
    fakeDb.addRecord({
      memberIds: [1],
      status: 'MATCHED',
      amount: 25000,
      transactionDate: at(18),
    });
    fakeDb.addRecord({
      memberIds: [1],
      status: 'ERROR',
      amount: 30000,
      transactionDate: at(19),
    });
    fakeDb.addRecord({
      memberIds: [1],
      status: 'CONFIRMED',
      amount: 1,
      transactionDate: at(10),
    });
    fakeDb.addRecord({
      memberIds: [1],
      status: 'SKIPPED',
      amount: 2,
      transactionDate: at(11),
    });
    fakeDb.addRecord({
      memberIds: [1],
      status: 'MATCHED',
      needsReview: true,
      amount: 3,
      transactionDate: at(12),
    });
    fakeDb.addRecord({
      memberIds: [1],
      status: 'MATCHED',
      kind: 'EVENT',
      amount: 4,
      transactionDate: at(13),
    });
    fakeDb.addRecord({
      memberIds: [2],
      status: 'MATCHED',
      amount: 5,
      transactionDate: at(14),
    });
    fakeDb.addRecord({ status: 'PENDING', amount: 6, transactionDate: at(15) });

    const { body } = await get(1001);
    expect(body.data.pendingDeposits).toEqual([
      { transactionDate: at(19).toISOString(), amount: 30000 },
      { transactionDate: at(18).toISOString(), amount: 25000 },
    ]);
  });

  it('반영 시각은 클럽의 가장 늦은 거래일시 (상태와 상관없이)', async () => {
    fakeDb.addRecord({
      status: 'PENDING',
      transactionDate: new Date(2026, 10, 20, 14, 30),
    });
    fakeDb.addRecord({
      status: 'CONFIRMED',
      transactionDate: new Date(2026, 10, 2),
    });
    const { body } = await get(1001);
    expect(body.data.asOf).toBe(new Date(2026, 10, 20, 14, 30).toISOString());
  });

  it('올라온 통장 내역이 없으면 반영 시각은 null', async () => {
    const { body } = await get(1001);
    expect(body.data.asOf).toBeNull();
  });
});

describe('fee-history — 요약과 연도', () => {
  it('미납 요약과 월 회비 — 5월부터 부부', async () => {
    fakeDb.addMember({ id: 2, name: '라마바' });
    fakeDb.addCouple(1, 2, new Date(2026, 4, 1));
    for (let month = 1; month <= 9; month++) {
      fakeDb.addPayment({ clubMemberId: 1, year: 2026, month });
    }
    const { body } = await get(1001, { year: '2026' });
    // 10·11월이 미납 (오늘 11/20)
    expect(body.data.summary.unpaidCount).toBe(2);
    expect(body.data.summary.unpaidAmount).toBe(22500 * 2);
    expect(body.data.summary.monthlyFee).toEqual([
      { fromMonth: 1, toMonth: 4, amount: 25000, isCouple: false },
      { fromMonth: 5, toMonth: 12, amount: 22500, isCouple: true },
    ]);
  });

  it('단가 없는 해(2027)는 금액 null, 월 회비 빈 목록, 그 해도 고를 수 있다', async () => {
    fakeDb.addPayment({ clubMemberId: 1, year: 2027, month: 3 });
    const res = await get(1001, { year: '2027' });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.summary.unpaidAmount).toBeNull();
    expect(res.body.data.summary.monthlyFee).toEqual([]);
    expect(res.body.data.months[2].status).toBe('PAID');
    expect(res.body.data.years).toEqual([2027, 2026]);
  });

  it('회비 시작월·이름이 없는 회원도 읽힌다', async () => {
    fakeDb.addMember({
      id: 4,
      name: null as unknown as string,
      feeObligationStartAt: null,
    });
    const recordId = fakeDb.addRecord({
      depositorName: '차카타',
      status: 'CONFIRMED',
    });
    fakeDb.addPayment({
      clubMemberId: 4,
      year: 2026,
      month: 1,
      paymentRecordId: recordId,
    });
    const res = await get(1004);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.years).toEqual([2026]);
    expect(res.body.data.months[0].payments[0].depositorName).toBe('차카타');
  });

  it('year가 숫자가 아니면 400', async () => {
    const res = await get(1001, { year: 'abc' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('연도를 확인해주세요');
    expect((await get(1001, { year: '0' })).statusCode).toBe(400);
  });

  it('year가 없으면 올해(한국 시각)', async () => {
    const { body } = await get(1001);
    expect(body.data.year).toBe(2026);
  });

  it('회비 대상 아님 회원은 빈 목록', async () => {
    fakeDb.state.members.find((m) => m.id === 1)!.feeExcluded = true;
    fakeDb.addPayment({ clubMemberId: 1, year: 2026, month: 1 });
    const { body } = await get(1001);
    expect(body.data.member.feeExcluded).toBe(true);
    expect(body.data.months).toEqual([]);
    expect(body.data.pendingDeposits).toEqual([]);
    expect(body.data.summary).toEqual({
      unpaidCount: 0,
      unpaidAmount: null,
      monthlyFee: [],
    });
  });
});
