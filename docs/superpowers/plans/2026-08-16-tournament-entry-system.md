# 배드민턴 대회 참가 신청 시스템 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 클럽 회원이 외부 배드민턴 대회 참가를 신청하고, 임원이 신청 현황을 취합·입금 확인·CSV 추출할 수 있는 시스템을 만든다. 게시판 댓글 방식에서 발생하던 개인정보 전체 노출 문제를 제거한다.

**Architecture:** 신청서(`TournamentEntry`) 1건 안에 선수 명단(`EntryPlayer`)과 신청 종목(`EntryEvent`)을 담고, 종목↔선수를 조인 테이블로 배정한다. 비즈니스 로직은 `src/lib/tournament/` 의 순수 함수로 분리해 Prisma 없이 단위 테스트하고, API 핸들러는 그 함수들을 호출하는 얇은 층으로 유지한다. 민감정보 차단은 Prisma `select` 레벨에서 수행한다.

**Tech Stack:** Next.js 15 (Pages Router), Prisma 6 + PostgreSQL, TypeScript, react-hook-form + zod, @tanstack/react-query, Tailwind CSS, Jest + ts-jest

**Spec:** `docs/superpowers/specs/2026-08-16-tournament-entry-design.md`

## Global Constraints

- **Prisma 스키마는 분할 관리한다.** `prisma/schema/*.prisma` 를 수정하고 `npm run build:schema` 로 `prisma/schema.prisma` 를 생성한다. `prisma/schema.prisma` 를 직접 편집하지 않는다.
- **새 스키마 파일은 `prisma/build-schema.ts` 의 `schemaFiles` 배열에 등록해야 한다.** 등록하지 않으면 무시된다.
- **API 핸들러에서는 `import { prisma } from '@/lib/prisma'` 싱글톤을 사용한다.** `.cursorrules` 에 `new PrismaClient()` 를 쓰라고 적혀 있으나, 이는 오래된 규칙이며 현재 코드베이스 전체(`src/pages/api/**`)가 싱글톤을 사용한다. 최근 커밋 `c6ceff3` 이 성능 문제로 싱글톤 전환을 완료했으므로 싱글톤을 따른다.
- **이벤트 핸들러 네이밍은 `on` 접두사.** `onClickSubmit`, `onChangeInput` 형식. (`.cursorrules` 규칙)
- **컴포넌트의 `export default` 는 파일 하단에 분리해 작성한다.** (`.cursorrules` 규칙)
- **API 호출은 `axios` 를 사용한다.** `fetch` 금지. (`.cursorrules` 규칙)
- **응답 형식:** 성공 `{ data: T, message: string }`, 실패 `{ error: string, status: number }`
- **들여쓰기 2칸, 최대 줄 길이 100자.**
- **테스트 실행:** `npx jest <path>` 또는 `npm test`
- **커밋은 Conventional Commits.** 각 태스크 끝에서 커밋한다.
- **민감정보(`birthDate`, `phoneNumber`, `tshirtSize`)는 회원용 응답에 절대 포함하지 않는다.** 프론트 마스킹이 아니라 Prisma `select` 에서 제외한다.

---

## File Structure

**신규 생성:**

| 파일 | 책임 |
|---|---|
| `prisma/schema/tournament.prisma` | 대회 도메인 6개 모델 |
| `src/types/tournament.types.ts` | 도메인 타입, API 요청/응답 타입 |
| `src/lib/tournament/fee.ts` | 참가비 합산 |
| `src/lib/tournament/status.ts` | 대회 상태 파생, 취소 후 신청서 상태 |
| `src/lib/tournament/validation.ts` | 신청 제출 검증 (순수 함수) |
| `src/lib/tournament/serialize.ts` | 회원용 마스킹 변환 |
| `src/lib/tournament/csv.ts` | CSV 행 변환 |
| `src/lib/clubAuth.ts` | 서버용 `requireClubMember` / `requireClubAdmin` |
| `src/schemas/tournament.schema.ts` | zod 스키마 (대회 생성/수정, 신청 제출) |
| `src/pages/api/clubs/[id]/tournaments/*` | API 핸들러 |
| `src/pages/clubs/[id]/tournaments/*` | 페이지 |
| `src/components/organisms/tournament/*` | 컴포넌트 |
| `src/hooks/useTournament*.ts` | react-query 훅 |

**수정:**

| 파일 | 변경 |
|---|---|
| `prisma/schema/enums.prisma` | enum 3개 추가 |
| `prisma/schema/club.prisma` | `Club.tournaments` 관계 필드 추가 |
| `prisma/build-schema.ts` | `tournament.prisma` 등록 |
| `src/types/index.ts` | tournament 타입 re-export |

---

## Phase 1: 스키마와 순수 로직

이 단계는 DB 마이그레이션과 테스트 가능한 비즈니스 로직을 만든다. 화면이나 API 없이 완결된다.

### Task 1: Prisma 스키마 추가

**Files:**
- Create: `prisma/schema/tournament.prisma`
- Modify: `prisma/schema/enums.prisma` (파일 끝에 추가)
- Modify: `prisma/schema/club.prisma` (`Club` 모델 관계 필드)
- Modify: `prisma/build-schema.ts:8-20` (`schemaFiles` 배열)

**Interfaces:**
- Consumes: 없음 (첫 태스크)
- Produces: Prisma Client 타입 `Tournament`, `TournamentEventOption`, `TournamentEntry`, `EntryPlayer`, `EntryEvent`, `EntryEventPlayer`, enum `TournamentStatus`, `EntryPaymentStatus`, `EntryEventStatus`

- [ ] **Step 1: enum 3개 추가**

`prisma/schema/enums.prisma` 파일 **끝에** 추가한다. 기존 enum은 건드리지 않는다.

```prisma

enum TournamentStatus {
  DRAFT     // 임시저장 (ADMIN에게만 노출)
  OPEN      // 모집중
  CLOSED    // 마감
}

enum EntryPaymentStatus {
  PENDING    // 입금대기
  CONFIRMED  // 입금확인
  CANCELED   // 취소
}

enum EntryEventStatus {
  ACTIVE
  CANCELED
}
```

- [ ] **Step 2: tournament.prisma 생성**

`prisma/schema/tournament.prisma` 를 아래 내용으로 만든다.

```prisma
// 외부 대회 (클럽이 참가 신청을 취합하는 대상)
model Tournament {
  id              String            @id @default(cuid())
  clubId          Int
  title           String
  hostName        String?                                  // 주최 (예: ○○시 배드민턴협회)
  description     String?                                  // 모집 요강
  tournamentDate  String?                                  // 대회 일자
  location        String?                                  // 대회 장소
  applyStartAt    DateTime?                                // 신청 시작 일시
  applyDeadline   DateTime                                 // 신청 마감 일시
  status          TournamentStatus  @default(DRAFT)        // 관리자의 수동 의도
  useTeamName     Boolean           @default(false)        // 팀명 입력 사용 여부
  tshirtSizes     String[]                                 // 빈 배열이면 티셔츠 미사용
  bankAccount     String?                                  // 입금 계좌 안내
  createdBy       Int                                      // ClubMember id
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  club            Club                     @relation("ClubToTournament", fields: [clubId], references: [id], onDelete: Cascade)
  eventOptions    TournamentEventOption[]
  entries         TournamentEntry[]

  @@index([clubId])
  @@index([clubId, status])
}

// 종목 옵션 (관리자가 대회마다 정의)
model TournamentEventOption {
  id            String       @id @default(cuid())
  tournamentId  String
  eventType     String                            // 남자복식, 혼합복식 등
  ageGroup      String                            // 30대부 등
  level         String       @default("")         // A조 등. 없는 대회도 있음
  playerCount   Int                               // 1 또는 2
  fee           Int                               // 참가비 (원)
  order         Int          @default(0)
  isActive      Boolean      @default(true)

  tournament    Tournament   @relation(fields: [tournamentId], references: [id], onDelete: Cascade)
  entryEvents   EntryEvent[]

  @@unique([tournamentId, eventType, ageGroup, level])
  @@index([tournamentId])
}

// 신청서 (회원 1명이 대회당 1건)
model TournamentEntry {
  id               String              @id @default(cuid())
  tournamentId     String
  userId           Int
  clubMemberId     Int
  depositorName    String                                        // 입금자명
  teamName         String?                                       // useTeamName일 때만
  paymentStatus    EntryPaymentStatus  @default(PENDING)
  totalFee         Int                 @default(0)               // ACTIVE 종목 fee 합계
  privacyAgreedAt  DateTime
  createdAt        DateTime            @default(now())
  updatedAt        DateTime            @updatedAt

  tournament       Tournament    @relation(fields: [tournamentId], references: [id], onDelete: Cascade)
  user             User          @relation(fields: [userId], references: [id])
  clubMember       ClubMember    @relation("TournamentEntryMember", fields: [clubMemberId], references: [id])
  players          EntryPlayer[]
  entryEvents      EntryEvent[]

  @@unique([tournamentId, userId])
  @@index([tournamentId])
  @@index([userId])
}

// 선수 명단 (신청서 단위, 티셔츠 중복 방지용)
model EntryPlayer {
  id           String             @id @default(cuid())
  entryId      String
  name         String
  gender       String
  birthDate    String                                    // 민감정보
  phoneNumber  String                                    // 민감정보
  tshirtSize   String?                                   // 민감정보
  order        Int                @default(0)

  entry        TournamentEntry    @relation(fields: [entryId], references: [id], onDelete: Cascade)
  eventPlayers EntryEventPlayer[]

  @@index([entryId])
}

// 신청 종목 1줄 (부분 취소 단위)
model EntryEvent {
  id             String                 @id @default(cuid())
  entryId        String
  eventOptionId  String
  fee            Int                                          // 신청 시점 참가비 스냅샷
  status         EntryEventStatus       @default(ACTIVE)
  canceledAt     DateTime?

  entry          TournamentEntry        @relation(fields: [entryId], references: [id], onDelete: Cascade)
  eventOption    TournamentEventOption  @relation(fields: [eventOptionId], references: [id])
  eventPlayers   EntryEventPlayer[]

  @@index([entryId])
  @@index([eventOptionId])
}

// 종목 ↔ 선수 배정
model EntryEventPlayer {
  id            String       @id @default(cuid())
  entryEventId  String
  entryPlayerId String

  entryEvent    EntryEvent   @relation(fields: [entryEventId], references: [id], onDelete: Cascade)
  entryPlayer   EntryPlayer  @relation(fields: [entryPlayerId], references: [id], onDelete: Cascade)

  @@unique([entryEventId, entryPlayerId])
  @@index([entryEventId])
}
```

- [ ] **Step 3: Club / User / ClubMember 에 관계 필드 추가**

`prisma/schema/club.prisma` 의 `Club` 모델 관계 블록에 한 줄 추가한다:

```prisma
  tournaments        Tournament[]        @relation("ClubToTournament")
```

같은 파일 `ClubMember` 모델의 Relations 블록에 추가한다:

```prisma
  tournamentEntries        TournamentEntry[]     @relation("TournamentEntryMember")
```

`prisma/schema/user.prisma` 의 `User` 모델 Relations 블록에 추가한다:

```prisma
  tournamentEntries   TournamentEntry[]
```

- [ ] **Step 4: build-schema.ts 에 등록**

`prisma/build-schema.ts` 의 `schemaFiles` 배열에서 `'guest.prisma',` 다음 줄에 추가한다. (`club.prisma` 뒤여야 관계가 해석된다)

```ts
  'guest.prisma',
  'tournament.prisma',
```

- [ ] **Step 5: 스키마 빌드 및 검증**

Run:
```bash
npm run build:schema && npx prisma validate
```
Expected: `Schema built successfully!` 그리고 `The schema at prisma/schema.prisma is valid 🚀`

에러가 나면 관계 필드 이름이 양쪽에서 일치하는지 확인한다. Prisma는 관계의 양쪽에 필드가 모두 있어야 한다.

- [ ] **Step 6: 마이그레이션 생성**

Run:
```bash
npx prisma migrate dev --name add_tournament_entry_system
```
Expected: `prisma/migrations/<timestamp>_add_tournament_entry_system/migration.sql` 생성 + Prisma Client 재생성

**주의:** DB 연결이 안 되면(`DATABASE_URL` 미설정 등) 사용자에게 알리고 중단한다. 마이그레이션 없이 다음 태스크로 진행하면 타입이 없어 전부 실패한다.

- [ ] **Step 7: 타입 생성 확인**

Run:
```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | head -20
```
Expected: 기존 에러 외에 새로운 에러 없음

- [ ] **Step 8: 커밋**

```bash
git add prisma/
git commit -m "feat(tournament): 대회 참가 신청 도메인 스키마 추가

- Tournament, TournamentEventOption, TournamentEntry
- EntryPlayer, EntryEvent, EntryEventPlayer
- TournamentStatus, EntryPaymentStatus, EntryEventStatus enum"
```

---

### Task 2: 도메인 타입 정의

**Files:**
- Create: `src/types/tournament.types.ts`
- Modify: `src/types/index.ts`

**Interfaces:**
- Consumes: Task 1의 Prisma 생성 타입
- Produces:
  - `TournamentEffectiveStatus = 'DRAFT' | 'UPCOMING' | 'OPEN' | 'CLOSED'`
  - `EventOptionInput` — 종목 옵션 입력 (id 없음)
  - `EntrySubmissionInput` — 신청 제출 페이로드
  - `PlayerInput`, `EntryEventInput`
  - `PublicParticipant` — 마스킹된 참가자
  - `EntryForAdmin` — 민감정보 포함 신청서

**기존 타입 재사용:** `src/types/common.types.ts` 의 `ApiErrorResponse` (`{ error, status }`) 가 스펙의 실패 응답 형식과 정확히 일치하므로 그대로 쓴다. 새로 정의하지 않는다. 성공 응답은 기존 `ApiSuccessResponse<K, T>` 가 `data: Record<K, T>` 로 키를 한 겹 감싸는 형태인데, 이 도메인은 `{ data: T, message }` 를 쓰므로 별도로 `TournamentApiSuccess<T>` 를 정의한다.

- [ ] **Step 1: 타입 파일 작성**

`src/types/tournament.types.ts`:

```ts
import type {
  EntryEvent,
  EntryEventStatus,
  EntryPaymentStatus,
  EntryPlayer,
  Tournament,
  TournamentEventOption,
  TournamentEntry,
  TournamentStatus,
} from '@prisma/client';

// Prisma enum 재노출
export type { TournamentStatus, EntryPaymentStatus, EntryEventStatus };

// DB에 저장되지 않는 파생 상태. UPCOMING은 응답에만 존재한다.
export type TournamentEffectiveStatus =
  | 'DRAFT'
  | 'UPCOMING'
  | 'OPEN'
  | 'CLOSED';

// ---------- 공통 API 응답 ----------
// 실패 응답은 기존 common.types.ts의 ApiErrorResponse를 그대로 사용한다.
// 성공 응답은 기존 ApiSuccessResponse가 data를 Record<K,T>로 감싸는 형태라
// 이 도메인 전용으로 평평한 형태를 정의한다.
export interface TournamentApiSuccess<T> {
  data: T;
  message: string;
}

// ---------- 관리자: 대회 생성/수정 입력 ----------
export interface EventOptionInput {
  id?: string; // 수정 시 기존 옵션 식별용. 신규는 undefined
  eventType: string;
  ageGroup: string;
  level: string;
  playerCount: number;
  fee: number;
  order: number;
}

export interface TournamentInput {
  title: string;
  hostName?: string | null;
  description?: string | null;
  tournamentDate?: string | null;
  location?: string | null;
  applyStartAt?: string | null; // ISO 문자열
  applyDeadline: string; // ISO 문자열
  status: TournamentStatus;
  useTeamName: boolean;
  tshirtSizes: string[];
  bankAccount?: string | null;
  eventOptions: EventOptionInput[];
}

// ---------- 신청자: 신청 제출 입력 ----------
export interface PlayerInput {
  key: string; // 폼 내부에서 종목↔선수를 잇는 임시 식별자
  name: string;
  gender: string;
  birthDate: string;
  phoneNumber: string;
  tshirtSize?: string | null;
  order: number;
}

export interface EntryEventInput {
  eventOptionId: string;
  playerKeys: string[]; // PlayerInput.key 참조
}

export interface EntrySubmissionInput {
  depositorName: string;
  teamName?: string | null;
  players: PlayerInput[];
  events: EntryEventInput[];
  privacyAgreed: boolean;
}

// ---------- 회원용: 마스킹된 참가자 ----------
export interface PublicParticipant {
  name: string;
  eventType: string;
  ageGroup: string;
  level: string;
}

// ---------- 관리자용: 민감정보 포함 ----------
export type EntryEventWithDetail = EntryEvent & {
  eventOption: TournamentEventOption;
  eventPlayers: Array<{ entryPlayer: EntryPlayer }>;
};

export type EntryForAdmin = TournamentEntry & {
  players: EntryPlayer[];
  entryEvents: EntryEventWithDetail[];
  clubMember: { id: number; name: string | null };
};

export type TournamentWithOptions = Tournament & {
  eventOptions: TournamentEventOption[];
};

// 대회 상세 응답 (회원용)
export interface TournamentDetailResponse {
  tournament: TournamentWithOptions;
  effectiveStatus: TournamentEffectiveStatus;
  participants: PublicParticipant[];
  myEntryId: string | null;
}
```

- [ ] **Step 2: index.ts 에 re-export 추가**

`src/types/index.ts` 의 마지막 줄(`export * from './board.types';`) 다음에 추가한다.

```ts
export * from './tournament.types';
```

- [ ] **Step 3: 타입 체크**

Run:
```bash
npx tsc --noEmit 2>&1 | grep -i tournament | head -20
```
Expected: 출력 없음 (tournament 관련 에러 없음)

- [ ] **Step 4: 커밋**

```bash
git add src/types/
git commit -m "feat(tournament): 대회 신청 도메인 타입 정의"
```

---

### Task 3: 참가비 합산 로직

**Files:**
- Create: `src/lib/tournament/fee.ts`
- Test: `src/lib/tournament/fee.test.ts`

**Interfaces:**
- Consumes: Task 2의 `EntryEventStatus`
- Produces: `calculateTotalFee(events: FeeCalculable[]): number`, `type FeeCalculable = { fee: number; status: EntryEventStatus }`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/tournament/fee.test.ts`:

```ts
import { describe, expect, it } from '@jest/globals';

import { calculateTotalFee } from './fee';

describe('calculateTotalFee', () => {
  it('ACTIVE 종목의 참가비만 합산한다', () => {
    const result = calculateTotalFee([
      { fee: 30000, status: 'ACTIVE' },
      { fee: 30000, status: 'ACTIVE' },
    ]);
    expect(result).toBe(60000);
  });

  it('CANCELED 종목은 합산에서 제외한다', () => {
    const result = calculateTotalFee([
      { fee: 30000, status: 'ACTIVE' },
      { fee: 30000, status: 'CANCELED' },
    ]);
    expect(result).toBe(30000);
  });

  it('빈 배열이면 0을 반환한다', () => {
    expect(calculateTotalFee([])).toBe(0);
  });

  it('모든 종목이 취소되면 0을 반환한다', () => {
    const result = calculateTotalFee([
      { fee: 30000, status: 'CANCELED' },
      { fee: 20000, status: 'CANCELED' },
    ]);
    expect(result).toBe(0);
  });

  it('참가비가 0원인 무료 대회도 처리한다', () => {
    expect(calculateTotalFee([{ fee: 0, status: 'ACTIVE' }])).toBe(0);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx jest src/lib/tournament/fee.test.ts`
Expected: FAIL — `Cannot find module './fee'`

- [ ] **Step 3: 구현**

`src/lib/tournament/fee.ts`:

```ts
import type { EntryEventStatus } from '@/types/tournament.types';

export type FeeCalculable = {
  fee: number;
  status: EntryEventStatus;
};

/**
 * ACTIVE 상태인 신청 종목의 참가비를 합산한다.
 * 취소된 종목은 청구 대상이 아니므로 제외한다.
 */
export function calculateTotalFee(events: FeeCalculable[]): number {
  return events
    .filter((event) => event.status === 'ACTIVE')
    .reduce((sum, event) => sum + event.fee, 0);
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx jest src/lib/tournament/fee.test.ts`
Expected: PASS — 5 tests passed

- [ ] **Step 5: 커밋**

```bash
git add src/lib/tournament/fee.ts src/lib/tournament/fee.test.ts
git commit -m "feat(tournament): 참가비 합산 로직 추가"
```

---

### Task 4: 대회 상태 파생 로직

**Files:**
- Create: `src/lib/tournament/status.ts`
- Test: `src/lib/tournament/status.test.ts`

**Interfaces:**
- Consumes: Task 2의 `TournamentStatus`, `TournamentEffectiveStatus`
- Produces:
  - `resolveTournamentStatus(input: StatusResolvable, now: Date): TournamentEffectiveStatus`
  - `type StatusResolvable = { status: TournamentStatus; applyStartAt: Date | null; applyDeadline: Date }`
  - `isAcceptingEntries(input: StatusResolvable, now: Date): boolean`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/tournament/status.test.ts`:

```ts
import { describe, expect, it } from '@jest/globals';

import { isAcceptingEntries, resolveTournamentStatus } from './status';

const NOW = new Date('2026-08-16T12:00:00Z');

describe('resolveTournamentStatus', () => {
  it('DRAFT는 마감일과 무관하게 DRAFT를 유지한다', () => {
    const result = resolveTournamentStatus(
      {
        status: 'DRAFT',
        applyStartAt: null,
        applyDeadline: new Date('2026-09-01T00:00:00Z'),
      },
      NOW
    );
    expect(result).toBe('DRAFT');
  });

  it('관리자가 수동 마감하면 마감일 이전이어도 CLOSED', () => {
    const result = resolveTournamentStatus(
      {
        status: 'CLOSED',
        applyStartAt: null,
        applyDeadline: new Date('2026-09-01T00:00:00Z'),
      },
      NOW
    );
    expect(result).toBe('CLOSED');
  });

  it('마감일이 지나면 OPEN이어도 CLOSED', () => {
    const result = resolveTournamentStatus(
      {
        status: 'OPEN',
        applyStartAt: null,
        applyDeadline: new Date('2026-08-01T00:00:00Z'),
      },
      NOW
    );
    expect(result).toBe('CLOSED');
  });

  it('신청 시작 전이면 UPCOMING', () => {
    const result = resolveTournamentStatus(
      {
        status: 'OPEN',
        applyStartAt: new Date('2026-08-20T00:00:00Z'),
        applyDeadline: new Date('2026-09-01T00:00:00Z'),
      },
      NOW
    );
    expect(result).toBe('UPCOMING');
  });

  it('신청 기간 안이면 OPEN', () => {
    const result = resolveTournamentStatus(
      {
        status: 'OPEN',
        applyStartAt: new Date('2026-08-10T00:00:00Z'),
        applyDeadline: new Date('2026-09-01T00:00:00Z'),
      },
      NOW
    );
    expect(result).toBe('OPEN');
  });

  it('applyStartAt이 없으면 마감 전까지 OPEN', () => {
    const result = resolveTournamentStatus(
      {
        status: 'OPEN',
        applyStartAt: null,
        applyDeadline: new Date('2026-09-01T00:00:00Z'),
      },
      NOW
    );
    expect(result).toBe('OPEN');
  });

  it('마감일과 현재가 같은 순간이면 아직 OPEN이다', () => {
    const deadline = new Date('2026-08-16T12:00:00Z');
    const result = resolveTournamentStatus(
      { status: 'OPEN', applyStartAt: null, applyDeadline: deadline },
      NOW
    );
    expect(result).toBe('OPEN');
  });
});

describe('isAcceptingEntries', () => {
  it('OPEN 상태에서만 true', () => {
    expect(
      isAcceptingEntries(
        {
          status: 'OPEN',
          applyStartAt: null,
          applyDeadline: new Date('2026-09-01T00:00:00Z'),
        },
        NOW
      )
    ).toBe(true);
  });

  it('마감되면 false', () => {
    expect(
      isAcceptingEntries(
        {
          status: 'OPEN',
          applyStartAt: null,
          applyDeadline: new Date('2026-08-01T00:00:00Z'),
        },
        NOW
      )
    ).toBe(false);
  });

  it('DRAFT면 false', () => {
    expect(
      isAcceptingEntries(
        {
          status: 'DRAFT',
          applyStartAt: null,
          applyDeadline: new Date('2026-09-01T00:00:00Z'),
        },
        NOW
      )
    ).toBe(false);
  });

  it('시작 전이면 false', () => {
    expect(
      isAcceptingEntries(
        {
          status: 'OPEN',
          applyStartAt: new Date('2026-08-20T00:00:00Z'),
          applyDeadline: new Date('2026-09-01T00:00:00Z'),
        },
        NOW
      )
    ).toBe(false);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx jest src/lib/tournament/status.test.ts`
Expected: FAIL — `Cannot find module './status'`

- [ ] **Step 3: 구현**

`src/lib/tournament/status.ts`:

```ts
import type {
  TournamentEffectiveStatus,
  TournamentStatus,
} from '@/types/tournament.types';

export type StatusResolvable = {
  status: TournamentStatus;
  applyStartAt: Date | null;
  applyDeadline: Date;
};

/**
 * DB의 status(관리자 수동 의도)와 신청 기간을 조합해 실제 노출 상태를 파생한다.
 * 스케줄러 없이 조회 시점에 계산하므로 cron이 필요 없다.
 */
export function resolveTournamentStatus(
  input: StatusResolvable,
  now: Date
): TournamentEffectiveStatus {
  if (input.status === 'DRAFT') return 'DRAFT';
  if (input.status === 'CLOSED') return 'CLOSED';
  if (now.getTime() > input.applyDeadline.getTime()) return 'CLOSED';
  if (input.applyStartAt && now.getTime() < input.applyStartAt.getTime()) {
    return 'UPCOMING';
  }
  return 'OPEN';
}

/**
 * 신청서 제출·수정·취소가 가능한 상태인지 판단한다.
 */
export function isAcceptingEntries(
  input: StatusResolvable,
  now: Date
): boolean {
  return resolveTournamentStatus(input, now) === 'OPEN';
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx jest src/lib/tournament/status.test.ts`
Expected: PASS — 11 tests passed

- [ ] **Step 5: 커밋**

```bash
git add src/lib/tournament/status.ts src/lib/tournament/status.test.ts
git commit -m "feat(tournament): 대회 상태 파생 로직 추가"
```

---

### Task 5: 취소 후 신청서 상태 계산

**Files:**
- Create: `src/lib/tournament/cancel.ts`
- Test: `src/lib/tournament/cancel.test.ts`

**Interfaces:**
- Consumes: Task 3의 `calculateTotalFee`, Task 2의 `EntryPaymentStatus`, `EntryEventStatus`
- Produces:
  - `resolveEntryStateAfterCancel(events: CancelableEvent[], currentPaymentStatus: EntryPaymentStatus, canceledEventId: string): EntryStateAfterCancel`
  - `type CancelableEvent = { id: string; fee: number; status: EntryEventStatus }`
  - `type EntryStateAfterCancel = { totalFee: number; paymentStatus: EntryPaymentStatus; allCanceled: boolean }`

이 함수는 스펙 §3.4의 "신청서 단위 상태와 종목 단위 상태의 관계" 표를 구현한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/tournament/cancel.test.ts`:

```ts
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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx jest src/lib/tournament/cancel.test.ts`
Expected: FAIL — `Cannot find module './cancel'`

- [ ] **Step 3: 구현**

`src/lib/tournament/cancel.ts`:

```ts
import type {
  EntryEventStatus,
  EntryPaymentStatus,
} from '@/types/tournament.types';

import { calculateTotalFee } from './fee';

export type CancelableEvent = {
  id: string;
  fee: number;
  status: EntryEventStatus;
};

export type EntryStateAfterCancel = {
  totalFee: number;
  paymentStatus: EntryPaymentStatus;
  allCanceled: boolean;
};

/**
 * 종목 하나를 취소했을 때 신청서가 가져야 할 상태를 계산한다.
 *
 * - 남은 ACTIVE 종목이 있으면 paymentStatus는 그대로 둔다.
 *   (입금확인 후 부분 취소 시 CONFIRMED를 유지하고 totalFee만 줄어든다.
 *    임원이 "입금액 > 청구액"을 보고 환불을 판단한다)
 * - 모든 종목이 취소되면 신청서 자체를 CANCELED로 내린다.
 */
export function resolveEntryStateAfterCancel(
  events: CancelableEvent[],
  currentPaymentStatus: EntryPaymentStatus,
  canceledEventId: string
): EntryStateAfterCancel {
  const nextEvents = events.map((event) =>
    event.id === canceledEventId
      ? { ...event, status: 'CANCELED' as EntryEventStatus }
      : event
  );

  const totalFee = calculateTotalFee(nextEvents);
  const allCanceled = nextEvents.every((event) => event.status === 'CANCELED');

  return {
    totalFee,
    paymentStatus: allCanceled ? 'CANCELED' : currentPaymentStatus,
    allCanceled,
  };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx jest src/lib/tournament/cancel.test.ts`
Expected: PASS — 5 tests passed

- [ ] **Step 5: 커밋**

```bash
git add src/lib/tournament/cancel.ts src/lib/tournament/cancel.test.ts
git commit -m "feat(tournament): 종목 취소 후 신청서 상태 계산 로직 추가"
```

---

### Task 6: 신청 제출 검증 로직

**Files:**
- Create: `src/lib/tournament/validation.ts`
- Test: `src/lib/tournament/validation.test.ts`

**Interfaces:**
- Consumes: Task 2의 `EntrySubmissionInput`, `PlayerInput`, `EntryEventInput`
- Produces:
  - `validateEntrySubmission(input: EntrySubmissionInput, options: ValidatableOption[]): ValidationResult`
  - `type ValidatableOption = { id: string; playerCount: number; isActive: boolean }`
  - `type ValidationResult = { ok: true } | { ok: false; error: string }`

스펙 §5.3 의 검증 표를 구현한다. **대회 마감 여부는 여기서 검사하지 않는다** — 그건 `isAcceptingEntries`(Task 4)의 책임이고, API 핸들러에서 두 함수를 모두 호출한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/tournament/validation.test.ts`:

```ts
import { describe, expect, it } from '@jest/globals';

import type { EntrySubmissionInput } from '@/types/tournament.types';

import { validateEntrySubmission } from './validation';

const OPTIONS = [
  { id: 'opt-double', playerCount: 2, isActive: true },
  { id: 'opt-single', playerCount: 1, isActive: true },
  { id: 'opt-inactive', playerCount: 2, isActive: false },
];

function makeInput(
  overrides: Partial<EntrySubmissionInput> = {}
): EntrySubmissionInput {
  return {
    depositorName: '홍길동',
    teamName: null,
    privacyAgreed: true,
    players: [
      {
        key: 'p1',
        name: '홍길동',
        gender: '남',
        birthDate: '1990-01-01',
        phoneNumber: '010-1111-2222',
        tshirtSize: 'L',
        order: 0,
      },
      {
        key: 'p2',
        name: '김철수',
        gender: '남',
        birthDate: '1988-05-05',
        phoneNumber: '010-3333-4444',
        tshirtSize: 'XL',
        order: 1,
      },
    ],
    events: [{ eventOptionId: 'opt-double', playerKeys: ['p1', 'p2'] }],
    ...overrides,
  };
}

describe('validateEntrySubmission', () => {
  it('정상 입력이면 ok true', () => {
    expect(validateEntrySubmission(makeInput(), OPTIONS)).toEqual({ ok: true });
  });

  it('개인정보 동의를 안 하면 거부한다', () => {
    const result = validateEntrySubmission(
      makeInput({ privacyAgreed: false }),
      OPTIONS
    );
    expect(result).toEqual({
      ok: false,
      error: '개인정보 수집·이용에 동의해야 신청할 수 있습니다.',
    });
  });

  it('입금자명이 비어 있으면 거부한다', () => {
    const result = validateEntrySubmission(
      makeInput({ depositorName: '   ' }),
      OPTIONS
    );
    expect(result).toEqual({ ok: false, error: '입금자명을 입력해주세요.' });
  });

  it('선수가 한 명도 없으면 거부한다', () => {
    const result = validateEntrySubmission(
      makeInput({ players: [], events: [] }),
      OPTIONS
    );
    expect(result).toEqual({ ok: false, error: '선수를 1명 이상 등록해주세요.' });
  });

  it('신청 종목이 없으면 거부한다', () => {
    const result = validateEntrySubmission(makeInput({ events: [] }), OPTIONS);
    expect(result).toEqual({ ok: false, error: '종목을 1개 이상 선택해주세요.' });
  });

  it('선수 key가 중복되면 거부한다', () => {
    const input = makeInput();
    input.players[1].key = 'p1';
    const result = validateEntrySubmission(input, OPTIONS);
    expect(result).toEqual({ ok: false, error: '선수 정보가 올바르지 않습니다.' });
  });

  it('이 대회에 없는 종목 ID면 거부한다', () => {
    const result = validateEntrySubmission(
      makeInput({
        events: [{ eventOptionId: 'opt-other-tournament', playerKeys: ['p1', 'p2'] }],
      }),
      OPTIONS
    );
    expect(result).toEqual({ ok: false, error: '선택할 수 없는 종목입니다.' });
  });

  it('비활성 종목이면 거부한다', () => {
    const result = validateEntrySubmission(
      makeInput({
        events: [{ eventOptionId: 'opt-inactive', playerKeys: ['p1', 'p2'] }],
      }),
      OPTIONS
    );
    expect(result).toEqual({ ok: false, error: '선택할 수 없는 종목입니다.' });
  });

  it('복식에 선수를 1명만 배정하면 거부한다', () => {
    const result = validateEntrySubmission(
      makeInput({
        events: [{ eventOptionId: 'opt-double', playerKeys: ['p1'] }],
      }),
      OPTIONS
    );
    expect(result).toEqual({
      ok: false,
      error: '종목별 선수 인원이 맞지 않습니다. (필요: 2명)',
    });
  });

  it('단식에 선수를 2명 배정하면 거부한다', () => {
    const result = validateEntrySubmission(
      makeInput({
        events: [{ eventOptionId: 'opt-single', playerKeys: ['p1', 'p2'] }],
      }),
      OPTIONS
    );
    expect(result).toEqual({
      ok: false,
      error: '종목별 선수 인원이 맞지 않습니다. (필요: 1명)',
    });
  });

  it('신청서에 없는 선수를 배정하면 거부한다', () => {
    const result = validateEntrySubmission(
      makeInput({
        events: [{ eventOptionId: 'opt-double', playerKeys: ['p1', 'p-ghost'] }],
      }),
      OPTIONS
    );
    expect(result).toEqual({
      ok: false,
      error: '종목에 배정된 선수를 찾을 수 없습니다.',
    });
  });

  it('같은 종목에 같은 선수를 두 번 배정하면 거부한다', () => {
    const result = validateEntrySubmission(
      makeInput({
        events: [{ eventOptionId: 'opt-double', playerKeys: ['p1', 'p1'] }],
      }),
      OPTIONS
    );
    expect(result).toEqual({
      ok: false,
      error: '한 종목에 같은 선수를 중복 배정할 수 없습니다.',
    });
  });

  it('같은 종목을 두 줄로 신청하면 거부한다', () => {
    const result = validateEntrySubmission(
      makeInput({
        events: [
          { eventOptionId: 'opt-double', playerKeys: ['p1', 'p2'] },
          { eventOptionId: 'opt-double', playerKeys: ['p1', 'p2'] },
        ],
      }),
      OPTIONS
    );
    expect(result).toEqual({ ok: false, error: '같은 종목을 중복 신청했습니다.' });
  });

  it('선수 이름이 비어 있으면 거부한다', () => {
    const input = makeInput();
    input.players[0].name = '';
    const result = validateEntrySubmission(input, OPTIONS);
    expect(result).toEqual({ ok: false, error: '선수 이름을 모두 입력해주세요.' });
  });

  it('한 선수가 여러 종목에 나가는 것은 허용한다', () => {
    const result = validateEntrySubmission(
      makeInput({
        events: [
          { eventOptionId: 'opt-double', playerKeys: ['p1', 'p2'] },
          { eventOptionId: 'opt-single', playerKeys: ['p1'] },
        ],
      }),
      OPTIONS
    );
    expect(result).toEqual({ ok: true });
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx jest src/lib/tournament/validation.test.ts`
Expected: FAIL — `Cannot find module './validation'`

- [ ] **Step 3: 구현**

`src/lib/tournament/validation.ts`:

```ts
import type { EntrySubmissionInput } from '@/types/tournament.types';

export type ValidatableOption = {
  id: string;
  playerCount: number;
  isActive: boolean;
};

export type ValidationResult = { ok: true } | { ok: false; error: string };

function fail(error: string): ValidationResult {
  return { ok: false, error };
}

/**
 * 신청 제출 페이로드를 검증한다.
 * 클라이언트가 보낸 값을 신뢰하지 않고 서버에서 재검증하는 것이 목적이다.
 * 대회 마감 여부는 isAcceptingEntries()의 책임이므로 여기서 다루지 않는다.
 */
export function validateEntrySubmission(
  input: EntrySubmissionInput,
  options: ValidatableOption[]
): ValidationResult {
  if (!input.privacyAgreed) {
    return fail('개인정보 수집·이용에 동의해야 신청할 수 있습니다.');
  }
  if (!input.depositorName?.trim()) {
    return fail('입금자명을 입력해주세요.');
  }
  if (input.players.length === 0) {
    return fail('선수를 1명 이상 등록해주세요.');
  }
  if (input.events.length === 0) {
    return fail('종목을 1개 이상 선택해주세요.');
  }

  const playerKeys = new Set(input.players.map((player) => player.key));
  if (playerKeys.size !== input.players.length) {
    return fail('선수 정보가 올바르지 않습니다.');
  }
  if (input.players.some((player) => !player.name?.trim())) {
    return fail('선수 이름을 모두 입력해주세요.');
  }

  const optionMap = new Map(options.map((option) => [option.id, option]));
  const seenOptionIds = new Set<string>();

  for (const event of input.events) {
    const option = optionMap.get(event.eventOptionId);
    if (!option || !option.isActive) {
      return fail('선택할 수 없는 종목입니다.');
    }
    if (seenOptionIds.has(event.eventOptionId)) {
      return fail('같은 종목을 중복 신청했습니다.');
    }
    seenOptionIds.add(event.eventOptionId);

    if (event.playerKeys.length !== option.playerCount) {
      return fail(
        `종목별 선수 인원이 맞지 않습니다. (필요: ${option.playerCount}명)`
      );
    }
    if (new Set(event.playerKeys).size !== event.playerKeys.length) {
      return fail('한 종목에 같은 선수를 중복 배정할 수 없습니다.');
    }
    if (event.playerKeys.some((key) => !playerKeys.has(key))) {
      return fail('종목에 배정된 선수를 찾을 수 없습니다.');
    }
  }

  return { ok: true };
}
```

**검증 순서 주의:** 인원수 → 중복 배정 → 존재 여부 순서를 지켜야 테스트가 통과한다. 복식에 `['p1','p1']` 을 넣으면 인원수는 2로 맞으므로 중복 검사에서 걸려야 한다.

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx jest src/lib/tournament/validation.test.ts`
Expected: PASS — 15 tests passed

- [ ] **Step 5: 커밋**

```bash
git add src/lib/tournament/validation.ts src/lib/tournament/validation.test.ts
git commit -m "feat(tournament): 신청 제출 검증 로직 추가"
```

---

### Task 7: 마스킹 변환 (개인정보 차단)

**Files:**
- Create: `src/lib/tournament/serialize.ts`
- Test: `src/lib/tournament/serialize.test.ts`

**Interfaces:**
- Consumes: Task 2의 `PublicParticipant`
- Produces:
  - `toPublicParticipants(entries: MaskableEntry[]): PublicParticipant[]`
  - `type MaskableEntry` — 아래 구현 참조
  - `PUBLIC_PARTICIPANT_SELECT` — Prisma select 상수

**이 태스크가 이 시스템에서 가장 중요하다.** 개인정보 노출이 게시판 방식을 버린 이유이므로, 민감 필드가 결과에 **존재하지 않음**을 명시적으로 테스트한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/tournament/serialize.test.ts`:

```ts
import { describe, expect, it } from '@jest/globals';

import { toPublicParticipants } from './serialize';

const ENTRIES = [
  {
    entryEvents: [
      {
        status: 'ACTIVE' as const,
        eventOption: { eventType: '남자복식', ageGroup: '30대부', level: 'A조' },
        eventPlayers: [
          { entryPlayer: { name: '홍길동' } },
          { entryPlayer: { name: '김철수' } },
        ],
      },
    ],
  },
];

describe('toPublicParticipants', () => {
  it('종목별 선수를 평평한 목록으로 펼친다', () => {
    expect(toPublicParticipants(ENTRIES)).toEqual([
      { name: '홍길동', eventType: '남자복식', ageGroup: '30대부', level: 'A조' },
      { name: '김철수', eventType: '남자복식', ageGroup: '30대부', level: 'A조' },
    ]);
  });

  it('취소된 종목은 목록에서 제외한다', () => {
    const entries = [
      {
        entryEvents: [
          {
            status: 'CANCELED' as const,
            eventOption: { eventType: '남자복식', ageGroup: '30대부', level: 'A조' },
            eventPlayers: [{ entryPlayer: { name: '홍길동' } }],
          },
        ],
      },
    ];
    expect(toPublicParticipants(entries)).toEqual([]);
  });

  it('민감정보 키가 결과에 존재하지 않는다', () => {
    const result = toPublicParticipants(ENTRIES);
    for (const participant of result) {
      expect(participant).not.toHaveProperty('birthDate');
      expect(participant).not.toHaveProperty('phoneNumber');
      expect(participant).not.toHaveProperty('tshirtSize');
      expect(Object.keys(participant).sort()).toEqual([
        'ageGroup',
        'eventType',
        'level',
        'name',
      ]);
    }
  });

  it('여러 신청서를 하나의 목록으로 합친다', () => {
    const entries = [...ENTRIES, ...ENTRIES];
    expect(toPublicParticipants(entries)).toHaveLength(4);
  });

  it('신청서가 없으면 빈 배열', () => {
    expect(toPublicParticipants([])).toEqual([]);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx jest src/lib/tournament/serialize.test.ts`
Expected: FAIL — `Cannot find module './serialize'`

- [ ] **Step 3: 구현**

`src/lib/tournament/serialize.ts`:

```ts
import type {
  EntryEventStatus,
  PublicParticipant,
} from '@/types/tournament.types';

export type MaskableEntry = {
  entryEvents: Array<{
    status: EntryEventStatus;
    eventOption: { eventType: string; ageGroup: string; level: string };
    eventPlayers: Array<{ entryPlayer: { name: string } }>;
  }>;
};

/**
 * 회원 전체에게 공개되는 참가자 목록을 만든다.
 * 이름과 종목 정보만 담고 생년월일·전화번호·티셔츠 사이즈는 포함하지 않는다.
 *
 * 이 함수에 넘기는 데이터부터 PUBLIC_PARTICIPANT_SELECT로 조회해야 한다.
 * 민감정보를 조회한 뒤 여기서 버리는 방식은 쓰지 않는다.
 */
export function toPublicParticipants(
  entries: MaskableEntry[]
): PublicParticipant[] {
  return entries.flatMap((entry) =>
    entry.entryEvents
      .filter((event) => event.status === 'ACTIVE')
      .flatMap((event) =>
        event.eventPlayers.map((eventPlayer) => ({
          name: eventPlayer.entryPlayer.name,
          eventType: event.eventOption.eventType,
          ageGroup: event.eventOption.ageGroup,
          level: event.eventOption.level,
        }))
      )
  );
}

/**
 * 회원용 참가자 목록 조회 시 사용하는 Prisma select.
 * 민감 필드를 애초에 DB에서 가져오지 않는 것이 핵심이다.
 */
export const PUBLIC_PARTICIPANT_SELECT = {
  entryEvents: {
    select: {
      status: true,
      eventOption: {
        select: { eventType: true, ageGroup: true, level: true },
      },
      eventPlayers: {
        select: { entryPlayer: { select: { name: true } } },
      },
    },
  },
} as const;
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx jest src/lib/tournament/serialize.test.ts`
Expected: PASS — 5 tests passed

- [ ] **Step 5: 커밋**

```bash
git add src/lib/tournament/serialize.ts src/lib/tournament/serialize.test.ts
git commit -m "feat(tournament): 회원용 참가자 목록 마스킹 변환 추가

민감정보는 Prisma select 단계에서 제외한다."
```

---

### Task 8: CSV 변환

**Files:**
- Create: `src/lib/tournament/csv.ts`
- Test: `src/lib/tournament/csv.test.ts`

**Interfaces:**
- Consumes: 없음 (자체 타입 정의)
- Produces:
  - `toCsvRows(entries: CsvEntry[]): string[][]`
  - `toCsvString(rows: string[][]): string` — BOM 포함
  - `CSV_HEADER: string[]`
  - `type CsvEntry` — 아래 구현 참조

CSV는 **종목 단위로 전개**한다. 한 선수가 2종목이면 2행이 나온다. 주최측 제출 양식이 보통 종목별 명단이기 때문이다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/tournament/csv.test.ts`:

```ts
import { describe, expect, it } from '@jest/globals';

import { CSV_HEADER, toCsvRows, toCsvString } from './csv';

const ENTRY = {
  depositorName: '홍길동',
  teamName: '번개클럽',
  paymentStatus: 'CONFIRMED' as const,
  entryEvents: [
    {
      status: 'ACTIVE' as const,
      fee: 30000,
      eventOption: { eventType: '남자복식', ageGroup: '30대부', level: 'A조' },
      eventPlayers: [
        {
          entryPlayer: {
            name: '홍길동',
            gender: '남',
            birthDate: '1990-01-01',
            phoneNumber: '010-1111-2222',
            tshirtSize: 'L',
          },
        },
        {
          entryPlayer: {
            name: '김철수',
            gender: '남',
            birthDate: '1988-05-05',
            phoneNumber: '010-3333-4444',
            tshirtSize: 'XL',
          },
        },
      ],
    },
  ],
};

describe('toCsvRows', () => {
  it('종목당 선수 수만큼 행을 만든다', () => {
    const rows = toCsvRows([ENTRY]);
    expect(rows).toHaveLength(2);
  });

  it('행에 종목·선수·입금 정보가 담긴다', () => {
    const [first] = toCsvRows([ENTRY]);
    expect(first).toEqual([
      '남자복식',
      '30대부',
      'A조',
      '홍길동',
      '남',
      '1990-01-01',
      '010-1111-2222',
      'L',
      '번개클럽',
      '홍길동',
      '30000',
      '입금확인',
    ]);
  });

  it('취소된 종목은 제외한다', () => {
    const entry = {
      ...ENTRY,
      entryEvents: [{ ...ENTRY.entryEvents[0], status: 'CANCELED' as const }],
    };
    expect(toCsvRows([entry])).toEqual([]);
  });

  it('팀명과 티셔츠가 없으면 빈 문자열로 채운다', () => {
    const entry = {
      ...ENTRY,
      teamName: null,
      entryEvents: [
        {
          ...ENTRY.entryEvents[0],
          eventPlayers: [
            {
              entryPlayer: {
                ...ENTRY.entryEvents[0].eventPlayers[0].entryPlayer,
                tshirtSize: null,
              },
            },
          ],
        },
      ],
    };
    const [first] = toCsvRows([entry]);
    expect(first[7]).toBe('');
    expect(first[8]).toBe('');
  });

  it('입금 상태를 한글로 변환한다', () => {
    const pending = toCsvRows([{ ...ENTRY, paymentStatus: 'PENDING' }]);
    expect(pending[0][11]).toBe('입금대기');
  });

  it('헤더 길이와 행 길이가 같다', () => {
    const [first] = toCsvRows([ENTRY]);
    expect(first).toHaveLength(CSV_HEADER.length);
  });
});

describe('toCsvString', () => {
  it('BOM으로 시작해 엑셀에서 한글이 깨지지 않는다', () => {
    const csv = toCsvString([['가나다']]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it('쉼표가 든 값을 큰따옴표로 감싼다', () => {
    const csv = toCsvString([['가,나']]);
    expect(csv).toContain('"가,나"');
  });

  it('큰따옴표가 든 값을 이스케이프한다', () => {
    const csv = toCsvString([['가"나']]);
    expect(csv).toContain('"가""나"');
  });

  it('행을 개행으로 잇는다', () => {
    const csv = toCsvString([['a'], ['b']]);
    expect(csv.replace('﻿', '')).toBe('a\r\nb');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx jest src/lib/tournament/csv.test.ts`
Expected: FAIL — `Cannot find module './csv'`

- [ ] **Step 3: 구현**

`src/lib/tournament/csv.ts`:

```ts
import type {
  EntryEventStatus,
  EntryPaymentStatus,
} from '@/types/tournament.types';

export type CsvEntry = {
  depositorName: string;
  teamName: string | null;
  paymentStatus: EntryPaymentStatus;
  entryEvents: Array<{
    status: EntryEventStatus;
    fee: number;
    eventOption: { eventType: string; ageGroup: string; level: string };
    eventPlayers: Array<{
      entryPlayer: {
        name: string;
        gender: string;
        birthDate: string;
        phoneNumber: string;
        tshirtSize: string | null;
      };
    }>;
  }>;
};

export const CSV_HEADER = [
  '종목',
  '연령',
  '급수',
  '이름',
  '성별',
  '생년월일',
  '전화번호',
  '티셔츠',
  '팀명',
  '입금자명',
  '참가비',
  '입금상태',
];

const PAYMENT_STATUS_LABEL: Record<EntryPaymentStatus, string> = {
  PENDING: '입금대기',
  CONFIRMED: '입금확인',
  CANCELED: '취소',
};

/**
 * 주최측 제출용 CSV 행을 만든다.
 * 종목 단위로 전개하므로 한 선수가 2종목이면 2행이 나온다.
 */
export function toCsvRows(entries: CsvEntry[]): string[][] {
  return entries.flatMap((entry) =>
    entry.entryEvents
      .filter((event) => event.status === 'ACTIVE')
      .flatMap((event) =>
        event.eventPlayers.map(({ entryPlayer }) => [
          event.eventOption.eventType,
          event.eventOption.ageGroup,
          event.eventOption.level,
          entryPlayer.name,
          entryPlayer.gender,
          entryPlayer.birthDate,
          entryPlayer.phoneNumber,
          entryPlayer.tshirtSize ?? '',
          entry.teamName ?? '',
          entry.depositorName,
          String(event.fee),
          PAYMENT_STATUS_LABEL[entry.paymentStatus],
        ])
      )
  );
}

function escapeCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * CSV 문자열로 직렬화한다.
 * 앞에 BOM을 붙여야 엑셀에서 한글이 깨지지 않는다.
 */
export function toCsvString(rows: string[][]): string {
  const body = rows
    .map((row) => row.map(escapeCell).join(','))
    .join('\r\n');
  return `﻿${body}`;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx jest src/lib/tournament/csv.test.ts`
Expected: PASS — 10 tests passed

- [ ] **Step 5: 커밋**

```bash
git add src/lib/tournament/csv.ts src/lib/tournament/csv.test.ts
git commit -m "feat(tournament): 주최측 제출용 CSV 변환 로직 추가"
```

---

### Task 9: 서버용 클럽 권한 헬퍼

**Files:**
- Create: `src/lib/clubAuth.ts`
- Test: `src/lib/clubAuth.test.ts`

**Interfaces:**
- Consumes: `@/lib/prisma` 싱글톤
- Produces:
  - `requireClubMember(userId: number, clubId: number): Promise<ClubMemberContext>`
  - `requireClubAdmin(userId: number, clubId: number): Promise<ClubMemberContext>`
  - `class ClubAuthError extends Error { status: number }`
  - `type ClubMemberContext = { id: number; role: string; status: string; name: string | null }`

기존 `src/utils/permissions.ts` 는 이미 조회된 객체를 받는 **클라이언트용** 헬퍼다. 이건 DB를 조회하는 서버용이므로 별도 파일에 만든다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/clubAuth.test.ts`:

```ts
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@/lib/prisma', () => ({
  prisma: { clubMember: { findUnique: jest.fn() } },
}));

import { prisma } from '@/lib/prisma';

import { ClubAuthError, requireClubAdmin, requireClubMember } from './clubAuth';

const findUnique = prisma.clubMember.findUnique as unknown as jest.Mock;

const APPROVED_MEMBER = {
  id: 10,
  role: 'MEMBER',
  status: 'APPROVED',
  name: '홍길동',
};

describe('requireClubMember', () => {
  beforeEach(() => jest.clearAllMocks());

  it('승인된 회원이면 컨텍스트를 반환한다', async () => {
    findUnique.mockResolvedValue(APPROVED_MEMBER);
    await expect(requireClubMember(1, 2)).resolves.toEqual(APPROVED_MEMBER);
  });

  it('클럽 멤버가 아니면 403', async () => {
    findUnique.mockResolvedValue(null);
    await expect(requireClubMember(1, 2)).rejects.toMatchObject({ status: 403 });
  });

  it('승인 대기중이면 403', async () => {
    findUnique.mockResolvedValue({ ...APPROVED_MEMBER, status: 'PENDING' });
    await expect(requireClubMember(1, 2)).rejects.toMatchObject({ status: 403 });
  });
});

describe('requireClubAdmin', () => {
  beforeEach(() => jest.clearAllMocks());

  it('ADMIN이면 컨텍스트를 반환한다', async () => {
    findUnique.mockResolvedValue({ ...APPROVED_MEMBER, role: 'ADMIN' });
    await expect(requireClubAdmin(1, 2)).resolves.toMatchObject({ role: 'ADMIN' });
  });

  it('일반 회원이면 403', async () => {
    findUnique.mockResolvedValue(APPROVED_MEMBER);
    await expect(requireClubAdmin(1, 2)).rejects.toMatchObject({ status: 403 });
  });

  it('ClubAuthError 인스턴스를 던진다', async () => {
    findUnique.mockResolvedValue(APPROVED_MEMBER);
    await expect(requireClubAdmin(1, 2)).rejects.toBeInstanceOf(ClubAuthError);
  });
});
```

**모킹 주의:** `jest.mock('@/lib/prisma', ...)` 호출은 `import` 문보다 위에 있어야 한다. jest가 호이스팅하지만, 명시적으로 위에 두면 읽는 사람이 헷갈리지 않는다.

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx jest src/lib/clubAuth.test.ts`
Expected: FAIL — `Cannot find module './clubAuth'`

- [ ] **Step 3: 구현**

`src/lib/clubAuth.ts`:

```ts
import { prisma } from '@/lib/prisma';

export type ClubMemberContext = {
  id: number;
  role: string;
  status: string;
  name: string | null;
};

export class ClubAuthError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ClubAuthError';
    this.status = status;
  }
}

async function findMember(
  userId: number,
  clubId: number
): Promise<ClubMemberContext | null> {
  return prisma.clubMember.findUnique({
    where: { clubId_userId: { clubId, userId } },
    select: { id: true, role: true, status: true, name: true },
  });
}

/**
 * 승인된 클럽 회원인지 확인한다. 아니면 ClubAuthError를 던진다.
 */
export async function requireClubMember(
  userId: number,
  clubId: number
): Promise<ClubMemberContext> {
  const member = await findMember(userId, clubId);
  if (!member || member.status !== 'APPROVED') {
    throw new ClubAuthError('클럽 회원만 이용할 수 있습니다.', 403);
  }
  return member;
}

/**
 * 클럽 임원(ADMIN)인지 확인한다. 아니면 ClubAuthError를 던진다.
 */
export async function requireClubAdmin(
  userId: number,
  clubId: number
): Promise<ClubMemberContext> {
  const member = await requireClubMember(userId, clubId);
  if (member.role !== 'ADMIN') {
    throw new ClubAuthError('권한이 없습니다.', 403);
  }
  return member;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx jest src/lib/clubAuth.test.ts`
Expected: PASS — 6 tests passed

- [ ] **Step 5: Phase 1 전체 테스트 확인**

Run: `npx jest src/lib/tournament src/lib/clubAuth.test.ts`
Expected: PASS — 6개 파일, 총 47 tests

- [ ] **Step 6: 커밋**

```bash
git add src/lib/clubAuth.ts src/lib/clubAuth.test.ts
git commit -m "feat(tournament): 서버용 클럽 권한 검증 헬퍼 추가"
```

---

## Phase 2: API 레이어

Phase 1의 순수 함수를 호출하는 얇은 핸들러를 만든다. 각 핸들러는 (1) 인증 (2) 권한 (3) 검증 (4) DB 작업 (5) 응답 순서를 따른다.

### Task 10: zod 스키마와 API 공통 유틸

**Files:**
- Create: `src/schemas/tournament.schema.ts`
- Create: `src/lib/tournament/apiHelpers.ts`
- Test: `src/schemas/tournament.schema.test.ts`

**Interfaces:**
- Consumes: Task 2의 타입, Task 9의 `ClubAuthError`
- Produces:
  - `tournamentInputSchema` — zod 스키마
  - `entrySubmissionSchema` — zod 스키마
  - `handleApiError(res, error): void`
  - `parseClubId(query): number | null`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/schemas/tournament.schema.test.ts`:

```ts
import { describe, expect, it } from '@jest/globals';

import { entrySubmissionSchema, tournamentInputSchema } from './tournament.schema';

const VALID_TOURNAMENT = {
  title: '2026 시장기 배드민턴 대회',
  hostName: '○○시 배드민턴협회',
  description: '참가비 종목당 3만원',
  tournamentDate: '2026-09-20',
  location: '○○체육관',
  applyStartAt: '2026-08-20T00:00:00.000Z',
  applyDeadline: '2026-09-01T00:00:00.000Z',
  status: 'OPEN',
  useTeamName: true,
  tshirtSizes: ['S', 'M', 'L'],
  bankAccount: '○○은행 123-456',
  eventOptions: [
    {
      eventType: '남자복식',
      ageGroup: '30대부',
      level: 'A조',
      playerCount: 2,
      fee: 30000,
      order: 0,
    },
  ],
};

describe('tournamentInputSchema', () => {
  it('정상 입력을 통과시킨다', () => {
    expect(tournamentInputSchema.safeParse(VALID_TOURNAMENT).success).toBe(true);
  });

  it('대회명이 없으면 거부한다', () => {
    const result = tournamentInputSchema.safeParse({
      ...VALID_TOURNAMENT,
      title: '',
    });
    expect(result.success).toBe(false);
  });

  it('종목 옵션이 비어 있으면 거부한다', () => {
    const result = tournamentInputSchema.safeParse({
      ...VALID_TOURNAMENT,
      eventOptions: [],
    });
    expect(result.success).toBe(false);
  });

  it('마감일이 시작일보다 빠르면 거부한다', () => {
    const result = tournamentInputSchema.safeParse({
      ...VALID_TOURNAMENT,
      applyStartAt: '2026-09-10T00:00:00.000Z',
      applyDeadline: '2026-09-01T00:00:00.000Z',
    });
    expect(result.success).toBe(false);
  });

  it('종목 조합이 중복되면 거부한다', () => {
    const option = VALID_TOURNAMENT.eventOptions[0];
    const result = tournamentInputSchema.safeParse({
      ...VALID_TOURNAMENT,
      eventOptions: [option, { ...option, order: 1 }],
    });
    expect(result.success).toBe(false);
  });

  it('playerCount가 1도 2도 아니면 거부한다', () => {
    const result = tournamentInputSchema.safeParse({
      ...VALID_TOURNAMENT,
      eventOptions: [{ ...VALID_TOURNAMENT.eventOptions[0], playerCount: 3 }],
    });
    expect(result.success).toBe(false);
  });

  it('참가비가 음수면 거부한다', () => {
    const result = tournamentInputSchema.safeParse({
      ...VALID_TOURNAMENT,
      eventOptions: [{ ...VALID_TOURNAMENT.eventOptions[0], fee: -1 }],
    });
    expect(result.success).toBe(false);
  });

  it('무료 대회(참가비 0원)를 허용한다', () => {
    const result = tournamentInputSchema.safeParse({
      ...VALID_TOURNAMENT,
      eventOptions: [{ ...VALID_TOURNAMENT.eventOptions[0], fee: 0 }],
    });
    expect(result.success).toBe(true);
  });

  it('applyStartAt이 없어도 통과한다', () => {
    const result = tournamentInputSchema.safeParse({
      ...VALID_TOURNAMENT,
      applyStartAt: null,
    });
    expect(result.success).toBe(true);
  });
});

describe('entrySubmissionSchema', () => {
  const VALID_ENTRY = {
    depositorName: '홍길동',
    teamName: null,
    privacyAgreed: true,
    players: [
      {
        key: 'p1',
        name: '홍길동',
        gender: '남',
        birthDate: '1990-01-01',
        phoneNumber: '010-1111-2222',
        tshirtSize: 'L',
        order: 0,
      },
    ],
    events: [{ eventOptionId: 'opt-1', playerKeys: ['p1'] }],
  };

  it('정상 입력을 통과시킨다', () => {
    expect(entrySubmissionSchema.safeParse(VALID_ENTRY).success).toBe(true);
  });

  it('fee나 totalFee를 보내도 스키마가 걸러낸다', () => {
    const parsed = entrySubmissionSchema.parse({
      ...VALID_ENTRY,
      totalFee: 999999,
      events: [{ eventOptionId: 'opt-1', playerKeys: ['p1'], fee: 1 }],
    });
    expect(parsed).not.toHaveProperty('totalFee');
    expect(parsed.events[0]).not.toHaveProperty('fee');
  });

  it('privacyAgreed가 false면 거부한다', () => {
    const result = entrySubmissionSchema.safeParse({
      ...VALID_ENTRY,
      privacyAgreed: false,
    });
    expect(result.success).toBe(false);
  });

  it('선수가 없으면 거부한다', () => {
    const result = entrySubmissionSchema.safeParse({
      ...VALID_ENTRY,
      players: [],
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx jest src/schemas/tournament.schema.test.ts`
Expected: FAIL — `Cannot find module './tournament.schema'`

- [ ] **Step 3: zod 스키마 구현**

`src/schemas/tournament.schema.ts`:

```ts
import { z } from 'zod';

const eventOptionSchema = z.object({
  id: z.string().optional(),
  eventType: z.string().trim().min(1, '종목을 입력해주세요.'),
  ageGroup: z.string().trim().min(1, '연령을 입력해주세요.'),
  level: z.string().trim().default(''),
  playerCount: z.union([z.literal(1), z.literal(2)]),
  fee: z.number().int().min(0, '참가비는 0원 이상이어야 합니다.'),
  order: z.number().int().min(0).default(0),
});

export const tournamentInputSchema = z
  .object({
    title: z.string().trim().min(1, '대회명을 입력해주세요.'),
    hostName: z.string().trim().nullable().optional(),
    description: z.string().nullable().optional(),
    tournamentDate: z.string().trim().nullable().optional(),
    location: z.string().trim().nullable().optional(),
    applyStartAt: z.string().datetime().nullable().optional(),
    applyDeadline: z.string().datetime(),
    status: z.enum(['DRAFT', 'OPEN', 'CLOSED']),
    useTeamName: z.boolean(),
    tshirtSizes: z.array(z.string().trim().min(1)),
    bankAccount: z.string().trim().nullable().optional(),
    eventOptions: z
      .array(eventOptionSchema)
      .min(1, '종목을 1개 이상 등록해주세요.'),
  })
  .refine(
    (input) =>
      !input.applyStartAt ||
      new Date(input.applyDeadline) > new Date(input.applyStartAt),
    { message: '신청 마감은 시작보다 늦어야 합니다.', path: ['applyDeadline'] }
  )
  .refine(
    (input) => {
      const keys = input.eventOptions.map(
        (option) => `${option.eventType}|${option.ageGroup}|${option.level}`
      );
      return new Set(keys).size === keys.length;
    },
    { message: '중복된 종목 조합이 있습니다.', path: ['eventOptions'] }
  );

const playerSchema = z.object({
  key: z.string().min(1),
  name: z.string().trim().min(1, '선수 이름을 입력해주세요.'),
  gender: z.string().trim().min(1, '성별을 선택해주세요.'),
  birthDate: z.string().trim().min(1, '생년월일을 입력해주세요.'),
  phoneNumber: z.string().trim().min(1, '전화번호를 입력해주세요.'),
  tshirtSize: z.string().trim().nullable().optional(),
  order: z.number().int().min(0).default(0),
});

// fee/totalFee는 의도적으로 스키마에 없다.
// zod는 기본적으로 정의되지 않은 키를 제거하므로 클라이언트가 보내도 무시된다.
const entryEventSchema = z.object({
  eventOptionId: z.string().min(1),
  playerKeys: z.array(z.string().min(1)).min(1).max(2),
});

export const entrySubmissionSchema = z.object({
  depositorName: z.string().trim().min(1, '입금자명을 입력해주세요.'),
  teamName: z.string().trim().nullable().optional(),
  privacyAgreed: z.literal(true, {
    errorMap: () => ({ message: '개인정보 수집·이용에 동의해주세요.' }),
  }),
  players: z.array(playerSchema).min(1, '선수를 1명 이상 등록해주세요.'),
  events: z.array(entryEventSchema).min(1, '종목을 1개 이상 선택해주세요.'),
});

export type TournamentInputParsed = z.infer<typeof tournamentInputSchema>;
export type EntrySubmissionParsed = z.infer<typeof entrySubmissionSchema>;
```

- [ ] **Step 4: API 공통 유틸 구현**

`src/lib/tournament/apiHelpers.ts`:

```ts
import type { NextApiResponse } from 'next';

import { ClubAuthError } from '@/lib/clubAuth';

/**
 * 핸들러에서 던져진 에러를 응답으로 변환한다.
 * ClubAuthError는 의도된 권한 실패이므로 상태 코드를 그대로 쓴다.
 */
export function handleApiError(res: NextApiResponse, error: unknown): void {
  if (error instanceof ClubAuthError) {
    res.status(error.status).json({ error: error.message, status: error.status });
    return;
  }
  console.error('대회 신청 API 오류:', error);
  res.status(500).json({ error: '일시적인 오류가 발생했습니다.', status: 500 });
}

/**
 * 쿼리의 클럽 ID를 숫자로 변환한다. 유효하지 않으면 null.
 */
export function parseClubId(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/**
 * 쿼리에서 문자열 하나를 꺼낸다.
 */
export function firstQueryValue(
  value: string | string[] | undefined
): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw ?? null;
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx jest src/schemas/tournament.schema.test.ts`
Expected: PASS — 13 tests passed

- [ ] **Step 6: 커밋**

```bash
git add src/schemas/tournament.schema.ts src/schemas/tournament.schema.test.ts src/lib/tournament/apiHelpers.ts
git commit -m "feat(tournament): zod 검증 스키마와 API 공통 유틸 추가"
```

---

### Task 11: 대회 목록·생성 API

**Files:**
- Create: `src/pages/api/clubs/[id]/tournaments/index.ts`

**Interfaces:**
- Consumes: Task 4 `resolveTournamentStatus`, Task 9 `requireClubMember`/`requireClubAdmin`, Task 10 `tournamentInputSchema`/`handleApiError`/`parseClubId`
- Produces: `GET /api/clubs/[id]/tournaments`, `POST /api/clubs/[id]/tournaments`

GET 응답: `{ data: { tournaments: TournamentListItem[] }, message }`
`TournamentListItem = Tournament & { effectiveStatus, entryCount }`

- [ ] **Step 1: 핸들러 구현**

`src/pages/api/clubs/[id]/tournaments/index.ts`:

```ts
import type { NextApiRequest, NextApiResponse } from 'next';

import { requireClubAdmin, requireClubMember } from '@/lib/clubAuth';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import {
  handleApiError,
  parseClubId,
} from '@/lib/tournament/apiHelpers';
import { resolveTournamentStatus } from '@/lib/tournament/status';
import { tournamentInputSchema } from '@/schemas/tournament.schema';

export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse
) {
  const clubId = parseClubId(req.query.id);
  if (!clubId) {
    return res.status(400).json({ error: '클럽 ID가 필요합니다.', status: 400 });
  }

  try {
    if (req.method === 'GET') {
      const member = await requireClubMember(req.user.id, clubId);
      const isAdmin = member.role === 'ADMIN';

      const tournaments = await prisma.tournament.findMany({
        // 일반 회원에게는 DRAFT 대회를 숨긴다
        where: {
          clubId,
          ...(isAdmin ? {} : { status: { not: 'DRAFT' } }),
        },
        orderBy: { applyDeadline: 'desc' },
        include: {
          _count: { select: { entries: true } },
        },
      });

      const now = new Date();
      const data = tournaments.map((tournament) => ({
        ...tournament,
        effectiveStatus: resolveTournamentStatus(tournament, now),
        entryCount: tournament._count.entries,
      }));

      return res
        .status(200)
        .json({ data: { tournaments: data }, message: '대회 목록을 불러왔습니다.' });
    }

    if (req.method === 'POST') {
      const member = await requireClubAdmin(req.user.id, clubId);

      const parsed = tournamentInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: parsed.error.errors[0]?.message ?? '입력값이 올바르지 않습니다.',
          status: 400,
        });
      }
      const input = parsed.data;

      const created = await prisma.tournament.create({
        data: {
          clubId,
          title: input.title,
          hostName: input.hostName ?? null,
          description: input.description ?? null,
          tournamentDate: input.tournamentDate ?? null,
          location: input.location ?? null,
          applyStartAt: input.applyStartAt ? new Date(input.applyStartAt) : null,
          applyDeadline: new Date(input.applyDeadline),
          status: input.status,
          useTeamName: input.useTeamName,
          tshirtSizes: input.tshirtSizes,
          bankAccount: input.bankAccount ?? null,
          createdBy: member.id,
          eventOptions: {
            create: input.eventOptions.map((option, index) => ({
              eventType: option.eventType,
              ageGroup: option.ageGroup,
              level: option.level,
              playerCount: option.playerCount,
              fee: option.fee,
              order: option.order ?? index,
            })),
          },
        },
        include: { eventOptions: { orderBy: { order: 'asc' } } },
      });

      return res
        .status(201)
        .json({ data: { tournament: created }, message: '대회를 생성했습니다.' });
    }

    return res
      .status(405)
      .json({ error: '허용되지 않는 메소드입니다.', status: 405 });
  } catch (error) {
    return handleApiError(res, error);
  }
});
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit 2>&1 | grep tournaments | head -10`
Expected: 출력 없음

- [ ] **Step 3: 개발 서버로 수동 확인**

Run: `npm run dev` 후 브라우저에서 로그인한 상태로 확인하거나, 다른 터미널에서:
```bash
curl -s -b "auth-token=<본인 토큰>" http://localhost:3000/api/clubs/1/tournaments | head -c 300
```
Expected: `{"data":{"tournaments":[]},"message":"대회 목록을 불러왔습니다."}`

토큰을 얻기 어려우면 이 단계는 건너뛰고 Task 20의 통합 확인에서 검증한다.

- [ ] **Step 4: 커밋**

```bash
git add src/pages/api/clubs/\[id\]/tournaments/index.ts
git commit -m "feat(tournament): 대회 목록 조회·생성 API 추가

DRAFT 대회는 ADMIN에게만 노출한다."
```

---

### Task 12: 대회 상세·수정·삭제 API

**Files:**
- Create: `src/pages/api/clubs/[id]/tournaments/[tournamentId]/index.ts`

**Interfaces:**
- Consumes: Task 7 `toPublicParticipants`/`PUBLIC_PARTICIPANT_SELECT`, Task 4 `resolveTournamentStatus`, Task 10 스키마·유틸
- Produces: `GET`/`PATCH`/`DELETE /api/clubs/[id]/tournaments/[tournamentId]`

GET 응답은 스펙의 `TournamentDetailResponse` 형태다.

- [ ] **Step 1: 핸들러 구현**

`src/pages/api/clubs/[id]/tournaments/[tournamentId]/index.ts`:

```ts
import type { NextApiRequest, NextApiResponse } from 'next';

import { requireClubAdmin, requireClubMember } from '@/lib/clubAuth';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import {
  firstQueryValue,
  handleApiError,
  parseClubId,
} from '@/lib/tournament/apiHelpers';
import {
  PUBLIC_PARTICIPANT_SELECT,
  toPublicParticipants,
} from '@/lib/tournament/serialize';
import { resolveTournamentStatus } from '@/lib/tournament/status';
import { tournamentInputSchema } from '@/schemas/tournament.schema';

export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse
) {
  const clubId = parseClubId(req.query.id);
  const tournamentId = firstQueryValue(req.query.tournamentId);
  if (!clubId || !tournamentId) {
    return res
      .status(400)
      .json({ error: '잘못된 요청입니다.', status: 400 });
  }

  try {
    if (req.method === 'GET') {
      const member = await requireClubMember(req.user.id, clubId);

      const tournament = await prisma.tournament.findFirst({
        where: { id: tournamentId, clubId },
        include: { eventOptions: { orderBy: { order: 'asc' } } },
      });
      if (!tournament) {
        return res
          .status(404)
          .json({ error: '대회를 찾을 수 없습니다.', status: 404 });
      }

      const now = new Date();
      const effectiveStatus = resolveTournamentStatus(tournament, now);

      // DRAFT는 ADMIN만 볼 수 있다
      if (effectiveStatus === 'DRAFT' && member.role !== 'ADMIN') {
        return res
          .status(404)
          .json({ error: '대회를 찾을 수 없습니다.', status: 404 });
      }

      // 참가자 목록: 민감정보를 아예 조회하지 않는다
      const maskedEntries = await prisma.tournamentEntry.findMany({
        where: { tournamentId, paymentStatus: { not: 'CANCELED' } },
        select: PUBLIC_PARTICIPANT_SELECT,
      });

      const myEntry = await prisma.tournamentEntry.findUnique({
        where: { tournamentId_userId: { tournamentId, userId: req.user.id } },
        select: { id: true },
      });

      return res.status(200).json({
        data: {
          tournament,
          effectiveStatus,
          participants: toPublicParticipants(maskedEntries),
          myEntryId: myEntry?.id ?? null,
        },
        message: '대회 정보를 불러왔습니다.',
      });
    }

    if (req.method === 'PATCH') {
      await requireClubAdmin(req.user.id, clubId);

      const parsed = tournamentInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: parsed.error.errors[0]?.message ?? '입력값이 올바르지 않습니다.',
          status: 400,
        });
      }
      const input = parsed.data;

      const existing = await prisma.tournament.findFirst({
        where: { id: tournamentId, clubId },
        include: {
          eventOptions: {
            include: { _count: { select: { entryEvents: true } } },
          },
        },
      });
      if (!existing) {
        return res
          .status(404)
          .json({ error: '대회를 찾을 수 없습니다.', status: 404 });
      }

      const keptIds = new Set(
        input.eventOptions.map((option) => option.id).filter(Boolean) as string[]
      );

      // 신청이 있는 종목의 인원수 변경은 차단한다 (기존 배정이 무효화됨)
      for (const option of input.eventOptions) {
        if (!option.id) continue;
        const before = existing.eventOptions.find((o) => o.id === option.id);
        if (!before) continue;
        if (
          before._count.entryEvents > 0 &&
          before.playerCount !== option.playerCount
        ) {
          return res.status(400).json({
            error: `이미 신청이 있는 종목(${before.eventType} ${before.ageGroup})의 인원수는 변경할 수 없습니다.`,
            status: 400,
          });
        }
      }

      await prisma.$transaction(async (tx) => {
        await tx.tournament.update({
          where: { id: tournamentId },
          data: {
            title: input.title,
            hostName: input.hostName ?? null,
            description: input.description ?? null,
            tournamentDate: input.tournamentDate ?? null,
            location: input.location ?? null,
            applyStartAt: input.applyStartAt
              ? new Date(input.applyStartAt)
              : null,
            applyDeadline: new Date(input.applyDeadline),
            status: input.status,
            useTeamName: input.useTeamName,
            tshirtSizes: input.tshirtSizes,
            bankAccount: input.bankAccount ?? null,
          },
        });

        // 목록에서 빠진 종목: 신청이 있으면 비활성화, 없으면 삭제
        for (const before of existing.eventOptions) {
          if (keptIds.has(before.id)) continue;
          if (before._count.entryEvents > 0) {
            await tx.tournamentEventOption.update({
              where: { id: before.id },
              data: { isActive: false },
            });
          } else {
            await tx.tournamentEventOption.delete({ where: { id: before.id } });
          }
        }

        // 기존 종목 수정 / 신규 종목 생성
        for (const [index, option] of input.eventOptions.entries()) {
          const data = {
            eventType: option.eventType,
            ageGroup: option.ageGroup,
            level: option.level,
            playerCount: option.playerCount,
            fee: option.fee,
            order: option.order ?? index,
            isActive: true,
          };
          if (option.id) {
            await tx.tournamentEventOption.update({
              where: { id: option.id },
              data,
            });
          } else {
            await tx.tournamentEventOption.create({
              data: { ...data, tournamentId },
            });
          }
        }
      });

      const updated = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: { eventOptions: { orderBy: { order: 'asc' } } },
      });

      return res
        .status(200)
        .json({ data: { tournament: updated }, message: '대회를 수정했습니다.' });
    }

    if (req.method === 'DELETE') {
      await requireClubAdmin(req.user.id, clubId);

      const existing = await prisma.tournament.findFirst({
        where: { id: tournamentId, clubId },
        select: { id: true },
      });
      if (!existing) {
        return res
          .status(404)
          .json({ error: '대회를 찾을 수 없습니다.', status: 404 });
      }

      // Cascade로 신청서·선수·종목이 함께 삭제된다
      await prisma.tournament.delete({ where: { id: tournamentId } });

      return res
        .status(200)
        .json({ data: { id: tournamentId }, message: '대회를 삭제했습니다.' });
    }

    return res
      .status(405)
      .json({ error: '허용되지 않는 메소드입니다.', status: 405 });
  } catch (error) {
    return handleApiError(res, error);
  }
});
```

**주의:** 종목 옵션 수정 시 `@@unique([tournamentId, eventType, ageGroup, level])` 제약과 충돌할 수 있다. 비활성화된 종목과 같은 조합을 새로 만들면 unique 위반이 난다. 이 경우 Prisma가 `P2002` 를 던지므로 `handleApiError` 가 500을 반환한다. 실무에서 드문 경우이므로 이번 범위에서는 그대로 둔다.

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit 2>&1 | grep -i "tournamentId" | head -10`
Expected: 출력 없음

- [ ] **Step 3: 커밋**

```bash
git add "src/pages/api/clubs/[id]/tournaments/[tournamentId]/index.ts"
git commit -m "feat(tournament): 대회 상세·수정·삭제 API 추가

- 참가자 목록은 민감정보를 조회하지 않는다
- 신청 있는 종목은 삭제 대신 비활성화
- 신청 있는 종목의 인원수 변경은 차단"
```

---

### Task 13: 신청서 제출·조회 API

**Files:**
- Create: `src/pages/api/clubs/[id]/tournaments/[tournamentId]/entries/index.ts`

**Interfaces:**
- Consumes: Task 3 `calculateTotalFee`, Task 4 `isAcceptingEntries`, Task 6 `validateEntrySubmission`, Task 9 권한 헬퍼, Task 10 `entrySubmissionSchema`
- Produces: `POST` (신청 제출, 회원), `GET` (전체 현황, ADMIN)

**핵심:** `fee` 와 `totalFee` 는 클라이언트 값을 절대 쓰지 않는다. 서버가 `TournamentEventOption` 에서 직접 읽어 스냅샷한다.

- [ ] **Step 1: 핸들러 구현**

`src/pages/api/clubs/[id]/tournaments/[tournamentId]/entries/index.ts`:

```ts
import type { NextApiRequest, NextApiResponse } from 'next';

import { requireClubAdmin, requireClubMember } from '@/lib/clubAuth';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import {
  firstQueryValue,
  handleApiError,
  parseClubId,
} from '@/lib/tournament/apiHelpers';
import { calculateTotalFee } from '@/lib/tournament/fee';
import { isAcceptingEntries } from '@/lib/tournament/status';
import { validateEntrySubmission } from '@/lib/tournament/validation';
import { entrySubmissionSchema } from '@/schemas/tournament.schema';

// 트랜잭션 안에서 마감을 감지했을 때 롤백시키기 위한 신호용 에러.
// 클래스 선언은 호이스팅되지 않으므로 반드시 사용처보다 위에 둔다.
class EntryClosedError extends Error {}

export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse
) {
  const clubId = parseClubId(req.query.id);
  const tournamentId = firstQueryValue(req.query.tournamentId);
  if (!clubId || !tournamentId) {
    return res.status(400).json({ error: '잘못된 요청입니다.', status: 400 });
  }

  try {
    // ---------- 관리자: 전체 신청 현황 ----------
    if (req.method === 'GET') {
      await requireClubAdmin(req.user.id, clubId);

      const entries = await prisma.tournamentEntry.findMany({
        where: { tournamentId, tournament: { clubId } },
        orderBy: { createdAt: 'asc' },
        include: {
          clubMember: { select: { id: true, name: true } },
          players: { orderBy: { order: 'asc' } },
          entryEvents: {
            include: {
              eventOption: true,
              eventPlayers: { include: { entryPlayer: true } },
            },
          },
        },
      });

      return res
        .status(200)
        .json({ data: { entries }, message: '신청 현황을 불러왔습니다.' });
    }

    // ---------- 회원: 신청 제출 ----------
    if (req.method === 'POST') {
      const member = await requireClubMember(req.user.id, clubId);

      const parsed = entrySubmissionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: parsed.error.errors[0]?.message ?? '입력값이 올바르지 않습니다.',
          status: 400,
        });
      }
      // privacyAgreed는 zod가 true만 통과시키므로 여기서 항상 true다
      const input = { ...parsed.data, privacyAgreed: true as const };

      const tournament = await prisma.tournament.findFirst({
        where: { id: tournamentId, clubId },
        include: { eventOptions: true },
      });
      if (!tournament) {
        return res
          .status(404)
          .json({ error: '대회를 찾을 수 없습니다.', status: 404 });
      }

      const validation = validateEntrySubmission(input, tournament.eventOptions);
      if (!validation.ok) {
        return res.status(400).json({ error: validation.error, status: 400 });
      }

      const feeById = new Map(
        tournament.eventOptions.map((option) => [option.id, option.fee])
      );
      // 클라이언트가 보낸 금액은 무시하고 DB 값으로 총액을 계산한다
      const totalFee = calculateTotalFee(
        input.events.map((event) => ({
          fee: feeById.get(event.eventOptionId) ?? 0,
          status: 'ACTIVE' as const,
        }))
      );

      const created = await prisma.$transaction(async (tx) => {
        // 마감 여부를 트랜잭션 안에서 재확인한다.
        // 폼을 열어둔 채 마감이 지나는 경우를 잡는다.
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
            userId: req.user.id,
            clubMemberId: member.id,
            depositorName: input.depositorName,
            teamName: tournament.useTeamName ? (input.teamName ?? null) : null,
            totalFee,
            privacyAgreedAt: new Date(),
          },
        });

        // 선수를 먼저 만들고, 폼의 임시 key를 실제 id로 매핑한다
        const keyToPlayerId = new Map<string, string>();
        for (const player of input.players) {
          const created = await tx.entryPlayer.create({
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
              order: player.order,
            },
          });
          keyToPlayerId.set(player.key, created.id);
        }

        for (const event of input.events) {
          const entryEvent = await tx.entryEvent.create({
            data: {
              entryId: entry.id,
              eventOptionId: event.eventOptionId,
              fee: feeById.get(event.eventOptionId) ?? 0,
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

      return res
        .status(201)
        .json({ data: { entry: created }, message: '신청이 완료되었습니다.' });
    }

    return res
      .status(405)
      .json({ error: '허용되지 않는 메소드입니다.', status: 405 });
  } catch (error) {
    if (error instanceof EntryClosedError) {
      return res
        .status(400)
        .json({ error: '신청이 마감되었습니다.', status: 400 });
    }
    // 같은 회원이 두 번 제출한 경우 (@@unique 위반)
    if (
      typeof error === 'object' &&
      error !== null &&
      (error as { code?: string }).code === 'P2002'
    ) {
      return res.status(409).json({
        error: '이미 신청하셨습니다. 내 신청에서 수정해주세요.',
        status: 409,
      });
    }
    return handleApiError(res, error);
  }
});
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit 2>&1 | grep -i entries | head -10`
Expected: 출력 없음

- [ ] **Step 3: 커밋**

```bash
git add "src/pages/api/clubs/[id]/tournaments/[tournamentId]/entries/index.ts"
git commit -m "feat(tournament): 신청서 제출·관리자 현황 조회 API 추가

- 참가비는 클라이언트 값을 무시하고 서버가 DB에서 스냅샷
- 마감 여부를 트랜잭션 안에서 재확인
- 중복 제출은 unique 제약으로 409 처리"
```

---

### Task 14: 내 신청서 조회·수정 API

**Files:**
- Create: `src/pages/api/clubs/[id]/tournaments/[tournamentId]/entries/my.ts`
- Create: `src/pages/api/clubs/[id]/tournaments/[tournamentId]/entries/[entryId]/index.ts`

**Interfaces:**
- Consumes: Task 3, 4, 6, 9, 10
- Produces: `GET .../entries/my`, `PATCH .../entries/[entryId]`

`my.ts` 는 신청 폼이 신규/수정을 판별하는 데 쓴다(스펙 §4.4).

- [ ] **Step 1: my.ts 구현**

`src/pages/api/clubs/[id]/tournaments/[tournamentId]/entries/my.ts`:

```ts
import type { NextApiRequest, NextApiResponse } from 'next';

import { requireClubMember } from '@/lib/clubAuth';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import {
  firstQueryValue,
  handleApiError,
  parseClubId,
} from '@/lib/tournament/apiHelpers';

export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
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
    await requireClubMember(req.user.id, clubId);

    // 본인 신청서이므로 민감정보를 포함해 반환한다
    const entry = await prisma.tournamentEntry.findUnique({
      where: { tournamentId_userId: { tournamentId, userId: req.user.id } },
      include: {
        players: { orderBy: { order: 'asc' } },
        entryEvents: {
          include: {
            eventOption: true,
            eventPlayers: { select: { entryPlayerId: true } },
          },
        },
      },
    });

    return res.status(200).json({
      data: { entry },
      message: entry ? '신청 내역을 불러왔습니다.' : '신청 내역이 없습니다.',
    });
  } catch (error) {
    return handleApiError(res, error);
  }
});
```

- [ ] **Step 2: [entryId]/index.ts 구현 (수정)**

`src/pages/api/clubs/[id]/tournaments/[tournamentId]/entries/[entryId]/index.ts`:

```ts
import type { NextApiRequest, NextApiResponse } from 'next';

import { requireClubMember } from '@/lib/clubAuth';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import {
  firstQueryValue,
  handleApiError,
  parseClubId,
} from '@/lib/tournament/apiHelpers';
import { calculateTotalFee } from '@/lib/tournament/fee';
import { isAcceptingEntries } from '@/lib/tournament/status';
import { validateEntrySubmission } from '@/lib/tournament/validation';
import { entrySubmissionSchema } from '@/schemas/tournament.schema';

export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse
) {
  if (req.method !== 'PATCH') {
    return res
      .status(405)
      .json({ error: '허용되지 않는 메소드입니다.', status: 405 });
  }

  const clubId = parseClubId(req.query.id);
  const tournamentId = firstQueryValue(req.query.tournamentId);
  const entryId = firstQueryValue(req.query.entryId);
  if (!clubId || !tournamentId || !entryId) {
    return res.status(400).json({ error: '잘못된 요청입니다.', status: 400 });
  }

  try {
    await requireClubMember(req.user.id, clubId);

    const parsed = entrySubmissionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.errors[0]?.message ?? '입력값이 올바르지 않습니다.',
        status: 400,
      });
    }
    const input = { ...parsed.data, privacyAgreed: true as const };

    const entry = await prisma.tournamentEntry.findFirst({
      where: { id: entryId, tournamentId, tournament: { clubId } },
      include: {
        tournament: { include: { eventOptions: true } },
        entryEvents: true,
      },
    });
    if (!entry) {
      return res
        .status(404)
        .json({ error: '신청 내역을 찾을 수 없습니다.', status: 404 });
    }
    // 본인만 수정할 수 있다 (임원도 수정 불가)
    if (entry.userId !== req.user.id) {
      return res.status(403).json({ error: '권한이 없습니다.', status: 403 });
    }
    if (!isAcceptingEntries(entry.tournament, new Date())) {
      return res
        .status(400)
        .json({ error: '신청이 마감되었습니다.', status: 400 });
    }

    const validation = validateEntrySubmission(
      input,
      entry.tournament.eventOptions
    );
    if (!validation.ok) {
      return res.status(400).json({ error: validation.error, status: 400 });
    }

    const feeById = new Map(
      entry.tournament.eventOptions.map((option) => [option.id, option.fee])
    );
    const canceledEvents = entry.entryEvents.filter(
      (event) => event.status === 'CANCELED'
    );
    const totalFee = calculateTotalFee([
      ...input.events.map((event) => ({
        fee: feeById.get(event.eventOptionId) ?? 0,
        status: 'ACTIVE' as const,
      })),
      ...canceledEvents,
    ]);

    await prisma.$transaction(async (tx) => {
      // 선수는 전체 교체 (이력 불필요)
      await tx.entryPlayer.deleteMany({ where: { entryId } });
      // ACTIVE 종목만 교체하고 CANCELED는 보존한다
      await tx.entryEvent.deleteMany({ where: { entryId, status: 'ACTIVE' } });

      const keyToPlayerId = new Map<string, string>();
      for (const player of input.players) {
        const createdPlayer = await tx.entryPlayer.create({
          data: {
            entryId,
            name: player.name,
            gender: player.gender,
            birthDate: player.birthDate,
            phoneNumber: player.phoneNumber,
            tshirtSize:
              entry.tournament.tshirtSizes.length > 0
                ? (player.tshirtSize ?? null)
                : null,
            order: player.order,
          },
        });
        keyToPlayerId.set(player.key, createdPlayer.id);
      }

      for (const event of input.events) {
        const entryEvent = await tx.entryEvent.create({
          data: {
            entryId,
            eventOptionId: event.eventOptionId,
            fee: feeById.get(event.eventOptionId) ?? 0,
          },
        });
        await tx.entryEventPlayer.createMany({
          data: event.playerKeys.map((key) => ({
            entryEventId: entryEvent.id,
            entryPlayerId: keyToPlayerId.get(key) as string,
          })),
        });
      }

      await tx.tournamentEntry.update({
        where: { id: entryId },
        data: {
          depositorName: input.depositorName,
          teamName: entry.tournament.useTeamName
            ? (input.teamName ?? null)
            : null,
          totalFee,
          // 수정 시 취소 상태였다면 다시 대기로 되돌린다
          paymentStatus:
            entry.paymentStatus === 'CANCELED' ? 'PENDING' : entry.paymentStatus,
        },
      });
    });

    return res
      .status(200)
      .json({ data: { entryId }, message: '신청 내역을 수정했습니다.' });
  } catch (error) {
    return handleApiError(res, error);
  }
});
```

**설계 메모:** CANCELED 종목을 보존하면서 선수를 전체 교체하므로, 취소된 종목의 `EntryEventPlayer` 는 cascade로 함께 사라진다. 취소 이력에서 "누가 나가려 했는지"는 잃지만 "어떤 종목을 취소했는지"는 남는다. 환불 정산에는 종목과 금액이면 충분하므로 이 손실을 감수한다.

- [ ] **Step 3: 타입 체크**

Run: `npx tsc --noEmit 2>&1 | grep -iE "entries/(my|\[entryId\])" | head -10`
Expected: 출력 없음

- [ ] **Step 4: 커밋**

```bash
git add "src/pages/api/clubs/[id]/tournaments/[tournamentId]/entries/"
git commit -m "feat(tournament): 내 신청서 조회·수정 API 추가

수정 시 ACTIVE 종목만 교체하고 CANCELED 이력은 보존한다."
```

---

### Task 15: 종목 부분 취소 · 입금 상태 변경 API

**Files:**
- Create: `src/pages/api/clubs/[id]/tournaments/[tournamentId]/entries/[entryId]/events/[entryEventId].ts`
- Create: `src/pages/api/clubs/[id]/tournaments/[tournamentId]/entries/[entryId]/payment.ts`

**Interfaces:**
- Consumes: Task 5 `resolveEntryStateAfterCancel`, Task 4 `isAcceptingEntries`, Task 9 권한 헬퍼
- Produces: `PATCH .../events/[entryEventId]` (본인, 취소), `PATCH .../payment` (ADMIN)

- [ ] **Step 1: 부분 취소 핸들러 구현**

`src/pages/api/clubs/[id]/tournaments/[tournamentId]/entries/[entryId]/events/[entryEventId].ts`:

```ts
import type { NextApiRequest, NextApiResponse } from 'next';

import { requireClubMember } from '@/lib/clubAuth';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import {
  firstQueryValue,
  handleApiError,
  parseClubId,
} from '@/lib/tournament/apiHelpers';
import { resolveEntryStateAfterCancel } from '@/lib/tournament/cancel';
import { isAcceptingEntries } from '@/lib/tournament/status';

export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse
) {
  if (req.method !== 'PATCH') {
    return res
      .status(405)
      .json({ error: '허용되지 않는 메소드입니다.', status: 405 });
  }

  const clubId = parseClubId(req.query.id);
  const tournamentId = firstQueryValue(req.query.tournamentId);
  const entryId = firstQueryValue(req.query.entryId);
  const entryEventId = firstQueryValue(req.query.entryEventId);
  if (!clubId || !tournamentId || !entryId || !entryEventId) {
    return res.status(400).json({ error: '잘못된 요청입니다.', status: 400 });
  }

  try {
    await requireClubMember(req.user.id, clubId);

    const entry = await prisma.tournamentEntry.findFirst({
      where: { id: entryId, tournamentId, tournament: { clubId } },
      include: { tournament: true, entryEvents: true },
    });
    if (!entry) {
      return res
        .status(404)
        .json({ error: '신청 내역을 찾을 수 없습니다.', status: 404 });
    }
    if (entry.userId !== req.user.id) {
      return res.status(403).json({ error: '권한이 없습니다.', status: 403 });
    }
    if (!isAcceptingEntries(entry.tournament, new Date())) {
      return res
        .status(400)
        .json({ error: '신청이 마감되었습니다.', status: 400 });
    }

    const target = entry.entryEvents.find((event) => event.id === entryEventId);
    if (!target) {
      return res
        .status(404)
        .json({ error: '신청 종목을 찾을 수 없습니다.', status: 404 });
    }
    if (target.status === 'CANCELED') {
      return res
        .status(400)
        .json({ error: '이미 취소된 종목입니다.', status: 400 });
    }

    const next = resolveEntryStateAfterCancel(
      entry.entryEvents,
      entry.paymentStatus,
      entryEventId
    );

    await prisma.$transaction([
      prisma.entryEvent.update({
        where: { id: entryEventId },
        data: { status: 'CANCELED', canceledAt: new Date() },
      }),
      prisma.tournamentEntry.update({
        where: { id: entryId },
        data: {
          totalFee: next.totalFee,
          paymentStatus: next.paymentStatus,
        },
      }),
    ]);

    return res.status(200).json({
      data: { entryEventId, totalFee: next.totalFee, allCanceled: next.allCanceled },
      message: next.allCanceled
        ? '신청이 모두 취소되었습니다.'
        : '해당 종목 신청을 취소했습니다.',
    });
  } catch (error) {
    return handleApiError(res, error);
  }
});
```

- [ ] **Step 2: 입금 상태 변경 핸들러 구현**

`src/pages/api/clubs/[id]/tournaments/[tournamentId]/entries/[entryId]/payment.ts`:

```ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { requireClubAdmin } from '@/lib/clubAuth';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import {
  firstQueryValue,
  handleApiError,
  parseClubId,
} from '@/lib/tournament/apiHelpers';

const paymentSchema = z.object({
  paymentStatus: z.enum(['PENDING', 'CONFIRMED', 'CANCELED']),
});

export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse
) {
  if (req.method !== 'PATCH') {
    return res
      .status(405)
      .json({ error: '허용되지 않는 메소드입니다.', status: 405 });
  }

  const clubId = parseClubId(req.query.id);
  const tournamentId = firstQueryValue(req.query.tournamentId);
  const entryId = firstQueryValue(req.query.entryId);
  if (!clubId || !tournamentId || !entryId) {
    return res.status(400).json({ error: '잘못된 요청입니다.', status: 400 });
  }

  try {
    await requireClubAdmin(req.user.id, clubId);

    const parsed = paymentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: '입금 상태 값이 올바르지 않습니다.', status: 400 });
    }

    const entry = await prisma.tournamentEntry.findFirst({
      where: { id: entryId, tournamentId, tournament: { clubId } },
      select: { id: true },
    });
    if (!entry) {
      return res
        .status(404)
        .json({ error: '신청 내역을 찾을 수 없습니다.', status: 404 });
    }

    // 입금 상태는 마감 후에도 변경할 수 있다 (통장 확인이 늦어질 수 있음)
    const updated = await prisma.tournamentEntry.update({
      where: { id: entryId },
      data: { paymentStatus: parsed.data.paymentStatus },
      select: { id: true, paymentStatus: true },
    });

    return res
      .status(200)
      .json({ data: { entry: updated }, message: '입금 상태를 변경했습니다.' });
  } catch (error) {
    return handleApiError(res, error);
  }
});
```

- [ ] **Step 3: 타입 체크**

Run: `npx tsc --noEmit 2>&1 | grep -iE "payment|entryEventId" | head -10`
Expected: 출력 없음

- [ ] **Step 4: 커밋**

```bash
git add "src/pages/api/clubs/[id]/tournaments/[tournamentId]/entries/[entryId]/"
git commit -m "feat(tournament): 종목 부분 취소·입금 상태 변경 API 추가"
```

---

### Task 16: CSV 다운로드 API

**Files:**
- Create: `src/pages/api/clubs/[id]/tournaments/[tournamentId]/entries/export.ts`

**Interfaces:**
- Consumes: Task 8 `toCsvRows`/`toCsvString`/`CSV_HEADER`, Task 9 `requireClubAdmin`
- Produces: `GET .../entries/export` → `text/csv` 응답

- [ ] **Step 1: 핸들러 구현**

`src/pages/api/clubs/[id]/tournaments/[tournamentId]/entries/export.ts`:

```ts
import type { NextApiRequest, NextApiResponse } from 'next';

import { requireClubAdmin } from '@/lib/clubAuth';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import {
  firstQueryValue,
  handleApiError,
  parseClubId,
} from '@/lib/tournament/apiHelpers';
import { CSV_HEADER, toCsvRows, toCsvString } from '@/lib/tournament/csv';

export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
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
    await requireClubAdmin(req.user.id, clubId);

    const tournament = await prisma.tournament.findFirst({
      where: { id: tournamentId, clubId },
      select: { title: true },
    });
    if (!tournament) {
      return res
        .status(404)
        .json({ error: '대회를 찾을 수 없습니다.', status: 404 });
    }

    const entries = await prisma.tournamentEntry.findMany({
      where: { tournamentId },
      orderBy: { createdAt: 'asc' },
      select: {
        depositorName: true,
        teamName: true,
        paymentStatus: true,
        entryEvents: {
          select: {
            status: true,
            fee: true,
            eventOption: {
              select: { eventType: true, ageGroup: true, level: true },
            },
            eventPlayers: {
              select: {
                entryPlayer: {
                  select: {
                    name: true,
                    gender: true,
                    birthDate: true,
                    phoneNumber: true,
                    tshirtSize: true,
                  },
                },
              },
            },
          },
          orderBy: { eventOption: { order: 'asc' } },
        },
      },
    });

    const csv = toCsvString([CSV_HEADER, ...toCsvRows(entries)]);
    const filename = encodeURIComponent(`${tournament.title}_참가신청.csv`);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${filename}`
    );
    return res.status(200).send(csv);
  } catch (error) {
    return handleApiError(res, error);
  }
});
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit 2>&1 | grep -i export | head -10`
Expected: 출력 없음

`orderBy: { eventOption: { order: 'asc' } }` 는 `select` 에 `order` 가 없어도 동작한다. select한 필드 집합이 Task 8의 `CsvEntry` 와 정확히 일치하므로 타입이 맞는다.

- [ ] **Step 3: Phase 2 전체 테스트**

Run: `npx jest src/lib src/schemas`
Expected: PASS — 기존 테스트 모두 통과

- [ ] **Step 4: 커밋**

```bash
git add "src/pages/api/clubs/[id]/tournaments/[tournamentId]/entries/export.ts"
git commit -m "feat(tournament): 주최측 제출용 CSV 다운로드 API 추가"
```

---

## Phase 3: 프론트엔드

**컨벤션 확인 (Phase 3 전체 적용):**
- 훅은 `useQuery`/`useMutation` + 전역 `axios` 를 상대 경로로 호출한다. (`@/lib/axios` 의 `api` 인스턴스는 `baseURL` 이 설정되어 있어 기존 훅들이 쓰지 않는다)
- 컴포넌트는 `function X() {}` 선언 후 파일 하단에 `export default X;`
- 이벤트 핸들러는 `on` 접두사

### Task 17: react-query 훅

**Files:**
- Create: `src/hooks/useTournaments.ts`
- Create: `src/hooks/useTournamentDetail.ts`
- Create: `src/hooks/useMyEntry.ts`
- Create: `src/hooks/useTournamentAdmin.ts`

**Interfaces:**
- Consumes: Phase 2의 API 엔드포인트, Task 2의 타입
- Produces:
  - `useTournaments(clubId)` → 목록
  - `useTournamentDetail(clubId, tournamentId)` → 상세
  - `useMyEntry(clubId, tournamentId)` → 내 신청서
  - `useSubmitEntry(clubId, tournamentId)` → 제출/수정 mutation
  - `useCancelEntryEvent(clubId, tournamentId)` → 부분 취소 mutation
  - `useAdminEntries(clubId, tournamentId)` → 관리자 현황
  - `useUpdatePaymentStatus(clubId, tournamentId)` → 입금 상태 mutation
  - `useSaveTournament(clubId)` → 대회 생성/수정 mutation

- [ ] **Step 1: 조회 훅 작성**

`src/hooks/useTournaments.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

import type {
  TournamentEffectiveStatus,
  TournamentWithOptions,
} from '@/types/tournament.types';

export type TournamentListItem = TournamentWithOptions & {
  effectiveStatus: TournamentEffectiveStatus;
  entryCount: number;
};

export function useTournaments(clubId: string | undefined) {
  return useQuery<TournamentListItem[]>({
    queryKey: ['tournaments', clubId],
    queryFn: async () => {
      const response = await axios.get(`/api/clubs/${clubId}/tournaments`);
      return response.data.data.tournaments;
    },
    enabled: !!clubId,
    staleTime: 1000 * 30,
  });
}
```

`src/hooks/useTournamentDetail.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

import type { TournamentDetailResponse } from '@/types/tournament.types';

export function useTournamentDetail(
  clubId: string | undefined,
  tournamentId: string | undefined
) {
  return useQuery<TournamentDetailResponse>({
    queryKey: ['tournament', clubId, tournamentId],
    queryFn: async () => {
      const response = await axios.get(
        `/api/clubs/${clubId}/tournaments/${tournamentId}`
      );
      return response.data.data;
    },
    enabled: !!clubId && !!tournamentId,
    staleTime: 1000 * 30,
  });
}
```

- [ ] **Step 2: 신청 관련 훅 작성**

`src/hooks/useMyEntry.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

import type { EntrySubmissionInput } from '@/types/tournament.types';

// my API가 include로 돌려주는 형태
export type MyEntry = {
  id: string;
  depositorName: string;
  teamName: string | null;
  totalFee: number;
  paymentStatus: 'PENDING' | 'CONFIRMED' | 'CANCELED';
  players: Array<{
    id: string;
    name: string;
    gender: string;
    birthDate: string;
    phoneNumber: string;
    tshirtSize: string | null;
    order: number;
  }>;
  entryEvents: Array<{
    id: string;
    fee: number;
    status: 'ACTIVE' | 'CANCELED';
    eventOption: {
      id: string;
      eventType: string;
      ageGroup: string;
      level: string;
      playerCount: number;
      fee: number;
    };
    eventPlayers: Array<{ entryPlayerId: string }>;
  }>;
};

export function useMyEntry(
  clubId: string | undefined,
  tournamentId: string | undefined
) {
  return useQuery<MyEntry | null>({
    queryKey: ['myEntry', clubId, tournamentId],
    queryFn: async () => {
      const response = await axios.get(
        `/api/clubs/${clubId}/tournaments/${tournamentId}/entries/my`
      );
      return response.data.data.entry;
    },
    enabled: !!clubId && !!tournamentId,
  });
}

export function useSubmitEntry(
  clubId: string | undefined,
  tournamentId: string | undefined
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      input: EntrySubmissionInput;
      entryId: string | null;
    }) => {
      const base = `/api/clubs/${clubId}/tournaments/${tournamentId}/entries`;
      // 기존 신청서가 있으면 수정, 없으면 신규 제출
      const response = params.entryId
        ? await axios.patch(`${base}/${params.entryId}`, params.input)
        : await axios.post(base, params.input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myEntry', clubId, tournamentId] });
      queryClient.invalidateQueries({ queryKey: ['tournament', clubId, tournamentId] });
    },
  });
}

export function useCancelEntryEvent(
  clubId: string | undefined,
  tournamentId: string | undefined
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { entryId: string; entryEventId: string }) => {
      const response = await axios.patch(
        `/api/clubs/${clubId}/tournaments/${tournamentId}/entries/${params.entryId}/events/${params.entryEventId}`
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myEntry', clubId, tournamentId] });
      queryClient.invalidateQueries({ queryKey: ['tournament', clubId, tournamentId] });
    },
  });
}
```

- [ ] **Step 3: 관리자 훅 작성**

`src/hooks/useTournamentAdmin.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

import type {
  EntryForAdmin,
  EntryPaymentStatus,
  TournamentInput,
} from '@/types/tournament.types';

export function useAdminEntries(
  clubId: string | undefined,
  tournamentId: string | undefined
) {
  return useQuery<EntryForAdmin[]>({
    queryKey: ['adminEntries', clubId, tournamentId],
    queryFn: async () => {
      const response = await axios.get(
        `/api/clubs/${clubId}/tournaments/${tournamentId}/entries`
      );
      return response.data.data.entries;
    },
    enabled: !!clubId && !!tournamentId,
  });
}

export function useUpdatePaymentStatus(
  clubId: string | undefined,
  tournamentId: string | undefined
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      entryId: string;
      paymentStatus: EntryPaymentStatus;
    }) => {
      const response = await axios.patch(
        `/api/clubs/${clubId}/tournaments/${tournamentId}/entries/${params.entryId}/payment`,
        { paymentStatus: params.paymentStatus }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['adminEntries', clubId, tournamentId],
      });
    },
  });
}

export function useSaveTournament(clubId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      input: TournamentInput;
      tournamentId: string | null;
    }) => {
      const base = `/api/clubs/${clubId}/tournaments`;
      const response = params.tournamentId
        ? await axios.patch(`${base}/${params.tournamentId}`, params.input)
        : await axios.post(base, params.input);
      return response.data.data.tournament;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournaments', clubId] });
    },
  });
}
```

- [ ] **Step 4: 타입 체크**

Run: `npx tsc --noEmit 2>&1 | grep -i "hooks/useTournament\|hooks/useMyEntry" | head -10`
Expected: 출력 없음

- [ ] **Step 5: 커밋**

```bash
git add src/hooks/useTournaments.ts src/hooks/useTournamentDetail.ts src/hooks/useMyEntry.ts src/hooks/useTournamentAdmin.ts
git commit -m "feat(tournament): 대회 신청 react-query 훅 추가"
```

---

### Task 18: 표시용 유틸과 상태 배지

**Files:**
- Create: `src/lib/tournament/display.ts`
- Create: `src/components/organisms/tournament/TournamentStatusBadge.tsx`
- Test: `src/lib/tournament/display.test.ts`

**Interfaces:**
- Consumes: Task 2 타입
- Produces:
  - `formatFee(fee: number): string` — "30,000원"
  - `formatEventLabel(option): string` — "남자복식 30대부 A조"
  - `getDaysUntil(deadline: Date, now: Date): number`
  - `STATUS_LABEL: Record<TournamentEffectiveStatus, string>`
  - `PAYMENT_LABEL: Record<EntryPaymentStatus, string>`
  - `TournamentStatusBadge` 컴포넌트

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/tournament/display.test.ts`:

```ts
import { describe, expect, it } from '@jest/globals';

import { formatEventLabel, formatFee, getDaysUntil } from './display';

describe('formatFee', () => {
  it('천 단위 콤마를 넣고 원을 붙인다', () => {
    expect(formatFee(30000)).toBe('30,000원');
  });

  it('0원은 무료로 표시한다', () => {
    expect(formatFee(0)).toBe('무료');
  });
});

describe('formatEventLabel', () => {
  it('종목·연령·급수를 공백으로 잇는다', () => {
    expect(
      formatEventLabel({ eventType: '남자복식', ageGroup: '30대부', level: 'A조' })
    ).toBe('남자복식 30대부 A조');
  });

  it('급수가 비어 있으면 생략한다', () => {
    expect(
      formatEventLabel({ eventType: '남자단식', ageGroup: '일반부', level: '' })
    ).toBe('남자단식 일반부');
  });
});

describe('getDaysUntil', () => {
  it('마감까지 남은 일수를 올림해 반환한다', () => {
    const now = new Date('2026-08-16T00:00:00Z');
    const deadline = new Date('2026-08-19T00:00:00Z');
    expect(getDaysUntil(deadline, now)).toBe(3);
  });

  it('마감이 지났으면 음수', () => {
    const now = new Date('2026-08-20T00:00:00Z');
    const deadline = new Date('2026-08-19T00:00:00Z');
    expect(getDaysUntil(deadline, now)).toBeLessThan(0);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx jest src/lib/tournament/display.test.ts`
Expected: FAIL — `Cannot find module './display'`

- [ ] **Step 3: 구현**

`src/lib/tournament/display.ts`:

```ts
import type {
  EntryPaymentStatus,
  TournamentEffectiveStatus,
} from '@/types/tournament.types';

export const STATUS_LABEL: Record<TournamentEffectiveStatus, string> = {
  DRAFT: '임시저장',
  UPCOMING: '모집예정',
  OPEN: '모집중',
  CLOSED: '마감',
};

export const STATUS_CLASS: Record<TournamentEffectiveStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  UPCOMING: 'bg-yellow-100 text-yellow-700',
  OPEN: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-200 text-gray-500',
};

export const PAYMENT_LABEL: Record<EntryPaymentStatus, string> = {
  PENDING: '입금대기',
  CONFIRMED: '입금확인',
  CANCELED: '취소',
};

export const PAYMENT_CLASS: Record<EntryPaymentStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  CANCELED: 'bg-gray-200 text-gray-500',
};

export function formatFee(fee: number): string {
  if (fee === 0) return '무료';
  return `${fee.toLocaleString('ko-KR')}원`;
}

export function formatEventLabel(option: {
  eventType: string;
  ageGroup: string;
  level: string;
}): string {
  return [option.eventType, option.ageGroup, option.level]
    .filter((part) => part.trim().length > 0)
    .join(' ');
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function getDaysUntil(deadline: Date, now: Date): number {
  return Math.ceil((deadline.getTime() - now.getTime()) / MS_PER_DAY);
}
```

- [ ] **Step 4: 배지 컴포넌트 작성**

`src/components/organisms/tournament/TournamentStatusBadge.tsx`:

```tsx
import { STATUS_CLASS, STATUS_LABEL } from '@/lib/tournament/display';
import type { TournamentEffectiveStatus } from '@/types/tournament.types';

interface TournamentStatusBadgeProps {
  status: TournamentEffectiveStatus;
}

function TournamentStatusBadge({ status }: TournamentStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export default TournamentStatusBadge;
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx jest src/lib/tournament/display.test.ts`
Expected: PASS — 6 tests passed

- [ ] **Step 6: 커밋**

```bash
git add src/lib/tournament/display.ts src/lib/tournament/display.test.ts src/components/organisms/tournament/TournamentStatusBadge.tsx
git commit -m "feat(tournament): 표시용 포맷 유틸과 상태 배지 컴포넌트 추가"
```

---

### Task 19: 신청 폼 — 선수 명단 필드

**Files:**
- Create: `src/components/organisms/tournament/entry/PlayerListField.tsx`
- Create: `src/components/organisms/tournament/entry/entryFormTypes.ts`

**Interfaces:**
- Consumes: Task 2 타입, 기존 `Input`/`Select`/`FormField` 컴포넌트
- Produces:
  - `type EntryFormValues = { depositorName; teamName; players: PlayerFormValue[]; events: EventFormValue[]; privacyAgreed }`
  - `type PlayerFormValue = { key; name; gender; birthDate; phoneNumber; tshirtSize }`
  - `type EventFormValue = { eventOptionId; playerKeys: string[] }`
  - `PlayerListField` 컴포넌트

`useFieldArray` 를 쓴다. 선수의 `key` 는 폼 안에서 종목↔선수를 잇는 임시 식별자이며, 서버가 실제 id로 매핑한다(Task 13).

- [ ] **Step 1: 폼 타입 정의**

`src/components/organisms/tournament/entry/entryFormTypes.ts`:

```ts
export interface PlayerFormValue {
  key: string;
  name: string;
  gender: string;
  birthDate: string;
  phoneNumber: string;
  tshirtSize: string;
}

export interface EventFormValue {
  eventOptionId: string;
  playerKeys: string[];
}

export interface EntryFormValues {
  depositorName: string;
  teamName: string;
  players: PlayerFormValue[];
  events: EventFormValue[];
  privacyAgreed: boolean;
}

export const GENDER_OPTIONS = [
  { value: '남', label: '남' },
  { value: '여', label: '여' },
];

/** 폼 내부에서만 쓰는 선수 식별자를 만든다. 서버 id와 무관하다. */
export function createPlayerKey(index: number): string {
  return `player-${index}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptyPlayer(index: number): PlayerFormValue {
  return {
    key: createPlayerKey(index),
    name: '',
    gender: '',
    birthDate: '',
    phoneNumber: '',
    tshirtSize: '',
  };
}
```

- [ ] **Step 2: PlayerListField 구현**

`src/components/organisms/tournament/entry/PlayerListField.tsx`:

```tsx
import { useFieldArray, useFormContext } from 'react-hook-form';

import { Input } from '@/components/atoms/inputs/Input';
import { Select } from '@/components/atoms/inputs/Select';
import { FormField } from '@/components/molecules/form/FormField';

import {
  createEmptyPlayer,
  GENDER_OPTIONS,
  type EntryFormValues,
} from './entryFormTypes';

interface PlayerListFieldProps {
  tshirtSizes: string[];
}

function PlayerListField({ tshirtSizes }: PlayerListFieldProps) {
  const { control, register, watch } = useFormContext<EntryFormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'players',
  });

  const events = watch('events');
  const useTshirt = tshirtSizes.length > 0;
  const tshirtOptions = tshirtSizes.map((size) => ({
    value: size,
    label: size,
  }));

  // 종목에 배정된 선수는 삭제할 수 없다 (배정이 깨지므로)
  const assignedKeys = new Set(
    (events ?? []).flatMap((event) => event.playerKeys ?? [])
  );

  const onClickAddPlayer = () => {
    append(createEmptyPlayer(fields.length));
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">① 선수 명단</h2>
        <button
          type="button"
          onClick={onClickAddPlayer}
          className="rounded-md bg-blue-50 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-100"
        >
          + 선수 추가
        </button>
      </div>
      <p className="text-sm text-gray-500">
        같은 선수가 여러 종목에 나가도 한 번만 등록하세요.
      </p>

      {fields.map((field, index) => {
        const playerKey = watch(`players.${index}.key`);
        const isAssigned = assignedKeys.has(playerKey);

        return (
          <div
            key={field.id}
            className="space-y-3 rounded-lg border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                선수 {index + 1}
              </span>
              <button
                type="button"
                onClick={() => remove(index)}
                disabled={isAssigned}
                className="text-sm text-red-500 disabled:text-gray-300"
                title={isAssigned ? '종목에 배정된 선수는 삭제할 수 없습니다' : ''}
              >
                삭제
              </button>
            </div>

            <input type="hidden" {...register(`players.${index}.key`)} />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label="이름" required>
                <Input
                  type="text"
                  {...register(`players.${index}.name`, { required: true })}
                />
              </FormField>

              <FormField label="성별" required>
                <Select
                  options={GENDER_OPTIONS}
                  {...register(`players.${index}.gender`, { required: true })}
                />
              </FormField>

              <FormField label="생년월일" required>
                <Input
                  type="date"
                  {...register(`players.${index}.birthDate`, { required: true })}
                />
              </FormField>

              <FormField label="전화번호" required>
                <Input
                  type="tel"
                  placeholder="010-1234-5678"
                  {...register(`players.${index}.phoneNumber`, {
                    required: true,
                  })}
                />
              </FormField>

              {useTshirt && (
                <FormField label="티셔츠 사이즈">
                  <Select
                    options={tshirtOptions}
                    {...register(`players.${index}.tshirtSize`)}
                  />
                </FormField>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}

export default PlayerListField;
```

**주의:** 기존 `Input`/`Select` 가 `register()` 의 ref를 전달받으려면 `forwardRef` 로 감싸져 있어야 한다. 다음 스텝에서 확인한다.

- [ ] **Step 3: Input/Select의 forwardRef 확인 및 수정**

Run:
```bash
grep -n "forwardRef" src/components/atoms/inputs/Input.tsx src/components/atoms/inputs/Select.tsx
```

출력이 없으면 두 컴포넌트를 `forwardRef` 로 감싼다. `Select.tsx` 예시:

```tsx
import { forwardRef } from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: Array<{ value: string; label: string }>;
  fullWidth?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ options, fullWidth = true, className = '', ...props }, ref) {
    return (
      <select
        ref={ref}
        className={`mt-1 block ${fullWidth ? 'w-full' : ''} rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${className}`}
        {...props}
      >
        <option value="">선택해주세요</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }
);
```

`Input.tsx` 도 같은 방식으로 `forwardRef<HTMLInputElement, InputProps>` 로 감싼다. **기존 props와 className 로직은 그대로 유지한다** — 다른 화면들이 이 컴포넌트를 쓰고 있으므로 동작이 바뀌면 안 된다.

- [ ] **Step 4: 기존 화면 회귀 확인**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: 기존 대비 새 에러 없음

Run: `npm run build 2>&1 | tail -20`
Expected: 빌드 성공

- [ ] **Step 5: 커밋**

```bash
git add src/components/organisms/tournament/entry/ src/components/atoms/inputs/
git commit -m "feat(tournament): 신청 폼 선수 명단 필드 추가

react-hook-form 연동을 위해 Input/Select를 forwardRef로 전환"
```

---

### Task 20: 신청 폼 — 종목 선택과 합계

**Files:**
- Create: `src/components/organisms/tournament/entry/EventListField.tsx`
- Create: `src/components/organisms/tournament/entry/EntrySummary.tsx`

**Interfaces:**
- Consumes: Task 19의 `EntryFormValues`, Task 18의 `formatFee`/`formatEventLabel`
- Produces: `EventListField`, `EntrySummary` 컴포넌트

종목을 고르면 그 종목의 `playerCount` 만큼 선수 배정 드롭다운이 나타난다.

- [ ] **Step 1: EventListField 구현**

`src/components/organisms/tournament/entry/EventListField.tsx`:

```tsx
import { useFieldArray, useFormContext } from 'react-hook-form';

import { Select } from '@/components/atoms/inputs/Select';
import { FormField } from '@/components/molecules/form/FormField';

import { formatEventLabel, formatFee } from '@/lib/tournament/display';
import type { TournamentEventOption } from '@prisma/client';

import type { EntryFormValues } from './entryFormTypes';

interface EventListFieldProps {
  eventOptions: TournamentEventOption[];
}

function EventListField({ eventOptions }: EventListFieldProps) {
  const { control, register, watch, setValue } =
    useFormContext<EntryFormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'events',
  });

  const players = watch('players') ?? [];
  const events = watch('events') ?? [];

  const activeOptions = eventOptions.filter((option) => option.isActive);
  const optionById = new Map(activeOptions.map((option) => [option.id, option]));

  const onClickAddEvent = () => {
    append({ eventOptionId: '', playerKeys: [] });
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">② 신청 종목</h2>
        <button
          type="button"
          onClick={onClickAddEvent}
          className="rounded-md bg-blue-50 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-100"
        >
          + 종목 추가
        </button>
      </div>

      {fields.map((field, index) => {
        const selectedId = events[index]?.eventOptionId ?? '';
        const option = optionById.get(selectedId);
        const playerCount = option?.playerCount ?? 0;
        // 이미 다른 줄에서 고른 종목은 제외한다
        const takenIds = new Set(
          events
            .map((event, i) => (i === index ? null : event.eventOptionId))
            .filter(Boolean) as string[]
        );

        const selectableOptions = activeOptions
          .filter((o) => !takenIds.has(o.id))
          .map((o) => ({
            value: o.id,
            label: `${formatEventLabel(o)} · ${formatFee(o.fee)}`,
          }));

        const playerOptions = players.map((player, i) => ({
          value: player.key,
          label: player.name.trim() || `선수 ${i + 1}`,
        }));

        const onChangeEventOption = (
          e: React.ChangeEvent<HTMLSelectElement>
        ) => {
          setValue(`events.${index}.eventOptionId`, e.target.value);
          // 종목이 바뀌면 인원수가 달라질 수 있으므로 배정을 초기화한다
          setValue(`events.${index}.playerKeys`, []);
        };

        return (
          <div
            key={field.id}
            className="space-y-3 rounded-lg border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                종목 {index + 1}
              </span>
              <button
                type="button"
                onClick={() => remove(index)}
                className="text-sm text-red-500"
              >
                삭제
              </button>
            </div>

            <FormField label="종목 선택" required>
              <Select
                options={selectableOptions}
                value={selectedId}
                onChange={onChangeEventOption}
              />
            </FormField>

            {playerCount > 0 &&
              Array.from({ length: playerCount }).map((_, slot) => (
                <FormField key={slot} label={`선수 ${slot + 1}`} required>
                  <Select
                    options={playerOptions}
                    {...register(`events.${index}.playerKeys.${slot}`, {
                      required: true,
                    })}
                  />
                </FormField>
              ))}

            {option && (
              <p className="text-right text-sm text-gray-600">
                참가비 {formatFee(option.fee)}
              </p>
            )}
          </div>
        );
      })}

      {fields.length === 0 && (
        <p className="rounded-md bg-gray-50 p-4 text-center text-sm text-gray-500">
          [+ 종목 추가]를 눌러 신청할 종목을 선택하세요.
        </p>
      )}
    </section>
  );
}

export default EventListField;
```

- [ ] **Step 2: EntrySummary 구현**

`src/components/organisms/tournament/entry/EntrySummary.tsx`:

```tsx
import { useFormContext } from 'react-hook-form';

import { Input } from '@/components/atoms/inputs/Input';
import { FormField } from '@/components/molecules/form/FormField';

import { formatFee } from '@/lib/tournament/display';
import type { TournamentEventOption } from '@prisma/client';

import type { EntryFormValues } from './entryFormTypes';

interface EntrySummaryProps {
  eventOptions: TournamentEventOption[];
  useTeamName: boolean;
  bankAccount: string | null;
}

function EntrySummary({
  eventOptions,
  useTeamName,
  bankAccount,
}: EntrySummaryProps) {
  const { register, watch } = useFormContext<EntryFormValues>();

  const events = watch('events') ?? [];
  const feeById = new Map(eventOptions.map((option) => [option.id, option.fee]));

  // 화면 표시용 금액이다. 실제 청구액은 서버가 다시 계산한다.
  const totalFee = events.reduce(
    (sum, event) => sum + (feeById.get(event.eventOptionId) ?? 0),
    0
  );

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">③ 입금 정보</h2>

      <div className="rounded-lg bg-blue-50 p-4">
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-700">납부하실 금액</span>
          <span className="text-xl font-bold text-blue-700">
            {formatFee(totalFee)}
          </span>
        </div>
        {bankAccount && (
          <p className="mt-2 text-sm text-gray-600">입금 계좌: {bankAccount}</p>
        )}
      </div>

      <FormField label="입금자명" required>
        <Input
          type="text"
          placeholder="통장에 찍히는 이름을 적어주세요"
          {...register('depositorName', { required: true })}
        />
      </FormField>

      {useTeamName && (
        <FormField label="팀명">
          <Input type="text" {...register('teamName')} />
        </FormField>
      )}

      <label className="flex items-start gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          className="mt-1"
          {...register('privacyAgreed', { required: true })}
        />
        <span>
          개인정보 수집·이용에 동의합니다. 수집한 정보(이름, 생년월일, 전화번호)는
          대회 참가 신청 목적으로만 사용되며 주최측에 제출됩니다. 본인 외 선수의
          정보를 입력한 경우 해당 선수의 동의를 받았음을 확인합니다.
        </span>
      </label>
    </section>
  );
}

export default EntrySummary;
```

- [ ] **Step 3: 타입 체크**

Run: `npx tsc --noEmit 2>&1 | grep -i "tournament/entry" | head -10`
Expected: 출력 없음

- [ ] **Step 4: 커밋**

```bash
git add src/components/organisms/tournament/entry/
git commit -m "feat(tournament): 신청 폼 종목 선택·합계 컴포넌트 추가

종목의 playerCount에 맞춰 선수 배정 슬롯을 렌더링한다."
```

---

### Task 21: 신청 페이지

**Files:**
- Create: `src/pages/clubs/[id]/tournaments/[tournamentId]/apply.tsx`

**Interfaces:**
- Consumes: Task 17 훅, Task 19·20 컴포넌트
- Produces: `/clubs/[id]/tournaments/[tournamentId]/apply` 페이지

신규/수정을 `useMyEntry` 결과로 판별한다(스펙 §4.4).

- [ ] **Step 1: 페이지 구현**

`src/pages/clubs/[id]/tournaments/[tournamentId]/apply.tsx`:

```tsx
import { useEffect } from 'react';

import { useRouter } from 'next/router';

import { FormProvider, useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';

import EntrySummary from '@/components/organisms/tournament/entry/EntrySummary';
import {
  createEmptyPlayer,
  type EntryFormValues,
} from '@/components/organisms/tournament/entry/entryFormTypes';
import EventListField from '@/components/organisms/tournament/entry/EventListField';
import PlayerListField from '@/components/organisms/tournament/entry/PlayerListField';

import { useMyEntry, useSubmitEntry } from '@/hooks/useMyEntry';
import { useTournamentDetail } from '@/hooks/useTournamentDetail';
import { RootState } from '@/store';

function TournamentApplyPage() {
  const router = useRouter();
  const clubId = router.query.id as string | undefined;
  const tournamentId = router.query.tournamentId as string | undefined;

  const currentUser = useSelector((state: RootState) => state.auth.user);
  const { data: detail, isLoading: isDetailLoading } = useTournamentDetail(
    clubId,
    tournamentId
  );
  const { data: myEntry, isLoading: isEntryLoading } = useMyEntry(
    clubId,
    tournamentId
  );
  const submitEntry = useSubmitEntry(clubId, tournamentId);

  const methods = useForm<EntryFormValues>({
    defaultValues: {
      depositorName: '',
      teamName: '',
      players: [createEmptyPlayer(0)],
      events: [],
      privacyAgreed: false,
    },
  });

  // 기존 신청서가 있으면 폼을 채운다
  useEffect(() => {
    if (!myEntry) return;

    const playerKeyById = new Map(
      myEntry.players.map((player) => [player.id, `player-${player.id}`])
    );

    methods.reset({
      depositorName: myEntry.depositorName,
      teamName: myEntry.teamName ?? '',
      players: myEntry.players.map((player) => ({
        key: playerKeyById.get(player.id) as string,
        name: player.name,
        gender: player.gender,
        birthDate: player.birthDate,
        phoneNumber: player.phoneNumber,
        tshirtSize: player.tshirtSize ?? '',
      })),
      events: myEntry.entryEvents
        .filter((event) => event.status === 'ACTIVE')
        .map((event) => ({
          eventOptionId: event.eventOption.id,
          playerKeys: event.eventPlayers
            .map((ep) => playerKeyById.get(ep.entryPlayerId))
            .filter(Boolean) as string[],
        })),
      privacyAgreed: true,
    });
  }, [myEntry, methods]);

  // 신규 신청이면 본인 정보를 선수 1로 자동 채운다
  useEffect(() => {
    if (myEntry || !currentUser) return;
    methods.setValue('players.0.name', currentUser.nickname ?? '');
    methods.setValue('depositorName', currentUser.nickname ?? '');
  }, [myEntry, currentUser, methods]);

  const onSubmitForm = methods.handleSubmit(async (values) => {
    try {
      await submitEntry.mutateAsync({
        entryId: myEntry?.id ?? null,
        input: {
          depositorName: values.depositorName,
          teamName: values.teamName || null,
          privacyAgreed: values.privacyAgreed,
          players: values.players.map((player, index) => ({
            key: player.key,
            name: player.name,
            gender: player.gender,
            birthDate: player.birthDate,
            phoneNumber: player.phoneNumber,
            tshirtSize: player.tshirtSize || null,
            order: index,
          })),
          events: values.events.map((event) => ({
            eventOptionId: event.eventOptionId,
            playerKeys: event.playerKeys.filter(Boolean),
          })),
        },
      });
      toast.success(myEntry ? '신청 내역을 수정했습니다.' : '신청이 완료되었습니다.');
      router.push(`/clubs/${clubId}/tournaments/${tournamentId}/my`);
    } catch (error) {
      const message =
        (error as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? '신청 처리 중 오류가 발생했습니다.';
      toast.error(message);
    }
  });

  if (isDetailLoading || isEntryLoading) {
    return <div className="p-6 text-center text-gray-500">불러오는 중...</div>;
  }
  if (!detail) {
    return <div className="p-6 text-center text-gray-500">대회를 찾을 수 없습니다.</div>;
  }
  if (detail.effectiveStatus !== 'OPEN') {
    return (
      <div className="p-6 text-center text-gray-500">
        현재 신청할 수 없는 대회입니다.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <h1 className="mb-1 text-xl font-bold">{detail.tournament.title}</h1>
      <p className="mb-6 text-sm text-gray-500">
        {myEntry ? '신청 내역 수정' : '참가 신청'}
      </p>

      <FormProvider {...methods}>
        <form onSubmit={onSubmitForm} className="space-y-8">
          <PlayerListField tshirtSizes={detail.tournament.tshirtSizes} />
          <EventListField eventOptions={detail.tournament.eventOptions} />
          <EntrySummary
            eventOptions={detail.tournament.eventOptions}
            useTeamName={detail.tournament.useTeamName}
            bankAccount={detail.tournament.bankAccount}
          />

          <button
            type="submit"
            disabled={submitEntry.isPending}
            className="w-full rounded-md bg-blue-600 py-3 font-medium text-white hover:bg-blue-700 disabled:bg-gray-300"
          >
            {submitEntry.isPending
              ? '처리 중...'
              : myEntry
                ? '수정하기'
                : '신청하기'}
          </button>
        </form>
      </FormProvider>
    </div>
  );
}

export default TournamentApplyPage;
```

- [ ] **Step 2: 타입 체크 및 빌드**

Run: `npx tsc --noEmit 2>&1 | grep -i apply | head -10`
Expected: 출력 없음

- [ ] **Step 3: 실제 동작 확인**

Run: `npm run dev`

브라우저에서 확인한다 (관리자 화면이 아직 없으므로 대회 데이터는 Prisma Studio로 직접 넣는다):

```bash
npx prisma studio
```
Studio에서 `Tournament` 1건과 `TournamentEventOption` 2건을 만든다. `applyDeadline` 은 미래 날짜, `status` 는 `OPEN`.

그 다음 `/clubs/<클럽ID>/tournaments/<대회ID>/apply` 에 접속해 확인한다:
- 선수 추가/삭제가 동작하는가
- 종목을 고르면 선수 배정 슬롯이 인원수만큼 나타나는가
- 종목을 추가하면 합계 금액이 늘어나는가
- 제출 후 DB에 `TournamentEntry`/`EntryPlayer`/`EntryEvent` 가 생기는가

- [ ] **Step 4: 커밋**

```bash
git add "src/pages/clubs/[id]/tournaments/[tournamentId]/apply.tsx"
git commit -m "feat(tournament): 대회 참가 신청 페이지 추가

기존 신청서 유무로 신규 제출과 수정을 판별한다."
```

---

### Task 22: 내 신청 확인 페이지

**Files:**
- Create: `src/pages/clubs/[id]/tournaments/[tournamentId]/my.tsx`

**Interfaces:**
- Consumes: Task 17 `useMyEntry`/`useCancelEntryEvent`/`useTournamentDetail`, Task 18 표시 유틸
- Produces: `/clubs/[id]/tournaments/[tournamentId]/my` 페이지

- [ ] **Step 1: 페이지 구현**

`src/pages/clubs/[id]/tournaments/[tournamentId]/my.tsx`:

```tsx
import { useRouter } from 'next/router';

import toast from 'react-hot-toast';

import {
  formatEventLabel,
  formatFee,
  PAYMENT_CLASS,
  PAYMENT_LABEL,
} from '@/lib/tournament/display';

import { useCancelEntryEvent, useMyEntry } from '@/hooks/useMyEntry';
import { useTournamentDetail } from '@/hooks/useTournamentDetail';

function MyEntryPage() {
  const router = useRouter();
  const clubId = router.query.id as string | undefined;
  const tournamentId = router.query.tournamentId as string | undefined;

  const { data: detail } = useTournamentDetail(clubId, tournamentId);
  const { data: myEntry, isLoading } = useMyEntry(clubId, tournamentId);
  const cancelEvent = useCancelEntryEvent(clubId, tournamentId);

  const isOpen = detail?.effectiveStatus === 'OPEN';

  const onClickCancelEvent = async (entryEventId: string, label: string) => {
    if (!myEntry) return;
    if (!window.confirm(`'${label}' 종목 신청을 취소할까요?`)) return;

    try {
      const result = await cancelEvent.mutateAsync({
        entryId: myEntry.id,
        entryEventId,
      });
      toast.success(result.message);
    } catch (error) {
      const message =
        (error as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? '취소 처리 중 오류가 발생했습니다.';
      toast.error(message);
    }
  };

  if (isLoading) {
    return <div className="p-6 text-center text-gray-500">불러오는 중...</div>;
  }

  if (!myEntry) {
    return (
      <div className="mx-auto max-w-2xl p-6 text-center">
        <p className="mb-4 text-gray-500">아직 신청 내역이 없습니다.</p>
        {isOpen && (
          <button
            type="button"
            onClick={() =>
              router.push(`/clubs/${clubId}/tournaments/${tournamentId}/apply`)
            }
            className="rounded-md bg-blue-600 px-4 py-2 text-white"
          >
            신청하러 가기
          </button>
        )}
      </div>
    );
  }

  const activeEvents = myEntry.entryEvents.filter(
    (event) => event.status === 'ACTIVE'
  );
  const canceledEvents = myEntry.entryEvents.filter(
    (event) => event.status === 'CANCELED'
  );
  const playerNameById = new Map(
    myEntry.players.map((player) => [player.id, player.name])
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">내 신청 내역</h1>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${PAYMENT_CLASS[myEntry.paymentStatus]}`}
        >
          {PAYMENT_LABEL[myEntry.paymentStatus]}
        </span>
      </div>

      <div className="rounded-lg bg-blue-50 p-4">
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-700">납부하실 금액</span>
          <span className="text-xl font-bold text-blue-700">
            {formatFee(myEntry.totalFee)}
          </span>
        </div>
        <p className="mt-2 text-sm text-gray-600">
          입금자명: {myEntry.depositorName}
        </p>
        {detail?.tournament.bankAccount && (
          <p className="text-sm text-gray-600">
            입금 계좌: {detail.tournament.bankAccount}
          </p>
        )}
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold">신청 종목</h2>
        {activeEvents.map((event) => {
          const label = formatEventLabel(event.eventOption);
          const names = event.eventPlayers
            .map((ep) => playerNameById.get(ep.entryPlayerId))
            .filter(Boolean)
            .join(', ');

          return (
            <div
              key={event.id}
              className="flex items-start justify-between rounded-lg border border-gray-200 p-4"
            >
              <div>
                <p className="font-medium">{label}</p>
                <p className="mt-1 text-sm text-gray-600">{names}</p>
                <p className="mt-1 text-sm text-gray-500">
                  {formatFee(event.fee)}
                </p>
              </div>
              {isOpen && (
                <button
                  type="button"
                  onClick={() => onClickCancelEvent(event.id, label)}
                  disabled={cancelEvent.isPending}
                  className="text-sm text-red-500 disabled:text-gray-300"
                >
                  취소
                </button>
              )}
            </div>
          );
        })}

        {canceledEvents.length > 0 && (
          <div className="space-y-2 pt-2">
            <h3 className="text-sm font-medium text-gray-500">취소한 종목</h3>
            {canceledEvents.map((event) => (
              <div
                key={event.id}
                className="rounded-lg bg-gray-50 p-3 text-sm text-gray-400 line-through"
              >
                {formatEventLabel(event.eventOption)} · {formatFee(event.fee)}
              </div>
            ))}
          </div>
        )}
      </section>

      {isOpen ? (
        <button
          type="button"
          onClick={() =>
            router.push(`/clubs/${clubId}/tournaments/${tournamentId}/apply`)
          }
          className="w-full rounded-md border border-blue-600 py-3 font-medium text-blue-600"
        >
          신청 내용 수정
        </button>
      ) : (
        <p className="text-center text-sm text-gray-500">
          신청이 마감되어 수정·취소할 수 없습니다.
        </p>
      )}
    </div>
  );
}

export default MyEntryPage;
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit 2>&1 | grep -i "my.tsx" | head -10`
Expected: 출력 없음

- [ ] **Step 3: 동작 확인**

`npm run dev` 후 Task 21에서 만든 신청 건으로 `/clubs/<클럽ID>/tournaments/<대회ID>/my` 확인:
- 신청 종목과 금액이 보이는가
- 종목 하나를 취소하면 합계가 줄어드는가
- 마지막 종목까지 취소하면 상태가 '취소'로 바뀌는가

- [ ] **Step 4: 커밋**

```bash
git add "src/pages/clubs/[id]/tournaments/[tournamentId]/my.tsx"
git commit -m "feat(tournament): 내 신청 확인·부분 취소 페이지 추가"
```

---

### Task 23: 대회 목록·상세 페이지

**Files:**
- Create: `src/pages/clubs/[id]/tournaments/index.tsx`
- Create: `src/pages/clubs/[id]/tournaments/[tournamentId]/index.tsx`
- Create: `src/components/organisms/tournament/TournamentCard.tsx`
- Create: `src/components/organisms/tournament/ParticipantList.tsx`

**Interfaces:**
- Consumes: Task 17 훅, Task 18 유틸·배지
- Produces: 목록/상세 페이지, `TournamentCard`, `ParticipantList` 컴포넌트

- [ ] **Step 1: TournamentCard 구현**

`src/components/organisms/tournament/TournamentCard.tsx`:

```tsx
import { formatFee, getDaysUntil } from '@/lib/tournament/display';
import type { TournamentListItem } from '@/hooks/useTournaments';

import TournamentStatusBadge from './TournamentStatusBadge';

interface TournamentCardProps {
  tournament: TournamentListItem;
  onClick: () => void;
}

function TournamentCard({ tournament, onClick }: TournamentCardProps) {
  const daysLeft = getDaysUntil(new Date(tournament.applyDeadline), new Date());
  const minFee = Math.min(
    ...tournament.eventOptions.map((option) => option.fee)
  );

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg border border-gray-200 p-4 text-left hover:border-blue-300 hover:bg-blue-50/30"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold">{tournament.title}</h3>
        <TournamentStatusBadge status={tournament.effectiveStatus} />
      </div>

      {tournament.hostName && (
        <p className="mt-1 text-sm text-gray-500">{tournament.hostName}</p>
      )}

      <dl className="mt-3 space-y-1 text-sm text-gray-600">
        {tournament.tournamentDate && (
          <div className="flex gap-2">
            <dt className="text-gray-400">대회일</dt>
            <dd>{tournament.tournamentDate}</dd>
          </div>
        )}
        <div className="flex gap-2">
          <dt className="text-gray-400">마감</dt>
          <dd>
            {new Date(tournament.applyDeadline).toLocaleDateString('ko-KR')}
            {tournament.effectiveStatus === 'OPEN' && daysLeft >= 0 && (
              <span className="ml-1 font-medium text-red-500">
                D-{daysLeft}
              </span>
            )}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-gray-400">참가비</dt>
          <dd>{formatFee(minFee)}부터</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-gray-400">신청</dt>
          <dd>{tournament.entryCount}건</dd>
        </div>
      </dl>
    </button>
  );
}

export default TournamentCard;
```

- [ ] **Step 2: ParticipantList 구현**

`src/components/organisms/tournament/ParticipantList.tsx`:

```tsx
import { formatEventLabel } from '@/lib/tournament/display';
import type { PublicParticipant } from '@/types/tournament.types';

interface ParticipantListProps {
  participants: PublicParticipant[];
}

/**
 * 회원 전체에게 공개되는 참가자 목록.
 * 서버가 이름과 종목만 내려주므로 민감정보는 애초에 여기 도달하지 않는다.
 */
function ParticipantList({ participants }: ParticipantListProps) {
  if (participants.length === 0) {
    return (
      <p className="rounded-md bg-gray-50 p-4 text-center text-sm text-gray-500">
        아직 신청자가 없습니다.
      </p>
    );
  }

  // 종목별로 묶어 보여준다 (파트너 찾기 용도)
  const grouped = participants.reduce<Record<string, string[]>>(
    (acc, participant) => {
      const key = formatEventLabel(participant);
      acc[key] = acc[key] ?? [];
      acc[key].push(participant.name);
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-3">
      {Object.entries(grouped).map(([label, names]) => (
        <div key={label} className="rounded-lg border border-gray-200 p-3">
          <p className="text-sm font-medium text-gray-700">{label}</p>
          <p className="mt-1 text-sm text-gray-600">{names.join(', ')}</p>
        </div>
      ))}
    </div>
  );
}

export default ParticipantList;
```

- [ ] **Step 3: 목록 페이지 구현**

`src/pages/clubs/[id]/tournaments/index.tsx`:

```tsx
import { useRouter } from 'next/router';

import { useSelector } from 'react-redux';

import TournamentCard from '@/components/organisms/tournament/TournamentCard';

import { useTournaments } from '@/hooks/useTournaments';
import { RootState } from '@/store';
import { Role } from '@/types/enums';

function TournamentListPage() {
  const router = useRouter();
  const clubId = router.query.id as string | undefined;
  const { data: tournaments, isLoading } = useTournaments(clubId);

  const clubMember = useSelector((state: RootState) => state.club.clubMember);
  const isAdmin = clubMember?.role === Role.ADMIN;

  if (isLoading) {
    return <div className="p-6 text-center text-gray-500">불러오는 중...</div>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">대회 참가 신청</h1>
        {isAdmin && (
          <button
            type="button"
            onClick={() => router.push(`/clubs/${clubId}/tournaments/new`)}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white"
          >
            대회 만들기
          </button>
        )}
      </div>

      {tournaments && tournaments.length > 0 ? (
        <div className="space-y-3">
          {tournaments.map((tournament) => (
            <TournamentCard
              key={tournament.id}
              tournament={tournament}
              onClick={() =>
                router.push(`/clubs/${clubId}/tournaments/${tournament.id}`)
              }
            />
          ))}
        </div>
      ) : (
        <p className="rounded-md bg-gray-50 p-6 text-center text-sm text-gray-500">
          등록된 대회가 없습니다.
        </p>
      )}
    </div>
  );
}

export default TournamentListPage;
```

**주의:** `state.club.clubMember` 경로가 실제 Redux 스토어와 다를 수 있다. 다음 스텝에서 확인한다.

- [ ] **Step 4: Redux 스토어 경로 확인**

Run:
```bash
grep -rn "clubMember" src/store/features/*.ts | head -10
grep -rn "state.club" src/pages/clubs/\[id\]/custom/index.tsx | head -5
```

`src/pages/clubs/[id]/custom/index.tsx` 가 관리자 권한을 확인하는 방식을 그대로 따른다. 경로가 다르면 목록 페이지의 `useSelector` 를 그에 맞게 고친다.

- [ ] **Step 5: 상세 페이지 구현**

`src/pages/clubs/[id]/tournaments/[tournamentId]/index.tsx`:

```tsx
import { useRouter } from 'next/router';

import { useSelector } from 'react-redux';

import ParticipantList from '@/components/organisms/tournament/ParticipantList';
import TournamentStatusBadge from '@/components/organisms/tournament/TournamentStatusBadge';

import { formatEventLabel, formatFee } from '@/lib/tournament/display';

import { useTournamentDetail } from '@/hooks/useTournamentDetail';
import { RootState } from '@/store';
import { Role } from '@/types/enums';

function TournamentDetailPage() {
  const router = useRouter();
  const clubId = router.query.id as string | undefined;
  const tournamentId = router.query.tournamentId as string | undefined;

  const { data: detail, isLoading } = useTournamentDetail(clubId, tournamentId);
  const clubMember = useSelector((state: RootState) => state.club.clubMember);
  const isAdmin = clubMember?.role === Role.ADMIN;

  if (isLoading) {
    return <div className="p-6 text-center text-gray-500">불러오는 중...</div>;
  }
  if (!detail) {
    return (
      <div className="p-6 text-center text-gray-500">대회를 찾을 수 없습니다.</div>
    );
  }

  const { tournament, effectiveStatus, participants, myEntryId } = detail;
  const basePath = `/clubs/${clubId}/tournaments/${tournamentId}`;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <header>
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-xl font-bold">{tournament.title}</h1>
          <TournamentStatusBadge status={effectiveStatus} />
        </div>
        {tournament.hostName && (
          <p className="mt-1 text-sm text-gray-500">{tournament.hostName}</p>
        )}
      </header>

      <section className="space-y-2 rounded-lg border border-gray-200 p-4 text-sm">
        {tournament.tournamentDate && (
          <p>
            <span className="text-gray-400">대회일 </span>
            {tournament.tournamentDate}
          </p>
        )}
        {tournament.location && (
          <p>
            <span className="text-gray-400">장소 </span>
            {tournament.location}
          </p>
        )}
        <p>
          <span className="text-gray-400">신청 마감 </span>
          {new Date(tournament.applyDeadline).toLocaleString('ko-KR')}
        </p>
        {tournament.bankAccount && (
          <p>
            <span className="text-gray-400">입금 계좌 </span>
            {tournament.bankAccount}
          </p>
        )}
      </section>

      {tournament.description && (
        <section>
          <h2 className="mb-2 font-semibold">모집 요강</h2>
          <p className="whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
            {tournament.description}
          </p>
        </section>
      )}

      <section>
        <h2 className="mb-2 font-semibold">종목 및 참가비</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2">종목</th>
                <th className="py-2">인원</th>
                <th className="py-2 text-right">참가비</th>
              </tr>
            </thead>
            <tbody>
              {tournament.eventOptions
                .filter((option) => option.isActive)
                .map((option) => (
                  <tr key={option.id} className="border-b last:border-0">
                    <td className="py-2">{formatEventLabel(option)}</td>
                    <td className="py-2">{option.playerCount}명</td>
                    <td className="py-2 text-right">{formatFee(option.fee)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">
          신청 현황 ({participants.length}명)
        </h2>
        <ParticipantList participants={participants} />
      </section>

      <div className="space-y-2">
        {effectiveStatus === 'OPEN' && (
          <button
            type="button"
            onClick={() => router.push(`${basePath}/apply`)}
            className="w-full rounded-md bg-blue-600 py-3 font-medium text-white"
          >
            {myEntryId ? '신청 내용 수정' : '신청하기'}
          </button>
        )}
        {myEntryId && (
          <button
            type="button"
            onClick={() => router.push(`${basePath}/my`)}
            className="w-full rounded-md border border-gray-300 py-3 font-medium text-gray-700"
          >
            내 신청 확인
          </button>
        )}
        {isAdmin && (
          <button
            type="button"
            onClick={() => router.push(`${basePath}/admin`)}
            className="w-full rounded-md border border-blue-600 py-3 font-medium text-blue-600"
          >
            신청 현황 관리
          </button>
        )}
      </div>
    </div>
  );
}

export default TournamentDetailPage;
```

- [ ] **Step 6: 타입 체크 및 동작 확인**

Run: `npx tsc --noEmit 2>&1 | grep -i tournaments | head -10`
Expected: 출력 없음

`npm run dev` 후 `/clubs/<클럽ID>/tournaments` 확인:
- 대회 카드가 보이고 D-day가 계산되는가
- 상세에서 종목·참가비 표가 보이는가
- 참가자 목록에 이름과 종목만 나오고 전화번호가 없는가 (개발자 도구 Network 탭에서 응답 JSON 확인)

- [ ] **Step 7: 커밋**

```bash
git add src/components/organisms/tournament/ "src/pages/clubs/[id]/tournaments/"
git commit -m "feat(tournament): 대회 목록·상세 페이지 추가

참가자 목록은 이름과 종목만 노출한다."
```

---

### Task 24: 관리자 대회 생성·수정 화면

**Files:**
- Create: `src/components/organisms/tournament/admin/EventOptionEditor.tsx`
- Create: `src/components/organisms/tournament/admin/TournamentForm.tsx`
- Create: `src/pages/clubs/[id]/tournaments/new.tsx`
- Create: `src/pages/clubs/[id]/tournaments/[tournamentId]/edit.tsx`

**Interfaces:**
- Consumes: Task 17 `useSaveTournament`, Task 2 `TournamentInput`/`EventOptionInput`
- Produces: `EventOptionEditor`, `TournamentForm`, 생성/수정 페이지

- [ ] **Step 1: EventOptionEditor 구현**

`src/components/organisms/tournament/admin/EventOptionEditor.tsx`:

```tsx
import { useFieldArray, useFormContext } from 'react-hook-form';

import { formatFee } from '@/lib/tournament/display';
import type { TournamentInput } from '@/types/tournament.types';

function EventOptionEditor() {
  const { control, register, watch } = useFormContext<TournamentInput>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'eventOptions',
  });

  const options = watch('eventOptions') ?? [];

  const onClickAddOption = () => {
    append({
      eventType: '',
      ageGroup: '',
      level: '',
      playerCount: 2,
      fee: 0,
      order: fields.length,
    });
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">종목 옵션</h2>
        <button
          type="button"
          onClick={onClickAddOption}
          className="rounded-md bg-blue-50 px-3 py-1.5 text-sm text-blue-700"
        >
          + 종목 추가
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2">종목</th>
              <th className="py-2">연령</th>
              <th className="py-2">급수</th>
              <th className="py-2">인원</th>
              <th className="py-2">참가비</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {fields.map((field, index) => (
              <tr key={field.id} className="border-b last:border-0">
                <td className="py-2 pr-2">
                  <input
                    className="w-full rounded border-gray-300 text-sm"
                    placeholder="남자복식"
                    {...register(`eventOptions.${index}.eventType`, {
                      required: true,
                    })}
                  />
                </td>
                <td className="py-2 pr-2">
                  <input
                    className="w-full rounded border-gray-300 text-sm"
                    placeholder="30대부"
                    {...register(`eventOptions.${index}.ageGroup`, {
                      required: true,
                    })}
                  />
                </td>
                <td className="py-2 pr-2">
                  <input
                    className="w-full rounded border-gray-300 text-sm"
                    placeholder="A조"
                    {...register(`eventOptions.${index}.level`)}
                  />
                </td>
                <td className="py-2 pr-2">
                  <select
                    className="rounded border-gray-300 text-sm"
                    {...register(`eventOptions.${index}.playerCount`, {
                      valueAsNumber: true,
                    })}
                  >
                    <option value={1}>1명</option>
                    <option value={2}>2명</option>
                  </select>
                </td>
                <td className="py-2 pr-2">
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    className="w-28 rounded border-gray-300 text-sm"
                    {...register(`eventOptions.${index}.fee`, {
                      valueAsNumber: true,
                    })}
                  />
                  <p className="mt-0.5 text-xs text-gray-400">
                    {formatFee(options[index]?.fee ?? 0)}
                  </p>
                </td>
                <td className="py-2">
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="text-sm text-red-500"
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {fields.length === 0 && (
        <p className="rounded-md bg-gray-50 p-4 text-center text-sm text-gray-500">
          종목을 1개 이상 등록해야 합니다.
        </p>
      )}
    </section>
  );
}

export default EventOptionEditor;
```

- [ ] **Step 2: TournamentForm 구현**

`src/components/organisms/tournament/admin/TournamentForm.tsx`:

```tsx
import { useState } from 'react';

import { FormProvider, useForm } from 'react-hook-form';

import { Input } from '@/components/atoms/inputs/Input';
import { FormField } from '@/components/molecules/form/FormField';

import type { TournamentInput } from '@/types/tournament.types';

import EventOptionEditor from './EventOptionEditor';

interface TournamentFormProps {
  defaultValues: TournamentInput;
  submitLabel: string;
  isSubmitting: boolean;
  onSubmitForm: (input: TournamentInput) => void;
}

function TournamentForm({
  defaultValues,
  submitLabel,
  isSubmitting,
  onSubmitForm,
}: TournamentFormProps) {
  const methods = useForm<TournamentInput>({ defaultValues });
  const [sizeInput, setSizeInput] = useState('');

  const tshirtSizes = methods.watch('tshirtSizes') ?? [];

  const onClickAddSize = () => {
    const size = sizeInput.trim();
    if (!size || tshirtSizes.includes(size)) return;
    methods.setValue('tshirtSizes', [...tshirtSizes, size]);
    setSizeInput('');
  };

  const onClickRemoveSize = (size: string) => {
    methods.setValue(
      'tshirtSizes',
      tshirtSizes.filter((item) => item !== size)
    );
  };

  const handleSubmitForm = methods.handleSubmit((values) => {
    onSubmitForm({
      ...values,
      // datetime-local 값을 ISO로 변환한다 (zod가 datetime을 요구)
      applyStartAt: values.applyStartAt
        ? new Date(values.applyStartAt).toISOString()
        : null,
      applyDeadline: new Date(values.applyDeadline).toISOString(),
      eventOptions: values.eventOptions.map((option, index) => ({
        ...option,
        level: option.level ?? '',
        order: index,
      })),
    });
  });

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmitForm} className="space-y-8">
        <section className="space-y-4">
          <h2 className="font-semibold">① 대회 기본 정보</h2>
          <FormField label="대회명" required>
            <Input type="text" {...methods.register('title', { required: true })} />
          </FormField>
          <FormField label="주최">
            <Input type="text" {...methods.register('hostName')} />
          </FormField>
          <FormField label="대회 일자">
            <Input type="date" {...methods.register('tournamentDate')} />
          </FormField>
          <FormField label="장소">
            <Input type="text" {...methods.register('location')} />
          </FormField>
          <FormField label="모집 요강">
            <textarea
              rows={5}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              {...methods.register('description')}
            />
          </FormField>
          <FormField label="입금 계좌">
            <Input
              type="text"
              placeholder="○○은행 123-456 (클럽명)"
              {...methods.register('bankAccount')}
            />
          </FormField>
        </section>

        <section className="space-y-4">
          <h2 className="font-semibold">② 신청 기간 · 상태</h2>
          <FormField label="신청 시작">
            <Input type="datetime-local" {...methods.register('applyStartAt')} />
          </FormField>
          <FormField label="신청 마감" required>
            <Input
              type="datetime-local"
              {...methods.register('applyDeadline', { required: true })}
            />
          </FormField>
          <FormField label="상태" required>
            <select
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              {...methods.register('status')}
            >
              <option value="DRAFT">임시저장 (회원에게 안 보임)</option>
              <option value="OPEN">모집 열기</option>
              <option value="CLOSED">마감</option>
            </select>
          </FormField>
        </section>

        <section className="space-y-4">
          <h2 className="font-semibold">③ 신청 양식 설정</h2>

          <EventOptionEditor />

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...methods.register('useTeamName')} />
            팀명 입력받기
          </label>

          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">
              티셔츠 사이즈 옵션
            </p>
            <div className="mb-2 flex flex-wrap gap-2">
              {tshirtSizes.map((size) => (
                <span
                  key={size}
                  className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm"
                >
                  {size}
                  <button
                    type="button"
                    onClick={() => onClickRemoveSize(size)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    ✕
                  </button>
                </span>
              ))}
              {tshirtSizes.length === 0 && (
                <span className="text-sm text-gray-400">
                  사이즈를 추가하지 않으면 티셔츠 항목을 받지 않습니다.
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={sizeInput}
                onChange={(e) => setSizeInput(e.target.value)}
                placeholder="S, M, L..."
                className="flex-1 rounded-md border-gray-300 text-sm"
              />
              <button
                type="button"
                onClick={onClickAddSize}
                className="rounded-md bg-gray-100 px-3 py-1.5 text-sm"
              >
                추가
              </button>
            </div>
          </div>
        </section>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-blue-600 py-3 font-medium text-white disabled:bg-gray-300"
        >
          {isSubmitting ? '저장 중...' : submitLabel}
        </button>
      </form>
    </FormProvider>
  );
}

export default TournamentForm;
```

- [ ] **Step 3: 생성 페이지 구현**

`src/pages/clubs/[id]/tournaments/new.tsx`:

```tsx
import { useRouter } from 'next/router';

import toast from 'react-hot-toast';

import TournamentForm from '@/components/organisms/tournament/admin/TournamentForm';

import { useSaveTournament } from '@/hooks/useTournamentAdmin';
import type { TournamentInput } from '@/types/tournament.types';

const EMPTY_TOURNAMENT: TournamentInput = {
  title: '',
  hostName: '',
  description: '',
  tournamentDate: '',
  location: '',
  applyStartAt: null,
  applyDeadline: '',
  status: 'DRAFT',
  useTeamName: false,
  tshirtSizes: [],
  bankAccount: '',
  eventOptions: [
    {
      eventType: '',
      ageGroup: '',
      level: '',
      playerCount: 2,
      fee: 0,
      order: 0,
    },
  ],
};

function NewTournamentPage() {
  const router = useRouter();
  const clubId = router.query.id as string | undefined;
  const saveTournament = useSaveTournament(clubId);

  const onSubmitForm = async (input: TournamentInput) => {
    try {
      const created = await saveTournament.mutateAsync({
        input,
        tournamentId: null,
      });
      toast.success('대회를 생성했습니다.');
      router.push(`/clubs/${clubId}/tournaments/${created.id}`);
    } catch (error) {
      const message =
        (error as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? '대회 생성 중 오류가 발생했습니다.';
      toast.error(message);
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <h1 className="mb-6 text-xl font-bold">대회 만들기</h1>
      <TournamentForm
        defaultValues={EMPTY_TOURNAMENT}
        submitLabel="대회 생성"
        isSubmitting={saveTournament.isPending}
        onSubmitForm={onSubmitForm}
      />
    </div>
  );
}

export default NewTournamentPage;
```

- [ ] **Step 4: 수정 페이지 구현**

`src/pages/clubs/[id]/tournaments/[tournamentId]/edit.tsx`:

```tsx
import { useRouter } from 'next/router';

import toast from 'react-hot-toast';

import TournamentForm from '@/components/organisms/tournament/admin/TournamentForm';

import { useTournamentDetail } from '@/hooks/useTournamentDetail';
import { useSaveTournament } from '@/hooks/useTournamentAdmin';
import type { TournamentInput } from '@/types/tournament.types';

/** datetime-local 입력이 요구하는 'YYYY-MM-DDTHH:mm' 형식으로 변환한다. */
function toLocalInputValue(value: string | Date | null): string {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function EditTournamentPage() {
  const router = useRouter();
  const clubId = router.query.id as string | undefined;
  const tournamentId = router.query.tournamentId as string | undefined;

  const { data: detail, isLoading } = useTournamentDetail(clubId, tournamentId);
  const saveTournament = useSaveTournament(clubId);

  const onSubmitForm = async (input: TournamentInput) => {
    try {
      await saveTournament.mutateAsync({ input, tournamentId: tournamentId! });
      toast.success('대회를 수정했습니다.');
      router.push(`/clubs/${clubId}/tournaments/${tournamentId}`);
    } catch (error) {
      const message =
        (error as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? '대회 수정 중 오류가 발생했습니다.';
      toast.error(message);
    }
  };

  if (isLoading) {
    return <div className="p-6 text-center text-gray-500">불러오는 중...</div>;
  }
  if (!detail) {
    return (
      <div className="p-6 text-center text-gray-500">대회를 찾을 수 없습니다.</div>
    );
  }

  const { tournament } = detail;
  const defaultValues: TournamentInput = {
    title: tournament.title,
    hostName: tournament.hostName ?? '',
    description: tournament.description ?? '',
    tournamentDate: tournament.tournamentDate ?? '',
    location: tournament.location ?? '',
    applyStartAt: toLocalInputValue(tournament.applyStartAt),
    applyDeadline: toLocalInputValue(tournament.applyDeadline),
    status: tournament.status,
    useTeamName: tournament.useTeamName,
    tshirtSizes: tournament.tshirtSizes,
    bankAccount: tournament.bankAccount ?? '',
    // 비활성 종목은 편집 목록에서 제외한다.
    // 목록에 없으면 서버가 비활성 상태를 유지하므로 기존 신청은 안전하다.
    eventOptions: tournament.eventOptions
      .filter((option) => option.isActive)
      .map((option, index) => ({
        id: option.id,
        eventType: option.eventType,
        ageGroup: option.ageGroup,
        level: option.level,
        playerCount: option.playerCount,
        fee: option.fee,
        order: index,
      })),
  };

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <h1 className="mb-6 text-xl font-bold">대회 수정</h1>
      <TournamentForm
        defaultValues={defaultValues}
        submitLabel="수정 저장"
        isSubmitting={saveTournament.isPending}
        onSubmitForm={onSubmitForm}
      />
    </div>
  );
}

export default EditTournamentPage;
```

- [ ] **Step 5: 타입 체크 및 동작 확인**

Run: `npx tsc --noEmit 2>&1 | grep -iE "new.tsx|edit.tsx|admin/" | head -10`
Expected: 출력 없음

`npm run dev` 후 `/clubs/<클럽ID>/tournaments/new` 에서 확인:
- 종목을 여러 줄 추가하고 참가비를 넣으면 아래에 "30,000원" 이 표시되는가
- 티셔츠 사이즈를 태그로 추가/삭제할 수 있는가
- 저장 후 상세 페이지로 이동하는가
- 수정 페이지에서 기존 값이 채워지는가 (특히 신청 마감 일시)

- [ ] **Step 6: 커밋**

```bash
git add src/components/organisms/tournament/admin/ "src/pages/clubs/[id]/tournaments/new.tsx" "src/pages/clubs/[id]/tournaments/[tournamentId]/edit.tsx"
git commit -m "feat(tournament): 관리자 대회 생성·수정 화면 추가

종목 옵션 표 편집, 티셔츠 사이즈 태그 입력 지원"
```

---

### Task 25: 관리자 신청 현황 화면

**Files:**
- Create: `src/components/organisms/tournament/admin/EntryTable.tsx`
- Create: `src/pages/clubs/[id]/tournaments/[tournamentId]/admin.tsx`

**Interfaces:**
- Consumes: Task 17 `useAdminEntries`/`useUpdatePaymentStatus`, Task 18 표시 유틸
- Produces: `EntryTable`, 관리자 현황 페이지

스펙 §4.5의 두 뷰(신청서 단위 / 종목 단위)를 탭으로 전환한다.

- [ ] **Step 1: EntryTable 구현**

`src/components/organisms/tournament/admin/EntryTable.tsx`:

```tsx
import {
  formatEventLabel,
  formatFee,
  PAYMENT_CLASS,
  PAYMENT_LABEL,
} from '@/lib/tournament/display';
import type { EntryForAdmin, EntryPaymentStatus } from '@/types/tournament.types';

interface EntryTableProps {
  entries: EntryForAdmin[];
  onChangePaymentStatus: (
    entryId: string,
    paymentStatus: EntryPaymentStatus
  ) => void;
}

/** 신청서 단위 뷰 — 통장 대조용 */
function EntryTable({ entries, onChangePaymentStatus }: EntryTableProps) {
  if (entries.length === 0) {
    return (
      <p className="rounded-md bg-gray-50 p-6 text-center text-sm text-gray-500">
        신청 내역이 없습니다.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="py-2">신청자</th>
            <th className="py-2">입금자명</th>
            <th className="py-2">종목</th>
            <th className="py-2 text-right">청구액</th>
            <th className="py-2">입금 상태</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const activeEvents = entry.entryEvents.filter(
              (event) => event.status === 'ACTIVE'
            );

            return (
              <tr key={entry.id} className="border-b align-top last:border-0">
                <td className="py-3">
                  {entry.clubMember?.name ?? '-'}
                  {entry.teamName && (
                    <p className="text-xs text-gray-400">{entry.teamName}</p>
                  )}
                </td>
                <td className="py-3">{entry.depositorName}</td>
                <td className="py-3">
                  {activeEvents.map((event) => (
                    <p key={event.id} className="text-xs">
                      {formatEventLabel(event.eventOption)}
                    </p>
                  ))}
                  {activeEvents.length === 0 && (
                    <span className="text-xs text-gray-400">전체 취소됨</span>
                  )}
                </td>
                <td className="py-3 text-right font-medium">
                  {formatFee(entry.totalFee)}
                </td>
                <td className="py-3">
                  <select
                    value={entry.paymentStatus}
                    onChange={(e) =>
                      onChangePaymentStatus(
                        entry.id,
                        e.target.value as EntryPaymentStatus
                      )
                    }
                    className={`rounded border-none px-2 py-1 text-xs font-medium ${PAYMENT_CLASS[entry.paymentStatus]}`}
                  >
                    {(
                      ['PENDING', 'CONFIRMED', 'CANCELED'] as EntryPaymentStatus[]
                    ).map((status) => (
                      <option key={status} value={status}>
                        {PAYMENT_LABEL[status]}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default EntryTable;
```

- [ ] **Step 2: 관리자 페이지 구현**

`src/pages/clubs/[id]/tournaments/[tournamentId]/admin.tsx`:

```tsx
import { useMemo, useState } from 'react';

import { useRouter } from 'next/router';

import toast from 'react-hot-toast';

import EntryTable from '@/components/organisms/tournament/admin/EntryTable';

import { formatEventLabel, formatFee } from '@/lib/tournament/display';

import {
  useAdminEntries,
  useUpdatePaymentStatus,
} from '@/hooks/useTournamentAdmin';
import { useTournamentDetail } from '@/hooks/useTournamentDetail';
import type { EntryPaymentStatus } from '@/types/tournament.types';

type ViewMode = 'entry' | 'event';

function TournamentAdminPage() {
  const router = useRouter();
  const clubId = router.query.id as string | undefined;
  const tournamentId = router.query.tournamentId as string | undefined;

  const [viewMode, setViewMode] = useState<ViewMode>('entry');
  const [statusFilter, setStatusFilter] = useState<'ALL' | EntryPaymentStatus>(
    'ALL'
  );

  const { data: detail } = useTournamentDetail(clubId, tournamentId);
  const { data: entries, isLoading } = useAdminEntries(clubId, tournamentId);
  const updatePayment = useUpdatePaymentStatus(clubId, tournamentId);

  const filtered = useMemo(
    () =>
      (entries ?? []).filter((entry) =>
        statusFilter === 'ALL' ? true : entry.paymentStatus === statusFilter
      ),
    [entries, statusFilter]
  );

  // 종목별 신청 인원 집계
  const eventGroups = useMemo(() => {
    const groups = new Map<
      string,
      Array<{ name: string; phoneNumber: string; tshirtSize: string | null }>
    >();

    for (const entry of filtered) {
      for (const event of entry.entryEvents) {
        if (event.status !== 'ACTIVE') continue;
        const label = formatEventLabel(event.eventOption);
        const list = groups.get(label) ?? [];
        for (const eventPlayer of event.eventPlayers) {
          list.push({
            name: eventPlayer.entryPlayer.name,
            phoneNumber: eventPlayer.entryPlayer.phoneNumber,
            tshirtSize: eventPlayer.entryPlayer.tshirtSize,
          });
        }
        groups.set(label, list);
      }
    }
    return Array.from(groups.entries());
  }, [filtered]);

  const totalConfirmed = useMemo(
    () =>
      (entries ?? [])
        .filter((entry) => entry.paymentStatus === 'CONFIRMED')
        .reduce((sum, entry) => sum + entry.totalFee, 0),
    [entries]
  );

  const onChangePaymentStatus = async (
    entryId: string,
    paymentStatus: EntryPaymentStatus
  ) => {
    try {
      await updatePayment.mutateAsync({ entryId, paymentStatus });
      toast.success('입금 상태를 변경했습니다.');
    } catch {
      toast.error('입금 상태 변경에 실패했습니다.');
    }
  };

  const onClickDownloadCsv = () => {
    window.location.href = `/api/clubs/${clubId}/tournaments/${tournamentId}/entries/export`;
  };

  if (isLoading) {
    return <div className="p-6 text-center text-gray-500">불러오는 중...</div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">신청 현황</h1>
          <p className="text-sm text-gray-500">{detail?.tournament.title}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() =>
              router.push(`/clubs/${clubId}/tournaments/${tournamentId}/edit`)
            }
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          >
            대회 수정
          </button>
          <button
            type="button"
            onClick={onClickDownloadCsv}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white"
          >
            CSV 다운로드
          </button>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">신청 건수</p>
          <p className="text-lg font-bold">{entries?.length ?? 0}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">입금 확인</p>
          <p className="text-lg font-bold">
            {(entries ?? []).filter((e) => e.paymentStatus === 'CONFIRMED').length}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">수납액</p>
          <p className="text-lg font-bold">{formatFee(totalConfirmed)}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-md border border-gray-200">
          <button
            type="button"
            onClick={() => setViewMode('entry')}
            className={`px-3 py-1.5 text-sm ${viewMode === 'entry' ? 'bg-blue-50 font-medium text-blue-700' : 'text-gray-500'}`}
          >
            신청서 단위
          </button>
          <button
            type="button"
            onClick={() => setViewMode('event')}
            className={`px-3 py-1.5 text-sm ${viewMode === 'event' ? 'bg-blue-50 font-medium text-blue-700' : 'text-gray-500'}`}
          >
            종목 단위
          </button>
        </div>

        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as 'ALL' | EntryPaymentStatus)
          }
          className="rounded-md border-gray-300 text-sm"
        >
          <option value="ALL">전체</option>
          <option value="PENDING">입금대기</option>
          <option value="CONFIRMED">입금확인</option>
          <option value="CANCELED">취소</option>
        </select>
      </div>

      {viewMode === 'entry' ? (
        <EntryTable
          entries={filtered}
          onChangePaymentStatus={onChangePaymentStatus}
        />
      ) : (
        <div className="space-y-4">
          {eventGroups.map(([label, players]) => (
            <section key={label} className="rounded-lg border border-gray-200 p-4">
              <h3 className="mb-2 font-medium">
                {label}{' '}
                <span className="text-sm text-gray-400">{players.length}명</span>
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[360px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="py-1">이름</th>
                      <th className="py-1">연락처</th>
                      <th className="py-1">티셔츠</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map((player, index) => (
                      <tr key={`${player.name}-${index}`} className="border-b last:border-0">
                        <td className="py-1">{player.name}</td>
                        <td className="py-1">{player.phoneNumber}</td>
                        <td className="py-1">{player.tshirtSize ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
          {eventGroups.length === 0 && (
            <p className="rounded-md bg-gray-50 p-6 text-center text-sm text-gray-500">
              신청 내역이 없습니다.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default TournamentAdminPage;
```

- [ ] **Step 3: 타입 체크 및 빌드**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: 기존 대비 새 에러 없음

Run: `npm run build 2>&1 | tail -20`
Expected: 빌드 성공

- [ ] **Step 4: 동작 확인**

`npm run dev` 후 `/clubs/<클럽ID>/tournaments/<대회ID>/admin` 확인:
- 신청서 단위 / 종목 단위 탭 전환이 되는가
- 입금 상태를 바꾸면 수납액 집계가 갱신되는가
- CSV 다운로드 시 엑셀에서 한글이 깨지지 않는가

- [ ] **Step 5: 커밋**

```bash
git add src/components/organisms/tournament/admin/EntryTable.tsx "src/pages/clubs/[id]/tournaments/[tournamentId]/admin.tsx"
git commit -m "feat(tournament): 관리자 신청 현황 화면 추가

신청서 단위·종목 단위 뷰, 입금 상태 변경, CSV 다운로드"
```

---

### Task 26: 직전 대회 복사

**Files:**
- Modify: `src/pages/clubs/[id]/tournaments/new.tsx`
- Modify: `src/hooks/useTournaments.ts`

**Interfaces:**
- Consumes: Task 17 `useTournaments`, Task 24의 `TournamentForm`
- Produces: `/clubs/[id]/tournaments/new?copyFrom=<tournamentId>` 지원

스펙 §6.3이 "우선순위 높음"으로 지정한 기능이다. 시즌마다 종목 구성이 비슷해 임원의 반복 입력을 가장 크게 줄인다. 새 API 없이 기존 상세 조회를 재사용한다.

- [ ] **Step 1: 목록 페이지에 복사 버튼 추가**

`src/pages/clubs/[id]/tournaments/index.tsx` 의 `TournamentCard` 렌더링 부분을 감싸 복사 버튼을 붙인다. 카드 자체가 `button` 이므로 중첩을 피해 카드 **바깥**에 둔다:

```tsx
{tournaments.map((tournament) => (
  <div key={tournament.id} className="space-y-1">
    <TournamentCard
      tournament={tournament}
      onClick={() =>
        router.push(`/clubs/${clubId}/tournaments/${tournament.id}`)
      }
    />
    {isAdmin && (
      <button
        type="button"
        onClick={() =>
          router.push(
            `/clubs/${clubId}/tournaments/new?copyFrom=${tournament.id}`
          )
        }
        className="text-xs text-gray-400 hover:text-blue-600"
      >
        이 대회 복사해서 새로 만들기
      </button>
    )}
  </div>
))}
```

기존 `{tournaments.map(...)}` 블록을 위 코드로 교체한다. `key` 가 `TournamentCard` 에서 감싼 `div` 로 옮겨간 점에 주의한다.

- [ ] **Step 2: 생성 페이지에서 copyFrom 처리**

`src/pages/clubs/[id]/tournaments/new.tsx` 를 아래처럼 수정한다. `useTournamentDetail` 을 조건부로 호출해 원본을 읽고, 종목 구성만 복제한다.

`import` 에 추가:

```tsx
import { useTournamentDetail } from '@/hooks/useTournamentDetail';
```

컴포넌트 본문을 교체한다:

```tsx
function NewTournamentPage() {
  const router = useRouter();
  const clubId = router.query.id as string | undefined;
  const copyFrom = router.query.copyFrom as string | undefined;

  const saveTournament = useSaveTournament(clubId);
  // copyFrom이 없으면 enabled: false라 요청이 나가지 않는다
  const { data: source, isLoading } = useTournamentDetail(clubId, copyFrom);

  const onSubmitForm = async (input: TournamentInput) => {
    try {
      const created = await saveTournament.mutateAsync({
        input,
        tournamentId: null,
      });
      toast.success('대회를 생성했습니다.');
      router.push(`/clubs/${clubId}/tournaments/${created.id}`);
    } catch (error) {
      const message =
        (error as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? '대회 생성 중 오류가 발생했습니다.';
      toast.error(message);
    }
  };

  if (copyFrom && isLoading) {
    return <div className="p-6 text-center text-gray-500">불러오는 중...</div>;
  }

  // 복사: 종목 구성·티셔츠·폼 설정만 가져오고 날짜와 제목은 비운다.
  // id를 제거해야 새 대회의 신규 종목으로 생성된다.
  const defaultValues: TournamentInput = source
    ? {
        ...EMPTY_TOURNAMENT,
        hostName: source.tournament.hostName ?? '',
        location: source.tournament.location ?? '',
        description: source.tournament.description ?? '',
        bankAccount: source.tournament.bankAccount ?? '',
        useTeamName: source.tournament.useTeamName,
        tshirtSizes: source.tournament.tshirtSizes,
        eventOptions: source.tournament.eventOptions
          .filter((option) => option.isActive)
          .map((option, index) => ({
            eventType: option.eventType,
            ageGroup: option.ageGroup,
            level: option.level,
            playerCount: option.playerCount,
            fee: option.fee,
            order: index,
          })),
      }
    : EMPTY_TOURNAMENT;

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <h1 className="mb-2 text-xl font-bold">대회 만들기</h1>
      {source && (
        <p className="mb-6 rounded-md bg-blue-50 p-3 text-sm text-blue-700">
          &lsquo;{source.tournament.title}&rsquo;의 종목 구성을 가져왔습니다.
          대회명과 일정을 새로 입력해주세요.
        </p>
      )}
      <TournamentForm
        // 복사 데이터가 도착한 뒤 폼을 다시 초기화하기 위한 key
        key={source?.tournament.id ?? 'new'}
        defaultValues={defaultValues}
        submitLabel="대회 생성"
        isSubmitting={saveTournament.isPending}
        onSubmitForm={onSubmitForm}
      />
    </div>
  );
}
```

**`key` 가 필요한 이유:** `TournamentForm` 은 `useForm({ defaultValues })` 로 초기값을 한 번만 읽는다. 복사 데이터가 비동기로 도착하면 이미 마운트된 폼은 갱신되지 않는다. `key` 를 바꿔 폼을 재마운트시키는 것이 가장 단순한 해법이다.

- [ ] **Step 3: 타입 체크**

Run: `npx tsc --noEmit 2>&1 | grep -iE "new.tsx|tournaments/index" | head -10`
Expected: 출력 없음

- [ ] **Step 4: 동작 확인**

`npm run dev` 후:
1. 대회를 하나 만들고 종목 3개를 등록한다
2. 목록에서 [이 대회 복사해서 새로 만들기] 클릭
3. 종목 3개와 티셔츠 사이즈가 채워져 있고, **대회명과 마감일은 비어 있는지** 확인
4. 대회명·마감일만 새로 입력해 저장 → 정상 생성되는지 확인
5. 원본 대회의 종목이 그대로 남아 있는지 확인 (복사가 원본을 건드리면 안 됨)

- [ ] **Step 5: 커밋**

```bash
git add "src/pages/clubs/[id]/tournaments/new.tsx" "src/pages/clubs/[id]/tournaments/index.tsx"
git commit -m "feat(tournament): 직전 대회 복사해서 만들기 기능 추가

종목 구성·티셔츠·폼 설정만 복제하고 일정은 비운다."
```

---

### Task 27: 클럽 네비게이션 연결과 최종 검증

**Files:**
- Modify: `src/components/organisms/navigation/clubNavigation/ClubNavigation.tsx`

**Interfaces:**
- Consumes: Task 23의 목록 페이지 경로
- Produces: 클럽 메뉴에서 대회 신청 진입점

- [ ] **Step 1: 네비게이션 구조 확인**

Run:
```bash
grep -n "guest\|board\|href\|label" src/components/organisms/navigation/clubNavigation/ClubNavigation.tsx | head -30
```

기존 메뉴 항목이 어떤 형태로 정의되어 있는지 확인한다 (배열 상수인지, JSX 하드코딩인지).

- [ ] **Step 2: 메뉴 항목 추가**

확인한 형태에 맞춰 "대회 신청" 항목을 추가한다. 배열 상수라면:

```ts
{ label: '대회 신청', href: `/clubs/${clubId}/tournaments` },
```

게시판(`/board`) 항목 바로 다음에 넣는다. 기존 항목의 스타일·아이콘 처리 방식을 그대로 따른다.

- [ ] **Step 3: 전체 테스트 실행**

Run: `npm test`
Expected: PASS — 기존 테스트 포함 전부 통과

기존 테스트가 깨졌다면 Task 19의 `forwardRef` 전환이 원인일 가능성이 높다. `GuestPageStrategy.test.ts` 와 `sms-notification.test.ts` 는 컴포넌트를 쓰지 않으므로 영향이 없어야 한다.

- [ ] **Step 4: 린트와 빌드**

Run: `npm run lint`
Expected: 에러 없음 (경고는 허용)

Run: `npm run build`
Expected: 빌드 성공

- [ ] **Step 5: 전체 시나리오 수동 검증**

`npm run dev` 후 아래 순서로 확인한다.

**관리자로:**
1. 클럽 메뉴 → 대회 신청 → [대회 만들기]
2. 종목 3개(복식 2, 단식 1), 참가비 서로 다르게, 티셔츠 S/M/L, 상태 "모집 열기", 마감일 미래로 설정 → 저장

**회원으로 (다른 계정 또는 같은 계정):**
3. 대회 상세에서 종목·참가비 표 확인
4. [신청하기] → 선수 3명 등록 → 종목 2개 신청(한 명이 두 종목에 중복 참여) → 합계 금액 확인 → 제출
5. 내 신청 확인에서 금액과 종목 확인
6. 종목 1개 취소 → 합계가 줄어드는지 확인

**개인정보 노출 검증 (가장 중요):**
7. 대회 상세 페이지에서 개발자 도구 → Network → `tournaments/<id>` 응답 JSON 확인
8. `participants` 배열에 `name`, `eventType`, `ageGroup`, `level` 만 있고 **`birthDate`·`phoneNumber`·`tshirtSize` 가 없어야 한다**

**관리자로 다시:**
9. 신청 현황에서 선수 명단과 연락처가 보이는지 확인
10. 입금 상태를 "입금확인"으로 변경 → 수납액 집계 확인
11. CSV 다운로드 → 엑셀로 열어 한글이 깨지지 않는지, 취소한 종목이 빠졌는지 확인

- [ ] **Step 6: 커밋**

```bash
git add src/components/organisms/navigation/clubNavigation/ClubNavigation.tsx
git commit -m "feat(tournament): 클럽 네비게이션에 대회 신청 메뉴 추가"
```

---

## 완료 기준

아래가 모두 참이면 이 계획은 완료다.

| 항목 | 확인 방법 |
|---|---|
| 단위 테스트 통과 | `npm test` — fee, status, cancel, validation, serialize, csv, display, clubAuth, schema |
| 빌드 성공 | `npm run build` |
| 관리자가 종목·참가비·티셔츠를 직접 정의해 대회를 만들 수 있다 | Task 27 Step 5의 1~2 |
| 회원이 여러 종목을 한 번에 신청하고 합계가 자동 계산된다 | Task 27 Step 5의 4 |
| 종목 단위 부분 취소가 되고 총액이 재계산된다 | Task 27 Step 5의 6 |
| **회원용 응답에 생년월일·전화번호가 없다** | Task 27 Step 5의 7~8 |
| 관리자만 민감정보와 전체 현황을 본다 | Task 27 Step 5의 9 |
| 입금 상태를 관리하고 CSV로 명단을 뽑을 수 있다 | Task 27 Step 5의 10~11 |
| 직전 대회를 복사해 새 대회를 만들 수 있다 | Task 26 Step 4 |

## 범위에서 제외한 것

스펙에 명시된 대로 이번 구현에 포함하지 않는다.

- 이메일·SMS 알림 (스펙 §2, 6-2 결정)
- 임원의 신청 내용 대리 수정·대리 등록 (사용자가 불필요하다고 확인)
- 온라인 결제·환불 처리
- 개인정보 보관 기간 자동 파기
- 종목 일괄 추가 ("남자복식 × [30대부, 40대부] × [A조, B조]" 조합 생성) — 스펙 §6.3이 "있으면 좋음"으로 분류. 직전 대회 복사(Task 26)가 반복 입력 부담을 대부분 해소하므로 제외
- 종목 명칭 자동완성 (스펙 §6.2) — 직전 대회 복사로 대체. 복사하면 이전 명칭이 그대로 들어오므로 오타 위험이 사라진다
- 대진표, 경기 결과
