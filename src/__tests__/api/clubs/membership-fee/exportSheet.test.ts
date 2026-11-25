/**
 * 납부현황 이미지 내보내기가 쓰는 표 모델 API.
 * 엑셀 내보내기(export.test.ts)와 같은 순서로 주되, 탈퇴 회원은 싣지 않는다 (카톡방은 지금 회원만 본다).
 */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

import type { FeeStatusSheetResponse } from '@/lib/membership-fee/feeStatusSheet';
import handler from '@/pages/api/clubs/[id]/membership-fee/export-sheet';

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

type Result = {
  statusCode: number;
  body: {
    data?: { sheet: FeeStatusSheetResponse };
    error?: string;
    status: number;
  };
};

async function sheetOf(year?: string, method = 'GET'): Promise<Result> {
  const res = buildRes();
  await handler(
    {
      method,
      query: { id: String(CLUB_ID), ...(year ? { year } : {}) },
    } as unknown as NextApiRequest,
    res as unknown as NextApiResponse
  );
  return res as unknown as Result;
}

/** export.test.ts와 같은 회원: 나회장(직책) · 가나다 · 다음해(2027부터) · 라탈퇴(2026.02) · 마옛날(2025 탈퇴) */
beforeEach(() => {
  mockUserId = ADMIN_USER_ID;
  fakeDb.reset();
  fakeDb.state.members.length = 0;
  fakeDb.state.members.push({
    id: 900,
    clubId: CLUB_ID,
    userId: ADMIN_USER_ID,
    role: 'ADMIN',
    status: 'APPROVED',
    name: '나회장',
    feeObligationStartAt: new Date(2025, 0, 1),
    leftAt: null,
    position: '회장',
    positionOrder: 1,
    feeExcluded: false,
  });
  fakeDb.addMember({ id: 1, name: '가나다' });
  fakeDb.addMember({
    id: 2,
    name: '다음해',
    feeObligationStartAt: new Date(2027, 0, 1),
  });
  fakeDb.addMember({
    id: 3,
    name: '라탈퇴',
    status: 'LEFT',
    leftAt: new Date(2026, 1, 20),
  });
  fakeDb.addMember({
    id: 4,
    name: '마옛날',
    status: 'LEFT',
    leftAt: new Date(2025, 5, 1),
  });
  fakeDb.addPayment({ clubMemberId: 1, year: 2026, month: 1 });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('GET /api/clubs/[id]/membership-fee/export-sheet', () => {
  it('엑셀과 같은 순서로 지금 회원만 준다 (탈퇴 회원은 이미지에 싣지 않는다)', async () => {
    const res = await sheetOf('2026');

    expect(res.statusCode).toBe(200);
    expect(res.body.data?.sheet.rows.map((row) => [row.no, row.name])).toEqual([
      [1, '나회장'],
      [2, '가나다'],
    ]);
    expect(res.body.data?.sheet.rows[0].remark).toBe('회장');
    expect(res.body.data?.sheet.rows[1].cells[0]).toBe('PAID');
  });

  it('탈퇴 회원이 빠지므로 마지막 회원 아래에 굵은 선을 긋지 않는다', async () => {
    const res = await sheetOf('2026');

    // 나회장은 직책 묶음의 끝이라 굵은 선, 가나다는 표의 끝이라 가는 선
    expect(res.body.data?.sheet.rows.map((row) => row.thickBottom)).toEqual([
      true,
      false,
    ]);
  });

  it('회비 대상 아님 회원은 싣지 않는다', async () => {
    fakeDb.addMember({ id: 6, name: '바코치', feeExcluded: true });

    const res = await sheetOf('2026');

    const names = res.body.data?.sheet.rows.map((row) => row.name);
    expect(names).not.toContain('바코치');
    expect(names).toContain('가나다');
  });

  it('반영일과 파일 날짜는 한국 날짜다', async () => {
    // 한국 시각으로 11월 26일 01:30
    jest.useFakeTimers({ now: new Date('2026-11-25T16:30:00Z') });

    const res = await sheetOf('2026');

    expect(res.body.data?.sheet).toMatchObject({
      year: 2026,
      asOf: '2026-11-26',
      stamp: '20261126',
    });
  });

  it('연도를 주지 않으면 한국 기준 올해다', async () => {
    jest.useFakeTimers({ now: new Date('2026-12-31T16:00:00Z') });

    const res = await sheetOf();

    expect(res.body.data?.sheet.year).toBe(2027);
  });

  it.each(['abc', '1999', '2026.5'])(
    '연도가 올바르지 않으면 거부한다: %s',
    async (year) => {
      const res = await sheetOf(year);

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({
        error: '연도가 올바르지 않습니다',
        status: 400,
      });
    }
  );

  it('관리자가 아니면 403', async () => {
    mockUserId = 12345;

    const res = await sheetOf('2026');

    expect(res.statusCode).toBe(403);
  });

  it('GET이 아니면 405', async () => {
    const res = await sheetOf('2026', 'POST');

    expect(res.statusCode).toBe(405);
  });
});
