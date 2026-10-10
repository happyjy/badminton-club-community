import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import ExcelJS from 'exceljs';

import handler from '@/pages/api/clubs/[id]/membership-fee/export';

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

async function exportYear(year?: string, method = 'GET') {
  const res = buildRes();
  await handler(
    {
      method,
      query: { id: String(CLUB_ID), ...(year ? { year } : {}) },
    } as unknown as NextApiRequest,
    res as unknown as NextApiResponse
  );
  return res;
}

async function namesIn(buffer: unknown) {
  const workbook = new ExcelJS.Workbook();
  // exceljs는 자체 Buffer 타입을 쓴다
  await workbook.xlsx.load(buffer as Parameters<typeof workbook.xlsx.load>[0]);
  const sheet = workbook.worksheets[0];
  const names: unknown[] = [];
  for (let row = 5; row <= sheet.rowCount; row++) {
    names.push(sheet.getRow(row).getCell(2).value);
  }
  return { sheet, names };
}

/**
 * 가나다: 일반 회원 / 나회장: 직책 있음 / 다음해: 2027년부터 의무
 * 라탈퇴: 2026년 2월 탈퇴 / 마옛날: 2025년에 탈퇴
 */
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

describe('GET /api/clubs/[id]/membership-fee/export', () => {
  it('그 해 납부현황을 엑셀 파일로 내려 준다', async () => {
    const res = await exportYear('2026');

    expect(res.statusCode).toBe(200);
    expect(res.headers['Content-Type']).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    expect(decodeURIComponent(res.headers['Content-Disposition'])).toMatch(
      /^attachment; filename\*=UTF-8''회비납부현황_2026_\d{8}\.xlsx$/
    );
    const { sheet } = await namesIn(res.body);
    expect(sheet.getCell('A1').value).toBe('2026년 월회비 납부현황');
  });

  it('그 해에 회비 의무가 있었던 회원만, 직책 → 가나다 → 탈퇴 순으로 싣는다', async () => {
    const res = await exportYear('2026');

    const { names } = await namesIn(res.body);
    // '다음해'(내년부터 의무)와 '마옛날'(작년에 탈퇴)은 빠진다
    expect(names).toEqual(['나회장', '가나다', '라탈퇴']);
  });

  it('연도를 주지 않으면 올해 현황이다', async () => {
    const res = await exportYear();

    const { sheet } = await namesIn(res.body);
    expect(String(sheet.getCell('A1').value)).toMatch(
      /^\d{4}년 월회비 납부현황$/
    );
  });

  it.each(['abc', '1999', '2026.5'])(
    '연도가 올바르지 않으면 거부한다: %s',
    async (year) => {
      const res = await exportYear(year);

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({
        error: '연도가 올바르지 않습니다',
        status: 400,
      });
    }
  );

  it('관리자가 아니면 거부한다', async () => {
    mockUserId = 12345;

    const res = await exportYear('2026');

    expect(res.statusCode).toBe(403);
  });

  it('GET이 아니면 거부한다', async () => {
    const res = await exportYear('2026', 'POST');

    expect(res.statusCode).toBe(405);
  });
});
