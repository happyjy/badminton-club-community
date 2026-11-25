import { describe, expect, it } from '@jest/globals';

import {
  argbToCss,
  buildFeeStatusSheet,
  paginateFeeStatusSheet,
  type FeeStatusSheetRow,
} from './feeStatusSheet';
import {
  buildMemberYearStatus,
  type MemberYearInput,
} from './memberYearStatus';

/** 2026년 11월 26일에 내보낸다 */
const today = new Date(2026, 10, 26);

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
      exemptMonths: [],
      isCouple: false,
      couplePartnerName: null,
      leavePeriods: [],
      paidMonths: new Set([1, 2, 3]),
      ...over,
    },
    today
  );

const ROWS = [
  member({ id: 3, name: '다마바', isCouple: true, couplePartnerName: '하하' }),
  member({
    id: 1,
    name: '가나다',
    position: '총무',
    positionOrder: 2,
    isCouple: true,
    couplePartnerName: '호호',
  }),
  member({ id: 2, name: '나회장', position: '회장', positionOrder: 1 }),
  member({
    id: 4,
    name: '라탈퇴',
    status: 'LEFT',
    leftAt: new Date(2026, 1, 20),
  }),
];

describe('buildFeeStatusSheet', () => {
  it('직책 회원을 정렬 순서대로 먼저, 나머지는 가나다순, 탈퇴 회원은 맨 아래에 "탈퇴"로', () => {
    const sheet = buildFeeStatusSheet(ROWS);

    expect(sheet.map((row) => [row.no, row.name])).toEqual([
      [1, '나회장'],
      [2, '가나다'],
      [3, '다마바'],
      ['탈퇴', '라탈퇴'],
    ]);
  });

  it('비고는 직책·부부를 잇고, 탈퇴 회원은 탈퇴만 적는다', () => {
    const sheet = buildFeeStatusSheet(ROWS);

    expect(sheet.map((row) => row.remark)).toEqual([
      '회장',
      '총무 · 부부',
      '부부',
      '2026.02 탈퇴',
    ]);
  });

  it('직책 묶음 끝과 활동 회원 끝에 굵은 선', () => {
    const sheet = buildFeeStatusSheet(ROWS);

    expect(sheet.map((row) => row.thickBottom)).toEqual([
      false,
      true,
      true,
      false,
    ]);
  });

  it('탈퇴 회원이 없으면 마지막 활동 회원에 굵은 선을 긋지 않는다', () => {
    const sheet = buildFeeStatusSheet([
      member({ id: 1 }),
      member({ id: 2, name: '나다라' }),
    ]);

    expect(sheet.map((row) => row.thickBottom)).toEqual([false, false]);
  });

  it('칸 상태를 1월부터 12월까지 싣는다', () => {
    const [row] = buildFeeStatusSheet([member()]);

    expect(row.cells).toHaveLength(12);
    expect(row.cells[0]).toBe('PAID');
    expect(row.cells[3]).toBe('UNPAID');
    expect(row.cells[11]).toBe('FUTURE');
  });
});

describe('buildFeeStatusSheet — 병가', () => {
  it('병가 칸은 상태만 싣고 사유는 싣지 않는다', () => {
    const [row] = buildFeeStatusSheet([
      member({
        leavePeriods: [
          {
            startYear: 2026,
            startMonth: 3,
            endYear: 2026,
            endMonth: 4,
            reason: '출산',
          },
        ],
      }),
    ]);

    expect(row.cells[2]).toBe('LEAVE');
    expect(JSON.stringify(row)).not.toContain('출산');
  });
});

describe('paginateFeeStatusSheet', () => {
  const rows = (count: number): FeeStatusSheetRow[] =>
    Array.from({ length: count }, (_, index) => ({
      no: index + 1,
      name: `회원${index + 1}`,
      cells: Array(12).fill('PAID'),
      remark: '',
      thickBottom: false,
    }));

  it('40명은 1장, 41명은 2장(40·1), 0명은 빈 1장', () => {
    expect(paginateFeeStatusSheet(rows(40)).map((page) => page.length)).toEqual(
      [40]
    );
    expect(paginateFeeStatusSheet(rows(41)).map((page) => page.length)).toEqual(
      [40, 1]
    );
    expect(paginateFeeStatusSheet([])).toEqual([[]]);
  });

  it('장마다 줄 순서를 그대로 둔다', () => {
    const pages = paginateFeeStatusSheet(rows(81));

    expect(pages.map((page) => page.length)).toEqual([40, 40, 1]);
    expect(pages[1][0].name).toBe('회원41');
    expect(pages[2][0].name).toBe('회원81');
  });
});

describe('argbToCss', () => {
  it('ARGB를 CSS 색으로 바꾼다', () => {
    expect(argbToCss('FFFFF2CC')).toBe('#FFF2CC');
  });
});
