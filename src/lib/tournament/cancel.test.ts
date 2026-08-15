import { describe, expect, it } from '@jest/globals';

import { resolveEntryStateAfterCancel } from './cancel';

const twoEvents = [
  { id: 'e1', fee: 30000, status: 'ACTIVE' as const },
  { id: 'e2', fee: 30000, status: 'ACTIVE' as const },
];

describe('resolveEntryStateAfterCancel', () => {
  it('일부 종목만 취소하면 paymentStatus를 유지한다', () => {
    const result = resolveEntryStateAfterCancel(twoEvents, 'PENDING', 'e1');
    expect(result.paymentStatus).toBe('PENDING');
    expect(result.totalFee).toBe(30000);
    expect(result.allCanceled).toBe(false);
  });

  it('마지막 ACTIVE 종목을 취소하면 신청서가 CANCELED가 된다', () => {
    const events = [
      { id: 'e1', fee: 30000, status: 'CANCELED' as const },
      { id: 'e2', fee: 30000, status: 'ACTIVE' as const },
    ];
    const result = resolveEntryStateAfterCancel(events, 'PENDING', 'e2');
    expect(result.paymentStatus).toBe('CANCELED');
    expect(result.totalFee).toBe(0);
    expect(result.allCanceled).toBe(true);
  });

  it('입금확인 상태에서 일부 취소하면 CONFIRMED를 유지하고 총액만 줄인다', () => {
    const result = resolveEntryStateAfterCancel(twoEvents, 'CONFIRMED', 'e1');
    expect(result.paymentStatus).toBe('CONFIRMED');
    expect(result.totalFee).toBe(30000);
  });

  it('입금확인 상태에서 전체 취소하면 CANCELED가 된다', () => {
    const events = [{ id: 'e1', fee: 30000, status: 'ACTIVE' as const }];
    const result = resolveEntryStateAfterCancel(events, 'CONFIRMED', 'e1');
    expect(result.paymentStatus).toBe('CANCELED');
    expect(result.totalFee).toBe(0);
  });

  it('이미 취소된 종목을 다시 취소해도 상태가 변하지 않는다', () => {
    const events = [
      { id: 'e1', fee: 30000, status: 'CANCELED' as const },
      { id: 'e2', fee: 30000, status: 'ACTIVE' as const },
    ];
    const result = resolveEntryStateAfterCancel(events, 'PENDING', 'e1');
    expect(result.paymentStatus).toBe('PENDING');
    expect(result.totalFee).toBe(30000);
    expect(result.allCanceled).toBe(false);
  });
});
