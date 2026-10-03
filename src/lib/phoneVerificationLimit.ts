/**
 * 전화번호 인증의 발송·확인 횟수 제한.
 *
 * 발송은 문자 한 통마다 비용이 들고 남의 번호로 문자 폭탄을 보낼 수 있어서,
 * 확인은 6자리(경우의 수 100만)를 전수 시도할 수 있어서 막는다.
 *
 * rateLimit.ts의 인메모리 카운터를 쓰므로 서버 인스턴스가 여러 개면 각자 센다.
 * 완전한 방어는 아니고, 자동화된 남용을 충분히 느리게 만드는 게 목적이다.
 * 확인 횟수 초과 시에는 DB의 인증번호 자체를 만료시켜 인스턴스가 바뀌어도
 * 같은 번호를 계속 시도할 수 없게 한다.
 */
import { toPhoneDigits } from '@/utils/phoneNumber';

import {
  canConsume,
  consumeAttempt,
  refundAttempt,
  resetAttempts,
  resetAttemptsByPrefix,
} from './rateLimit';

const PREFIX = 'phone-verification:';

/**
 * 같은 번호로 다시 보내기까지 기다릴 시간.
 * 사용자 단위로는 두지 않는다. 번호를 잘못 넣었다가 고쳐서 바로 보내는 경우를 막지 않기 위해서다.
 */
export const SEND_COOLDOWN_MS = 60 * 1000;
const SEND_WINDOW_MS = 60 * 60 * 1000;
/** 번호 하나가 한 시간에 받을 수 있는 문자 수 */
export const SEND_HOURLY_LIMIT_PER_PHONE = 5;
/** 사용자 한 명이 한 시간에 보낼 수 있는 문자 수 (번호 오타 재시도 여유를 둔다) */
export const SEND_HOURLY_LIMIT_PER_USER = 10;

/** 인증번호 하나로 확인할 수 있는 최대 횟수 */
export const MAX_VERIFY_ATTEMPTS = 5;
// 인증번호 유효시간(3분)보다 넉넉하게 잡는다. 새로 받으면 초기화된다.
const VERIFY_WINDOW_MS = 10 * 60 * 1000;

export type SendLimitResult =
  | {
      allowed: true;
      /** 발송에 실패했을 때 호출해 이번에 차감한 횟수를 되돌린다 */
      release: () => void;
    }
  | { allowed: false; message: string };

const COOLDOWN_MESSAGE =
  '인증번호를 방금 보냈습니다. 잠시 후 다시 시도해주세요.';
const HOURLY_MESSAGE =
  '인증번호 요청이 너무 많습니다. 잠시 후(최대 1시간) 다시 시도해주세요.';

/**
 * 인증번호 발송 1회를 소비한다.
 * 같은 번호라도 형식(하이픈 유무)이 다를 수 있어 숫자만 남겨 센다.
 * 모든 제한을 먼저 확인하고 전부 통과할 때만 한꺼번에 차감한다.
 * 하나에 막혔는데 나머지 횟수만 줄어드는 일을 막기 위해서다.
 */
export function checkSendLimit(
  userId: number,
  phoneNumber: string,
  now: number = Date.now()
): SendLimitResult {
  const digits = toPhoneDigits(phoneNumber);

  const limits: Array<{
    key: string;
    limit: number;
    windowMs: number;
    message: string;
  }> = [
    {
      key: `${PREFIX}send-cooldown:phone:${digits}`,
      limit: 1,
      windowMs: SEND_COOLDOWN_MS,
      message: COOLDOWN_MESSAGE,
    },
    {
      key: `${PREFIX}send-hourly:user:${userId}`,
      limit: SEND_HOURLY_LIMIT_PER_USER,
      windowMs: SEND_WINDOW_MS,
      message: HOURLY_MESSAGE,
    },
    {
      key: `${PREFIX}send-hourly:phone:${digits}`,
      limit: SEND_HOURLY_LIMIT_PER_PHONE,
      windowMs: SEND_WINDOW_MS,
      message: HOURLY_MESSAGE,
    },
  ];

  const blocked = limits.find(
    ({ key, limit }) => !canConsume(key, { limit, now })
  );
  if (blocked) {
    return { allowed: false, message: blocked.message };
  }

  limits.forEach(({ key, limit, windowMs }) =>
    consumeAttempt(key, { limit, windowMs, now })
  );

  return {
    allowed: true,
    release: () => limits.forEach(({ key }) => refundAttempt(key)),
  };
}

function verifyKey(userId: number, clubId: number, phoneNumber: string) {
  return `${PREFIX}verify:${userId}:${clubId}:${toPhoneDigits(phoneNumber)}`;
}

/**
 * 인증번호 확인 1회를 소비한다.
 * remaining이 0이면 이번이 마지막 기회였다는 뜻이다.
 */
export function consumeVerifyAttempt(
  userId: number,
  clubId: number,
  phoneNumber: string,
  now: number = Date.now()
): { allowed: boolean; remaining: number } {
  return consumeAttempt(verifyKey(userId, clubId, phoneNumber), {
    limit: MAX_VERIFY_ATTEMPTS,
    windowMs: VERIFY_WINDOW_MS,
    now,
  });
}

/** 새 인증번호를 보냈거나 인증에 성공하면 확인 횟수를 초기화한다 */
export function resetVerifyAttempts(
  userId: number,
  clubId: number,
  phoneNumber: string
): void {
  resetAttempts(verifyKey(userId, clubId, phoneNumber));
}

/** 모든 카운터를 지운다. 테스트에서 쓴다. */
export function resetPhoneVerificationLimits(): void {
  resetAttemptsByPrefix(PREFIX);
}
