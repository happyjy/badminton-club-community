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
  consumeAttempt,
  resetAttempts,
  resetAttemptsByPrefix,
} from './rateLimit';

const PREFIX = 'phone-verification:';

/** 같은 사용자·같은 번호로 다시 보내기까지 기다릴 시간 */
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
  | { allowed: true }
  | { allowed: false; message: string };

/**
 * 인증번호 발송 1회를 소비한다.
 * 같은 번호라도 형식(하이픈 유무)이 다를 수 있어 숫자만 남겨 센다.
 */
export function checkSendLimit(
  userId: number,
  phoneNumber: string,
  now: number = Date.now()
): SendLimitResult {
  const digits = toPhoneDigits(phoneNumber);

  const cooldownKeys = [
    `${PREFIX}send-cooldown:user:${userId}`,
    `${PREFIX}send-cooldown:phone:${digits}`,
  ];
  for (const key of cooldownKeys) {
    const { allowed } = consumeAttempt(key, {
      limit: 1,
      windowMs: SEND_COOLDOWN_MS,
      now,
    });
    if (!allowed) {
      return {
        allowed: false,
        message: '인증번호를 방금 보냈습니다. 잠시 후 다시 시도해주세요.',
      };
    }
  }

  const hourlyLimits: Array<[string, number]> = [
    [`${PREFIX}send-hourly:user:${userId}`, SEND_HOURLY_LIMIT_PER_USER],
    [`${PREFIX}send-hourly:phone:${digits}`, SEND_HOURLY_LIMIT_PER_PHONE],
  ];
  for (const [key, limit] of hourlyLimits) {
    const { allowed } = consumeAttempt(key, {
      limit,
      windowMs: SEND_WINDOW_MS,
      now,
    });
    if (!allowed) {
      return {
        allowed: false,
        message:
          '인증번호 요청이 너무 많습니다. 잠시 후(최대 1시간) 다시 시도해주세요.',
      };
    }
  }

  return { allowed: true };
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
