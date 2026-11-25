import { describe, expect, it } from '@jest/globals';

import { statusTone } from '@/constants/statusTone';

describe('statusTone', () => {
  it('게스트 신청: 대기는 주의, 승인은 긍정, 거절은 부정', () => {
    expect(statusTone('guest', 'PENDING')).toBe('warning');
    expect(statusTone('guest', 'APPROVED')).toBe('positive');
    expect(statusTone('guest', 'REJECTED')).toBe('negative');
  });

  it('회원: 활동 중은 중립이라 회비 상태가 더 눈에 띈다', () => {
    expect(statusTone('member', 'APPROVED')).toBe('neutral');
    expect(statusTone('member', 'PENDING')).toBe('warning');
    expect(statusTone('member', 'REJECTED')).toBe('negative');
    expect(statusTone('member', 'ON_LEAVE')).toBe('neutral');
    expect(statusTone('member', 'LEFT')).toBe('neutral');
  });

  it('운동 참가: 확정은 긍정, 대기 명단은 주의', () => {
    expect(statusTone('participation', 'CONFIRMED')).toBe('positive');
    expect(statusTone('participation', 'WAITLIST')).toBe('warning');
  });

  it('대회: 모집 중은 긍정, 임시저장·마감은 중립', () => {
    expect(statusTone('tournament', 'OPEN')).toBe('positive');
    expect(statusTone('tournament', 'DRAFT')).toBe('neutral');
    expect(statusTone('tournament', 'CLOSED')).toBe('neutral');
  });

  it('대회 입금·종목', () => {
    expect(statusTone('entryPayment', 'PENDING')).toBe('warning');
    expect(statusTone('entryPayment', 'CONFIRMED')).toBe('positive');
    expect(statusTone('entryPayment', 'CANCELED')).toBe('negative');
    expect(statusTone('entryEvent', 'ACTIVE')).toBe('positive');
    expect(statusTone('entryEvent', 'CANCELED')).toBe('negative');
  });

  it('회비 기록', () => {
    expect(statusTone('feeRecord', 'PENDING')).toBe('warning');
    expect(statusTone('feeRecord', 'MATCHED')).toBe('positive');
    expect(statusTone('feeRecord', 'CONFIRMED')).toBe('positive');
    expect(statusTone('feeRecord', 'ERROR')).toBe('negative');
    expect(statusTone('feeRecord', 'SKIPPED')).toBe('neutral');
  });

  it('입금 분류: 회비가 아닌 것은 눈에 띄지 않게, 가입비만 구분되게 한다', () => {
    expect(statusTone('paymentKind', 'FEE')).toBe('positive');
    expect(statusTone('paymentKind', 'JOINING_FEE')).toBe('warning');
    expect(statusTone('paymentKind', 'EVENT')).toBe('neutral');
    expect(statusTone('paymentKind', 'OTHER')).toBe('neutral');
    expect(statusTone('paymentKind', 'INTEREST')).toBe('neutral');
  });

  it('모르는 상태값은 중립이다', () => {
    expect(statusTone('guest', 'SOMETHING_NEW')).toBe('neutral');
  });

  it('상태가 비어 있어도 중립이다', () => {
    expect(statusTone('guest', null)).toBe('neutral');
    expect(statusTone('guest', undefined)).toBe('neutral');
    expect(statusTone('guest', '')).toBe('neutral');
  });

  it('객체의 기본 속성 이름이 상태로 들어와도 중립이다', () => {
    expect(statusTone('guest', 'constructor')).toBe('neutral');
    expect(statusTone('guest', 'toString')).toBe('neutral');
  });
});
