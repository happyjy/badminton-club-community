import { beforeEach, describe, expect, it } from '@jest/globals';

import { consumeAttempt, resetAttempts } from './rateLimit';

describe('consumeAttempt', () => {
  beforeEach(() => {
    resetAttempts('1.2.3.4');
  });

  it('제한 안에서는 허용하고 남은 횟수를 줄인다', () => {
    const first = consumeAttempt('1.2.3.4', { limit: 3, now: 0 });
    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(2);

    const second = consumeAttempt('1.2.3.4', { limit: 3, now: 0 });
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(1);
  });

  it('제한을 넘으면 거부한다', () => {
    consumeAttempt('1.2.3.4', { limit: 2, now: 0 });
    consumeAttempt('1.2.3.4', { limit: 2, now: 0 });

    const third = consumeAttempt('1.2.3.4', { limit: 2, now: 0 });
    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
  });

  it('시간 창이 지나면 다시 허용한다', () => {
    consumeAttempt('1.2.3.4', { limit: 1, windowMs: 1000, now: 0 });
    const blocked = consumeAttempt('1.2.3.4', {
      limit: 1,
      windowMs: 1000,
      now: 500,
    });
    expect(blocked.allowed).toBe(false);

    const afterWindow = consumeAttempt('1.2.3.4', {
      limit: 1,
      windowMs: 1000,
      now: 1500,
    });
    expect(afterWindow.allowed).toBe(true);
  });

  it('키가 다르면 서로 영향을 주지 않는다', () => {
    consumeAttempt('1.2.3.4', { limit: 1, now: 0 });
    const other = consumeAttempt('5.6.7.8', { limit: 1, now: 0 });
    expect(other.allowed).toBe(true);
    resetAttempts('5.6.7.8');
  });
});
