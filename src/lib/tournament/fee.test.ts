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
  const player = (key: string, isLocalMember: boolean) => ({
    key,
    isLocalMember,
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

  it('비회원 선수 1명이면 추가금을 1회 더한다', () => {
    const result = calculateEventFee({
      baseFee: 60000,
      surcharge: 10000,
      playerKeys: ['a', 'b'],
      players: [player('a', true), player('b', false)],
    });
    expect(result).toBe(70000);
  });

  it('비회원 선수 2명이면 추가금을 2회 더한다', () => {
    const result = calculateEventFee({
      baseFee: 60000,
      surcharge: 10000,
      playerKeys: ['a', 'b'],
      players: [player('a', false), player('b', false)],
    });
    expect(result).toBe(80000);
  });

  it('모두 회원이면 추가금이 붙지 않는다', () => {
    const result = calculateEventFee({
      baseFee: 60000,
      surcharge: 10000,
      playerKeys: ['a', 'b'],
      players: [player('a', true), player('b', true)],
    });
    expect(result).toBe(60000);
  });

  it('단식 종목에서 비회원이면 추가금을 1회만 더한다', () => {
    const result = calculateEventFee({
      baseFee: 30000,
      surcharge: 10000,
      playerKeys: ['a'],
      players: [player('a', false), player('b', false)],
    });
    expect(result).toBe(40000);
  });

  it('해당 종목에 배정되지 않은 비회원은 계산에서 제외한다', () => {
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
});
