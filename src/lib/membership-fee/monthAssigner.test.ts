import { describe, expect, it } from '@jest/globals';

import { assignMonths } from './monthAssigner';

type YM = { year: number; month: number };

const ALL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const in2026 = (...months: number[]): YM[] =>
  months.map((month) => ({ year: 2026, month }));

/** 5월 10일 거래, 2025~2027년 내내 의무, 납부 이력 없음 */
const input = (over: Partial<Parameters<typeof assignMonths>[0]> = {}) => ({
  monthCount: 1,
  hints: null,
  txDate: new Date(2026, 4, 10),
  obligationMonthsByYear: new Map([
    [2025, ALL],
    [2026, ALL],
    [2027, ALL],
  ]),
  paid: [] as YM[],
  ...over,
});

describe('assignMonths', () => {
  describe('월 힌트가 있을 때', () => {
    it('개월 수가 맞고 모두 미납 의무월이면 힌트대로 배정한다', () => {
      expect(
        assignMonths(
          input({
            monthCount: 2,
            hints: { source: 'depositorName', months: in2026(6, 7) },
          })
        )
      ).toEqual({
        selections: in2026(6, 7),
        usedHints: true,
        needsReview: false,
        reasons: [],
      });
    });

    it('전년의 밀린 달을 적은 힌트도 그대로 배정한다', () => {
      const december = [{ year: 2025, month: 12 }];

      expect(
        assignMonths(
          input({
            txDate: new Date(2026, 1, 13),
            hints: { source: 'memo', months: december },
          })
        )
      ).toMatchObject({ selections: december, usedHints: true });
    });

    it('힌트의 개월 수가 금액과 다르면 제안으로 배정하고 검토하게 한다', () => {
      const result = assignMonths(
        input({
          monthCount: 1,
          hints: { source: 'depositorName', months: in2026(6, 7) },
          paid: in2026(1, 2, 3, 4),
        })
      );

      expect(result).toMatchObject({
        selections: in2026(5),
        usedHints: false,
        needsReview: true,
      });
      expect(result.reasons[0]).toContain('월 힌트');
    });

    it('힌트의 달이 이미 납부됐으면 검토하게 한다', () => {
      const result = assignMonths(
        input({
          hints: { source: 'memo', months: in2026(4) },
          paid: in2026(1, 2, 3, 4),
        })
      );

      expect(result.needsReview).toBe(true);
      expect(result.reasons[0]).toContain('이미 납부');
      expect(result.selections).toEqual(in2026(5));
    });

    it('힌트의 달이 의무월이 아니면 검토하게 한다', () => {
      const result = assignMonths(
        input({
          hints: { source: 'memo', months: in2026(3) },
          obligationMonthsByYear: new Map([[2026, [4, 5, 6]]]),
        })
      );

      expect(result.needsReview).toBe(true);
      expect(result.reasons[0]).toContain('의무');
    });
  });

  describe('월 힌트가 없을 때', () => {
    it('그 해의 밀린 달부터 채운다', () => {
      expect(
        assignMonths(input({ monthCount: 3, paid: in2026(1, 2, 3) })).selections
      ).toEqual(in2026(4, 5, 6));
    });

    it('밀린 달이 없으면 거래월 다음 달로 넘어간다 (선납)', () => {
      expect(
        assignMonths(input({ paid: in2026(1, 2, 3, 4, 5) }))
      ).toMatchObject({ selections: in2026(6), needsReview: false });
    });

    it('연말에는 다음 해로 이어진다', () => {
      expect(
        assignMonths(
          input({
            monthCount: 2,
            txDate: new Date(2026, 11, 20),
            paid: in2026(...ALL.slice(0, 11)),
          })
        ).selections
      ).toEqual([
        { year: 2026, month: 12 },
        { year: 2027, month: 1 },
      ]);
    });

    it('휴회 등으로 의무가 없는 달은 건너뛴다', () => {
      expect(
        assignMonths(
          input({
            monthCount: 2,
            paid: in2026(1, 2, 3, 4),
            obligationMonthsByYear: new Map([[2026, [1, 2, 3, 4, 7, 8]]]),
          })
        ).selections
      ).toEqual(in2026(7, 8));
    });

    it('전년의 미납 달로는 거슬러 가지 않는다', () => {
      expect(
        assignMonths(input({ txDate: new Date(2026, 0, 5) })).selections
      ).toEqual(in2026(1));
    });

    it('이미 석 달 넘게 앞서 낸 회원의 입금은 검토하게 한다', () => {
      const result = assignMonths(
        input({ txDate: new Date(2026, 8, 20), paid: in2026(...ALL) })
      );

      expect(result.selections).toEqual([{ year: 2027, month: 1 }]);
      expect(result.needsReview).toBe(true);
      expect(result.reasons[0]).toContain('선납');
    });

    it('배정할 달이 모자라면 있는 만큼만 배정하고 검토하게 한다', () => {
      const result = assignMonths(
        input({
          monthCount: 3,
          obligationMonthsByYear: new Map([[2026, [5]]]),
        })
      );

      expect(result.selections).toEqual(in2026(5));
      expect(result.needsReview).toBe(true);
      expect(result.reasons[0]).toContain('모자');
    });
  });

  it('개월 수가 0이면 아무 달도 배정하지 않는다', () => {
    expect(assignMonths(input({ monthCount: 0 }))).toEqual({
      selections: [],
      usedHints: false,
      needsReview: false,
      reasons: [],
    });
  });
});
