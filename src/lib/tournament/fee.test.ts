import { describe, expect, it } from '@jest/globals';

import { calculateTotalFee } from './fee';

describe('calculateTotalFee', () => {
  it('ACTIVE 종목의 참가비만 합산한다', () => {
    const result = calculateTotalFee([
      { fee: 30000, status: 'ACTIVE' },
      { fee: 30000, status: 'ACTIVE' },
    ]);
    expect(result).toBe(60000);
  });

  it('CANCELED 종목은 합산에서 제외한다', () => {
    const result = calculateTotalFee([
      { fee: 30000, status: 'ACTIVE' },
      { fee: 30000, status: 'CANCELED' },
    ]);
    expect(result).toBe(30000);
  });

  it('빈 배열이면 0을 반환한다', () => {
    expect(calculateTotalFee([])).toBe(0);
  });

  it('모든 종목이 취소되면 0을 반환한다', () => {
    const result = calculateTotalFee([
      { fee: 30000, status: 'CANCELED' },
      { fee: 20000, status: 'CANCELED' },
    ]);
    expect(result).toBe(0);
  });

  it('참가비가 0원인 무료 대회도 처리한다', () => {
    expect(calculateTotalFee([{ fee: 0, status: 'ACTIVE' }])).toBe(0);
  });
});
