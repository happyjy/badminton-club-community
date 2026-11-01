import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import handler from '@/pages/api/clubs/[id]/membership-fee/unpaid';

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

async function unpaidNames(month: number) {
  const res = buildRes();
  await handler(
    {
      method: 'GET',
      query: { id: String(CLUB_ID), year: '2026', month: String(month) },
    } as unknown as NextApiRequest,
    res as unknown as NextApiResponse
  );
  const body = res.body as { data: { unpaidMembers: { name: string }[] } };
  return body.data.unpaidMembers.map((member) => member.name);
}

/**
 * 가나다: 일반 회원, 낸 달 없음
 * 나다라: 4월부터 면제 (연중에 임원이 됨), 낸 달 없음
 * 다라마: 1년 전체 면제
 */
beforeEach(() => {
  fakeDb.reset();
  // 테스트의 관리자 회원은 헷갈리지 않게 면제로 둔다
  fakeDb.state.exemptions.push({ clubMemberId: ADMIN_MEMBER_ID, year: 2026 });

  fakeDb.addMember({ id: 1, name: '가나다' });
  fakeDb.addMember({ id: 2, name: '나다라' });
  fakeDb.addMember({ id: 3, name: '다라마' });
  fakeDb.state.exemptions.push(
    { clubMemberId: 2, year: 2026, startMonth: 4, endMonth: 12 },
    { clubMemberId: 3, year: 2026, startMonth: 1, endMonth: 12 }
  );
});

describe('GET /api/clubs/[id]/membership-fee/unpaid', () => {
  it('면제 기간 앞의 달에 안 냈으면 미납 목록에 든다', async () => {
    expect(await unpaidNames(3)).toEqual(['가나다', '나다라']);
  });

  it('면제 기간의 달에는 미납 목록에 들지 않는다', async () => {
    expect(await unpaidNames(5)).toEqual(['가나다']);
  });
});
