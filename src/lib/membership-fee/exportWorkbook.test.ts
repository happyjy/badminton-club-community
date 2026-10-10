import { describe, expect, it } from '@jest/globals';
import ExcelJS from 'exceljs';

import { buildFeeStatusWorkbook, CELL_FILL } from './exportWorkbook';
import {
  buildMemberYearStatus,
  type MemberYearInput,
} from './memberYearStatus';

/** 2026년 4월 20일에 내보낸다 */
const asOf = new Date(2026, 3, 20);

const member = (over: Partial<MemberYearInput> = {}) =>
  buildMemberYearStatus(
    2026,
    {
      id: 1,
      userId: 1,
      name: '가나다',
      status: 'APPROVED',
      feeObligationStartAt: new Date(2025, 0, 1),
      leftAt: null,
      position: null,
      positionOrder: null,
      isExempt: false,
      isCouple: false,
      couplePartnerName: null,
      leavePeriods: [],
      paidMonths: new Set([1, 2, 3]),
      ...over,
    },
    asOf
  );

async function sheetOf(rows: ReturnType<typeof member>[]) {
  const buffer = await buildFeeStatusWorkbook({ year: 2026, asOf, rows });
  const workbook = new ExcelJS.Workbook();
  // exceljs는 자체 Buffer 타입을 쓴다
  await workbook.xlsx.load(
    buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]
  );
  return workbook.worksheets[0];
}

const fillOf = (cell: ExcelJS.Cell) =>
  (cell.fill as ExcelJS.FillPattern | undefined)?.fgColor?.argb;
/** 1월은 C열(3번째)이다 */
const monthCell = (row: ExcelJS.Row, month: number) => row.getCell(2 + month);
const DATA_START = 5;

describe('buildFeeStatusWorkbook', () => {
  it('제목·반영일·범례·머리글을 재무의 납부현황표와 같은 자리에 둔다', async () => {
    const sheet = await sheetOf([member()]);

    expect(sheet.name).toBe('2026년 납부현황');
    expect(sheet.getCell('A1').value).toBe('2026년 월회비 납부현황');
    expect(sheet.getCell('O2').value).toBe('반영일 : 2026.4.20');

    const legend = sheet.getRow(3);
    expect(
      [6, 8, 10, 12, 14].map((column) => legend.getCell(column).value)
    ).toEqual(['완납', '미납', '면제', '병가', '해당없음']);
    expect(
      [7, 9, 11, 13, 15].map((column) => fillOf(legend.getCell(column)))
    ).toEqual([
      CELL_FILL.PAID,
      CELL_FILL.UNPAID,
      CELL_FILL.EXEMPT,
      CELL_FILL.LEAVE,
      CELL_FILL.NONE,
    ]);

    const header = sheet.getRow(4);
    expect(header.getCell(1).value).toBe('NO');
    expect(header.getCell(2).value).toBe('성명');
    expect(header.getCell(3).value).toBe('1월');
    expect(header.getCell(14).value).toBe('12월');
    expect(header.getCell(15).value).toBe('비고');
  });

  it('회원마다 번호·이름을 쓰고 달 칸을 상태 색으로 칠한다', async () => {
    const sheet = await sheetOf([member()]);
    const row = sheet.getRow(DATA_START);

    expect(row.getCell(1).value).toBe(1);
    expect(row.getCell(2).value).toBe('가나다');
    expect(fillOf(monthCell(row, 1))).toBe(CELL_FILL.PAID);
    expect(fillOf(monthCell(row, 3))).toBe(CELL_FILL.PAID);
    // 4월: 이번 달인데 안 냈다
    expect(fillOf(monthCell(row, 4))).toBe(CELL_FILL.UNPAID);
    // 5월부터는 아직 오지 않았다 → 칠하지 않는다
    expect(fillOf(monthCell(row, 5))).toBeUndefined();
    expect(monthCell(row, 5).value).toBeNull();
  });

  it('면제·병가·해당없음을 각자의 색으로 칠한다', async () => {
    const sheet = await sheetOf([
      member({ id: 1, name: '가', isExempt: true, paidMonths: new Set() }),
      member({
        id: 2,
        name: '나',
        feeObligationStartAt: new Date(2026, 2, 1),
        paidMonths: new Set([3]),
        leavePeriods: [
          { startYear: 2026, startMonth: 4, endYear: 2026, endMonth: 6 },
        ],
      }),
    ]);

    const exempt = sheet.getRow(DATA_START);
    expect(fillOf(monthCell(exempt, 1))).toBe(CELL_FILL.EXEMPT);
    expect(fillOf(monthCell(exempt, 4))).toBe(CELL_FILL.EXEMPT);
    expect(fillOf(monthCell(exempt, 5))).toBeUndefined();

    const joinedInMarch = sheet.getRow(DATA_START + 1);
    expect(fillOf(monthCell(joinedInMarch, 1))).toBe(CELL_FILL.NONE);
    expect(fillOf(monthCell(joinedInMarch, 3))).toBe(CELL_FILL.PAID);
    expect(fillOf(monthCell(joinedInMarch, 4))).toBe(CELL_FILL.LEAVE);
    // 병가는 아직 오지 않은 달도 칠한다
    expect(fillOf(monthCell(joinedInMarch, 6))).toBe(CELL_FILL.LEAVE);
  });

  it('병가 사유는 이어진 병가의 첫 달 칸에 한 번만 적는다', async () => {
    const sheet = await sheetOf([
      member({
        paidMonths: new Set(),
        leavePeriods: [
          {
            startYear: 2026,
            startMonth: 1,
            endYear: 2026,
            endMonth: 3,
            reason: '무릎 부상',
          },
        ],
      }),
    ]);
    const row = sheet.getRow(DATA_START);

    expect(monthCell(row, 1).value).toBe('무릎 부상');
    expect(monthCell(row, 2).value).toBeNull();
    expect(monthCell(row, 3).value).toBeNull();
  });

  it('직책이 있는 회원을 먼저 쓰고 비고에 직책을 적으며, 그 아래에 굵은 선을 긋는다', async () => {
    const sheet = await sheetOf([
      member({ id: 1, name: '다라마' }),
      member({ id: 2, name: '가나다' }),
      member({ id: 3, name: '하하하', position: '총무', positionOrder: 2 }),
      member({ id: 4, name: '파파파', position: '회장', positionOrder: 1 }),
    ]);
    const names = [0, 1, 2, 3].map(
      (offset) => sheet.getRow(DATA_START + offset).getCell(2).value
    );

    expect(names).toEqual(['파파파', '하하하', '가나다', '다라마']);
    expect(sheet.getRow(DATA_START).getCell(15).value).toBe('회장');
    expect(sheet.getRow(DATA_START + 2).getCell(15).value).toBeNull();
    // 번호는 위에서부터 이어서 매긴다
    expect(sheet.getRow(DATA_START + 3).getCell(1).value).toBe(4);
    expect(sheet.getRow(DATA_START + 1).getCell(2).border?.bottom?.style).toBe(
      'medium'
    );
    expect(sheet.getRow(DATA_START).getCell(2).border?.bottom?.style).toBe(
      'thin'
    );
  });

  it('탈퇴 회원은 활동 회원 아래에 따로 모아 쓴다', async () => {
    const sheet = await sheetOf([
      member({
        id: 1,
        name: '가탈퇴',
        status: 'LEFT',
        leftAt: new Date(2026, 1, 20),
        paidMonths: new Set([1, 2]),
      }),
      member({ id: 2, name: '하하하' }),
    ]);

    expect(sheet.getRow(DATA_START).getCell(2).value).toBe('하하하');
    const left = sheet.getRow(DATA_START + 1);
    expect(left.getCell(1).value).toBe('탈퇴');
    expect(left.getCell(2).value).toBe('가탈퇴');
    expect(fillOf(monthCell(left, 2))).toBe(CELL_FILL.PAID);
    expect(fillOf(monthCell(left, 3))).toBe(CELL_FILL.NONE);
    expect(left.getCell(15).value).toBe('2026.02 탈퇴');
  });

  it('회원이 없어도 머리글까지는 만든다', async () => {
    const sheet = await sheetOf([]);

    expect(sheet.getRow(4).getCell(2).value).toBe('성명');
    expect(sheet.getRow(DATA_START).getCell(2).value).toBeNull();
  });

  it('인쇄할 때 쪽마다 범례와 머리글이 반복되게 한다', async () => {
    const sheet = await sheetOf([member()]);

    expect(sheet.pageSetup.printTitlesRow).toBe('3:4');
    expect(sheet.pageSetup.fitToWidth).toBe(1);
  });
});
