import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import recordHandler from '@/pages/api/clubs/[id]/membership-fee/records/[recordId]/index';
import unskipHandler from '@/pages/api/clubs/[id]/membership-fee/records/[recordId]/unskip';
import bulkUnskipHandler from '@/pages/api/clubs/[id]/membership-fee/records/bulk-unskip';

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

async function call(
  handler: Handler,
  method: string,
  query: Record<string, string>,
  body?: unknown
) {
  const res = buildRes();
  await handler(
    {
      method,
      query: { id: String(CLUB_ID), ...query },
      body,
    } as unknown as NextApiRequest,
    res as unknown as NextApiResponse
  );
  return res as {
    statusCode: number;
    body: {
      error?: string;
      data: {
        record: Record<string, unknown>;
        results: { success: string[]; failed: { reason: string }[] };
      };
    };
  };
}

const update = (recordId: string, body: unknown) =>
  call(recordHandler, 'PUT', { recordId }, body);

/** 1 가나다·2 마바사: 2026년 1~4월 납부 */
beforeEach(() => {
  fakeDb.reset();
  fakeDb.addMember({ id: 1, name: '가나다' });
  fakeDb.addMember({ id: 2, name: '마바사' });
  for (const clubMemberId of [1, 2]) {
    for (const month of [1, 2, 3, 4]) {
      fakeDb.addPayment({ clubMemberId, year: 2026, month });
    }
  }
});

const matched = (
  over: Record<string, unknown> & { memberIds?: number[] } = {}
) => fakeDb.addRecord({ status: 'MATCHED', memberIds: [1], ...over });

describe('PUT records/[recordId] — 회비가 아닌 금액', () => {
  it('떼어 낸 금액을 저장하고 나머지로 다시 판정해 돌려준다', async () => {
    const id = matched({ amount: 49500 });

    const res = await update(id, { nonFeeAmount: 24500, nonFeeKind: 'OTHER' });

    expect(res.statusCode).toBe(200);
    expect(fakeDb.record(id)).toMatchObject({
      nonFeeAmount: 24500,
      nonFeeKind: 'OTHER',
      status: 'MATCHED',
    });
    expect(res.body.data.record).toMatchObject({
      needsReview: false,
      reviewReasons: [],
      suggestedSelections: [{ year: 2026, month: 5 }],
    });
  });

  it('0으로 되돌리면 성격도 지운다', async () => {
    const id = matched({
      amount: 125000,
      nonFeeAmount: 100000,
      nonFeeKind: 'JOINING_FEE',
    });

    await update(id, { nonFeeAmount: 0 });

    expect(fakeDb.record(id)).toMatchObject({
      nonFeeAmount: 0,
      nonFeeKind: null,
    });
  });

  it('입금액과 같거나 큰 금액은 거부한다', async () => {
    const id = matched({ amount: 25000 });

    const res = await update(id, { nonFeeAmount: 25000, nonFeeKind: 'OTHER' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('회비가 아닌 금액은 입금액보다 적어야 합니다');
    expect(fakeDb.record(id).nonFeeAmount).toBe(0);
  });

  it('금액만 있고 성격이 없으면 거부한다', async () => {
    const id = matched({ amount: 49500 });

    const res = await update(id, { nonFeeAmount: 24500 });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('회비가 아닌 금액의 성격을 골라주세요');
  });
});

describe('PUT records/[recordId] — 분류', () => {
  it('회비가 아닌 분류로 바꾸면 건너뜀이 되고 바꾼 기록을 남긴다', async () => {
    const id = matched({
      amount: 15000,
      kindReason: '한 달 단가보다 적은 금액',
      nonFeeAmount: 5000,
      nonFeeKind: 'OTHER',
      needsReview: true,
    });

    const res = await update(id, { kind: 'EVENT' });

    expect(res.statusCode).toBe(200);
    expect(fakeDb.record(id)).toMatchObject({
      kind: 'EVENT',
      status: 'SKIPPED',
      errorReason: null,
      nonFeeAmount: 0,
      nonFeeKind: null,
      needsReview: false,
    });
    expect(fakeDb.record(id).kindReason).toBe(
      '직접 변경 (이전: 회비 — 한 달 단가보다 적은 금액)'
    );
  });

  it('건너뛴 행사 건을 회비로 바꾸면 매칭 회원이 있을 때 매칭됨이 된다', async () => {
    const id = matched({ kind: 'EVENT', status: 'SKIPPED' });

    const res = await update(id, { kind: 'FEE' });

    expect(fakeDb.record(id)).toMatchObject({ kind: 'FEE', status: 'MATCHED' });
    expect(res.body.data.record.suggestedSelections).toEqual([
      { year: 2026, month: 5 },
    ]);
  });

  it('회비로 바꿨는데 입금자명으로도 회원을 찾지 못하면 대기가 된다', async () => {
    const id = matched({
      kind: 'JOINING_FEE',
      status: 'SKIPPED',
      memberIds: [],
      depositorName: '모르는이',
    });

    await update(id, { kind: 'FEE' });

    expect(fakeDb.record(id)).toMatchObject({
      kind: 'FEE',
      status: 'PENDING',
      errorReason: '회원 매칭 실패',
    });
  });

  it('재무가 직접 건너뛴 회비 건은 메모를 고쳐도 건너뜀으로 남는다', async () => {
    const id = matched({ status: 'SKIPPED' });

    await update(id, { note: '확인 중' });

    expect(fakeDb.record(id)).toMatchObject({
      status: 'SKIPPED',
      note: '확인 중',
    });
  });
});

describe('PUT records/[recordId] — 매칭 회원', () => {
  it('회원을 사람이 고르면 회원 확인 표시를 끄고 다시 판정한다', async () => {
    const id = matched({ needsReview: true });

    const res = await update(id, { matchedMemberIds: [2] });

    expect(fakeDb.record(id)).toMatchObject({
      matchedMemberId: 2,
      status: 'MATCHED',
      needsReview: false,
    });
    expect(fakeDb.state.matched).toMatchObject([
      { paymentRecordId: id, clubMemberId: 2 },
    ]);
    expect(res.body.data.record.needsReview).toBe(false);
  });

  it('회원을 모두 지우면 대기가 된다', async () => {
    const id = matched();

    await update(id, { matchedMemberIds: [] });

    expect(fakeDb.record(id)).toMatchObject({
      matchedMemberId: null,
      status: 'PENDING',
    });
  });

  it('대기 건에 회원을 고르면 매칭됨이 된다', async () => {
    const id = matched({
      status: 'PENDING',
      memberIds: [],
      errorReason: '회원 매칭 실패',
    });

    await update(id, { matchedMemberIds: [1] });

    expect(fakeDb.record(id)).toMatchObject({
      status: 'MATCHED',
      errorReason: null,
    });
  });

  it('이 클럽의 회원이 아니면 거부한다', async () => {
    const id = matched();

    const res = await update(id, { matchedMemberIds: [999] });

    expect(res.statusCode).toBe(400);
    expect(fakeDb.record(id).matchedMemberId).toBe(1);
  });
});

describe('PUT records/[recordId] — 메모와 확정된 건', () => {
  it('메모를 저장하고, 빈 메모는 지운다', async () => {
    const id = matched();

    await update(id, { note: '4월병가, 5월로 이월' });
    expect(fakeDb.record(id).note).toBe('4월병가, 5월로 이월');

    await update(id, { note: null });
    expect(fakeDb.record(id).note).toBeNull();
  });

  it('확정된 건은 메모만 고칠 수 있다', async () => {
    const id = matched({ status: 'CONFIRMED' });

    const note = await update(id, { note: '확인함' });
    const kind = await update(id, { kind: 'EVENT' });

    expect(note.statusCode).toBe(200);
    expect(fakeDb.record(id).note).toBe('확인함');
    expect(kind.statusCode).toBe(400);
    expect(kind.body.error).toBe('이미 확정된 입금 내역은 수정할 수 없습니다');
    expect(fakeDb.record(id)).toMatchObject({
      kind: 'FEE',
      status: 'CONFIRMED',
    });
  });
});

describe('PUT records/[recordId] — 그사이 바뀐 건', () => {
  it('읽은 뒤 다른 요청이 확정했으면 고치지 않고 알린다', async () => {
    const id = matched();
    const realTransaction = fakeDb.prisma.$transaction;
    const spy = jest
      .spyOn(fakeDb.prisma, '$transaction')
      .mockImplementation(async (run) => {
        // 트랜잭션이 시작되기 직전에 다른 요청이 확정을 끝냈다
        fakeDb.record(id).status = 'CONFIRMED';
        return realTransaction(run);
      });

    const res = await update(id, { matchedMemberIds: [2] });
    spy.mockRestore();

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe(
      '그사이 바뀐 입금 내역입니다. 새로 고친 뒤 다시 시도해주세요'
    );
    // 확정된 채로 남고, 매칭 회원도 그대로다
    expect(fakeDb.record(id)).toMatchObject({
      status: 'CONFIRMED',
      matchedMemberId: 1,
    });
    expect(fakeDb.state.matched).toMatchObject([
      { paymentRecordId: id, clubMemberId: 1 },
    ]);
  });

  it('상태는 이 API로 직접 바꿀 수 없다 (납부 없는 확정을 만들 수 없게)', async () => {
    const id = matched();

    await update(id, { status: 'CONFIRMED', note: '메모' });

    expect(fakeDb.record(id)).toMatchObject({
      status: 'MATCHED',
      note: '메모',
    });
  });
});

describe('PUT records/[recordId] — 회비로 되돌릴 때의 재매칭', () => {
  it('매칭 회원이 없던 행사 건은 입금자명으로 회원을 다시 찾는다', async () => {
    const id = matched({
      kind: 'EVENT',
      status: 'SKIPPED',
      memberIds: [],
      depositorName: '가나다 뒷풀이',
    });

    await update(id, { kind: 'FEE' });

    expect(fakeDb.record(id)).toMatchObject({
      kind: 'FEE',
      status: 'MATCHED',
      matchedMemberId: 1,
      needsReview: false,
    });
    expect(fakeDb.state.matched).toMatchObject([
      { paymentRecordId: id, clubMemberId: 1 },
    ]);
  });

  it('이름이 비슷한 회원으로 찾았으면 회원 확인 표시를 남긴다', async () => {
    const id = matched({
      kind: 'OTHER',
      status: 'SKIPPED',
      memberIds: [],
      depositorName: '가나라',
    });

    await update(id, { kind: 'FEE' });

    expect(fakeDb.record(id)).toMatchObject({
      status: 'MATCHED',
      matchedMemberId: 1,
      needsReview: true,
    });
  });

  it('남겨 둔 매칭 회원이 있으면 다시 찾지 않고 그 회원을 쓴다', async () => {
    const id = matched({
      kind: 'EVENT',
      status: 'SKIPPED',
      memberIds: [2],
      depositorName: '가나다 뒷풀이',
    });

    await update(id, { kind: 'FEE' });

    expect(fakeDb.record(id)).toMatchObject({
      status: 'MATCHED',
      matchedMemberId: 2,
    });
  });
});

describe('건너뛰기 해제', () => {
  it('회비가 아닌 분류는 해제할 수 없다 (분류를 먼저 바꿔야 한다)', async () => {
    const id = matched({ kind: 'EVENT', status: 'SKIPPED' });

    const res = await call(unskipHandler, 'POST', { recordId: id });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe(
      '회비가 아닌 입금입니다. 분류를 회비로 바꿔주세요'
    );
    expect(fakeDb.record(id).status).toBe('SKIPPED');
  });

  it('일괄 해제에서도 회비가 아닌 분류는 실패로 돌려준다', async () => {
    const event = matched({ kind: 'EVENT', status: 'SKIPPED' });
    const fee = matched({ status: 'SKIPPED' });

    const res = await call(
      bulkUnskipHandler,
      'POST',
      {},
      {
        recordIds: [event, fee],
      }
    );

    expect(res.body.data.results.success).toEqual([fee]);
    expect(res.body.data.results.failed[0].reason).toBe(
      '회비가 아닌 입금입니다. 분류를 회비로 바꿔주세요'
    );
    expect(fakeDb.record(event).status).toBe('SKIPPED');
    expect(fakeDb.record(fee).status).toBe('MATCHED');
  });
});
