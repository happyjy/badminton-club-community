import { describe, expect, it } from '@jest/globals';

import { IGNORED_ERRORS, scrubEvent } from './scrubEvent';

import type { ErrorEvent } from '@sentry/nextjs';

const baseEvent = (overrides: Partial<ErrorEvent>): ErrorEvent => ({
  type: undefined,
  ...overrides,
});

describe('scrubEvent', () => {
  it('console.error 인자 중 라벨 문자열만 남긴다', () => {
    const event = scrubEvent(
      baseEvent({
        extra: {
          arguments: [
            'SMS 전송 중 오류:',
            { guestName: '홍길동', smsRecipients: ['01012345678'] },
          ],
          other: 'keep',
        },
      })
    );

    expect(event.extra).toEqual({
      arguments: ['SMS 전송 중 오류:'],
      other: 'keep',
    });
    expect(JSON.stringify(event)).not.toContain('01012345678');
  });

  it('요청에서 메소드와 쿼리를 뗀 주소만 남긴다', () => {
    const event = scrubEvent(
      baseEvent({
        request: {
          method: 'POST',
          url: 'https://example.com/api/clubs/1/guests/apply?phone=01012345678',
          query_string: 'phone=01012345678',
          cookies: { 'auth-token': 'secret-token' },
          headers: { cookie: 'auth-token=secret-token' },
          data: { name: '홍길동', phoneNumber: '01012345678' },
        },
      })
    );

    expect(event.request).toEqual({
      method: 'POST',
      url: 'https://example.com/api/clubs/1/guests/apply',
    });
  });

  it('사용자 정보와 직전 로그 기록을 지운다', () => {
    const event = scrubEvent(
      baseEvent({
        user: { ip_address: '203.0.113.7', email: 'a@b.c' },
        breadcrumbs: [
          { category: 'console', message: 'SMS API 요청 바디: 01012345678' },
        ],
      })
    );

    expect(event.user).toBeUndefined();
    expect(event.breadcrumbs).toBeUndefined();
  });

  it('지울 것이 없는 이벤트는 그대로 돌려준다', () => {
    const event = baseEvent({ message: '클럽 목록 조회 중 오류 발생:' });

    expect(scrubEvent(event)).toEqual({
      type: undefined,
      message: '클럽 목록 조회 중 오류 발생:',
    });
  });
});

describe('IGNORED_ERRORS', () => {
  it('로그인 토큰 검증 실패만 걸러낸다', () => {
    const matches = (text: string) =>
      IGNORED_ERRORS.some((pattern) => text.includes(pattern));

    expect(matches('TokenExpiredError: jwt expired')).toBe(true);
    expect(matches('JsonWebTokenError: invalid signature')).toBe(true);
    expect(
      matches('Error: JWT_SECRET 환경변수가 없거나 안전하지 않습니다.')
    ).toBe(false);
    expect(matches('PrismaClientKnownRequestError: P2002')).toBe(false);
  });
});
