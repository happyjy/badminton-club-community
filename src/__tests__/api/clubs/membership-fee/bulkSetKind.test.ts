import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import handler from '@/pages/api/clubs/[id]/membership-fee/records/bulk-set-kind';

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

async function setKind(body: unknown, method = 'POST') {
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

/** 1 가나다: 2026년 1~4월 납부 */
beforeEach(() => {
  mockUserId = ADMIN_USER_ID;
  fakeDb.reset();
  fakeDb.addMember({ id: 1, name: '가나다' });
  for (const month of [1, 2, 3, 4]) {
    fakeDb.addPayment({ clubMemberId: 1, year: 2026, month });
  }
});

describe('POST records/bulk-set-kind — 회비가 아닌 분류로', () => {
  it('고른 건을 모두 그 분류의 건너뜀으로 바꾸고, 건마다 이전 분류를 근거에 남긴다', async () => {
    const short = fakeDb.addRecord({
      status: 'MATCHED',
      memberIds: [1],
      amount: 15000,
      kindReason: '한 달 단가보다 적은 금액',
      nonFeeAmount: 5000,
      nonFeeKind: 'OTHER',
      needsReview: true,
    });
    const unknown = fakeDb.addRecord({
      status: 'PENDING',
      amount: 15000,
      errorReason: '회원 매칭 실패',
      kindReason: '한 달 단가보다 적은 금액',
    });

    const res = await setKind({ recordIds: [short, unknown], kind: 'EVENT' });

    expect(res.statusCode).toBe(200);
    for (const id of [short, unknown]) {
      expect(fakeDb.record(id)).toMatchObject({
        kind: 'EVENT',
        status: 'SKIPPED',
        errorReason: null,
        needsReview: false,
        nonFeeAmount: 0,
        nonFeeKind: null,
        kindReason: '직접 변경 (이전: 회비 — 한 달 단가보다 적은 금액)',
      });
    }
    // 누가 낸 돈인지는 남긴다
    expect(fakeDb.record(short).matchedMemberId).toBe(1);
    expect(res.body.data.results).toEqual({
      success: [short, unknown],
      failed: [],
    });
    expect(res.body.data.summary).toEqual({
      total: 2,
      processed: 2,
      success: 2,
      failed: 0,
    });
    expect(res.body.message).toBe('2건 분류 변경, 0건 실패');
  });

  it('건너뛴 회비 건도 바꿀 수 있다', async () => {
    const skipped = fakeDb.addRecord({ status: 'SKIPPED', amount: 24500 });

    await setKind({ recordIds: [skipped], kind: 'OTHER' });

    expect(fakeDb.record(skipped)).toMatchObject({
      kind: 'OTHER',
      status: 'SKIPPED',
      kindReason: '직접 변경 (이전: 회비 — 근거 없음)',
    });
  });
});

describe('POST records/bulk-set-kind — 회비로', () => {
  it('매칭 회원이 있으면 매칭됨, 입금자명으로도 찾지 못하면 대기로 되돌린다', async () => {
    const withMember = fakeDb.addRecord({
      kind: 'EVENT',
      status: 'SKIPPED',
      memberIds: [1],
      kindReason: "'단체티' 표기",
    });
    const withoutMember = fakeDb.addRecord({
      kind: 'JOINING_FEE',
      status: 'SKIPPED',
      amount: 100000,
      depositorName: '모르는이',
    });

    const res = await setKind({
      recordIds: [withMember, withoutMember],
      kind: 'FEE',
    });

    expect(fakeDb.record(withMember)).toMatchObject({
      kind: 'FEE',
      status: 'MATCHED',
      errorReason: null,
      kindReason: "직접 변경 (이전: 행사 — '단체티' 표기)",
    });
    expect(fakeDb.record(withoutMember)).toMatchObject({
      kind: 'FEE',
      status: 'PENDING',
      errorReason: '회원 매칭 실패',
    });
    expect(res.body.data.results.success).toEqual([withMember, withoutMember]);
  });
});

describe('POST records/bulk-set-kind — 회비로 되돌릴 때의 재매칭', () => {
  it('매칭 회원이 없던 건은 입금자명으로 회원을 다시 찾아 매칭됨으로 둔다', async () => {
    const found = fakeDb.addRecord({
      kind: 'EVENT',
      status: 'SKIPPED',
      depositorName: '가나다 뒷풀이',
      amount: 25000,
    });
    const unknown = fakeDb.addRecord({
      kind: 'EVENT',
      status: 'SKIPPED',
      depositorName: '모르는이 뒷풀이',
      amount: 25000,
    });

    await setKind({ recordIds: [found, unknown], kind: 'FEE' });

    expect(fakeDb.record(found)).toMatchObject({
      kind: 'FEE',
      status: 'MATCHED',
      matchedMemberId: 1,
    });
    expect(
      fakeDb.state.matched.filter((m) => m.paymentRecordId === found)
    ).toMatchObject([{ clubMemberId: 1 }]);
    expect(fakeDb.record(unknown)).toMatchObject({
      kind: 'FEE',
      status: 'PENDING',
      matchedMemberId: null,
    });
  });
});

describe('POST records/bulk-set-kind — 바꾸지 않는 건', () => {
  it('확정된 건은 그대로 두고 실패로 돌려준다', async () => {
    const confirmed = fakeDb.addRecord({ status: 'CONFIRMED', memberIds: [1] });
    const open = fakeDb.addRecord({ status: 'MATCHED', memberIds: [1] });

    const res = await setKind({ recordIds: [confirmed, open], kind: 'EVENT' });

    expect(res.statusCode).toBe(200);
    expect(fakeDb.record(confirmed)).toMatchObject({
      kind: 'FEE',
      status: 'CONFIRMED',
    });
    expect(res.body.data.results).toEqual({
      success: [open],
      failed: [
        {
          recordId: confirmed,
          reason: '확정된 입금 내역은 분류를 바꿀 수 없습니다',
        },
      ],
    });
    expect(res.body.message).toBe('1건 분류 변경, 1건 실패');
  });

  it('이미 그 분류인 건은 근거를 덮어쓰지 않고 실패로 돌려준다', async () => {
    const event = fakeDb.addRecord({
      kind: 'EVENT',
      status: 'SKIPPED',
      kindReason: "'뒷풀이' 표기",
    });

    const res = await setKind({ recordIds: [event], kind: 'EVENT' });

    expect(fakeDb.record(event).kindReason).toBe("'뒷풀이' 표기");
    expect(res.body.data.results.failed).toEqual([
      { recordId: event, reason: "이미 '행사'로 분류된 내역입니다" },
    ]);
  });

  it('없는 건은 실패로 돌려준다', async () => {
    const res = await setKind({ recordIds: ['nope'], kind: 'EVENT' });

    expect(res.body.data.results.failed).toEqual([
      { recordId: 'nope', reason: '입금 내역을 찾을 수 없습니다' },
    ]);
    expect(res.body.data.summary).toMatchObject({ total: 1, processed: 0 });
  });
});

describe('POST records/bulk-set-kind — 요청 검증', () => {
  it('건을 고르지 않으면 거부한다', async () => {
    const res = await setKind({ recordIds: [], kind: 'EVENT' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('최소 1개의 레코드를 선택해야 합니다');
  });

  it('없는 분류는 거부한다', async () => {
    const id = fakeDb.addRecord({ status: 'MATCHED', memberIds: [1] });

    const res = await setKind({ recordIds: [id], kind: 'DONATION' });

    expect(res.statusCode).toBe(400);
    expect(fakeDb.record(id).kind).toBe('FEE');
  });

  it('POST가 아니면 거부한다', async () => {
    expect((await setKind({}, 'GET')).statusCode).toBe(405);
  });

  it('관리자가 아니면 거부한다', async () => {
    mockUserId = 12345;
    const id = fakeDb.addRecord({ status: 'MATCHED', memberIds: [1] });

    const res = await setKind({ recordIds: [id], kind: 'EVENT' });

    expect(res.statusCode).toBe(403);
    expect(fakeDb.record(id).kind).toBe('FEE');
  });
});
