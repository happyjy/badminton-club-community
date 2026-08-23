# 대회 외부 참가자 신청 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로그인 없이 대회에 참가 신청할 수 있는 공개 경로를 추가하고, 관리자가 외부 신청을 회원 신청과 구분해 볼 수 있게 한다.

**Architecture:** 기존 회원 신청 흐름(`entries/index.ts`)은 그대로 두고, 인증 없는 `external/*` API와 페이지를 병렬로 추가한다. 참가비 계산(`calculateEventFee`)과 검증(`validateEntrySubmission`)은 **회원·외부가 같은 함수를 공유**해 금액·규칙이 갈라지지 않게 한다. `TournamentEntry.userId`를 nullable로 바꾸는 것이 이 작업의 유일한 파괴적 변경이며, 그 파급을 Task 2에서 한꺼번에 정리한다.

**Tech Stack:** Next.js Pages Router, Prisma + PostgreSQL(Supabase), react-hook-form, zod, Jest + Testing Library, Tailwind

**Spec:** `docs/superpowers/specs/2026-08-23-external-tournament-entry-design.md`

## Global Constraints

- **DB는 프로덕션이다.** `.env`의 `DATABASE_URL`은 실운영 Supabase를 가리킨다(회원 445명, 신청 기록 다수). `prisma migrate dev` 절대 금지. 스키마 변경은 `CLAUDE.md`의 절차를 따르고, **SQL 적용 전 반드시 사용자에게 확인받는다.**
- **커밋 메시지에 `Co-Authored-By: Claude` 트레일러를 넣지 않는다.** PR 본문에 `🤖 Generated with` 푸터도 넣지 않는다.
- 테스트는 Jest. `import { describe, expect, it } from '@jest/globals';` 로 시작한다. 실행은 `npm test`.
- 스키마는 `prisma/schema/*.prisma`(도메인별 파일)를 고치고 `npm run build:schema`로 통합한다. `prisma/schema.prisma`는 자동 생성 파일이므로 직접 고치지 않는다.
- 기존 대회·신청 데이터의 동작이 바뀌면 안 된다. 신규 필드 기본값은 `allowExternalEntry = false`, `surchargeUnit = PER_PLAYER`.
- 작은 변경에는 `npm run build`를 돌리지 않는다. `npx tsc --noEmit` + `npm test`로 확인한다.
- 서버는 클라이언트가 보낸 금액·소속 여부를 신뢰하지 않는다. 항상 DB 값으로 재계산한다.

---

## Task 1: 참가비 부과 단위 (`PER_TEAM`)

`calculateEventFee`에 부과 단위를 추가한다. DB 변경 없이 순수 함수만 고치므로 가장 먼저 한다.

**Files:**
- Modify: `src/lib/tournament/fee.ts`
- Test: `src/lib/tournament/fee.test.ts`

**Interfaces:**
- Consumes: 없음 (첫 태스크)
- Produces:
  - `export type SurchargeUnitValue = 'PER_PLAYER' | 'PER_TEAM'`
  - `calculateEventFee({ baseFee, surcharge, unit?, playerKeys, players }): number` — `unit` 생략 시 `'PER_PLAYER'`

> Prisma가 생성하는 `SurchargeUnit` enum을 직접 import하지 않고 문자열 리터럴 유니온을 쓴다. `fee.ts`는 클라이언트 컴포넌트(`EntrySummary.tsx`)에서도 import하므로 `@prisma/client` 의존을 만들지 않는 편이 안전하다. 기존 `EntryEventStatus`도 `@/types/tournament.types`에서 가져오는 같은 패턴이다.

- [ ] **Step 1: 실패하는 테스트를 작성한다**

`src/lib/tournament/fee.test.ts`의 `describe('calculateEventFee', ...)` 블록 맨 끝(마지막 `it`의 닫는 `});` 다음, `describe`를 닫는 `});` 앞)에 아래를 추가한다:

```ts
  describe('PER_TEAM 부과 단위', () => {
    it('외부 선수가 2명이어도 추가금을 1회만 더한다', () => {
      const result = calculateEventFee({
        baseFee: 60000,
        surcharge: 10000,
        unit: 'PER_TEAM',
        playerKeys: ['a', 'b'],
        players: [player('a', false), player('b', false)],
      });
      expect(result).toBe(70000);
    });

    it('외부 선수가 1명이어도 추가금을 1회 더한다', () => {
      const result = calculateEventFee({
        baseFee: 60000,
        surcharge: 10000,
        unit: 'PER_TEAM',
        playerKeys: ['a', 'b'],
        players: [player('a', true), player('b', false)],
      });
      expect(result).toBe(70000);
    });

    it('모두 소속이면 추가금이 붙지 않는다', () => {
      const result = calculateEventFee({
        baseFee: 60000,
        surcharge: 10000,
        unit: 'PER_TEAM',
        playerKeys: ['a', 'b'],
        players: [player('a', true), player('b', true)],
      });
      expect(result).toBe(60000);
    });

    it('추가금이 0원이면 단위와 무관하게 기본 참가비만 받는다', () => {
      const result = calculateEventFee({
        baseFee: 60000,
        surcharge: 0,
        unit: 'PER_TEAM',
        playerKeys: ['a', 'b'],
        players: [player('a', false), player('b', false)],
      });
      expect(result).toBe(60000);
    });

    it('unit을 생략하면 기존 동작(1인당)을 유지한다', () => {
      const result = calculateEventFee({
        baseFee: 60000,
        surcharge: 10000,
        playerKeys: ['a', 'b'],
        players: [player('a', false), player('b', false)],
      });
      expect(result).toBe(80000);
    });
  });
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

```bash
npm test -- src/lib/tournament/fee.test.ts
```

기대: `PER_TEAM` 케이스가 80000을 반환해 FAIL. (`unit`은 타입에 없는 키라 zod가 아닌 TS 오류도 함께 난다.)

- [ ] **Step 3: 최소 구현을 작성한다**

`src/lib/tournament/fee.ts`에서 `EventFeeInput` 타입과 `calculateEventFee` 함수를 아래로 교체한다:

```ts
/** 추가금 부과 단위. Prisma의 SurchargeUnit enum과 값이 같아야 한다. */
export type SurchargeUnitValue = 'PER_PLAYER' | 'PER_TEAM';

export type EventFeeInput = {
  /** 종목에 정의된 기본 참가비 */
  baseFee: number;
  /** 외부 선수에게 붙는 추가금. 0이면 추가금 미사용 */
  surcharge: number;
  /** 부과 단위. 생략하면 기존 동작인 1인당 부과 */
  unit?: SurchargeUnitValue;
  /** 이 종목에 배정된 선수 key 목록 */
  playerKeys: string[];
  /** 신청서 전체 선수 명단 */
  players: SurchargeablePlayer[];
};

/**
 * 종목 1줄의 참가비를 계산한다.
 *
 * 추가금 부과 단위는 대회마다 다르다.
 * - PER_PLAYER: "소속이 아닌 경우 1인당 1만원 추가" — 외부 선수 수만큼 붙는다
 * - PER_TEAM:   "외부 선수가 낀 팀은 1만원 추가" — 몇 명이든 종목당 1회만 붙는다
 *
 * 한 선수가 여러 종목에 나가면 어느 단위든 종목마다 각각 부과된다.
 */
export function calculateEventFee({
  baseFee,
  surcharge,
  unit = 'PER_PLAYER',
  playerKeys,
  players,
}: EventFeeInput): number {
  if (surcharge <= 0) return baseFee;

  const memberByKey = new Map(
    players.map((player) => [player.key, player.isClubMember])
  );
  // 명단에 없는 key는 검증 단계에서 걸러지므로 여기서는 소속으로 본다
  const externalCount = playerKeys.filter(
    (key) => memberByKey.get(key) === false
  ).length;

  if (externalCount === 0) return baseFee;
  // 팀당 부과는 외부 선수가 1명이라도 있으면 1회만 붙인다
  if (unit === 'PER_TEAM') return baseFee + surcharge;

  return baseFee + externalCount * surcharge;
}
```

- [ ] **Step 4: 테스트가 통과하는지 확인한다**

```bash
npm test -- src/lib/tournament/fee.test.ts
npx tsc --noEmit
```

기대: 전부 PASS. 기존 `PER_PLAYER` 테스트도 그대로 통과해야 한다(`unit` 기본값 덕분).

- [ ] **Step 5: 커밋한다**

```bash
git add src/lib/tournament/fee.ts src/lib/tournament/fee.test.ts
git commit -m "feat(tournament): 참가비 추가금 부과 단위에 팀당 옵션 추가"
```

---

## Task 2: 외부 신청 검증 규칙

외부 신청은 선수 전원이 비회원이므로 `minClubMembersPerTeam` 검증을 면제해야 한다. 면제하지 않으면 모든 외부 신청이 제출 불가가 된다.

**Files:**
- Modify: `src/lib/tournament/validation.ts`
- Test: `src/lib/tournament/validation.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `validateEntrySubmission(input, tournament, options?: { isExternal?: boolean }): ValidationResult`
  - `options.isExternal === true`면 최소 소속 인원 검증만 건너뛴다. 나머지 규칙(종목 인원 수, 중복 배정, 연령·급수 유효성)은 그대로 적용된다.

- [ ] **Step 1: 실패하는 테스트를 작성한다**

`src/lib/tournament/validation.test.ts` 파일 맨 끝에 아래 `describe`를 추가한다. 파일 상단에 이미 있는 헬퍼/타입 import는 그대로 두고, 기존 테스트가 쓰는 대회 객체 만드는 방식을 참고해 맞춘다(기존 파일의 헬퍼 이름이 다르면 그것을 쓴다):

```ts
describe('validateEntrySubmission - 외부 신청', () => {
  const tournament = {
    eventTypes: [
      { id: 'e1', name: '남자복식', playerCount: 2, isActive: true },
    ],
    ageGroups: ['30대'],
    levels: [],
    memberLabel: '당산클럽 소속',
    minClubMembersPerTeam: 1,
  };

  const externalInput = {
    depositorName: '김철수',
    teamName: null,
    privacyAgreed: true as const,
    players: [
      {
        key: 'p1',
        name: '김철수',
        gender: '남',
        birthDate: '1990-01-01',
        phoneNumber: '010-1111-2222',
        tshirtSize: null,
        isClubMember: false,
        order: 0,
      },
      {
        key: 'p2',
        name: '이영희',
        gender: '남',
        birthDate: '1991-02-02',
        phoneNumber: '010-3333-4444',
        tshirtSize: null,
        isClubMember: false,
        order: 1,
      },
    ],
    events: [
      { eventTypeId: 'e1', ageGroup: '30대', level: '', playerKeys: ['p1', 'p2'] },
    ],
  };

  it('외부 신청이면 최소 소속 인원 검증을 면제한다', () => {
    const result = validateEntrySubmission(externalInput, tournament, {
      isExternal: true,
    });
    expect(result.ok).toBe(true);
  });

  it('회원 신청이면 최소 소속 인원 검증을 그대로 적용한다', () => {
    const result = validateEntrySubmission(externalInput, tournament);
    expect(result.ok).toBe(false);
  });

  it('외부 신청이어도 종목 인원 수가 맞지 않으면 거부한다', () => {
    const result = validateEntrySubmission(
      {
        ...externalInput,
        events: [
          { eventTypeId: 'e1', ageGroup: '30대', level: '', playerKeys: ['p1'] },
        ],
      },
      tournament,
      { isExternal: true }
    );
    expect(result.ok).toBe(false);
  });

  it('외부 신청이어도 선택할 수 없는 연령이면 거부한다', () => {
    const result = validateEntrySubmission(
      {
        ...externalInput,
        events: [
          {
            eventTypeId: 'e1',
            ageGroup: '99대',
            level: '',
            playerKeys: ['p1', 'p2'],
          },
        ],
      },
      tournament,
      { isExternal: true }
    );
    expect(result.ok).toBe(false);
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

```bash
npm test -- src/lib/tournament/validation.test.ts
```

기대: "외부 신청이면 최소 소속 인원 검증을 면제한다"가 FAIL (세 번째 인자를 받지 않으므로 검증이 걸린다).

- [ ] **Step 3: 최소 구현을 작성한다**

`src/lib/tournament/validation.ts`에서 함수 시그니처와 `minClubMembers` 계산 줄만 고친다.

시그니처를 아래로 바꾼다:

```ts
export type ValidateEntryOptions = {
  /**
   * 외부(비로그인) 신청 여부.
   * 외부 신청서는 선수 전원이 비회원이므로 최소 소속 인원 검증을 면제한다.
   * 면제하지 않으면 모든 외부 신청이 제출 불가가 된다.
   */
  isExternal?: boolean;
};

export function validateEntrySubmission(
  input: EntrySubmissionInput,
  tournament: ValidatableTournament,
  options: ValidateEntryOptions = {}
): ValidationResult {
```

그리고 기존의

```ts
  const minClubMembers = tournament.minClubMembersPerTeam ?? 0;
```

를 아래로 바꾼다:

```ts
  const minClubMembers = options.isExternal
    ? 0
    : (tournament.minClubMembersPerTeam ?? 0);
```

`if (minClubMembers > 0)` 블록은 그대로 둔다. 0이 되면 자연히 건너뛴다.

- [ ] **Step 4: 테스트가 통과하는지 확인한다**

```bash
npm test -- src/lib/tournament/validation.test.ts
npx tsc --noEmit
```

기대: 전부 PASS. 기존 검증 테스트도 그대로 통과해야 한다(세 번째 인자 기본값 덕분).

- [ ] **Step 5: 커밋한다**

```bash
git add src/lib/tournament/validation.ts src/lib/tournament/validation.test.ts
git commit -m "feat(tournament): 외부 신청 시 최소 소속 인원 검증 면제"
```

---

## Task 3: 외부 신청 조회 키 유틸

이름 + 휴대폰 뒷 4자리로 신청서를 찾기 위한 정규화·대조 로직. 순수 함수라 DB 없이 테스트한다.

**Files:**
- Create: `src/lib/tournament/externalEntry.ts`
- Test: `src/lib/tournament/externalEntry.test.ts`

**Interfaces:**
- Consumes: `formatPhoneNumber`, `toPhoneDigits` (`@/utils/phoneNumber`)
- Produces:
  - `normalizeContactName(value: string): string` — 모든 공백 제거
  - `getPhoneTail(value: string): string` — 숫자만 남긴 뒤 마지막 4자리
  - `matchesPhoneTail(storedPhone: string, inputTail: string): boolean`

- [ ] **Step 1: 실패하는 테스트를 작성한다**

`src/lib/tournament/externalEntry.test.ts` 를 새로 만든다:

```ts
import { describe, expect, it } from '@jest/globals';

import {
  getPhoneTail,
  matchesPhoneTail,
  normalizeContactName,
} from './externalEntry';

describe('normalizeContactName', () => {
  it('이름 안팎의 공백을 모두 제거한다', () => {
    expect(normalizeContactName(' 김 철수 ')).toBe('김철수');
  });

  it('공백이 없는 이름은 그대로 둔다', () => {
    expect(normalizeContactName('김철수')).toBe('김철수');
  });

  it('탭이나 연속 공백도 제거한다', () => {
    expect(normalizeContactName('김\t철  수')).toBe('김철수');
  });
});

describe('getPhoneTail', () => {
  it('하이픈이 있는 번호에서 뒤 4자리를 뽑는다', () => {
    expect(getPhoneTail('010-1234-5678')).toBe('5678');
  });

  it('숫자만 있는 번호에서도 뒤 4자리를 뽑는다', () => {
    expect(getPhoneTail('01012345678')).toBe('5678');
  });

  it('4자리 미만이면 있는 만큼 반환한다', () => {
    expect(getPhoneTail('123')).toBe('123');
  });

  it('빈 문자열이면 빈 문자열을 반환한다', () => {
    expect(getPhoneTail('')).toBe('');
  });
});

describe('matchesPhoneTail', () => {
  it('저장된 번호의 뒤 4자리가 입력과 같으면 true', () => {
    expect(matchesPhoneTail('010-1234-5678', '5678')).toBe(true);
  });

  it('입력에 하이픈이 섞여 있어도 숫자만 비교한다', () => {
    expect(matchesPhoneTail('010-1234-5678', '-5678')).toBe(true);
  });

  it('뒤 4자리가 다르면 false', () => {
    expect(matchesPhoneTail('010-1234-5678', '9999')).toBe(false);
  });

  it('입력이 4자리가 아니면 false로 막는다', () => {
    expect(matchesPhoneTail('010-1234-5678', '678')).toBe(false);
  });

  it('빈 입력은 false', () => {
    expect(matchesPhoneTail('010-1234-5678', '')).toBe(false);
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

```bash
npm test -- src/lib/tournament/externalEntry.test.ts
```

기대: FAIL — `Cannot find module './externalEntry'`

- [ ] **Step 3: 최소 구현을 작성한다**

`src/lib/tournament/externalEntry.ts` 를 새로 만든다:

```ts
import { toPhoneDigits } from '@/utils/phoneNumber';

/** 조회에 쓰는 휴대폰 뒷자리 길이 */
export const PHONE_TAIL_LENGTH = 4;

/**
 * 조회 키로 쓸 이름을 정규화한다.
 * "김 철수"와 "김철수"가 같은 사람으로 취급되도록 공백을 모두 없앤다.
 * 중복 신청 차단(부분 유니크 인덱스)도 이 값을 기준으로 하므로,
 * 저장할 때와 조회할 때 반드시 같은 함수를 거쳐야 한다.
 */
export function normalizeContactName(value: string): string {
  return value.replace(/\s/g, '');
}

/** 전화번호에서 숫자만 남긴 뒤 마지막 4자리를 돌려준다. */
export function getPhoneTail(value: string): string {
  const digits = toPhoneDigits(value);
  return digits.slice(-PHONE_TAIL_LENGTH);
}

/**
 * 저장된 전화번호의 뒷자리가 사용자가 입력한 뒷자리와 일치하는지 본다.
 * 입력이 4자리가 아니면 대조 범위가 넓어져 타인 신청서가 열릴 수 있으므로 거부한다.
 */
export function matchesPhoneTail(
  storedPhone: string,
  inputTail: string
): boolean {
  const digits = toPhoneDigits(inputTail);
  if (digits.length !== PHONE_TAIL_LENGTH) return false;
  return getPhoneTail(storedPhone) === digits;
}
```

- [ ] **Step 4: 테스트가 통과하는지 확인한다**

```bash
npm test -- src/lib/tournament/externalEntry.test.ts
npx tsc --noEmit
```

기대: 전부 PASS.

- [ ] **Step 5: 커밋한다**

```bash
git add src/lib/tournament/externalEntry.ts src/lib/tournament/externalEntry.test.ts
git commit -m "feat(tournament): 외부 신청 조회 키 정규화 유틸 추가"
```

---

## Task 4: 시도 횟수 제한 유틸

휴대폰 뒷 4자리는 경우의 수가 1만이라, 무제한 시도를 허용하면 타인의 신청서(생년월일·전화번호 포함)가 열린다.

**Files:**
- Create: `src/lib/rateLimit.ts`
- Test: `src/lib/rateLimit.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `consumeAttempt(key: string, options?: { limit?: number; windowMs?: number; now?: number }): { allowed: boolean; remaining: number }`
  - `resetAttempts(key: string): void` — 테스트용
  - 기본값: `limit = 10`, `windowMs = 600_000` (10분)

> `now`를 주입 가능하게 만드는 이유: 시간 경과 테스트를 `setTimeout` 없이 결정적으로 쓰기 위해서다.

- [ ] **Step 1: 실패하는 테스트를 작성한다**

`src/lib/rateLimit.test.ts` 를 새로 만든다:

```ts
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
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

```bash
npm test -- src/lib/rateLimit.test.ts
```

기대: FAIL — `Cannot find module './rateLimit'`

- [ ] **Step 3: 최소 구현을 작성한다**

`src/lib/rateLimit.ts` 를 새로 만든다:

```ts
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
```

- [ ] **Step 4: 테스트가 통과하는지 확인한다**

```bash
npm test -- src/lib/rateLimit.test.ts
npx tsc --noEmit
```

기대: 전부 PASS.

- [ ] **Step 5: 커밋한다**

```bash
git add src/lib/rateLimit.ts src/lib/rateLimit.test.ts
git commit -m "feat(lib): 인메모리 시도 횟수 제한 유틸 추가"
```

---

## Task 5: 스키마 변경과 마이그레이션 (⚠️ 사용자 확인 필요)

**이 태스크는 프로덕션 DB를 건드린다. Step 6에서 반드시 멈추고 사용자 승인을 받는다.**

**Files:**
- Modify: `prisma/schema/enums.prisma`
- Modify: `prisma/schema/tournament.prisma`
- Create: `prisma/migrations/<타임스탬프>_external_tournament_entry/migration.sql`

**Interfaces:**
- Consumes: 없음
- Produces: Prisma 클라이언트에 아래가 생긴다
  - `SurchargeUnit` enum (`PER_PLAYER` | `PER_TEAM`)
  - `Tournament.allowExternalEntry: boolean`, `Tournament.surchargeUnit: SurchargeUnit`
  - `TournamentEntry.userId: number | null`, `clubMemberId: number | null`
  - `TournamentEntry.isExternal: boolean`, `contactName: string | null`, `contactPhone: string | null`

- [ ] **Step 1: enum을 추가한다**

`prisma/schema/enums.prisma` 파일 끝에 추가:

```prisma
// 비회원 추가금 부과 단위
enum SurchargeUnit {
  PER_PLAYER  // 외부 선수 1인당 부과
  PER_TEAM    // 종목당 1회 부과 (외부 선수가 1명이라도 있으면)
}
```

- [ ] **Step 2: Tournament에 필드를 추가한다**

`prisma/schema/tournament.prisma`의 `model Tournament` 안, `minClubMembersPerTeam` 줄 바로 아래에 추가:

```prisma
  // 로그인 없이 신청할 수 있는 공개 링크를 열지 여부.
  // 기본값이 false라 기존 대회는 회원 전용 그대로다.
  allowExternalEntry    Boolean @default(false)
  // 추가금을 1인당 물릴지 팀당 물릴지. 기존 동작이 1인당이므로 그것이 기본값이다.
  surchargeUnit         SurchargeUnit @default(PER_PLAYER)
```

- [ ] **Step 3: TournamentEntry를 고친다**

`prisma/schema/tournament.prisma`의 `model TournamentEntry`에서:

`userId`, `clubMemberId` 줄을 nullable로 바꾸고 외부 신청 필드를 추가한다. 아래 형태가 되어야 한다:

```prisma
model TournamentEntry {
  id               String              @id @default(cuid())
  tournamentId     String
  // 외부(비로그인) 신청서에는 계정이 없으므로 nullable이다.
  userId           Int?
  clubMemberId     Int?
  // 외부 신청 여부. 관리자 화면에서 회원 신청과 구분하는 기준이다.
  isExternal       Boolean             @default(false)
  // 외부 신청자의 조회 키. 이름은 공백을 제거해, 번호는 포맷을 통일해 저장한다.
  // 입금자명은 대리 입금 때 본인과 다를 수 있어 조회 키로 쓰지 않는다.
  contactName      String?
  contactPhone     String?
  depositorName    String
  teamName         String?
  paymentStatus    EntryPaymentStatus  @default(PENDING)
  totalFee         Int                 @default(0)
  privacyAgreedAt  DateTime
  createdAt        DateTime            @default(now())
  updatedAt        DateTime            @updatedAt

  tournament       Tournament    @relation(fields: [tournamentId], references: [id], onDelete: Cascade)
  user             User?         @relation(fields: [userId], references: [id])
  clubMember       ClubMember?   @relation("TournamentEntryMember", fields: [clubMemberId], references: [id])
  players          EntryPlayer[]
  entryEvents      EntryEvent[]

  // userId가 NULL인 외부 신청서는 Postgres에서 이 제약에 걸리지 않는다.
  // (NULL끼리는 서로 다르게 취급된다) 회원 중복 제출 방지는 그대로 동작한다.
  @@unique([tournamentId, userId])
  @@index([tournamentId])
  @@index([userId])
  @@index([tournamentId, isExternal])
}
```

- [ ] **Step 4: 통합 스키마를 빌드한다**

```bash
npm run build:schema
```

기대: 성공. `prisma/schema.prisma`가 갱신된다.

- [ ] **Step 5: 무엇이 바뀌는지 확인한다 (읽기 전용)**

```bash
npx prisma migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma --script
```

출력에는 **기존 스키마 드리프트**(`PostCategory`, `PostComment`, `PaymentRecord`의 인덱스·FK)가 섞여 나온다. 그건 이번 작업과 무관하므로 **가져오지 않는다.**

- [ ] **Step 6: 마이그레이션 SQL을 손으로 작성한다**

`prisma/migrations/20260823000000_external_tournament_entry/migration.sql` 을 만들고 아래만 넣는다. diff 출력을 통째로 복사하지 않는다:

```sql
-- 비회원 추가금 부과 단위
CREATE TYPE "SurchargeUnit" AS ENUM ('PER_PLAYER', 'PER_TEAM');

-- 대회: 외부 신청 허용 여부와 추가금 부과 단위
ALTER TABLE "Tournament"
  ADD COLUMN "allowExternalEntry" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "surchargeUnit" "SurchargeUnit" NOT NULL DEFAULT 'PER_PLAYER';

-- 신청서: 외부 신청은 계정이 없으므로 userId/clubMemberId를 nullable로 완화한다.
-- 기존 행은 모두 값이 채워져 있으므로 데이터 손실이 없다.
ALTER TABLE "TournamentEntry"
  ALTER COLUMN "userId" DROP NOT NULL,
  ALTER COLUMN "clubMemberId" DROP NOT NULL;

-- 신청서: 외부 신청 구분과 조회 키
ALTER TABLE "TournamentEntry"
  ADD COLUMN "isExternal" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "contactName" TEXT,
  ADD COLUMN "contactPhone" TEXT;

-- 외부 신청의 중복 제출 차단.
-- 회원 신청서(isExternal=false)는 이 인덱스에 걸리지 않는다.
CREATE UNIQUE INDEX "TournamentEntry_external_unique"
  ON "TournamentEntry" ("tournamentId", "contactPhone", "contactName")
  WHERE "isExternal" = true;

-- 관리자 목록에서 외부 신청만 추려 볼 때 쓴다
CREATE INDEX "TournamentEntry_tournamentId_isExternal_idx"
  ON "TournamentEntry" ("tournamentId", "isExternal");
```

- [ ] **Step 7: ⚠️ 여기서 멈추고 사용자에게 확인받는다**

사용자에게 아래를 설명하고 **명시적 승인을 기다린다:**

- 적용할 SQL 전문
- 영향 범위: `Tournament` 2컬럼 추가, `TournamentEntry` 3컬럼 추가 + 2컬럼 NOT NULL 완화, 인덱스 2개 추가
- 기존 행 데이터는 변경되지 않음 (전부 기본값 추가 / 제약 완화)
- 되돌리려면: 추가한 컬럼·인덱스·타입을 DROP하고 `userId`/`clubMemberId`에 NOT NULL을 다시 건다 (NOT NULL 복구는 외부 신청서가 생기기 전에만 가능)
- 백업 상태를 확인하도록 안내

**승인 없이 Step 8로 넘어가지 않는다.**

- [ ] **Step 8: 승인 후 적용한다**

```bash
npx prisma db execute \
  --file prisma/migrations/20260823000000_external_tournament_entry/migration.sql \
  --schema prisma/schema.prisma
npx prisma migrate resolve --applied 20260823000000_external_tournament_entry
npx prisma generate
```

- [ ] **Step 9: 타입이 맞는지 확인한다**

```bash
npx tsc --noEmit
```

기대: `userId`/`clubMemberId`가 nullable이 되면서 **Task 6에서 고칠 지점들이 오류로 드러난다.** 이 오류 목록을 Task 6의 입력으로 쓴다. 오류가 없다면 nullable 전환이 반영되지 않은 것이므로 `prisma generate`를 다시 돌린다.

- [ ] **Step 10: 커밋한다**

```bash
git add prisma/schema/enums.prisma prisma/schema/tournament.prisma prisma/schema.prisma prisma/migrations/
git commit -m "feat(tournament): 외부 신청용 스키마 추가"
```

---

## Task 6: nullable 전환 파급 정리

Task 5에서 `userId`가 nullable이 되며 깨진 곳들을 고친다. 기능 추가가 아니라 **기존 동작 보존**이 목적이다.

**Files:**
- Modify: `src/pages/api/clubs/[id]/tournaments/[tournamentId]/entries/my.ts`
- Modify: `src/pages/api/clubs/[id]/tournaments/[tournamentId]/entries/[entryId]/index.ts:58`
- Modify: `src/pages/api/clubs/[id]/tournaments/[tournamentId]/entries/[entryId]/events/[entryEventId].ts:44`
- Modify: `src/types/tournament.types.ts`

**Interfaces:**
- Consumes: Task 5의 Prisma 타입
- Produces: 기존 회원 신청 API가 nullable 스키마에서도 그대로 동작한다

- [ ] **Step 1: `my.ts`의 조회를 `findFirst`로 바꾼다**

nullable 복합키는 `findUnique`에 쓸 수 없다. `my.ts`에서

```ts
    const entry = await prisma.tournamentEntry.findUnique({
      where: { tournamentId_userId: { tournamentId, userId: req.user.id } },
```

를 아래로 바꾼다:

```ts
    // userId가 nullable이 되어 복합 유니크 키를 findUnique에 쓸 수 없다.
    // 회원 신청서는 (tournamentId, userId)로 여전히 최대 1건이다.
    const entry = await prisma.tournamentEntry.findFirst({
      where: { tournamentId, userId: req.user.id },
```

나머지 `include` 블록과 응답은 그대로 둔다.

- [ ] **Step 2: 소유권 검사에 명시적 null 가드를 넣는다**

`entries/[entryId]/index.ts:58`과 `entries/[entryId]/events/[entryEventId].ts:44`의

```ts
    if (entry.userId !== req.user.id) {
```

를 두 파일 모두 아래로 바꾼다:

```ts
    // 외부 신청서는 userId가 없다. 회원 세션으로는 접근할 수 없어야 한다.
    if (entry.userId == null || entry.userId !== req.user.id) {
```

- [ ] **Step 3: 타입에 외부 신청 필드를 반영한다**

`src/types/tournament.types.ts`의 `TournamentInput` 인터페이스에서 `minClubMembersPerTeam: number;` 줄 아래에 추가:

```ts
  allowExternalEntry: boolean;
  surchargeUnit: 'PER_PLAYER' | 'PER_TEAM';
```

- [ ] **Step 4: 타입 검사와 전체 테스트를 돌린다**

```bash
npx tsc --noEmit
npm test
```

기대: 전부 통과. Step 1~3에서 잡지 못한 nullable 오류가 남아 있으면 같은 방식(옵셔널 체이닝 또는 명시적 null 가드)으로 고친다. `clubMember?.name` 형태가 필요한 지점이 나오면 Task 9에서 다루므로 여기서는 타입만 통과시킨다.

- [ ] **Step 5: 커밋한다**

```bash
git add src/pages/api src/types/tournament.types.ts
git commit -m "fix(tournament): 신청서 userId nullable 전환에 따른 조회·권한 검사 정리"
```

---

## Task 7: 관리자 폼에 외부 신청 설정 추가

관리자가 대회별로 공개 링크를 켜고, 추가금 부과 단위를 고를 수 있게 한다.

**Files:**
- Modify: `src/schemas/tournament.schema.ts`
- Modify: `src/components/organisms/tournament/admin/TournamentForm.tsx`
- Modify: `src/pages/clubs/[id]/tournaments/new.tsx:25-27`
- Modify: `src/pages/clubs/[id]/tournaments/[tournamentId]/edit.tsx:67-69`
- Modify: `src/pages/api/clubs/[id]/tournaments/index.ts:82-84`
- Modify: `src/pages/api/clubs/[id]/tournaments/[tournamentId]/index.ts:147-149`

**Interfaces:**
- Consumes: Task 5의 `SurchargeUnit`
- Produces: `tournamentInputSchema`가 `allowExternalEntry: boolean`, `surchargeUnit: 'PER_PLAYER' | 'PER_TEAM'` 을 받는다

- [ ] **Step 1: zod 스키마에 필드를 추가한다**

`src/schemas/tournament.schema.ts`의 `tournamentInputSchema` 안, `minClubMembersPerTeam` 정의 바로 아래에 추가:

```ts
    allowExternalEntry: z.boolean().default(false),
    surchargeUnit: z
      .enum(['PER_PLAYER', 'PER_TEAM'])
      .default('PER_PLAYER'),
```

- [ ] **Step 2: 관리자 폼에 입력을 추가한다**

`TournamentForm.tsx`에서 `minClubMembersPerTeam` 입력을 감싼 `FormField` 블록 바로 다음에 아래를 넣는다. `watch`가 이미 쓰이고 있지 않다면 `methods.watch`를 그대로 쓴다:

```tsx
          <FormField label="추가금 부과 단위">
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  value="PER_PLAYER"
                  {...methods.register('surchargeUnit')}
                />
                1인당
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  value="PER_TEAM"
                  {...methods.register('surchargeUnit')}
                />
                팀당
              </label>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              팀당으로 두면 한 종목에 외부 선수가 몇 명이든 추가금이 1회만
              붙습니다.
            </p>
          </FormField>

          <FormField label="외부 신청">
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4"
                {...methods.register('allowExternalEntry')}
              />
              <span>
                <span className="font-medium text-gray-800">
                  로그인 없이 신청할 수 있는 공개 링크를 연다
                </span>
                <span className="ml-2 text-gray-500">
                  링크를 아는 사람은 누구나 신청할 수 있습니다.
                </span>
              </span>
            </label>
          </FormField>
```

부과 단위 라디오는 추가금을 쓰지 않는 대회에서는 의미가 없다. 위 `추가금 부과 단위` FormField 전체를 아래 조건으로 감싼다:

```tsx
          {methods.watch('nonMemberSurcharge') > 0 && (
            /* 추가금 부과 단위 FormField */
          )}
```

- [ ] **Step 3: 폼 기본값을 채운다**

`src/pages/clubs/[id]/tournaments/new.tsx`의 기본값 객체에서 `minClubMembersPerTeam: 0,` 아래에 추가:

```ts
  allowExternalEntry: false,
  surchargeUnit: 'PER_PLAYER' as const,
```

`src/pages/clubs/[id]/tournaments/[tournamentId]/edit.tsx`의 기존값 매핑에서 `minClubMembersPerTeam: tournament.minClubMembersPerTeam,` 아래에 추가:

```ts
    allowExternalEntry: tournament.allowExternalEntry,
    surchargeUnit: tournament.surchargeUnit,
```

- [ ] **Step 4: 저장 API에 반영한다**

`src/pages/api/clubs/[id]/tournaments/index.ts`의 `create` data에서 `minClubMembersPerTeam: input.minClubMembersPerTeam,` 아래에 추가:

```ts
          allowExternalEntry: input.allowExternalEntry,
          surchargeUnit: input.surchargeUnit,
```

`src/pages/api/clubs/[id]/tournaments/[tournamentId]/index.ts`의 `update` data에도 같은 두 줄을 `minClubMembersPerTeam` 아래에 추가한다(들여쓰기는 주변에 맞춘다).

- [ ] **Step 5: 확인하고 커밋한다**

```bash
npx tsc --noEmit
npm test
```

기대: 전부 통과.

```bash
git add src/schemas/tournament.schema.ts src/components/organisms/tournament/admin/TournamentForm.tsx src/pages/clubs src/pages/api/clubs
git commit -m "feat(tournament): 관리자 폼에 외부 신청 허용과 추가금 부과 단위 추가"
```

---

## Task 8: 외부 신청 API

인증 없는 엔드포인트 3종. 공개 API이므로 방어를 함께 넣는다.

**Files:**
- Create: `src/pages/api/clubs/[id]/tournaments/[tournamentId]/external/tournament.ts`
- Create: `src/pages/api/clubs/[id]/tournaments/[tournamentId]/external/entries.ts`
- Create: `src/pages/api/clubs/[id]/tournaments/[tournamentId]/external/lookup.ts`
- Modify: `src/schemas/tournament.schema.ts`

**Interfaces:**
- Consumes: Task 1 `calculateEventFee`, Task 2 `validateEntrySubmission(..., { isExternal: true })`, Task 3 `normalizeContactName`/`matchesPhoneTail`, Task 4 `consumeAttempt`/`getClientIp`
- Produces:
  - `externalEntrySubmissionSchema` — `entrySubmissionSchema` + `contactName`, `contactPhone`
  - `GET /api/clubs/:id/tournaments/:tournamentId/external/tournament`
  - `POST /api/clubs/:id/tournaments/:tournamentId/external/entries`
  - `POST /api/clubs/:id/tournaments/:tournamentId/external/lookup`

- [ ] **Step 1: 외부 신청 zod 스키마를 추가한다**

`src/schemas/tournament.schema.ts` 파일 끝(`export type` 줄들 앞)에 추가:

```ts
// 외부 신청은 계정이 없으므로 조회에 쓸 이름·연락처를 따로 받는다
export const externalEntrySubmissionSchema = entrySubmissionSchema.extend({
  contactName: z.string().trim().min(1, '신청자 이름을 입력해주세요.'),
  contactPhone: z
    .string()
    .trim()
    .min(1, '연락처를 입력해주세요.')
    .refine(isValidPhoneNumber, '올바른 전화번호가 아닙니다.')
    .transform(formatPhoneNumber),
});

// 이름 + 휴대폰 뒷 4자리로 본인 신청서를 찾는다
export const externalLookupSchema = z.object({
  contactName: z.string().trim().min(1, '신청자 이름을 입력해주세요.'),
  phoneTail: z
    .string()
    .trim()
    .regex(/^\d{4}$/, '휴대폰 뒷 4자리를 입력해주세요.'),
});
```

파일 끝의 export type 목록에 추가:

```ts
export type ExternalEntrySubmissionParsed = z.infer<
  typeof externalEntrySubmissionSchema
>;
export type ExternalLookupParsed = z.infer<typeof externalLookupSchema>;
```

- [ ] **Step 2: 대회 공개 조회 API를 만든다**

`src/pages/api/clubs/[id]/tournaments/[tournamentId]/external/tournament.ts`:

```ts
import { prisma } from '@/lib/prisma';
import {
  firstQueryValue,
  handleApiError,
  parseClubId,
} from '@/lib/tournament/apiHelpers';

import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * 외부(비로그인) 신청자에게 보여줄 대회 정보.
 * 인증이 없으므로 대회 메타데이터만 돌려준다.
 * 신청 현황이나 타인의 선수 명단은 절대 포함하지 않는다.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res
      .status(405)
      .json({ error: '허용되지 않는 메소드입니다.', status: 405 });
  }

  const clubId = parseClubId(req.query.id);
  const tournamentId = firstQueryValue(req.query.tournamentId);
  if (!clubId || !tournamentId) {
    return res.status(400).json({ error: '잘못된 요청입니다.', status: 400 });
  }

  try {
    const tournament = await prisma.tournament.findFirst({
      where: { id: tournamentId, clubId, allowExternalEntry: true },
      select: {
        id: true,
        title: true,
        hostName: true,
        description: true,
        applyNotice: true,
        tournamentDate: true,
        location: true,
        applyStartAt: true,
        applyDeadline: true,
        status: true,
        useTeamName: true,
        tshirtSizes: true,
        bankAccount: true,
        memberLabel: true,
        nonMemberSurcharge: true,
        surchargeUnit: true,
        minClubMembersPerTeam: true,
        ageGroups: true,
        levels: true,
        eventTypes: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    // 외부 신청을 열지 않은 대회는 존재 자체를 알리지 않는다
    if (!tournament) {
      return res
        .status(404)
        .json({ error: '대회를 찾을 수 없습니다.', status: 404 });
    }

    return res
      .status(200)
      .json({ data: { tournament }, message: '대회 정보를 불러왔습니다.' });
  } catch (error) {
    return handleApiError(res, error);
  }
}
```

- [ ] **Step 3: 외부 신청 제출 API를 만든다**

`src/pages/api/clubs/[id]/tournaments/[tournamentId]/external/entries.ts`:

```ts
import { prisma } from '@/lib/prisma';
import {
  firstQueryValue,
  handleApiError,
  parseClubId,
} from '@/lib/tournament/apiHelpers';
import { normalizeContactName } from '@/lib/tournament/externalEntry';
import { calculateEventFee, calculateTotalFee } from '@/lib/tournament/fee';
import { isAcceptingEntries } from '@/lib/tournament/status';
import { validateEntrySubmission } from '@/lib/tournament/validation';
import { externalEntrySubmissionSchema } from '@/schemas/tournament.schema';

import type { NextApiRequest, NextApiResponse } from 'next';

// 트랜잭션 안에서 마감을 감지했을 때 롤백시키기 위한 신호용 에러
class EntryClosedError extends Error {}

/**
 * 로그인 없이 대회에 신청한다.
 * 회원 신청(entries/index.ts)과 같은 계산·검증 함수를 쓰되,
 * 선수 전원을 비회원으로 고정하고 최소 소속 인원 검증을 면제한다.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res
      .status(405)
      .json({ error: '허용되지 않는 메소드입니다.', status: 405 });
  }

  const clubId = parseClubId(req.query.id);
  const tournamentId = firstQueryValue(req.query.tournamentId);
  if (!clubId || !tournamentId) {
    return res.status(400).json({ error: '잘못된 요청입니다.', status: 400 });
  }

  try {
    const parsed = externalEntrySubmissionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.errors[0]?.message ?? '입력값이 올바르지 않습니다.',
        status: 400,
      });
    }
    const input = { ...parsed.data, privacyAgreed: true as const };

    const tournament = await prisma.tournament.findFirst({
      where: { id: tournamentId, clubId, allowExternalEntry: true },
      include: { eventTypes: true },
    });
    if (!tournament) {
      return res
        .status(404)
        .json({ error: '대회를 찾을 수 없습니다.', status: 404 });
    }

    // 외부 신청서는 선수 전원이 비회원이다. 클라이언트가 보낸 값을 믿지 않는다.
    const players = input.players.map((player) => ({
      ...player,
      isClubMember: false,
    }));

    const validation = validateEntrySubmission(
      { ...input, players },
      tournament,
      { isExternal: true }
    );
    if (!validation.ok) {
      return res.status(400).json({ error: validation.error, status: 400 });
    }

    const feeById = new Map(
      tournament.eventTypes.map((eventType) => [eventType.id, eventType.fee])
    );
    const useSurcharge = tournament.nonMemberSurcharge > 0;
    const surchargePlayers = players.map((player) => ({
      key: player.key,
      // 추가금을 쓰지 않는 대회면 추가금이 0이 되도록 소속으로 취급한다
      isClubMember: useSurcharge ? false : true,
    }));

    const feeByEventIndex = input.events.map((event) =>
      calculateEventFee({
        baseFee: feeById.get(event.eventTypeId) ?? 0,
        surcharge: tournament.nonMemberSurcharge,
        unit: tournament.surchargeUnit,
        playerKeys: event.playerKeys,
        players: surchargePlayers,
      })
    );
    const totalFee = calculateTotalFee(
      feeByEventIndex.map((fee) => ({ fee, status: 'ACTIVE' as const }))
    );

    const created = await prisma.$transaction(async (tx) => {
      // 폼을 열어둔 채 마감이 지나는 경우를 잡는다
      const fresh = await tx.tournament.findUnique({
        where: { id: tournamentId },
        select: { status: true, applyStartAt: true, applyDeadline: true },
      });
      if (!fresh || !isAcceptingEntries(fresh, new Date())) {
        throw new EntryClosedError();
      }

      const entry = await tx.tournamentEntry.create({
        data: {
          tournamentId,
          isExternal: true,
          // 조회 키는 저장할 때와 찾을 때 같은 정규화를 거쳐야 한다
          contactName: normalizeContactName(input.contactName),
          contactPhone: input.contactPhone,
          depositorName: input.depositorName,
          teamName: tournament.useTeamName ? (input.teamName ?? null) : null,
          totalFee,
          privacyAgreedAt: new Date(),
        },
      });

      const keyToPlayerId = new Map<string, string>();
      for (const player of players) {
        const createdPlayer = await tx.entryPlayer.create({
          data: {
            entryId: entry.id,
            name: player.name,
            gender: player.gender,
            birthDate: player.birthDate,
            phoneNumber: player.phoneNumber,
            tshirtSize:
              tournament.tshirtSizes.length > 0
                ? (player.tshirtSize ?? null)
                : null,
            isClubMember: false,
            order: player.order,
          },
        });
        keyToPlayerId.set(player.key, createdPlayer.id);
      }

      for (const [index, event] of input.events.entries()) {
        const entryEvent = await tx.entryEvent.create({
          data: {
            entryId: entry.id,
            eventTypeId: event.eventTypeId,
            ageGroup: event.ageGroup,
            level: event.level,
            fee: feeByEventIndex[index],
          },
        });
        await tx.entryEventPlayer.createMany({
          data: event.playerKeys.map((key) => ({
            entryEventId: entryEvent.id,
            entryPlayerId: keyToPlayerId.get(key) as string,
          })),
        });
      }

      return entry;
    });

    return res.status(201).json({
      data: { entryId: created.id },
      message: '신청이 완료되었습니다.',
    });
  } catch (error) {
    if (error instanceof EntryClosedError) {
      return res
        .status(400)
        .json({ error: '신청이 마감되었습니다.', status: 400 });
    }
    // 같은 이름+연락처로 두 번 제출한 경우 (부분 유니크 인덱스 위반)
    if (
      typeof error === 'object' &&
      error !== null &&
      (error as { code?: string }).code === 'P2002'
    ) {
      return res.status(409).json({
        error: '이미 신청하셨습니다. 신청 조회에서 확인해주세요.',
        status: 409,
      });
    }
    return handleApiError(res, error);
  }
}
```

- [ ] **Step 4: 신청 조회 API를 만든다**

`src/pages/api/clubs/[id]/tournaments/[tournamentId]/external/lookup.ts`:

```ts
import { prisma } from '@/lib/prisma';
import { consumeAttempt, getClientIp } from '@/lib/rateLimit';
import {
  firstQueryValue,
  handleApiError,
  parseClubId,
} from '@/lib/tournament/apiHelpers';
import {
  matchesPhoneTail,
  normalizeContactName,
} from '@/lib/tournament/externalEntry';
import { externalLookupSchema } from '@/schemas/tournament.schema';

import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * 이름 + 휴대폰 뒷 4자리로 본인 신청서를 찾는다.
 *
 * GET이 아니라 POST인 이유: 개인정보를 URL 쿼리스트링이나 서버 로그에
 * 남기지 않기 위해서다.
 *
 * 뒷 4자리는 경우의 수가 1만뿐이라 무제한 시도를 허용하면 타인의 신청서
 * (생년월일·전화번호 포함)가 열린다. 그래서 IP 기준으로 시도를 제한한다.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res
      .status(405)
      .json({ error: '허용되지 않는 메소드입니다.', status: 405 });
  }

  const clubId = parseClubId(req.query.id);
  const tournamentId = firstQueryValue(req.query.tournamentId);
  if (!clubId || !tournamentId) {
    return res.status(400).json({ error: '잘못된 요청입니다.', status: 400 });
  }

  const ip = getClientIp(req.headers);
  const { allowed } = consumeAttempt(`external-lookup:${tournamentId}:${ip}`);
  if (!allowed) {
    return res.status(429).json({
      error: '조회 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.',
      status: 429,
    });
  }

  try {
    const parsed = externalLookupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.errors[0]?.message ?? '입력값이 올바르지 않습니다.',
        status: 400,
      });
    }

    const contactName = normalizeContactName(parsed.data.contactName);

    // 이름으로 후보를 좁힌 뒤 뒷자리를 대조한다.
    // 뒷자리를 SQL에서 비교하지 않는 이유는 저장 포맷(하이픈)에 의존하지
    // 않기 위해서다. 이름이 같은 사람은 많아야 몇 명이라 부담이 없다.
    const candidates = await prisma.tournamentEntry.findMany({
      where: {
        tournamentId,
        isExternal: true,
        contactName,
        tournament: { clubId, allowExternalEntry: true },
      },
      include: {
        players: { orderBy: { order: 'asc' } },
        entryEvents: {
          include: {
            eventType: true,
            eventPlayers: { select: { entryPlayerId: true } },
          },
        },
      },
    });

    const entry = candidates.find((candidate) =>
      matchesPhoneTail(candidate.contactPhone ?? '', parsed.data.phoneTail)
    );

    if (!entry) {
      // 이름이 없는 경우와 뒷자리가 틀린 경우를 구분해 알리지 않는다.
      // 구분하면 어떤 이름이 신청했는지 떠볼 수 있다.
      return res.status(404).json({
        error: '신청 내역을 찾을 수 없습니다. 이름과 뒷자리를 확인해주세요.',
        status: 404,
      });
    }

    return res
      .status(200)
      .json({ data: { entry }, message: '신청 내역을 불러왔습니다.' });
  } catch (error) {
    return handleApiError(res, error);
  }
}
```

- [ ] **Step 5: 확인하고 커밋한다**

```bash
npx tsc --noEmit
npm test
```

기대: 전부 통과.

```bash
git add src/pages/api/clubs/\[id\]/tournaments/\[tournamentId\]/external src/schemas/tournament.schema.ts
git commit -m "feat(tournament): 비로그인 외부 신청 API 추가"
```

---

## Task 9: 외부 신청 폼 컴포넌트 분기

기존 신청 폼 컴포넌트에 `isExternal` prop을 추가한다. 폼을 복제하지 않는다.

**Files:**
- Modify: `src/components/organisms/tournament/entry/PlayerListField.tsx`
- Modify: `src/components/organisms/tournament/entry/EventListField.tsx`
- Modify: `src/components/organisms/tournament/entry/EntrySummary.tsx`
- Test: `src/__tests__/components/tournament/PlayerListField.dom.test.tsx`

**Interfaces:**
- Consumes: Task 1 `SurchargeUnitValue`
- Produces:
  - `PlayerListField` props에 `isExternal?: boolean` 추가
  - `EventListField` props에 `isExternal?: boolean` 추가
  - `EntrySummary` props에 `surchargeUnit?: SurchargeUnitValue` 추가

- [ ] **Step 1: 실패하는 DOM 테스트를 작성한다**

`src/__tests__/components/tournament/PlayerListField.dom.test.tsx` 파일 끝에 추가한다. 파일 상단의 렌더 헬퍼가 이미 있으므로 그 이름과 시그니처에 맞춰 쓴다(헬퍼가 `renderPlayerListField(props)` 형태가 아니면 기존 테스트가 쓰는 방식을 그대로 따른다):

```tsx
describe('PlayerListField - 외부 신청', () => {
  it('외부 신청이면 소속 체크박스가 비활성화되고 해제 상태다', () => {
    renderPlayerListField({
      tshirtSizes: [],
      memberLabel: '당산클럽 소속',
      nonMemberSurcharge: 10000,
      isExternal: true,
    });

    const checkbox = screen.getByRole('checkbox', {
      name: /당산클럽 소속/,
    }) as HTMLInputElement;

    expect(checkbox).toBeDisabled();
    expect(checkbox.checked).toBe(false);
  });

  it('회원 신청이면 소속 체크박스를 조작할 수 있다', () => {
    renderPlayerListField({
      tshirtSizes: [],
      memberLabel: '당산클럽 소속',
      nonMemberSurcharge: 10000,
    });

    const checkbox = screen.getByRole('checkbox', {
      name: /당산클럽 소속/,
    }) as HTMLInputElement;

    expect(checkbox).not.toBeDisabled();
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

```bash
npm test -- src/__tests__/components/tournament/PlayerListField.dom.test.tsx
```

기대: "외부 신청이면 ..." 케이스가 FAIL (체크박스가 disabled가 아니다).

- [ ] **Step 3: `PlayerListField`를 고친다**

props 인터페이스에 추가:

```ts
  /** 외부(비로그인) 신청 폼인지. true면 소속 체크박스를 잠근다 */
  isExternal?: boolean;
```

구조 분해에 `isExternal = false,` 를 추가하고, 체크박스 부분을 아래로 바꾼다:

```tsx
              <label className="flex items-start gap-2 rounded-md bg-gray-50 p-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4"
                  // 외부 신청자는 정의상 비회원이므로 조작할 수 없다.
                  // disabled된 input은 폼 값에서 빠지므로 register의 disabled를
                  // 쓰지 않고, 값은 항상 false로 고정한다.
                  disabled={isExternal}
                  {...register(`players.${index}.isClubMember`)}
                />
                <span>
                  <span className="font-medium text-gray-800">
                    {memberLabel}
                  </span>
                  <span className="ml-2 text-gray-500">
                    {isExternal
                      ? `외부 신청은 참가 종목마다 ${nonMemberSurcharge.toLocaleString()}원이 추가됩니다.`
                      : `해제하면 참가 종목마다 ${nonMemberSurcharge.toLocaleString()}원이 추가됩니다.`}
                  </span>
                </span>
              </label>
```

`disabled` input은 제출값에서 빠지므로, 외부 폼에서는 값이 항상 `false`가 되도록 페이지(Task 10)에서 `defaultValues`의 `isClubMember`를 `false`로 둔다. 서버도 무조건 `false`로 덮으므로 이중 방어다.

- [ ] **Step 4: `EventListField`의 최소 소속 인원 안내를 숨긴다**

props 인터페이스에 `isExternal?: boolean;` 을 추가하고 구조 분해에 `isExternal = false,` 를 넣는다. `minClubMembersPerTeam` 관련 계산을 하는 `useMemo`/함수 초입의

```ts
    if (minClubMembersPerTeam <= 0) return 0;
```

를 아래로 바꾼다:

```ts
    // 외부 신청은 최소 소속 인원 검증을 면제받으므로 안내도 하지 않는다
    if (isExternal || minClubMembersPerTeam <= 0) return 0;
```

- [ ] **Step 5: `EntrySummary`에 부과 단위를 넘긴다**

props 인터페이스에 추가:

```ts
  /** 추가금 부과 단위. 생략하면 1인당 */
  surchargeUnit?: SurchargeUnitValue;
```

`import { calculateEventFee } from '@/lib/tournament/fee';` 를 아래로 바꾼다:

```ts
import {
  calculateEventFee,
  type SurchargeUnitValue,
} from '@/lib/tournament/fee';
```

구조 분해에 `surchargeUnit,` 를 추가하고, `calculateEventFee` 호출에 `unit: surchargeUnit,` 을 넣는다:

```ts
    const fee = calculateEventFee({
      baseFee,
      surcharge: nonMemberSurcharge,
      unit: surchargeUnit,
      playerKeys: event.playerKeys ?? [],
      players,
    });
```

- [ ] **Step 6: 기존 신청 페이지에 부과 단위를 전달한다**

`src/pages/clubs/[id]/tournaments/[tournamentId]/apply.tsx`의 `EntrySummary` 사용처에 추가:

```tsx
            surchargeUnit={detail.tournament.surchargeUnit}
```

- [ ] **Step 7: 확인하고 커밋한다**

```bash
npm test -- src/__tests__/components/tournament/PlayerListField.dom.test.tsx
npx tsc --noEmit
npm test
```

기대: 전부 통과.

```bash
git add src/components/organisms/tournament/entry src/__tests__/components/tournament src/pages/clubs
git commit -m "feat(tournament): 신청 폼에 외부 신청 분기 추가"
```

---

## Task 10: 외부 신청·조회 페이지

**Files:**
- Create: `src/pages/clubs/[id]/tournaments/[tournamentId]/external-apply.tsx`
- Create: `src/pages/clubs/[id]/tournaments/[tournamentId]/external-entry.tsx`

**Interfaces:**
- Consumes: Task 8의 API 3종, Task 9의 컴포넌트 props
- Produces: 없음 (최종 화면)

- [ ] **Step 1: 외부 신청 페이지를 만든다**

`src/pages/clubs/[id]/tournaments/[tournamentId]/external-apply.tsx` 를 만든다. 기존 `apply.tsx`를 참고하되 아래가 다르다:

- `useSelector(state => state.auth.clubMember)` 를 쓰지 않는다 (로그인 정보 없음)
- `useMyEntry` 를 쓰지 않는다 (기존 신청서 불러오기 없음)
- 대회 정보는 `useTournamentDetail` 대신 `/api/clubs/${clubId}/tournaments/${tournamentId}/external/tournament` 를 직접 fetch 한다
- 제출은 `/api/clubs/${clubId}/tournaments/${tournamentId}/external/entries` 로 POST
- `defaultValues.players[0].isClubMember` 를 `false` 로 둔다
- 신청자 이름(`contactName`)·연락처(`contactPhone`) 입력 필드를 추가한다
- `validateEntrySubmission` 프리체크에 `{ isExternal: true }` 를 넘긴다
- 하위 컴포넌트에 `isExternal` 을 넘긴다

레이아웃은 `apply.tsx`의 섹션 구성(① 선수 명단 → ② 종목 → ③ 입금 정보)을 그대로 따르고, 그 위에 신청자 정보 블록을 둔다:

```tsx
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">신청자 정보</h2>
        <p className="text-sm text-gray-500">
          신청 후 내용을 확인하려면 여기 입력한 이름과 연락처 뒷 4자리가
          필요합니다.
        </p>
        <FormField
          label="신청자 이름"
          error={methods.formState.errors.contactName?.message}
        >
          <Input
            {...methods.register('contactName', {
              required: '신청자 이름을 입력해주세요.',
            })}
          />
        </FormField>
        <FormField
          label="연락처"
          error={methods.formState.errors.contactPhone?.message}
        >
          <Controller
            control={methods.control}
            name="contactPhone"
            rules={{ validate: getPhoneNumberError }}
            render={({ field }) => (
              <Input
                value={formatPhoneNumber(field.value)}
                onChange={(event) =>
                  field.onChange(toPhoneDigits(event.target.value))
                }
                placeholder="010-1234-5678"
              />
            )}
          />
        </FormField>
      </section>
```

또 대회 요강상 출전 불가 조합이 있으므로 안내를 넣는다:

```tsx
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-medium">신청 전 확인해주세요</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            협회 등록 여부는 &lsquo;배드민턴 대진표 BKPLAY&rsquo; 앱에서 조회할
            수 있습니다.
          </li>
          <li>
            타 지역 협회에 이미 등록된 선수끼리의 조합은 대회 규정상 출전이
            불가능합니다.
          </li>
          <li>
            신청 내용은 접수 후 담당자가 확인하며, 자격 미달 시 개별
            안내드립니다.
          </li>
        </ul>
      </div>
```

폼 타입은 `EntryFormValues` 를 확장해 페이지 안에 둔다:

```ts
type ExternalEntryFormValues = EntryFormValues & {
  contactName: string;
  contactPhone: string;
};
```

- [ ] **Step 2: 신청 조회 페이지를 만든다**

`src/pages/clubs/[id]/tournaments/[tournamentId]/external-entry.tsx` 를 만든다. 이름 + 뒷 4자리를 받아 `external/lookup` 에 POST하고, 결과를 읽기 전용으로 보여준다:

```tsx
import { useState } from 'react';

import { useRouter } from 'next/router';

import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

import { Input } from '@/components/atoms/inputs/Input';
import { FormField } from '@/components/molecules/form/FormField';

import { formatFee } from '@/lib/tournament/display';

type LookupFormValues = {
  contactName: string;
  phoneTail: string;
};

type LookedUpEntry = {
  id: string;
  depositorName: string;
  teamName: string | null;
  totalFee: number;
  paymentStatus: string;
  players: Array<{ id: string; name: string; gender: string }>;
  entryEvents: Array<{
    id: string;
    ageGroup: string;
    level: string;
    fee: number;
    status: string;
    eventType: { name: string };
  }>;
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: '입금대기',
  CONFIRMED: '입금확인',
  CANCELED: '취소',
};

function ExternalEntryLookupPage() {
  const router = useRouter();
  const clubId = router.query.id as string | undefined;
  const tournamentId = router.query.tournamentId as string | undefined;

  const [entry, setEntry] = useState<LookedUpEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState } = useForm<LookupFormValues>({
    defaultValues: { contactName: '', phoneTail: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (!clubId || !tournamentId) return;
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/clubs/${clubId}/tournaments/${tournamentId}/external/lookup`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        }
      );
      const body = await response.json();
      if (!response.ok) {
        toast.error(body.error ?? '조회에 실패했습니다.');
        setEntry(null);
        return;
      }
      setEntry(body.data.entry);
    } finally {
      setIsLoading(false);
    }
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <h1 className="text-xl font-bold">신청 내역 조회</h1>

      <form onSubmit={onSubmit} className="space-y-4">
        <FormField
          label="신청자 이름"
          error={formState.errors.contactName?.message}
        >
          <Input
            {...register('contactName', {
              required: '신청자 이름을 입력해주세요.',
            })}
          />
        </FormField>
        <FormField
          label="휴대폰 뒷 4자리"
          error={formState.errors.phoneTail?.message}
        >
          <Input
            inputMode="numeric"
            maxLength={4}
            placeholder="5678"
            {...register('phoneTail', {
              required: '휴대폰 뒷 4자리를 입력해주세요.',
              pattern: {
                value: /^\d{4}$/,
                message: '숫자 4자리를 입력해주세요.',
              },
            })}
          />
        </FormField>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-md bg-blue-600 py-2 text-white disabled:bg-gray-300"
        >
          {isLoading ? '조회 중...' : '조회하기'}
        </button>
      </form>

      {entry && (
        <section className="space-y-4 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">신청 내역</h2>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-sm">
              {PAYMENT_STATUS_LABEL[entry.paymentStatus] ?? entry.paymentStatus}
            </span>
          </div>

          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">입금자명</dt>
              <dd>{entry.depositorName}</dd>
            </div>
            {entry.teamName && (
              <div className="flex justify-between">
                <dt className="text-gray-500">팀명</dt>
                <dd>{entry.teamName}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-500">총 참가비</dt>
              <dd className="font-medium">{formatFee(entry.totalFee)}</dd>
            </div>
          </dl>

          <div>
            <h3 className="mb-2 text-sm font-medium">신청 종목</h3>
            <ul className="space-y-1 text-sm">
              {entry.entryEvents
                .filter((event) => event.status === 'ACTIVE')
                .map((event) => (
                  <li key={event.id} className="flex justify-between">
                    <span>
                      {event.eventType.name} · {event.ageGroup}
                      {event.level ? ` · ${event.level}` : ''}
                    </span>
                    <span>{formatFee(event.fee)}</span>
                  </li>
                ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium">선수</h3>
            <ul className="space-y-1 text-sm">
              {entry.players.map((player) => (
                <li key={player.id}>
                  {player.name} ({player.gender})
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-gray-500">
            내용을 수정하려면 클럽 담당자에게 문의해주세요.
          </p>
        </section>
      )}
    </div>
  );
}

export default ExternalEntryLookupPage;
```

- [ ] **Step 3: 확인하고 커밋한다**

```bash
npx tsc --noEmit
npm test
```

기대: 전부 통과.

```bash
git add src/pages/clubs/\[id\]/tournaments/\[tournamentId\]/external-apply.tsx src/pages/clubs/\[id\]/tournaments/\[tournamentId\]/external-entry.tsx
git commit -m "feat(tournament): 외부 신청·조회 페이지 추가"
```

---

## Task 11: 관리자 화면 구분 표시

**Files:**
- Modify: `src/lib/tournament/csv.ts`
- Test: `src/lib/tournament/csv.test.ts`
- Modify: `src/components/organisms/tournament/admin/EntryTable.tsx`
- Modify: `src/pages/api/clubs/[id]/tournaments/[tournamentId]/entries/index.ts`
- Modify: `src/pages/api/clubs/[id]/tournaments/[tournamentId]/entries/export.ts`

**Interfaces:**
- Consumes: Task 5의 `isExternal`, `contactName`, `contactPhone`
- Produces: `CsvEntry` 타입에 `isExternal: boolean`, `contactPhone: string | null` 추가. `CSV_HEADER`에 `신청경로`, `신청자연락처` 추가

- [ ] **Step 1: 실패하는 CSV 테스트를 작성한다**

`src/lib/tournament/csv.test.ts` 파일 끝에 추가한다. 기존 테스트가 쓰는 엔트리 생성 방식에 맞춰 `isExternal`/`contactPhone` 을 넣는다:

```ts
describe('toCsvRows - 외부 신청 구분', () => {
  const baseEntry = {
    depositorName: '김철수',
    teamName: null,
    paymentStatus: 'PENDING' as const,
    entryEvents: [
      {
        status: 'ACTIVE' as const,
        fee: 70000,
        ageGroup: '30대',
        level: '',
        eventType: { name: '남자복식' },
        eventPlayers: [
          {
            entryPlayer: {
              name: '김철수',
              gender: '남',
              birthDate: '1990-01-01',
              phoneNumber: '010-1111-2222',
              tshirtSize: null,
              isClubMember: false,
            },
          },
        ],
      },
    ],
  };

  it('외부 신청은 신청경로를 외부로 표기한다', () => {
    const rows = toCsvRows([
      { ...baseEntry, isExternal: true, contactPhone: '010-1111-2222' },
    ]);
    expect(rows[0]).toContain('외부');
    expect(rows[0]).toContain('010-1111-2222');
  });

  it('회원 신청은 신청경로를 회원으로 표기한다', () => {
    const rows = toCsvRows([
      { ...baseEntry, isExternal: false, contactPhone: null },
    ]);
    expect(rows[0]).toContain('회원');
  });

  it('헤더에 신청경로와 신청자연락처가 있다', () => {
    expect(CSV_HEADER).toContain('신청경로');
    expect(CSV_HEADER).toContain('신청자연락처');
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

```bash
npm test -- src/lib/tournament/csv.test.ts
```

기대: FAIL — 헤더에 새 컬럼이 없다.

- [ ] **Step 3: CSV를 고친다**

`src/lib/tournament/csv.ts`에서 `CsvEntry` 타입에 추가:

```ts
export type CsvEntry = {
  depositorName: string;
  teamName: string | null;
  paymentStatus: EntryPaymentStatus;
  /** 외부(비로그인) 신청 여부 */
  isExternal: boolean;
  /** 외부 신청자의 연락처. 회원 신청서에는 없다 */
  contactPhone: string | null;
  entryEvents: Array<{
```

(나머지 필드는 그대로)

`CSV_HEADER` 를 아래로 바꾼다:

```ts
export const CSV_HEADER = [
  '종목',
  '연령',
  '급수',
  '이름',
  '성별',
  '생년월일',
  '전화번호',
  '티셔츠',
  '소속여부',
  '팀명',
  '입금자명',
  '참가비',
  '입금상태',
  '신청경로',
  '신청자연락처',
];
```

`toCsvRows` 의 행 배열 마지막(`PAYMENT_STATUS_LABEL[entry.paymentStatus],` 다음)에 추가:

```ts
          entry.isExternal ? '외부' : '회원',
          entry.contactPhone ?? '',
```

- [ ] **Step 4: 테스트가 통과하는지 확인한다**

```bash
npm test -- src/lib/tournament/csv.test.ts
```

기대: PASS.

- [ ] **Step 5: 관리자 목록 API가 새 필드를 반환하게 한다**

`entries/index.ts` 의 GET 분기에서 `findMany` 의 `include` 를 그대로 두면 스칼라 필드는 전부 나온다. `clubMember` 가 nullable이 되었으므로 select만 확인한다. 변경이 필요 없으면 그대로 둔다.

`entries/export.ts` 에서 `toCsvRows` 에 넘기는 데이터에 `isExternal`, `contactPhone` 이 포함되는지 확인한다. `select` 로 필드를 좁히고 있다면 두 필드를 추가한다.

- [ ] **Step 6: 관리자 목록에 배지를 추가한다**

`src/components/organisms/tournament/admin/EntryTable.tsx` 에서 신청자명을 보여주는 셀을 찾아, 이름 옆에 배지를 붙인다:

```tsx
                  <span className="inline-flex items-center gap-2">
                    {entry.clubMember?.name ?? entry.contactName ?? '-'}
                    {entry.isExternal && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                        외부 신청
                      </span>
                    )}
                  </span>
```

`EntryTable` 의 props 타입에 `isExternal: boolean`, `contactName: string | null` 을 추가하고, `clubMember` 를 nullable(`clubMember: { id: number; name: string } | null`)로 바꾼다.

- [ ] **Step 7: 확인하고 커밋한다**

```bash
npx tsc --noEmit
npm test
```

기대: 전부 통과.

```bash
git add src/lib/tournament/csv.ts src/lib/tournament/csv.test.ts src/components/organisms/tournament/admin/EntryTable.tsx src/pages/api/clubs
git commit -m "feat(tournament): 관리자 화면에 외부 신청 구분 표시"
```

---

## Task 12: 대회 상세에 외부 신청 링크 노출

관리자가 공개 링크를 복사해 전달할 수 있어야 한다.

**Files:**
- Modify: `src/pages/clubs/[id]/tournaments/[tournamentId]/admin.tsx`

**Interfaces:**
- Consumes: Task 5의 `allowExternalEntry`
- Produces: 없음 (최종 화면)

- [ ] **Step 1: 링크 안내 블록을 추가한다**

`admin.tsx` 의 대회 정보 영역에, `allowExternalEntry` 가 켜져 있을 때만 보이는 블록을 넣는다:

```tsx
        {detail?.tournament.allowExternalEntry && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-900">
              외부 신청 링크가 열려 있습니다
            </p>
            <p className="mt-1 text-xs text-blue-800">
              아래 주소를 아는 사람은 로그인 없이 신청할 수 있습니다.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 overflow-x-auto rounded bg-white px-2 py-1 text-xs">
                {typeof window !== 'undefined'
                  ? `${window.location.origin}/clubs/${clubId}/tournaments/${tournamentId}/external-apply`
                  : ''}
              </code>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${window.location.origin}/clubs/${clubId}/tournaments/${tournamentId}/external-apply`
                  );
                  toast.success('링크를 복사했습니다.');
                }}
                className="shrink-0 rounded-md bg-blue-600 px-3 py-1 text-xs text-white"
              >
                복사
              </button>
            </div>
          </div>
        )}
```

`toast` 가 이미 import되어 있지 않으면 `import toast from 'react-hot-toast';` 를 추가한다.

- [ ] **Step 2: 확인하고 커밋한다**

```bash
npx tsc --noEmit
npm test
```

기대: 전부 통과.

```bash
git add src/pages/clubs/\[id\]/tournaments/\[tournamentId\]/admin.tsx
git commit -m "feat(tournament): 관리자 화면에 외부 신청 링크 안내 추가"
```

---

## Task 13: 전체 검증

**Files:** 없음 (검증만)

- [ ] **Step 1: 전체 테스트와 타입 검사를 돌린다**

```bash
npm test
npx tsc --noEmit
npm run lint
```

기대: 전부 통과. 실패가 있으면 해당 태스크로 돌아가 고친다.

- [ ] **Step 2: 스키마 변경이 있었으므로 빌드까지 확인한다**

```bash
npm run build
```

기대: 성공. (전역 제약상 작은 변경엔 build를 생략하지만, 이번 작업은 스키마가 바뀌었으므로 예외로 돌린다.)

- [ ] **Step 3: 수동 확인 체크리스트**

`npm run dev` 로 띄우고 아래를 확인한다:

| 확인 항목 | 기대 |
|---|---|
| 기존 대회의 회원 신청 | 이전과 동일하게 동작 |
| 관리자 폼에서 외부 신청 체크 | 저장되고 대회 상세에 링크 노출 |
| 외부 신청 OFF인 대회의 `/external-apply` | 대회를 찾을 수 없음 |
| 외부 신청 ON인 대회의 `/external-apply` | 신청 가능, 소속 체크박스 disabled |
| 추가금 단위 팀당 + 외부 2명 | 추가금이 1회만 붙음 |
| 같은 이름+연락처로 재신청 | 409, "이미 신청하셨습니다" |
| `/external-entry` 에서 이름+뒷4자리 | 본인 신청서 조회됨 |
| 틀린 뒷자리로 여러 번 시도 | 10회 초과 시 429 |
| 관리자 목록 | 외부 신청에 배지 표시 |
| CSV 내보내기 | 신청경로·신청자연락처 컬럼 존재 |

- [ ] **Step 4: 브랜치를 정리한다**

superpowers:finishing-a-development-branch 스킬을 써서 통합 방식을 정한다.

---

## 자체 점검 결과

**스펙 커버리지**

| 스펙 항목 | 태스크 |
|---|---|
| 3.1 Tournament 필드 | Task 5 |
| 3.2 TournamentEntry 변경 | Task 5 |
| 3.3 유니크 제약 | Task 5 Step 6 |
| 3.4 nullable 파급 | Task 6 |
| 3.5 마이그레이션 절차 | Task 5 Step 5~8 |
| 4.1 신규 페이지 | Task 10 |
| 4.2 신규 API | Task 8 |
| 4.3 비로그인 방어 | Task 4, Task 8 |
| 4.4 폼 차이 | Task 9, Task 10 |
| 5 참가비 계산 | Task 1, Task 7, Task 9 |
| 6 관리자 화면 | Task 11, Task 12 |
| 7 테스트 | Task 1~4, 9, 11에 분산 |

**남은 판단 지점**

- Task 11 Step 5는 기존 코드의 `select` 사용 여부에 따라 변경이 필요할 수도, 없을 수도 있다. 구현자가 파일을 열어 확인한다.
- Task 9 Step 1의 DOM 테스트 렌더 헬퍼는 기존 파일의 것을 재사용한다. 시그니처가 다르면 기존 테스트를 따른다.
- Task 10 Step 1은 `apply.tsx` 를 참고해 작성하는 분량이 크다. 구현 중 컴포넌트 props가 스펙과 어긋나면 Task 9로 돌아가 조정한다.
