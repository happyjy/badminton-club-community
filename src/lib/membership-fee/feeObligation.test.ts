import { describe, it, expect } from '@jest/globals';

import {
  getFirstObligationMonth,
  isMonthObligated,
  obligationMonthCount,
  getObligationMonths,
} from './feeObligation';

describe('feeObligation', () => {
  describe('getFirstObligationMonth (15일 규칙)', () => {
    it('15일 이전 가입 시 해당 월부터 의무', () => {
      expect(getFirstObligationMonth(2025, new Date('2025-03-10'))).toBe(3);
      expect(getFirstObligationMonth(2025, new Date('2025-03-15'))).toBe(3);
    });

    it('16일 이후 가입 시 다음 달부터 의무', () => {
      expect(getFirstObligationMonth(2025, new Date('2025-03-16'))).toBe(4);
      expect(getFirstObligationMonth(2025, new Date('2025-03-21'))).toBe(4);
    });

    it('12월 16일 가입 시 다음 해 1월부터 의무', () => {
      expect(getFirstObligationMonth(2026, new Date('2025-12-20'))).toBe(1);
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
    it('3월 21일 가입 시 3월 미의무, 4월 의무', () => {
      const start = new Date('2025-03-21');
      expect(isMonthObligated(2025, 3, start)).toBe(false);
      expect(isMonthObligated(2025, 4, start)).toBe(true);
    });

    it('null 시 전 월 의무', () => {
      expect(isMonthObligated(2025, 1, null)).toBe(true);
      expect(isMonthObligated(2025, 12, null)).toBe(true);
    });
  });

  describe('obligationMonthCount', () => {
    it('3월부터 의무 시 10개월', () => {
      expect(obligationMonthCount(2025, new Date('2025-03-10'))).toBe(10);
    });

    it('4월부터 의무 시 9개월', () => {
      expect(obligationMonthCount(2025, new Date('2025-03-21'))).toBe(9);
    });

    it('null 시 12개월', () => {
      expect(obligationMonthCount(2025, null)).toBe(12);
    });
  });

  describe('getObligationMonths', () => {
    it('4월부터 의무 시 [4,5,...,12]', () => {
      const months = getObligationMonths(2025, new Date('2025-03-21'));
      expect(months).toEqual([4, 5, 6, 7, 8, 9, 10, 11, 12]);
    });

    it('null 시 1~12', () => {
      const months = getObligationMonths(2025, null);
      expect(months).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    });
  });
});
