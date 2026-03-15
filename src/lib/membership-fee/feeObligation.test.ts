import { describe, it, expect } from '@jest/globals';

import {
  getFirstObligationMonth,
  isMonthObligated,
  obligationMonthCount,
  getObligationMonths,
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
});
