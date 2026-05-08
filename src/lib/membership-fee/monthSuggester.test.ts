import { describe, it, expect } from '@jest/globals';

import { suggestMonths } from './monthSuggester';

describe('suggestMonths', () => {
  it('거래월에 N개월치를 입금하면 거래월부터 과거로 채운다 (밀린 회비 우선)', () => {
    // 2월에 2개월치 입금, 납부 이력 없음 → [1, 2]
    expect(suggestMonths(2, [], 2)).toEqual([1, 2]);
  });

  it('거래월보다 과거에 미납 월이 부족하면 거래월 이후로 보충한다', () => {
    // 2월에 3개월치 입금, 납부 이력 없음 → [1, 2, 3]
    expect(suggestMonths(3, [], 2)).toEqual([1, 2, 3]);
  });

  it('이미 납부된 월은 건너뛴다', () => {
    // 3월에 2개월치 입금, 1월 이미 납부 → [2, 3]
    expect(suggestMonths(2, [{ month: 1 }], 3)).toEqual([2, 3]);
  });

  it('거래월 이전에 미납 월이 있어도 의무월이 아니면 건너뛴다', () => {
    // 3월에 1개월치, 의무월이 [3,4,5,...]만 (가입이 3월) → [3]
    expect(suggestMonths(1, [], 3, [3, 4, 5, 6, 7, 8, 9, 10, 11, 12])).toEqual([
      3,
    ]);
  });

  it('1월에 1개월치 입금하면 1월로 추천', () => {
    expect(suggestMonths(1, [], 1)).toEqual([1]);
  });

  it('의무월 + 납부 이력을 모두 반영해 채울 수 있는 만큼만 반환', () => {
    // 12월에 3개월치, 11월·12월 이미 납부, 의무월 1~12 → [1, 2, 3]
    expect(suggestMonths(3, [{ month: 11 }, { month: 12 }], 12)).toEqual([
      1, 2, 3,
    ]);
  });

  it('월 수가 가능한 후보보다 많으면 가능한 만큼만 반환', () => {
    // 의무월이 [1,2]뿐인데 3개월치 요구 → [1, 2]만
    expect(suggestMonths(3, [], 2, [1, 2])).toEqual([1, 2]);
  });
});
