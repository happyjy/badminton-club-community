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
