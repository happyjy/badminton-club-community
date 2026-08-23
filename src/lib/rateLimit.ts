/**
 * 아주 단순한 인메모리 시도 횟수 제한.
 *
 * 서버리스에서는 인스턴스마다 카운터가 따로 놀기 때문에 완벽한 방어가 아니다.
 * 목적은 자동화 도구가 휴대폰 뒷 4자리(경우의 수 1만)를 전수 시도하는 것을
 * 충분히 느리게 만드는 것이다. 실제 남용이 관측되면 영속 저장소로 옮긴다.
 */

type Bucket = {
  count: number;
  /** 이 시각이 지나면 카운터를 초기화한다 */
  expiresAt: number;
};

const buckets = new Map<string, Bucket>();

const DEFAULT_LIMIT = 10;
const DEFAULT_WINDOW_MS = 10 * 60 * 1000;

export type ConsumeOptions = {
  /** 시간 창 안에서 허용할 최대 시도 횟수 */
  limit?: number;
  /** 시간 창 길이(ms) */
  windowMs?: number;
  /** 현재 시각. 테스트에서 시간을 고정하기 위해 주입한다 */
  now?: number;
};

export type ConsumeResult = {
  allowed: boolean;
  remaining: number;
};

/**
 * 시도 1회를 소비한다.
 * 제한을 넘으면 allowed=false를 돌려준다. 호출부가 429로 응답하면 된다.
 */
export function consumeAttempt(
  key: string,
  options: ConsumeOptions = {}
): ConsumeResult {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const now = options.now ?? Date.now();

  const existing = buckets.get(key);
  // 창이 지났으면 새 창을 연다
  if (!existing || existing.expiresAt <= now) {
    buckets.set(key, { count: 1, expiresAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count };
}

/** 카운터를 지운다. 테스트에서 쓴다. */
export function resetAttempts(key: string): void {
  buckets.delete(key);
}

/**
 * 요청자 IP를 뽑는다. 프록시 뒤에 있으므로 x-forwarded-for를 먼저 본다.
 * 헤더는 위조 가능하지만, 이 제한의 목적은 정직한 자동화를 늦추는 것이라 충분하다.
 */
export function getClientIp(headers: {
  'x-forwarded-for'?: string | string[];
}): string {
  const forwarded = headers['x-forwarded-for'];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return raw?.split(',')[0]?.trim() || 'unknown';
}
