import { describe, expect, it } from '@jest/globals';

import { calculateEventFee, calculateTotalFee } from './fee';

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

describe('calculateEventFee', () => {
  const player = (key: string, isClubMember: boolean) => ({
    key,
    isClubMember,
  });

  it('추가금이 0원이면 종목 참가비를 그대로 반환한다', () => {
    const result = calculateEventFee({
      baseFee: 60000,
      surcharge: 0,
      playerKeys: ['a', 'b'],
      players: [player('a', true), player('b', false)],
    });
    expect(result).toBe(60000);
  });

  it('외부 선수 1명이면 추가금을 1회 더한다', () => {
    const result = calculateEventFee({
      baseFee: 60000,
      surcharge: 10000,
      playerKeys: ['a', 'b'],
      players: [player('a', true), player('b', false)],
    });
    expect(result).toBe(70000);
  });

  it('외부 선수 2명이면 추가금을 2회 더한다', () => {
    const result = calculateEventFee({
      baseFee: 60000,
      surcharge: 10000,
      playerKeys: ['a', 'b'],
      players: [player('a', false), player('b', false)],
    });
    expect(result).toBe(80000);
  });

  it('모두 소속이면 추가금이 붙지 않는다', () => {
    const result = calculateEventFee({
      baseFee: 60000,
      surcharge: 10000,
      playerKeys: ['a', 'b'],
      players: [player('a', true), player('b', true)],
    });
    expect(result).toBe(60000);
  });

  it('단식 종목에서 외부 선수면 추가금을 1회만 더한다', () => {
    const result = calculateEventFee({
      baseFee: 30000,
      surcharge: 10000,
      playerKeys: ['a'],
      players: [player('a', false), player('b', false)],
    });
    expect(result).toBe(40000);
  });

  it('해당 종목에 배정되지 않은 외부 선수는 계산에서 제외한다', () => {
    const result = calculateEventFee({
      baseFee: 60000,
      surcharge: 10000,
      playerKeys: ['a', 'b'],
      players: [player('a', true), player('b', true), player('c', false)],
    });
    expect(result).toBe(60000);
  });

  it('존재하지 않는 선수 key는 무시한다', () => {
    const result = calculateEventFee({
      baseFee: 60000,
      surcharge: 10000,
      playerKeys: ['a', 'missing'],
      players: [player('a', false)],
    });
    expect(result).toBe(70000);
  });

  describe('PER_TEAM 부과 단위', () => {
    it('외부 선수가 2명이어도 추가금을 1회만 더한다', () => {
      const result = calculateEventFee({
        baseFee: 60000,
        surcharge: 10000,
        unit: 'PER_TEAM',
        playerKeys: ['a', 'b'],
        players: [player('a', false), player('b', false)],
      });
      expect(result).toBe(70000);
    });

    it('외부 선수가 1명이어도 추가금을 1회 더한다', () => {
      const result = calculateEventFee({
        baseFee: 60000,
        surcharge: 10000,
        unit: 'PER_TEAM',
        playerKeys: ['a', 'b'],
        players: [player('a', true), player('b', false)],
      });
      expect(result).toBe(70000);
    });

    it('모두 소속이면 추가금이 붙지 않는다', () => {
      const result = calculateEventFee({
        baseFee: 60000,
        surcharge: 10000,
        unit: 'PER_TEAM',
        playerKeys: ['a', 'b'],
        players: [player('a', true), player('b', true)],
      });
      expect(result).toBe(60000);
    });

    it('추가금이 0원이면 단위와 무관하게 기본 참가비만 받는다', () => {
      const result = calculateEventFee({
        baseFee: 60000,
        surcharge: 0,
        unit: 'PER_TEAM',
        playerKeys: ['a', 'b'],
        players: [player('a', false), player('b', false)],
      });
      expect(result).toBe(60000);
    });

    it('unit을 생략하면 기존 동작(1인당)을 유지한다', () => {
      const result = calculateEventFee({
        baseFee: 60000,
        surcharge: 10000,
        playerKeys: ['a', 'b'],
        players: [player('a', false), player('b', false)],
      });
      expect(result).toBe(80000);
    });
  });
});
