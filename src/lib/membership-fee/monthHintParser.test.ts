import { describe, expect, it } from '@jest/globals';

import { parseMonthHints, pickMonthHints } from './monthHintParser';

type YM = { year: number; month: number };

const tx = (month: number, day = 10) => new Date(2026, month - 1, day);
const in2026 = (...months: number[]): YM[] =>
  months.map((month) => ({ year: 2026, month }));

describe('parseMonthHints', () => {
  it.each<[string, Date, YM[]]>([
    ['가나다3월', tx(3), in2026(3)],
    ['가나다 1,2월', tx(2), in2026(1, 2)],
    ['가나다1/2월', tx(2), in2026(1, 2)],
    ['가나다1월2월', tx(2), in2026(1, 2)],
    ['6~9월', tx(6), in2026(6, 7, 8, 9)],
    ['6-9월', tx(6), in2026(6, 7, 8, 9)],
    ['가나다1월-4월', tx(3), in2026(1, 2, 3, 4)],
    ['5월~10월', tx(7), in2026(5, 6, 7, 8, 9, 10)],
    ['6~12월회비', tx(6), in2026(6, 7, 8, 9, 10, 11, 12)],
    ['3,4,5월회비', tx(5), in2026(3, 4, 5)],
    ['가나다45월회비', tx(4), in2026(4, 5)],
    ['26.3월가나다', tx(2, 27), in2026(3)],
    ['가나다. 6회비', tx(5, 31), in2026(6)],
    // 선납: 거래월 뒤의 가까운 달은 당해
    ['가나다 5월', tx(4, 29), in2026(5)],
    ['가나다10,11월', tx(8, 31), in2026(10, 11)],
  ])('%s', (text, date, expected) => {
    expect(parseMonthHints(text, date)).toEqual(expected);
  });

  it('연도 경계: 1월 거래의 "12월1월"은 전년 12월과 당해 1월이다', () => {
    expect(parseMonthHints('가나다 12월1월', tx(1, 14))).toEqual([
      { year: 2025, month: 12 },
      { year: 2026, month: 1 },
    ]);
  });

  it('밀린 달: 2월 거래의 "12월회비"·"11,12월회비"는 전년이다', () => {
    expect(parseMonthHints('12월회비', tx(2))).toEqual([
      { year: 2025, month: 12 },
    ]);
    expect(parseMonthHints('11,12월회비', tx(2))).toEqual([
      { year: 2025, month: 11 },
      { year: 2025, month: 12 },
    ]);
  });

  it('연말 선납: 12월 거래의 "1,2월"은 다음 해다', () => {
    expect(parseMonthHints('가나다1,2월', tx(12, 28))).toEqual([
      { year: 2027, month: 1 },
      { year: 2027, month: 2 },
    ]);
  });

  it.each(['가나다', '가나다03', '13월', '0월', '', '가나다86마바사회비'])(
    '월로 읽을 수 없으면 빈 배열: %s',
    (text) => {
      expect(parseMonthHints(text, tx(3))).toEqual([]);
    }
  );

  it('같은 달이 두 번 적혀도 한 번만 싣는다', () => {
    expect(parseMonthHints('3월 가나다 3월', tx(3))).toEqual(in2026(3));
  });
});

describe('pickMonthHints', () => {
  it('메모에 월이 있으면 메모를 우선한다', () => {
    expect(pickMonthHints('12월가나다', '1월', tx(1))).toEqual({
      source: 'memo',
      months: in2026(1),
    });
  });

  it('메모에 월이 없으면 입금자명에서 읽는다', () => {
    expect(pickMonthHints('가나다3월', '최종', tx(3))).toEqual({
      source: 'depositorName',
      months: in2026(3),
    });
  });

  it('둘 다 없으면 null', () => {
    expect(pickMonthHints('가나다', null, tx(3))).toBeNull();
  });
});
