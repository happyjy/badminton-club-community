import { beforeEach, describe, expect, it } from '@jest/globals';

import {
  MAX_VERIFY_ATTEMPTS,
  SEND_COOLDOWN_MS,
  SEND_HOURLY_LIMIT_PER_PHONE,
  SEND_HOURLY_LIMIT_PER_USER,
  checkSendLimit,
  consumeVerifyAttempt,
  resetPhoneVerificationLimits,
  resetVerifyAttempts,
} from './phoneVerificationLimit';

const HOUR = 60 * 60 * 1000;

describe('checkSendLimit', () => {
  beforeEach(() => {
    resetPhoneVerificationLimits();
  });

  it('처음 보내는 요청은 허용한다', () => {
    expect(checkSendLimit(1, '010-1234-5678', 0).allowed).toBe(true);
  });

  it('번호를 잘못 넣었다가 고쳐서 바로 다른 번호로 보내는 것은 허용한다', () => {
    checkSendLimit(1, '01012345678', 0);
    const result = checkSendLimit(1, '01099998888', 1000);
    expect(result.allowed).toBe(true);
  });

  it('번호 쪽 제한에 걸려 거절되면 사용자 횟수는 줄지 않는다', () => {
    checkSendLimit(1, '01012345678', 0);
    // 사용자 2가 쿨다운 중인 번호로 여러 번 시도해도
    for (let i = 0; i < 20; i += 1) {
      expect(checkSendLimit(2, '01012345678', 1000 + i).allowed).toBe(false);
    }
    // 사용자 2의 시간당 한도는 그대로 남아 있다
    for (let i = 0; i < SEND_HOURLY_LIMIT_PER_USER; i += 1) {
      const phone = `0105555${String(i).padStart(4, '0')}`;
      expect(checkSendLimit(2, phone, 2000 + i).allowed).toBe(true);
    }
  });

  it('release하면 차감한 횟수를 되돌려 바로 다시 보낼 수 있다', () => {
    const first = checkSendLimit(1, '01012345678', 0);
    expect(first.allowed).toBe(true);
    if (first.allowed) first.release();

    expect(checkSendLimit(1, '01012345678', 1000).allowed).toBe(true);
  });

  it('다른 사용자라도 같은 번호로 쿨다운 안에 보내면 막는다 (형식이 달라도 같은 번호)', () => {
    checkSendLimit(1, '01012345678', 0);
    const result = checkSendLimit(2, '010-1234-5678', 1000);
    expect(result.allowed).toBe(false);
  });

  it('쿨다운이 지나면 다시 허용한다', () => {
    checkSendLimit(1, '01012345678', 0);
    expect(checkSendLimit(1, '01012345678', SEND_COOLDOWN_MS).allowed).toBe(
      true
    );
  });

  it('한 번호로는 한 시간에 정해진 횟수까지만 보낸다', () => {
    for (let i = 0; i < SEND_HOURLY_LIMIT_PER_PHONE; i += 1) {
      // 사용자를 바꿔 가며 쿨다운을 피해도 번호 기준 상한에 걸린다
      expect(
        checkSendLimit(100 + i, '01012345678', i * SEND_COOLDOWN_MS).allowed
      ).toBe(true);
    }
    const blocked = checkSendLimit(
      999,
      '01012345678',
      SEND_HOURLY_LIMIT_PER_PHONE * SEND_COOLDOWN_MS
    );
    expect(blocked.allowed).toBe(false);

    // 한 시간이 지나면 풀린다
    expect(checkSendLimit(999, '01012345678', HOUR + 1).allowed).toBe(true);
  });

  it('한 사용자는 한 시간에 정해진 횟수까지만 보낸다', () => {
    for (let i = 0; i < SEND_HOURLY_LIMIT_PER_USER; i += 1) {
      // 번호를 바꿔 가며 보내도 사용자 기준 상한에 걸린다
      const phone = `0101234${String(1000 + i)}`;
      expect(checkSendLimit(1, phone, i * SEND_COOLDOWN_MS).allowed).toBe(true);
    }
    const blocked = checkSendLimit(
      1,
      '01055556666',
      SEND_HOURLY_LIMIT_PER_USER * SEND_COOLDOWN_MS
    );
    expect(blocked.allowed).toBe(false);
  });

  it('막힐 때는 화면에 보여 줄 한국어 안내를 준다', () => {
    checkSendLimit(1, '01012345678', 0);
    const result = checkSendLimit(1, '01012345678', 0);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.message).toMatch(/잠시 후/);
    }
  });
});

describe('consumeVerifyAttempt', () => {
  beforeEach(() => {
    resetPhoneVerificationLimits();
  });

  it(`인증번호는 ${MAX_VERIFY_ATTEMPTS}번까지만 확인할 수 있다`, () => {
    for (let i = 0; i < MAX_VERIFY_ATTEMPTS; i += 1) {
      const result = consumeVerifyAttempt(1, 3, '01012345678', 0);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(MAX_VERIFY_ATTEMPTS - 1 - i);
    }
    expect(consumeVerifyAttempt(1, 3, '01012345678', 0).allowed).toBe(false);
  });

  it('번호 형식만 바꿔서 횟수를 새로 받을 수 없다', () => {
    for (let i = 0; i < MAX_VERIFY_ATTEMPTS; i += 1) {
      consumeVerifyAttempt(1, 3, '01012345678', 0);
    }
    expect(consumeVerifyAttempt(1, 3, '010-1234-5678', 0).allowed).toBe(false);
  });

  it('인증번호를 새로 받으면 횟수가 초기화된다', () => {
    for (let i = 0; i < MAX_VERIFY_ATTEMPTS; i += 1) {
      consumeVerifyAttempt(1, 3, '01012345678', 0);
    }
    resetVerifyAttempts(1, 3, '010-1234-5678');
    expect(consumeVerifyAttempt(1, 3, '01012345678', 0).allowed).toBe(true);
  });
});
