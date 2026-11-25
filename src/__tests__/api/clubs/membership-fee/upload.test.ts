import fs from 'fs';

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as XLSX from 'xlsx';

import handler from '@/pages/api/clubs/[id]/membership-fee/upload';

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

const UPLOAD_PATH = '/tmp/fee-upload-test.xlsx';
jest.mock('formidable', () => ({
  __esModule: true,
  default: () => ({
    parse: async () => [
      {},
      {
        file: [
          {
            filepath: '/tmp/fee-upload-test.xlsx',
            originalFilename: '회비통장.xlsx',
          },
        ],
      },
    ],
  }),
}));

type SheetRow = [string, string, string, string, string, string, string];

/** [거래일시, 내용(입금자명), 금액, 거래구분?, 메모?] 로 통장 엑셀을 만든다 */
function workbook(rows: [string, string, number, string?, string?][]): Buffer {
  const header: SheetRow = [
    '거래일시',
    '구분',
    '거래금액',
    '거래 후 잔액',
    '거래구분',
    '내용',
    '메모',
  ];
  const body = rows.map(
    ([at, name, amount, type = '일반입금', memo = '']): SheetRow => [
      at,
      '입금',
      amount.toLocaleString('en-US'),
      '0',
      type,
      name,
      memo,
    ]
  );
  const sheet = XLSX.utils.aoa_to_sheet([
    ['카카오뱅크 거래내역'],
    header,
    ...body,
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, '거래내역');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

let uploaded: Buffer;
const realReadFileSync = fs.readFileSync;
const realUnlinkSync = fs.unlinkSync;

async function upload(rows: [string, string, number, string?, string?][]) {
  uploaded = workbook(rows);
  const res = buildRes();
  await handler(
    {
      method: 'POST',
      query: { id: String(CLUB_ID) },
    } as unknown as NextApiRequest,
    res as unknown as NextApiResponse
  );
  return res as {
    statusCode: number;
    body: {
      error?: string;
      message?: string;
      data: {
        batch: { id: string; recordCount: number };
        records: Record<string, unknown>[];
        duplicates: { depositorName: string }[];
        summary: Record<string, unknown>;
      };
    };
  };
}

beforeEach(() => {
  mockUserId = ADMIN_USER_ID;
  fakeDb.reset();
  fakeDb.addMember({ id: 1, name: '가나다' });
  fakeDb.addMember({ id: 2, name: '마바사' });
  // 1~4월은 이미 냈다
  for (const clubMemberId of [1, 2]) {
    for (const month of [1, 2, 3, 4]) {
      fakeDb.addPayment({ clubMemberId, year: 2026, month });
    }
  }

  jest
    .spyOn(fs, 'readFileSync')
    .mockImplementation(((path, ...rest) =>
      path === UPLOAD_PATH
        ? uploaded
        : (realReadFileSync as (...args: unknown[]) => unknown)(
            path,
            ...rest
          )) as typeof fs.readFileSync);
  jest.spyOn(fs, 'unlinkSync').mockImplementation(((path) => {
    if (path !== UPLOAD_PATH) realUnlinkSync(path);
  }) as typeof fs.unlinkSync);
});

describe('POST /api/clubs/[id]/membership-fee/upload', () => {
  it('회비 입금을 회원에 매칭해 저장하고, 배정할 달을 함께 돌려준다', async () => {
    const res = await upload([['2026.05.03 10:00:00', '가나다5월', 25000]]);

    expect(res.statusCode).toBe(200);
    const [saved] = fakeDb.state.records;
    expect(saved).toMatchObject({
      clubId: CLUB_ID,
      depositorName: '가나다5월',
      amount: 25000,
      kind: 'FEE',
      status: 'MATCHED',
      matchedMemberId: 1,
      errorReason: null,
      needsReview: false,
      monthHints: {
        source: 'depositorName',
        months: [{ year: 2026, month: 5 }],
      },
    });
    expect(fakeDb.state.matched).toMatchObject([
      { paymentRecordId: saved.id, clubMemberId: 1 },
    ]);
    expect(res.body.data.batch.recordCount).toBe(1);
    expect(res.body.data.records[0]).toMatchObject({
      id: saved.id,
      suggestedSelections: [{ year: 2026, month: 5 }],
      needsReview: false,
    });
  });

  it('행사·이자는 건너뜀으로, 회원을 못 찾은 회비는 대기로 저장한다', async () => {
    await upload([
      ['2026.05.03 10:00:00', '가나다단체티', 20000],
      ['2026.05.22 09:00:00', '입출금통장 이자', 377, '예금이자'],
      ['2026.05.04 10:00:00', '모르는이', 25000],
    ]);

    const byName = (name: string) =>
      fakeDb.state.records.find((r) => r.depositorName === name);
    expect(byName('가나다단체티')).toMatchObject({
      kind: 'EVENT',
      status: 'SKIPPED',
      matchedMemberId: null,
    });
    expect(byName('입출금통장 이자')).toMatchObject({
      kind: 'INTEREST',
      status: 'SKIPPED',
    });
    expect(byName('모르는이')).toMatchObject({
      kind: 'FEE',
      status: 'PENDING',
      errorReason: '회원 매칭 실패',
    });
    expect(fakeDb.state.matched).toHaveLength(0);
  });

  it('이름이 한 글자 다른 매칭은 회원 확인이 필요하다고 저장한다', async () => {
    const res = await upload([['2026.05.03 10:00:00', '가나라', 25000]]);

    expect(fakeDb.state.records[0]).toMatchObject({
      status: 'MATCHED',
      matchedMemberId: 1,
      needsReview: true,
    });
    expect(res.body.data.records[0].needsReview).toBe(true);
  });

  it('분류·상태별 건수와 바로 확정할 수 있는 건수를 요약한다', async () => {
    const res = await upload([
      ['2026.05.03 10:00:00', '가나다5월', 25000],
      ['2026.05.03 11:00:00', '마바사', 20000],
      ['2026.05.03 12:00:00', '가나다단체티', 20000],
      ['2026.05.04 10:00:00', '모르는이', 25000],
    ]);

    expect(res.body.data.summary).toMatchObject({
      total: 4,
      fee: 3,
      event: 1,
      matched: 2,
      pending: 1,
      error: 0,
      needsReview: 1,
      confirmable: 1,
      duplicates: 0,
      ratesFallback: [],
    });
  });

  describe('이미 올라온 거래', () => {
    it('겹치는 거래는 빼고 새 거래만 저장한다', async () => {
      await upload([['2026.05.03 10:00:00', '가나다5월', 25000]]);

      const res = await upload([
        ['2026.05.03 10:00:00', '가나다5월', 25000],
        ['2026.06.03 10:00:00', '가나다6월', 25000],
      ]);

      expect(res.statusCode).toBe(200);
      expect(fakeDb.state.records.map((r) => r.depositorName)).toEqual([
        '가나다5월',
        '가나다6월',
      ]);
      expect(res.body.data.batch.recordCount).toBe(1);
      expect(res.body.data.summary.duplicates).toBe(1);
      expect(res.body.data.duplicates[0].depositorName).toBe('가나다5월');
      expect(res.body.message).toContain('이미 올라온 1건');
    });

    it('전부 이미 올라온 파일이면 배치를 만들지 않고 알린다', async () => {
      await upload([['2026.05.03 10:00:00', '가나다5월', 25000]]);

      const res = await upload([['2026.05.03 10:00:00', '가나다5월', 25000]]);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('이미 올라와 있습니다');
      expect(fakeDb.state.batches).toHaveLength(1);
      expect(fakeDb.state.records).toHaveLength(1);
    });
  });

  describe('단가 설정', () => {
    it('어느 해의 단가도 없으면 아무것도 저장하지 않고 설정을 요구한다', async () => {
      fakeDb.state.feeTypes.length = 0;

      const res = await upload([['2026.05.03 10:00:00', '가나다5월', 25000]]);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('2026년 회비 설정이 필요합니다');
      expect(fakeDb.state.batches).toHaveLength(0);
    });

    it('거래 연도의 단가가 없으면 직전 연도 단가로 판정하고 그 사실을 알린다', async () => {
      const res = await upload([['2027.01.03 10:00:00', '가나다1월', 25000]]);

      expect(res.statusCode).toBe(200);
      expect(fakeDb.state.records[0]).toMatchObject({ status: 'MATCHED' });
      expect(res.body.data.summary.ratesFallback).toEqual([
        { year: 2027, usedYear: 2026 },
      ]);
    });
  });

  it('입금 행이 없는 파일은 거부한다', async () => {
    const res = await upload([]);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('입금 내역이 없습니다');
  });

  it('관리자가 아니면 거부한다', async () => {
    mockUserId = 12345;

    const res = await upload([['2026.05.03 10:00:00', '가나다5월', 25000]]);

    expect(res.statusCode).toBe(403);
    expect(fakeDb.state.records).toHaveLength(0);
  });
});
