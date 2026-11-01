import { describe, it, expect } from '@jest/globals';

import {
  getFirstObligationMonth,
  isMonthObligated,
  obligationMonthCount,
  getObligationMonths,
  isMonthInLeave,
  getNextObligatedMonth,
  explainNextObligatedMonth,
  type LeavePeriod,
} from './feeObligation';

describe('feeObligation', () => {
  describe('getFirstObligationMonth', () => {
    it('시작일이 속한 월이 첫 의무월 (일자 무관)', () => {
      expect(getFirstObligationMonth(2025, new Date('2025-03-01'))).toBe(3);
      expect(getFirstObligationMonth(2025, new Date('2025-03-15'))).toBe(3);
      expect(getFirstObligationMonth(2025, new Date('2025-03-21'))).toBe(3);
      expect(getFirstObligationMonth(2025, new Date('2025-03-31'))).toBe(3);
    });

    it('당해 연도 이전 가입 시 1월부터', () => {
      expect(getFirstObligationMonth(2025, new Date('2024-06-01'))).toBe(1);
    });

    it('당해 연도 이후 가입 시 null', () => {
      expect(getFirstObligationMonth(2025, new Date('2026-01-01'))).toBe(null);
    });

    it('null 시작일 시 1월 (하위 호환)', () => {
      expect(getFirstObligationMonth(2025, null)).toBe(1);
    });
  });

  describe('isMonthObligated', () => {
    it('3월 시작 시 3월 미의무 전, 3월부터 의무', () => {
      const start = new Date('2025-03-15');
      expect(isMonthObligated(2025, 2, start)).toBe(false);
      expect(isMonthObligated(2025, 3, start)).toBe(true);
      expect(isMonthObligated(2025, 4, start)).toBe(true);
    });

    it('null 시 전 월 의무', () => {
      expect(isMonthObligated(2025, 1, null)).toBe(true);
      expect(isMonthObligated(2025, 12, null)).toBe(true);
    });
  });

  describe('obligationMonthCount', () => {
    it('3월부터 의무 시 10개월', () => {
      expect(obligationMonthCount(2025, new Date('2025-03-01'))).toBe(10);
    });

    it('4월부터 의무 시 9개월', () => {
      expect(obligationMonthCount(2025, new Date('2025-04-15'))).toBe(9);
    });

    it('null 시 12개월', () => {
      expect(obligationMonthCount(2025, null)).toBe(12);
    });
  });

  describe('getObligationMonths', () => {
    it('4월부터 의무 시 [4,5,...,12]', () => {
      const months = getObligationMonths(2025, new Date('2025-04-01'));
      expect(months).toEqual([4, 5, 6, 7, 8, 9, 10, 11, 12]);
    });

    it('null 시 1~12', () => {
      const months = getObligationMonths(2025, null);
      expect(months).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    });
  });

  describe('휴회 기간 반영', () => {
    const leaveMarToMay: LeavePeriod = {
      startYear: 2025,
      startMonth: 3,
      endYear: 2025,
      endMonth: 5,
    };

    describe('isMonthInLeave', () => {
      it('시작~종료 구간 안이면 true', () => {
        expect(isMonthInLeave(2025, 2, leaveMarToMay)).toBe(false);
        expect(isMonthInLeave(2025, 3, leaveMarToMay)).toBe(true);
        expect(isMonthInLeave(2025, 5, leaveMarToMay)).toBe(true);
        expect(isMonthInLeave(2025, 6, leaveMarToMay)).toBe(false);
      });

      it('종료 미정이면 시작 연월 이후 모두 true', () => {
        const openEnd = {
          startYear: 2025,
          startMonth: 4,
          endYear: null,
          endMonth: null,
        };
        expect(isMonthInLeave(2025, 3, openEnd)).toBe(false);
        expect(isMonthInLeave(2025, 4, openEnd)).toBe(true);
        expect(isMonthInLeave(2025, 12, openEnd)).toBe(true);
        expect(isMonthInLeave(2026, 1, openEnd)).toBe(true);
      });
    });

    it('getObligationMonths에서 휴회 월 제외', () => {
      // 2025년 1월부터 의무인데 3~5월 휴회 → 1,2,6,7,...,12
      const months = getObligationMonths(2025, null, [leaveMarToMay]);
      expect(months).toEqual([1, 2, 6, 7, 8, 9, 10, 11, 12]);
    });

    it('isMonthObligated에서 휴회 월은 false', () => {
      expect(isMonthObligated(2025, 3, null, [leaveMarToMay])).toBe(false);
      expect(isMonthObligated(2025, 6, null, [leaveMarToMay])).toBe(true);
    });

    it('obligationMonthCount에서 휴회 월 제외', () => {
      expect(obligationMonthCount(2025, null, [leaveMarToMay])).toBe(9);
    });
  });

  describe('getNextObligatedMonth', () => {
    it('lastPaid 다음 달이 의무월이면 그대로 반환', () => {
      const lastPaid = { year: 2025, month: 2 };
      expect(getNextObligatedMonth(lastPaid, null)).toEqual({
        year: 2025,
        month: 3,
      });
    });

    it('lastPaid 다음 달이 휴회 월이면 휴회 종료 직후 의무월 반환', () => {
      // 1월 납부, 3~5월 병가 → 다음 의무월은 6월
      const lastPaid = { year: 2025, month: 2 };
      const leave: LeavePeriod = {
        startYear: 2025,
        startMonth: 3,
        endYear: 2025,
        endMonth: 5,
      };
      expect(getNextObligatedMonth(lastPaid, null, [leave])).toEqual({
        year: 2025,
        month: 6,
      });
    });

    it('lastPaid가 12월이면 다음 해 1월부터 탐색', () => {
      const lastPaid = { year: 2025, month: 12 };
      expect(getNextObligatedMonth(lastPaid, null)).toEqual({
        year: 2026,
        month: 1,
      });
    });

    it('lastPaid가 12월이고 다음 해 1~2월 휴회면 3월', () => {
      const lastPaid = { year: 2025, month: 12 };
      const leave: LeavePeriod = {
        startYear: 2026,
        startMonth: 1,
        endYear: 2026,
        endMonth: 2,
      };
      expect(getNextObligatedMonth(lastPaid, null, [leave])).toEqual({
        year: 2026,
        month: 3,
      });
    });

    it('lastPaid가 없으면 feeObligationStartAt 기준 첫 의무월', () => {
      const start = new Date('2025-04-15');
      expect(getNextObligatedMonth(null, start)).toEqual({
        year: 2025,
        month: 4,
      });
    });

    it('lastPaid가 없고 시작 월이 휴회면 휴회 이후 첫 의무월', () => {
      const start = new Date('2025-03-01');
      const leave: LeavePeriod = {
        startYear: 2025,
        startMonth: 3,
        endYear: 2025,
        endMonth: 4,
      };
      expect(getNextObligatedMonth(null, start, [leave])).toEqual({
        year: 2025,
        month: 5,
      });
    });

    it('탈퇴월 이후로는 null', () => {
      const lastPaid = { year: 2025, month: 5 };
      const leftAt = new Date('2025-05-20');
      expect(getNextObligatedMonth(lastPaid, null, [], leftAt)).toBe(null);
    });

    it('휴회가 종료 미정이고 24개월 내 의무월이 없으면 null', () => {
      const lastPaid = { year: 2025, month: 2 };
      const openLeave: LeavePeriod = {
        startYear: 2025,
        startMonth: 3,
        endYear: null,
        endMonth: null,
      };
      expect(getNextObligatedMonth(lastPaid, null, [openLeave])).toBe(null);
    });
  });

  describe('explainNextObligatedMonth', () => {
    it('일반 케이스: 단순 +1이면 reasons는 빈 배열', () => {
      const lastPaid = { year: 2025, month: 2 };
      const result = explainNextObligatedMonth(lastPaid, null);
      expect(result.next).toEqual({ year: 2025, month: 3 });
      expect(result.reasons).toEqual([]);
    });

    it('휴회 끼어 차기월이 밀리면 휴회 사유 라벨', () => {
      const lastPaid = { year: 2026, month: 2 };
      const leave: LeavePeriod = {
        startYear: 2026,
        startMonth: 3,
        endYear: 2026,
        endMonth: 4,
      };
      const result = explainNextObligatedMonth(lastPaid, null, [leave]);
      expect(result.next).toEqual({ year: 2026, month: 5 });
      expect(result.reasons).toEqual(['2026년 3~4월 휴회 제외']);
    });

    it('연속되지 않은 휴회는 별도 라벨로', () => {
      const lastPaid = { year: 2026, month: 2 };
      const leaveMar: LeavePeriod = {
        startYear: 2026,
        startMonth: 3,
        endYear: 2026,
        endMonth: 3,
      };
      const leaveMay: LeavePeriod = {
        startYear: 2026,
        startMonth: 5,
        endYear: 2026,
        endMonth: 5,
      };
      const result = explainNextObligatedMonth(lastPaid, null, [
        leaveMar,
        leaveMay,
      ]);
      // 4월은 의무월이라 그 시점에 결과 반환 → 5월 휴회는 reasons에 안 들어감
      expect(result.next).toEqual({ year: 2026, month: 4 });
      expect(result.reasons).toEqual(['2026년 3월 휴회 제외']);
    });

    it('연도 경계를 넘는 휴회 라벨', () => {
      const lastPaid = { year: 2025, month: 11 };
      const leave: LeavePeriod = {
        startYear: 2025,
        startMonth: 12,
        endYear: 2026,
        endMonth: 2,
      };
      const result = explainNextObligatedMonth(lastPaid, null, [leave]);
      expect(result.next).toEqual({ year: 2026, month: 3 });
      expect(result.reasons).toEqual(['2025년 12월~2026년 2월 휴회 제외']);
    });

    it('lastPaid 없고 의무 시작월이 미래면 의무 시작월 라벨', () => {
      const start = new Date('2026-04-15');
      const result = explainNextObligatedMonth(null, start);
      expect(result.next).toEqual({ year: 2026, month: 4 });
      expect(result.reasons).toEqual(['의무 시작월: 2026년 4월']);
    });

    it('탈퇴로 차기월 없으면 탈퇴 사유', () => {
      const lastPaid = { year: 2026, month: 5 };
      const leftAt = new Date('2026-05-20');
      const result = explainNextObligatedMonth(lastPaid, null, [], leftAt);
      expect(result.next).toBeNull();
      expect(result.reasons).toEqual(['2026년 5월 탈퇴로 더 이상 의무 없음']);
    });
  });
});
