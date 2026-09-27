import { describe, expect, it } from '@jest/globals';

import {
  buildPromotionMessage,
  normalizePhoneNumber,
  shouldSendPromotionSms,
} from './parkingSms';

describe('normalizePhoneNumber', () => {
  it('하이픈을 걷어내고 숫자만 남긴다', () => {
    expect(normalizePhoneNumber('010-1234-5678')).toBe('01012345678');
  });

  it('기본값 플레이스홀더는 없는 번호로 본다', () => {
    expect(normalizePhoneNumber('010-0000-0000')).toBeNull();
  });

  it('빈 값은 null이다', () => {
    expect(normalizePhoneNumber(null)).toBeNull();
    expect(normalizePhoneNumber('')).toBeNull();
  });
});

describe('shouldSendPromotionSms', () => {
  it('문자 설정이 꺼져 있으면 보내지 않는다', () => {
    expect(
      shouldSendPromotionSms({
        smsEnabled: false,
        promotedSmsAt: null,
        phoneNumber: '01012345678',
      })
    ).toBe(false);
  });

  it('이미 보낸 기록이 있으면 다시 보내지 않는다', () => {
    expect(
      shouldSendPromotionSms({
        smsEnabled: true,
        promotedSmsAt: new Date(),
        phoneNumber: '01012345678',
      })
    ).toBe(false);
  });

  it('전화번호가 없으면 보내지 않는다', () => {
    expect(
      shouldSendPromotionSms({
        smsEnabled: true,
        promotedSmsAt: null,
        phoneNumber: null,
      })
    ).toBe(false);
  });

  it('설정이 켜져 있고 기록이 없고 번호가 있으면 보낸다', () => {
    expect(
      shouldSendPromotionSms({
        smsEnabled: true,
        promotedSmsAt: null,
        phoneNumber: '01012345678',
      })
    ).toBe(true);
  });
});

describe('buildPromotionMessage', () => {
  it('클럽 이름과 날짜, 장소를 담는다', () => {
    const message = buildPromotionMessage({
      clubName: '당산배드민턴',
      date: new Date(Date.UTC(2026, 8, 18, 19, 0)),
      location: 'OO초등학교',
    });

    expect(message).toContain('당산배드민턴');
    expect(message).toContain('주차 신청이 확정');
    expect(message).toContain('9/18');
    expect(message).toContain('19:00');
    expect(message).toContain('OO초등학교');
  });
});
