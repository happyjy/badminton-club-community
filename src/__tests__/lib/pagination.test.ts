import { describe, expect, it } from '@jest/globals';

import { getPageNumbers } from '@/lib/pagination';

describe('getPageNumbers', () => {
  it('쪽 수가 적으면 전부 보여 준다', () => {
    expect(getPageNumbers(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(getPageNumbers(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('쪽이 하나거나 없으면 그 하나만 돌려준다', () => {
    expect(getPageNumbers(1, 1)).toEqual([1]);
    expect(getPageNumbers(1, 0)).toEqual([1]);
  });

  it('앞쪽에 있으면 뒤만 줄인다', () => {
    expect(getPageNumbers(2, 20)).toEqual([1, 2, 3, 4, 5, '…', 20]);
  });

  it('뒤쪽에 있으면 앞만 줄인다', () => {
    expect(getPageNumbers(19, 20)).toEqual([1, '…', 16, 17, 18, 19, 20]);
  });

  it('가운데에 있으면 양쪽을 줄이고 현재 쪽의 앞뒤를 보여 준다', () => {
    expect(getPageNumbers(10, 20)).toEqual([1, '…', 9, 10, 11, '…', 20]);
  });

  it('언제나 첫 쪽·끝 쪽·현재 쪽을 포함하고 max칸을 넘지 않는다', () => {
    for (let total = 1; total <= 40; total++) {
      for (let current = 1; current <= total; current++) {
        const pages = getPageNumbers(current, total);
        expect(pages.length).toBeLessThanOrEqual(7);
        expect(pages).toContain(1);
        expect(pages).toContain(total);
        expect(pages).toContain(current);
        const numbers = pages.filter((p): p is number => p !== '…');
        expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
        expect(new Set(numbers).size).toBe(numbers.length);
      }
    }
  });

  it('범위를 벗어난 현재 쪽은 범위 안으로 당긴다', () => {
    expect(getPageNumbers(99, 20)).toEqual(getPageNumbers(20, 20));
    expect(getPageNumbers(0, 20)).toEqual(getPageNumbers(1, 20));
  });
});
