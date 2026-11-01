import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import indexHandler from '@/pages/api/clubs/[id]/membership-fee/exemptions';
import itemHandler from '@/pages/api/clubs/[id]/membership-fee/exemptions/[exemptionId]';

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
    { method, query: { id: String(CLUB_ID), ...query }, body } as never,
    res as unknown as NextApiResponse
  );
  return res as { statusCode: number; body: { error?: string } };
}

const register = (body: Record<string, unknown>) =>
  call(indexHandler as Handler, 'POST', {}, body);

const edit = (exemptionId: number, body: Record<string, unknown>) =>
  call(
    itemHandler as Handler,
    'PATCH',
    { exemptionId: String(exemptionId) },
    body
  );

const stored = () =>
  fakeDb.state.exemptions.map((e) => ({
    clubMemberId: e.clubMemberId,
    year: e.year,
    startMonth: e.startMonth,
    endMonth: e.endMonth,
    reason: e.reason,
  }));

beforeEach(() => {
  fakeDb.reset();
  fakeDb.addMember({ id: 1, name: '가나다' });
});

describe('POST exemptions — 면제 기간', () => {
  it('그 해 안의 시작 월~종료 월로 등록한다', async () => {
    const res = await register({
      clubMemberId: 1,
      year: 2026,
      startMonth: 4,
      endMonth: 12,
      reason: '임원',
    });

    expect(res.statusCode).toBe(201);
    expect(stored()).toEqual([
      {
        clubMemberId: 1,
        year: 2026,
        startMonth: 4,
        endMonth: 12,
        reason: '임원',
      },
    ]);
  });

  it('기간을 주지 않으면 1년 전체로 등록한다', async () => {
    await register({ clubMemberId: 1, year: 2026, reason: '임원' });

    expect(stored()[0]).toMatchObject({ startMonth: 1, endMonth: 12 });
  });

  it('종료 월이 시작 월보다 앞서면 등록하지 않는다', async () => {
    const res = await register({
      clubMemberId: 1,
      year: 2026,
      startMonth: 6,
      endMonth: 3,
      reason: '임원',
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('종료 월은 시작 월보다 앞설 수 없습니다');
    expect(stored()).toEqual([]);
  });
});

describe('PATCH exemptions/[exemptionId] — 기간·사유 수정', () => {
  beforeEach(() => {
    fakeDb.state.exemptions.push({
      id: 3,
      clubMemberId: 1,
      year: 2026,
      startMonth: 1,
      endMonth: 12,
      reason: '임원',
      createdById: 900,
    });
  });

  it('기간과 사유를 고친다', async () => {
    const res = await edit(3, { startMonth: 4, endMonth: 12, reason: '총무' });

    expect(res.statusCode).toBe(200);
    expect(stored()).toEqual([
      {
        clubMemberId: 1,
        year: 2026,
        startMonth: 4,
        endMonth: 12,
        reason: '총무',
      },
    ]);
  });

  it('종료 월이 시작 월보다 앞서면 고치지 않는다', async () => {
    const res = await edit(3, { startMonth: 6, endMonth: 3, reason: '임원' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('종료 월은 시작 월보다 앞설 수 없습니다');
    expect(stored()[0]).toMatchObject({ startMonth: 1, endMonth: 12 });
  });

  it('없는 면제면 404', async () => {
    const res = await edit(99, { startMonth: 4, endMonth: 12, reason: '임원' });

    expect(res.statusCode).toBe(404);
  });
});
