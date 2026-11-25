import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import handler from '@/pages/api/clubs/[id]/members/[userId]/fee-obligation';

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

const MEMBER_ID = 1;
const USER_ID = 1001;
const START = new Date('2025-03-01T00:00:00.000Z');

async function patch(body: unknown) {
  const res = buildRes();
  await handler(
    {
      method: 'PATCH',
      query: { id: String(CLUB_ID), userId: String(USER_ID) },
      body,
    } as unknown as NextApiRequest,
    res as unknown as NextApiResponse
  );
  return res as { statusCode: number; body: { error?: string } };
}

const saved = () =>
  fakeDb.state.members.find((member) => member.id === MEMBER_ID)!;

beforeEach(() => {
  fakeDb.reset();
  fakeDb.addMember({
    id: MEMBER_ID,
    userId: USER_ID,
    name: '가나다',
    feeObligationStartAt: START,
    position: null,
    positionOrder: null,
  });
});

describe('PATCH members/[userId]/fee-obligation — 직책', () => {
  it('직책과 정렬 순서를 저장한다', async () => {
    const res = await patch({ position: ' 총무 ', positionOrder: 3 });

    expect(res.statusCode).toBe(200);
    expect(saved()).toMatchObject({ position: '총무', positionOrder: 3 });
  });

  it('직책만 보내면 회비 입금 시작일은 건드리지 않는다', async () => {
    await patch({ position: '총무', positionOrder: 3 });

    expect(saved().feeObligationStartAt).toEqual(START);
  });

  it('빈 값으로 보내면 직책을 지운다', async () => {
    await patch({ position: '총무', positionOrder: 3 });

    await patch({ position: '  ', positionOrder: '' });

    expect(saved()).toMatchObject({ position: null, positionOrder: null });
  });

  it.each([1.5, 'abc', -1])(
    '정렬 순서가 1 이상의 정수가 아니면 거부한다: %s',
    async (positionOrder) => {
      const res = await patch({ position: '총무', positionOrder });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('정렬 순서는 1 이상의 정수로 적어주세요');
      expect(saved().position).toBeNull();
    }
  );
});

describe('PATCH members/[userId]/fee-obligation — 회비 대상 아님', () => {
  it('회비 대상 아님만 보내면 그 칸만 고친다', async () => {
    await patch({ position: '총무', positionOrder: 3 });

    const res = await patch({ feeExcluded: true });

    expect(res.statusCode).toBe(200);
    expect(saved()).toMatchObject({
      feeExcluded: true,
      feeObligationStartAt: START,
      position: '총무',
      positionOrder: 3,
    });
  });

  it('다시 끌 수 있다', async () => {
    await patch({ feeExcluded: true });

    await patch({ feeExcluded: false });

    expect(saved().feeExcluded).toBe(false);
  });

  it('회비 대상 아님이 불리언이 아니면 거부한다', async () => {
    const res = await patch({ feeExcluded: 'yes' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('회비 대상 여부를 확인해주세요');
    expect(saved().feeExcluded).toBe(false);
  });
});

describe('PATCH members/[userId]/fee-obligation — 회비 입금 시작일', () => {
  it('시작일을 저장하고 직책은 건드리지 않는다', async () => {
    await patch({ position: '총무', positionOrder: 3 });

    await patch({ feeObligationStartAt: '2026-03-01T00:00:00.000Z' });

    expect(saved()).toMatchObject({
      feeObligationStartAt: new Date('2026-03-01T00:00:00.000Z'),
      position: '총무',
    });
  });

  it('null을 보내면 시작일을 지운다', async () => {
    await patch({ feeObligationStartAt: null });

    expect(saved().feeObligationStartAt).toBeNull();
  });

  it('날짜가 아니면 거부한다', async () => {
    const res = await patch({ feeObligationStartAt: '날짜아님' });

    expect(res.statusCode).toBe(400);
    expect(saved().feeObligationStartAt).toEqual(START);
  });
});

describe('PATCH members/[userId]/fee-obligation — 탈퇴일은 탈퇴 상태에만', () => {
  it('탈퇴가 아닌 회원에 탈퇴일을 넣으면 거부한다', async () => {
    const res = await patch({ leftAt: '2026-07-01T00:00:00.000Z' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('탈퇴한 회원만 탈퇴일을 넣을 수 있습니다');
    expect(saved().leftAt ?? null).toBeNull();
  });

  it('탈퇴가 아닌 회원은 탈퇴일 null과 함께 시작일을 저장할 수 있다 (회원 상세 화면이 보내는 모양)', async () => {
    const res = await patch({
      feeObligationStartAt: '2026-03-01T00:00:00.000Z',
      leftAt: null,
    });

    expect(res.statusCode).toBe(200);
    expect(saved().feeObligationStartAt).toEqual(
      new Date('2026-03-01T00:00:00.000Z')
    );
  });

  it('탈퇴 회원의 탈퇴일을 지우면 거부한다', async () => {
    saved().status = 'LEFT';
    saved().leftAt = new Date('2026-05-01T00:00:00.000Z');

    const res = await patch({ leftAt: null });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('탈퇴월을 입력해주세요');
    expect(saved().leftAt).toEqual(new Date('2026-05-01T00:00:00.000Z'));
  });

  it('탈퇴 회원의 탈퇴일은 바꿀 수 있다', async () => {
    saved().status = 'LEFT';
    saved().leftAt = new Date('2026-07-01T00:00:00.000Z');

    const res = await patch({ leftAt: '2026-05-01T00:00:00.000Z' });

    expect(res.statusCode).toBe(200);
    expect(saved().leftAt).toEqual(new Date('2026-05-01T00:00:00.000Z'));
  });

  it('없는 회원은 404', async () => {
    const res = buildRes();
    await handler(
      {
        method: 'PATCH',
        query: { id: String(CLUB_ID), userId: '9999' },
        body: { position: '총무' },
      } as unknown as NextApiRequest,
      res as unknown as NextApiResponse
    );

    expect(res.statusCode).toBe(404);
    expect((res as unknown as { body: { error?: string } }).body.error).toBe(
      '회원을 찾을 수 없습니다'
    );
  });
});
