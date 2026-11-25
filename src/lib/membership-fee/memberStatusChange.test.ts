import { describe, expect, it } from '@jest/globals';

import {
  latestPaidMonth,
  parseMonthInput,
  statusMonthKind,
  toMonthInput,
} from './memberStatusChange';

describe('statusMonthKind — 상태를 바꿀 때 달을 묻는 경우', () => {
  it.each([
    ['APPROVED', 'LEFT'],
    ['ON_LEAVE', 'LEFT'],
    ['REJECTED', 'LEFT'],
  ])('%s → %s는 탈퇴월을 묻는다', (prev, next) => {
    expect(statusMonthKind(prev, next)).toBe('leave');
  });

  it.each([
    ['LEFT', 'APPROVED'],
    ['LEFT', 'ON_LEAVE'],
  ])('%s → %s는 다시 시작하는 달을 묻는다', (prev, next) => {
    expect(statusMonthKind(prev, next)).toBe('rejoin');
  });

  it.each([
    ['LEFT', 'LEFT'],
    ['LEFT', 'REJECTED'],
    ['LEFT', 'PENDING'],
    ['APPROVED', 'ON_LEAVE'],
  ])('%s → %s는 묻지 않는다', (prev, next) => {
    expect(statusMonthKind(prev, next)).toBeNull();
  });
});

describe('parseMonthInput — YYYY-MM을 그 달 1일 UTC로', () => {
  it('그 달 1일 00:00 UTC', () => {
    expect(parseMonthInput('2026-07')?.toISOString()).toBe(
      '2026-07-01T00:00:00.000Z'
    );
  });

  it.each([['2026-13'], ['2026-1'], [''], [202607], [null], ['1999-12']])(
    '%p는 달이 아니다',
    (value) => {
      expect(parseMonthInput(value)).toBeNull();
    }
  );
});

describe('toMonthInput — 저장된 날짜를 YYYY-MM으로 (한국 시각)', () => {
  it('한국 자정으로 저장된 예전 날짜도 제 달로 읽는다', () => {
    expect(toMonthInput(new Date('2024-12-31T15:00:00.000Z'))).toBe('2025-01');
  });

  it('그 달 1일 UTC', () => {
    expect(toMonthInput(new Date('2026-07-01T00:00:00.000Z'))).toBe('2026-07');
  });
});

describe('latestPaidMonth — 가장 늦은 납부 달', () => {
  it('연·월이 가장 늦은 달', () => {
    expect(
      latestPaidMonth([
        { year: 2026, month: 3 },
        { year: 2026, month: 12 },
        { year: 2025, month: 12 },
      ])
    ).toBe('2026-12');
  });

  it('납부가 없으면 null', () => {
    expect(latestPaidMonth([])).toBeNull();
  });
});
