# 운동 출석 주차 신청 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 운동 일정별로 제한된 주차 자리를 선착순 신청받고, 정원 초과 시 대기 순번을 부여하며, 승격 시 문자로 알린다.

**Architecture:** 정원을 **정하는 일**(`resolveParkingCapacity`)과 정원에 맞춰 **배정하는 일**(`recalcParkingAssignments`)을 함수 두 개로 분리한다. 배정 함수는 숫자만 받고 평일/주말을 모른다. 신청·취소·정원변경·참여취소 네 경로가 모두 같은 재계산 함수를 호출하므로 승격·강등 분기가 존재하지 않는다.

**Tech Stack:** Next.js 15 (Pages Router), Prisma 6, PostgreSQL(Supabase), Jest, Tailwind CSS, Redux Toolkit

**Spec:** `docs/superpowers/specs/2026-09-12-workout-parking-request-design.md`

## Global Constraints

- **DB 변경은 사용자 승인 후에만 실행한다.** Task 1의 Step 6에서 반드시 멈춘다. `prisma migrate dev`는 절대 쓰지 않는다 (DB 전체 리셋을 요구한다).
- `prisma/schema.prisma`는 자동 생성 파일이다. 직접 고치지 않고 `prisma/schema/*.prisma`를 고친 뒤 `npm run build:schema`를 돌린다.
- **날짜 판정은 반드시 `getUTCDay()`를 쓴다.** 이 레포는 운동 시간을 "벽시계 시각을 UTC 슬롯에 담는" 방식으로 저장한다(`src/lib/workout/datetime.ts` 주석 참고). `getDay()`를 쓰면 서버 타임존에 따라 요일이 틀어진다.
- 커밋 메시지에 `Co-Authored-By: Claude` 트레일러를 넣지 않는다.
- 테스트는 `npm test`로 돌린다 (Jest). 테스트 파일은 대상 파일 옆에 `*.test.ts`로 둔다.
- 기존 코드가 `status`를 `String`으로 쓰므로 `ParkingRequest.status`도 `String`으로 맞춘다.
- 한국어 주석과 한국어 에러 메시지를 쓴다 (기존 코드 관례).

---

## 파일 구조

| 파일 | 책임 | 신규/수정 |
|---|---|---|
| `prisma/schema/clubCustomSetting.prisma` | 클럽 주차 설정 3필드 | 수정 |
| `prisma/schema/workout.prisma` | `Workout.parkingCapacity`, `ParkingRequest` 모델 | 수정 |
| `prisma/schema/club.prisma` | `ClubMember`에 역관계 추가 | 수정 |
| `src/lib/workout/parkingCapacity.ts` | 유효 정원 판정 (순수 함수, DB 무관) | 신규 |
| `src/lib/workout/parkingAssignment.ts` | 배정 재계산 (트랜잭션 클라이언트 사용) | 신규 |
| `src/lib/workout/parkingSms.ts` | 승격 문자 발송 | 신규 |
| `src/pages/api/clubs/[id]/custom/parking.ts` | 클럽 주차 설정 조회/변경 | 신규 |
| `src/pages/api/workouts/[workoutId]/parking.ts` | 주차 신청/취소 | 신규 |
| `src/pages/api/workouts/[workoutId]/parking/capacity.ts` | 그날 정원 변경 | 신규 |
| `src/components/organisms/forms/ParkingSettingsForm.tsx` | 관리자 설정 폼 | 신규 |
| `src/components/organisms/workout/WorkoutParkingSection.tsx` | 운동 상세 주차 명단 | 신규 |
| `src/pages/clubs/[id]/custom/index.tsx` | 주차 탭 추가 | 수정 |
| `src/components/organisms/workout/WorkoutListItem.tsx` | 주차 현황·버튼 | 수정 |
| `src/pages/clubs/[id]/attendance/index.tsx` | 주차 신청 핸들러 | 수정 |
| `src/pages/api/clubs/[id]/workouts.ts` | 응답에 주차 현황 추가 | 수정 |
| `src/pages/api/workouts/[workoutId]/participate.ts` | 참여 취소 시 주차 연동 | 수정 |
| `src/types/parking.types.ts` | 주차 관련 타입 | 신규 |

`parkingCapacity.ts`와 `parkingAssignment.ts`를 나눈 이유는 **테스트 난이도**다. 전자는 DB 없이 순수하게 테스트되고, 후자는 Prisma 목이 필요하다. 한 파일에 두면 순수 로직 테스트까지 목 설정에 묶인다.

---

## Task 1: 스키마 변경과 마이그레이션

**Files:**
- Modify: `prisma/schema/clubCustomSetting.prisma`
- Modify: `prisma/schema/workout.prisma`
- Modify: `prisma/schema/club.prisma`
- Create: `prisma/migrations/<타임스탬프>_add_parking_request/migration.sql`

**Interfaces:**
- Consumes: 없음
- Produces: Prisma 모델 `ParkingRequest`, 필드 `ClubCustomSettings.parkingEnabled` / `parkingWeekdayCapacity` / `parkingWeekendCapacity` / `parkingSmsEnabled`, `Workout.parkingCapacity`

- [ ] **Step 1: `clubCustomSetting.prisma`에 필드 4개 추가**

`smsRecipients` 줄 아래, `createdAt` 위에 넣는다.

```prisma
  // 주차 신청 설정
  parkingEnabled        Boolean  @default(false) // 주차 신청 기능 사용 여부
  parkingWeekdayCapacity Int     @default(0)     // 평일(월~금) 기본 주차 대수
  parkingWeekendCapacity Int     @default(0)     // 주말(토·일) 기본 주차 대수
  parkingSmsEnabled     Boolean  @default(false) // 승격 시 문자 발송 여부
```

- [ ] **Step 2: `workout.prisma`에 필드와 모델 추가**

`Workout` 모델의 `clubId` 아래에 추가:

```prisma
  parkingCapacity     Int?                 // 그날 주차 대수. null이면 클럽 기본값
```

`Workout`의 relations 블록에 추가:

```prisma
  parkingRequests     ParkingRequest[]
```

파일 끝에 모델 추가:

```prisma
// 운동 일정별 주차 신청
model ParkingRequest {
  id            Int       @id @default(autoincrement())
  workoutId     Int
  clubMemberId  Int
  status        String    @default("CONFIRMED") // CONFIRMED | WAITLIST
  position      Int       // 신청 순번(1부터). 승격/강등 판정 기준
  promotedSmsAt DateTime? // 승격 문자 발송 시각. 중복 발송 방지용
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Relations
  workout       Workout    @relation(fields: [workoutId], references: [id], onDelete: Cascade)
  clubMember    ClubMember @relation(fields: [clubMemberId], references: [id])

  @@unique([workoutId, clubMemberId])
  @@index([workoutId, position])
}
```

- [ ] **Step 3: `club.prisma`의 `ClubMember`에 역관계 추가**

`ClubMember` 모델의 relations 블록에 추가한다. Prisma는 양쪽 모두 선언해야 한다.

```prisma
  parkingRequests     ParkingRequest[]
```

- [ ] **Step 4: 통합 스키마 빌드**

Run: `npm run build:schema`
Expected: 에러 없이 종료. `prisma/schema.prisma`가 갱신된다.

- [ ] **Step 5: 변경 내역 확인 (읽기 전용, 안전)**

Run:
```bash
npx prisma migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma --script
```

Expected: `CREATE TABLE "ParkingRequest"`, `ALTER TABLE "Workout" ADD COLUMN "parkingCapacity"`, `ALTER TABLE "ClubCustomSettings" ADD COLUMN ...` 4개가 보인다. **기존 드리프트(`PostCategory`, `PostComment`, `PaymentRecord`의 인덱스·FK)도 함께 출력되므로 그것들은 제외한다.**

- [ ] **Step 6: 마이그레이션 SQL 직접 작성**

diff 출력에서 **이 작업에 해당하는 것만** 골라 `prisma/migrations/<YYYYMMDDHHMMSS>_add_parking_request/migration.sql`에 쓴다. 드리프트 SQL을 섞으면 안 된다.

```sql
-- ClubCustomSettings: 주차 설정 4개
ALTER TABLE "ClubCustomSettings" ADD COLUMN "parkingEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ClubCustomSettings" ADD COLUMN "parkingWeekdayCapacity" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ClubCustomSettings" ADD COLUMN "parkingWeekendCapacity" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ClubCustomSettings" ADD COLUMN "parkingSmsEnabled" BOOLEAN NOT NULL DEFAULT false;

-- Workout: 그날 주차 대수
ALTER TABLE "Workout" ADD COLUMN "parkingCapacity" INTEGER;

-- ParkingRequest 신규 테이블
CREATE TABLE "ParkingRequest" (
    "id" SERIAL NOT NULL,
    "workoutId" INTEGER NOT NULL,
    "clubMemberId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "position" INTEGER NOT NULL,
    "promotedSmsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ParkingRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ParkingRequest_workoutId_clubMemberId_key" ON "ParkingRequest"("workoutId", "clubMemberId");
CREATE INDEX "ParkingRequest_workoutId_position_idx" ON "ParkingRequest"("workoutId", "position");

ALTER TABLE "ParkingRequest" ADD CONSTRAINT "ParkingRequest_workoutId_fkey"
  FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParkingRequest" ADD CONSTRAINT "ParkingRequest_clubMemberId_fkey"
  FOREIGN KEY ("clubMemberId") REFERENCES "ClubMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

- [ ] **Step 7: 🛑 여기서 멈추고 사용자 승인을 받는다**

사용자에게 다음을 설명하고 명시적 승인을 기다린다. **승인 없이 다음 스텝으로 넘어가지 않는다.**

- 실행할 SQL 전문
- 영향 범위: 기존 테이블 2개에 컬럼 추가(기존 행은 기본값으로 채워짐), 신규 테이블 1개 생성. **기존 데이터 삭제·변경 없음**
- 대상이 프로덕션 Supabase라는 점
- 백업 상태 확인 권고

- [ ] **Step 8: 승인 후 마이그레이션 적용**

```bash
npx prisma db execute --file prisma/migrations/<타임스탬프>_add_parking_request/migration.sql --schema prisma/schema.prisma
npx prisma migrate resolve --applied <타임스탬프>_add_parking_request
npx prisma generate
```

- [ ] **Step 9: 타입 생성 확인**

Run: `npx tsc --noEmit`
Expected: `ParkingRequest` 관련 타입 에러 없음. (기존 에러가 있다면 그대로 남아 있어도 된다.)

- [ ] **Step 10: 커밋**

```bash
git add prisma/
git commit -m "feat(parking): 주차 신청 스키마 추가

ParkingRequest 테이블과 클럽/운동별 주차 정원 필드를 추가한다."
```

---

## Task 2: 유효 정원 판정 함수

**Files:**
- Create: `src/lib/workout/parkingCapacity.ts`
- Test: `src/lib/workout/parkingCapacity.test.ts`

**Interfaces:**
- Consumes: Task 1의 스키마 필드
- Produces:
  - `isWeekendWorkout(date: Date | string): boolean`
  - `resolveParkingCapacity(workout: WorkoutCapacityInput, settings: ClubParkingSettings | null): number`
  - `type WorkoutCapacityInput = { date: Date | string; parkingCapacity: number | null }`
  - `type ClubParkingSettings = { parkingWeekdayCapacity: number; parkingWeekendCapacity: number }`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/workout/parkingCapacity.test.ts`:

```ts
import { describe, expect, it } from '@jest/globals';

import { isWeekendWorkout, resolveParkingCapacity } from './parkingCapacity';

// 이 레포는 운동 시간을 UTC 슬롯에 벽시계 값 그대로 담는다.
// 2026-09-16은 수요일, 2026-09-19는 토요일, 2026-09-20은 일요일이다.
const WEDNESDAY = new Date(Date.UTC(2026, 8, 16, 19, 0));
const SATURDAY = new Date(Date.UTC(2026, 8, 19, 10, 0));
const SUNDAY = new Date(Date.UTC(2026, 8, 20, 10, 0));

const settings = {
  parkingWeekdayCapacity: 5,
  parkingWeekendCapacity: 6,
};

describe('isWeekendWorkout', () => {
  it('토요일과 일요일을 주말로 본다', () => {
    expect(isWeekendWorkout(SATURDAY)).toBe(true);
    expect(isWeekendWorkout(SUNDAY)).toBe(true);
  });

  it('평일은 주말이 아니다', () => {
    expect(isWeekendWorkout(WEDNESDAY)).toBe(false);
  });

  it('자정 근처에도 UTC 기준으로 판정한다', () => {
    // KST로 해석하면 토요일이 되는 금요일 23시. UTC 기준이므로 평일이다.
    const fridayLate = new Date(Date.UTC(2026, 8, 18, 23, 0));
    expect(isWeekendWorkout(fridayLate)).toBe(false);
  });
});

describe('resolveParkingCapacity', () => {
  it('평일 운동은 평일 기본값을 쓴다', () => {
    const capacity = resolveParkingCapacity(
      { date: WEDNESDAY, parkingCapacity: null },
      settings
    );
    expect(capacity).toBe(5);
  });

  it('주말 운동은 주말 기본값을 쓴다', () => {
    const capacity = resolveParkingCapacity(
      { date: SATURDAY, parkingCapacity: null },
      settings
    );
    expect(capacity).toBe(6);
  });

  it('그날 지정값이 있으면 요일과 무관하게 그 값이 이긴다', () => {
    const capacity = resolveParkingCapacity(
      { date: SATURDAY, parkingCapacity: 3 },
      settings
    );
    expect(capacity).toBe(3);
  });

  it('그날 지정값이 0이면 기본값으로 넘어가지 않고 0이다', () => {
    const capacity = resolveParkingCapacity(
      { date: WEDNESDAY, parkingCapacity: 0 },
      settings
    );
    expect(capacity).toBe(0);
  });

  it('설정이 없으면 0을 반환한다', () => {
    const capacity = resolveParkingCapacity(
      { date: WEDNESDAY, parkingCapacity: null },
      null
    );
    expect(capacity).toBe(0);
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npm test -- parkingCapacity`
Expected: FAIL. `Cannot find module './parkingCapacity'`

- [ ] **Step 3: 구현 작성**

`src/lib/workout/parkingCapacity.ts`:

```ts
/**
 * 운동 일정의 유효 주차 정원을 구한다.
 *
 * 정원은 세 군데에 흩어져 있다: 그날 지정값, 주말 기본값, 평일 기본값.
 * 어느 값을 쓸지 판정하는 코드는 이 파일에만 존재한다.
 * 나중에 요일별 설정이나 기간 한정 규칙이 필요해지면 이 함수 내부만 바꾸면 되고,
 * 호출하는 쪽(API·화면·배정 로직)은 손대지 않는다.
 */

export type WorkoutCapacityInput = {
  date: Date | string;
  parkingCapacity: number | null;
};

export type ClubParkingSettings = {
  parkingWeekdayCapacity: number;
  parkingWeekendCapacity: number;
};

/**
 * 주말(토·일) 운동인지 판정한다.
 *
 * 이 레포는 운동 시간을 "벽시계 시각을 UTC 슬롯에 그대로 담는" 방식으로 저장한다
 * (src/lib/workout/datetime.ts 참고). 따라서 getDay()가 아니라 getUTCDay()를 써야
 * 서버 타임존과 무관하게 같은 요일이 나온다.
 */
export function isWeekendWorkout(date: Date | string): boolean {
  const day = new Date(date).getUTCDay();
  return day === 0 || day === 6; // 0=일요일, 6=토요일
}

/**
 * 구체적인 쪽이 이긴다: 그날 지정값 > 요일별 기본값.
 *
 * parkingCapacity의 0과 null은 다르다.
 * 0은 "그날은 주차 자리가 없음"을 관리자가 명시한 상태이고,
 * null은 "따로 정하지 않았으니 클럽 기본값을 따름"이다.
 */
export function resolveParkingCapacity(
  workout: WorkoutCapacityInput,
  settings: ClubParkingSettings | null
): number {
  if (workout.parkingCapacity !== null) {
    return workout.parkingCapacity;
  }
  if (!settings) {
    return 0;
  }
  return isWeekendWorkout(workout.date)
    ? settings.parkingWeekendCapacity
    : settings.parkingWeekdayCapacity;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- parkingCapacity`
Expected: PASS, 8개 테스트 모두 통과

- [ ] **Step 5: 커밋**

```bash
git add src/lib/workout/parkingCapacity.ts src/lib/workout/parkingCapacity.test.ts
git commit -m "feat(parking): 유효 주차 정원 판정 함수 추가

그날 지정값과 평일/주말 기본값 중 무엇을 쓸지 판정하는 로직을
함수 하나로 고정한다. 향후 규칙이 복잡해져도 호출부는 바뀌지 않는다."
```

---

## Task 3: 배정 재계산 함수

**Files:**
- Create: `src/lib/workout/parkingAssignment.ts`
- Test: `src/lib/workout/parkingAssignment.test.ts`

**Interfaces:**
- Consumes: Task 1의 `ParkingRequest` 모델
- Produces:
  - `PARKING_STATUS = { CONFIRMED: 'CONFIRMED', WAITLIST: 'WAITLIST' } as const`
  - `assignParkingSlots(requests: ParkingRow[], capacity: number): AssignmentResult`
  - `recalcParkingAssignments(tx: ParkingTxClient, workoutId: number, capacity: number): Promise<number[]>` — 승격된 `clubMemberId` 배열을 반환
  - `type ParkingRow = { id: number; clubMemberId: number; status: string; position: number }`

**설계 메모:** 순수 계산(`assignParkingSlots`)과 DB 쓰기(`recalcParkingAssignments`)를 나눈다. 전자는 목 없이 테스트되고, 후자는 전자를 호출해 결과만 DB에 반영한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/workout/parkingAssignment.test.ts`:

```ts
import { describe, expect, it } from '@jest/globals';

import { assignParkingSlots, PARKING_STATUS } from './parkingAssignment';

const row = (
  id: number,
  clubMemberId: number,
  status: string,
  position: number
) => ({ id, clubMemberId, status, position });

describe('assignParkingSlots', () => {
  it('정원 안의 신청은 확정으로 배정한다', () => {
    const result = assignParkingSlots(
      [
        row(1, 101, PARKING_STATUS.CONFIRMED, 1),
        row(2, 102, PARKING_STATUS.CONFIRMED, 2),
      ],
      5
    );

    expect(result.updates).toEqual([]);
    expect(result.promotedClubMemberIds).toEqual([]);
  });

  it('정원을 넘는 신청은 대기로 배정한다', () => {
    const result = assignParkingSlots(
      [
        row(1, 101, PARKING_STATUS.CONFIRMED, 1),
        row(2, 102, PARKING_STATUS.CONFIRMED, 2),
        row(3, 103, PARKING_STATUS.CONFIRMED, 3),
      ],
      2
    );

    expect(result.updates).toEqual([
      { id: 3, status: PARKING_STATUS.WAITLIST, clearPromotedSms: true },
    ]);
    expect(result.promotedClubMemberIds).toEqual([]);
  });

  it('앞사람이 빠지면 첫 대기자를 승격시킨다', () => {
    // position 1이 취소되어 목록에서 빠진 상태
    const result = assignParkingSlots(
      [
        row(2, 102, PARKING_STATUS.CONFIRMED, 2),
        row(3, 103, PARKING_STATUS.WAITLIST, 3),
      ],
      2
    );

    expect(result.updates).toEqual([
      { id: 3, status: PARKING_STATUS.CONFIRMED, clearPromotedSms: false },
    ]);
    expect(result.promotedClubMemberIds).toEqual([103]);
  });

  it('대기자만 빠지면 아무도 승격되지 않는다', () => {
    const result = assignParkingSlots(
      [
        row(1, 101, PARKING_STATUS.CONFIRMED, 1),
        row(2, 102, PARKING_STATUS.CONFIRMED, 2),
      ],
      2
    );

    expect(result.updates).toEqual([]);
    expect(result.promotedClubMemberIds).toEqual([]);
  });

  it('정원을 줄이면 뒷순번 확정자를 대기로 강등한다', () => {
    const result = assignParkingSlots(
      [
        row(1, 101, PARKING_STATUS.CONFIRMED, 1),
        row(2, 102, PARKING_STATUS.CONFIRMED, 2),
        row(3, 103, PARKING_STATUS.CONFIRMED, 3),
      ],
      2
    );

    expect(result.updates).toEqual([
      { id: 3, status: PARKING_STATUS.WAITLIST, clearPromotedSms: true },
    ]);
    expect(result.promotedClubMemberIds).toEqual([]);
  });

  it('정원을 늘리면 대기자를 순번대로 승격한다', () => {
    const result = assignParkingSlots(
      [
        row(1, 101, PARKING_STATUS.CONFIRMED, 1),
        row(2, 102, PARKING_STATUS.WAITLIST, 2),
        row(3, 103, PARKING_STATUS.WAITLIST, 3),
      ],
      3
    );

    expect(result.updates).toEqual([
      { id: 2, status: PARKING_STATUS.CONFIRMED, clearPromotedSms: false },
      { id: 3, status: PARKING_STATUS.CONFIRMED, clearPromotedSms: false },
    ]);
    expect(result.promotedClubMemberIds).toEqual([102, 103]);
  });

  it('정원이 0이면 모든 신청이 대기가 된다', () => {
    const result = assignParkingSlots(
      [row(1, 101, PARKING_STATUS.CONFIRMED, 1)],
      0
    );

    expect(result.updates).toEqual([
      { id: 1, status: PARKING_STATUS.WAITLIST, clearPromotedSms: true },
    ]);
    expect(result.promotedClubMemberIds).toEqual([]);
  });

  it('순번이 뒤섞여 들어와도 순번 오름차순으로 배정한다', () => {
    const result = assignParkingSlots(
      [
        row(3, 103, PARKING_STATUS.WAITLIST, 3),
        row(1, 101, PARKING_STATUS.CONFIRMED, 1),
        row(2, 102, PARKING_STATUS.WAITLIST, 2),
      ],
      2
    );

    expect(result.updates).toEqual([
      { id: 2, status: PARKING_STATUS.CONFIRMED, clearPromotedSms: false },
    ]);
    expect(result.promotedClubMemberIds).toEqual([102]);
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npm test -- parkingAssignment`
Expected: FAIL. `Cannot find module './parkingAssignment'`

- [ ] **Step 3: 구현 작성**

`src/lib/workout/parkingAssignment.ts`:

```ts
import type { Prisma } from '@prisma/client';

/**
 * 주차 신청 배정 로직.
 *
 * 신청·취소·정원변경·참여취소 네 경로가 모두 이 재계산 함수를 호출한다.
 * 승격과 강등을 개별 규칙으로 나누지 않고 전체 재계산 한 가지로 통일하면
 * 네 경우가 같은 코드로 처리되어 분기가 사라진다.
 */

export const PARKING_STATUS = {
  CONFIRMED: 'CONFIRMED',
  WAITLIST: 'WAITLIST',
} as const;

export type ParkingRow = {
  id: number;
  clubMemberId: number;
  status: string;
  position: number;
};

export type ParkingUpdate = {
  id: number;
  status: string;
  /** 확정 → 대기로 강등될 때 승격 문자 기록을 지워, 재승격 시 다시 보낼 수 있게 한다 */
  clearPromotedSms: boolean;
};

export type AssignmentResult = {
  /** 상태가 실제로 바뀌는 건만 담긴다 */
  updates: ParkingUpdate[];
  /** 대기 → 확정으로 올라간 회원. 문자 발송 대상 */
  promotedClubMemberIds: number[];
};

/**
 * 순번 오름차순으로 앞에서 capacity개를 확정, 나머지를 대기로 배정한다.
 * DB를 모르는 순수 함수라 목 없이 테스트된다.
 */
export function assignParkingSlots(
  requests: ParkingRow[],
  capacity: number
): AssignmentResult {
  const ordered = [...requests].sort((a, b) => a.position - b.position);

  const updates: ParkingUpdate[] = [];
  const promotedClubMemberIds: number[] = [];

  ordered.forEach((request, index) => {
    const nextStatus =
      index < capacity ? PARKING_STATUS.CONFIRMED : PARKING_STATUS.WAITLIST;

    if (request.status === nextStatus) return;

    const isPromotion = nextStatus === PARKING_STATUS.CONFIRMED;
    updates.push({
      id: request.id,
      status: nextStatus,
      clearPromotedSms: !isPromotion,
    });

    if (isPromotion) {
      promotedClubMemberIds.push(request.clubMemberId);
    }
  });

  return { updates, promotedClubMemberIds };
}

/** 트랜잭션 클라이언트 또는 일반 PrismaClient 모두 받을 수 있는 타입 */
export type ParkingTxClient = Omit<
  Prisma.TransactionClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * 해당 운동의 주차 배정을 다시 계산해 DB에 반영한다.
 * 반환값은 대기 → 확정으로 승격된 clubMemberId 목록이며,
 * 문자 발송은 호출하는 쪽이 트랜잭션 밖에서 담당한다.
 */
export async function recalcParkingAssignments(
  tx: ParkingTxClient,
  workoutId: number,
  capacity: number
): Promise<number[]> {
  const requests = await tx.parkingRequest.findMany({
    where: { workoutId },
    select: { id: true, clubMemberId: true, status: true, position: true },
    orderBy: { position: 'asc' },
  });

  const { updates, promotedClubMemberIds } = assignParkingSlots(
    requests,
    capacity
  );

  for (const update of updates) {
    await tx.parkingRequest.update({
      where: { id: update.id },
      data: {
        status: update.status,
        ...(update.clearPromotedSms ? { promotedSmsAt: null } : {}),
      },
    });
  }

  return promotedClubMemberIds;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- parkingAssignment`
Expected: PASS, 8개 테스트 모두 통과

- [ ] **Step 5: 타입 확인**

Run: `npx tsc --noEmit`
Expected: 이 파일 관련 에러 없음

- [ ] **Step 6: 커밋**

```bash
git add src/lib/workout/parkingAssignment.ts src/lib/workout/parkingAssignment.test.ts
git commit -m "feat(parking): 주차 배정 재계산 함수 추가

순번 오름차순으로 정원만큼 확정, 나머지를 대기로 배정한다.
순수 계산과 DB 반영을 나눠 목 없이 테스트한다."
```

---

## Task 4: 클럽 주차 설정 API

**Files:**
- Create: `src/pages/api/clubs/[id]/custom/parking.ts`
- Create: `src/types/parking.types.ts`

**Interfaces:**
- Consumes: Task 1의 `ClubCustomSettings` 필드
- Produces:
  - `GET /api/clubs/[id]/custom/parking` → `ClubParkingSettingsResponse`
  - `PUT /api/clubs/[id]/custom/parking` (관리자 전용)
  - `type ClubParkingSettingsResponse = { parkingEnabled: boolean; parkingWeekdayCapacity: number; parkingWeekendCapacity: number; parkingSmsEnabled: boolean }`

- [ ] **Step 1: 타입 파일 작성**

`src/types/parking.types.ts`:

```ts
/** 클럽 단위 주차 설정 */
export interface ClubParkingSettingsResponse {
  parkingEnabled: boolean;
  parkingWeekdayCapacity: number;
  parkingWeekendCapacity: number;
  parkingSmsEnabled: boolean;
}

/** 운동 카드·상세에 내려주는 주차 현황 */
export interface WorkoutParkingStatus {
  /** 클럽 설정이 꺼져 있으면 false. 이때 화면에 주차 영역을 그리지 않는다 */
  enabled: boolean;
  /** 이 운동에 적용되는 유효 정원 */
  capacity: number;
  /** 확정 인원 수 */
  confirmedCount: number;
  /** 대기 인원 수 */
  waitlistCount: number;
  /** 이 운동에 그날 지정값이 있는지. null이면 클럽 기본값을 따르는 중 */
  overrideCapacity: number | null;
  /** 로그인한 회원 본인의 상태 */
  myStatus: 'NONE' | 'CONFIRMED' | 'WAITLIST';
  /** 본인이 대기 중일 때 몇 번째인지. 대기가 아니면 null */
  myWaitlistOrder: number | null;
}

/** 관리자 명단에 쓰는 한 줄 */
export interface ParkingRequestListItem {
  id: number;
  clubMemberId: number;
  name: string;
  status: 'CONFIRMED' | 'WAITLIST';
  position: number;
}
```

- [ ] **Step 2: API 작성**

기존 `src/pages/api/clubs/[id]/custom/home.ts` 패턴을 따르되, PUT에는 관리자 권한 확인을 넣는다.

`src/pages/api/clubs/[id]/custom/parking.ts`:

```ts
import { ClubAuthError, requireClubAdmin } from '@/lib/clubAuth';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';

import type { NextApiRequest, NextApiResponse } from 'next';

const PARKING_FIELDS = {
  parkingEnabled: true,
  parkingWeekdayCapacity: true,
  parkingWeekendCapacity: true,
  parkingSmsEnabled: true,
} as const;

const DEFAULT_SETTINGS = {
  parkingEnabled: false,
  parkingWeekdayCapacity: 0,
  parkingWeekendCapacity: 0,
  parkingSmsEnabled: false,
};

/** 음수나 소수가 들어오지 않도록 정수로 다듬는다 */
function toCapacity(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
}

export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse
) {
  const clubId = Number(req.query.id);
  if (!Number.isInteger(clubId)) {
    return res.status(400).json({ error: '잘못된 클럽 ID입니다' });
  }

  if (req.method === 'GET') {
    try {
      const settings = await prisma.clubCustomSettings.findUnique({
        where: { clubId },
        select: PARKING_FIELDS,
      });
      return res.status(200).json(settings ?? DEFAULT_SETTINGS);
    } catch (error) {
      console.error('주차 설정 조회 중 오류 발생:', error);
      return res.status(500).json({ error: '주차 설정을 불러오지 못했습니다' });
    }
  }

  if (req.method === 'PUT') {
    try {
      await requireClubAdmin(req.user.id, clubId);

      const data = {
        parkingEnabled: Boolean(req.body.parkingEnabled),
        parkingWeekdayCapacity: toCapacity(req.body.parkingWeekdayCapacity),
        parkingWeekendCapacity: toCapacity(req.body.parkingWeekendCapacity),
        parkingSmsEnabled: Boolean(req.body.parkingSmsEnabled),
      };

      const settings = await prisma.clubCustomSettings.upsert({
        where: { clubId },
        update: data,
        create: { clubId, ...data },
        select: PARKING_FIELDS,
      });

      return res.status(200).json(settings);
    } catch (error) {
      if (error instanceof ClubAuthError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error('주차 설정 변경 중 오류 발생:', error);
      return res.status(500).json({ error: '주차 설정을 저장하지 못했습니다' });
    }
  }

  res.setHeader('Allow', ['GET', 'PUT']);
  return res.status(405).json({ error: '허용되지 않는 메소드입니다' });
});
```

- [ ] **Step 3: 타입 확인**

Run: `npx tsc --noEmit`
Expected: 이 파일 관련 에러 없음

`ClubAuthError`는 `status: number` 속성을 가진다(`src/lib/clubAuth.ts:10-18`). 위 코드의 `error.status` 사용이 맞다.

- [ ] **Step 4: 커밋**

```bash
git add src/pages/api/clubs/\[id\]/custom/parking.ts src/types/parking.types.ts
git commit -m "feat(parking): 클럽 주차 설정 API 추가

기능 on/off, 평일·주말 기본 대수, 문자 발송 여부를 관리한다.
변경은 관리자만 가능하다."
```

---

## Task 5: 관리자 주차 설정 화면

**Files:**
- Create: `src/components/organisms/forms/ParkingSettingsForm.tsx`
- Modify: `src/pages/clubs/[id]/custom/index.tsx`

**Interfaces:**
- Consumes: Task 4의 `GET`/`PUT /api/clubs/[id]/custom/parking`, `ClubParkingSettingsResponse`
- Produces: `parking` 탭

- [ ] **Step 1: 폼 컴포넌트 작성**

기존 폼(`EmailSettingsForm` 등)의 구조를 먼저 읽고 클래스명·버튼 배치를 맞춘다.

`src/components/organisms/forms/ParkingSettingsForm.tsx`:

```tsx
import { useEffect, useState } from 'react';

import { ClubParkingSettingsResponse } from '@/types/parking.types';

interface ParkingSettingsFormProps {
  settings: ClubParkingSettingsResponse | null;
  onSubmit: (values: ClubParkingSettingsResponse) => Promise<void>;
}

const EMPTY: ClubParkingSettingsResponse = {
  parkingEnabled: false,
  parkingWeekdayCapacity: 0,
  parkingWeekendCapacity: 0,
  parkingSmsEnabled: false,
};

export default function ParkingSettingsForm({
  settings,
  onSubmit,
}: ParkingSettingsFormProps) {
  const [values, setValues] = useState<ClubParkingSettingsResponse>(
    settings ?? EMPTY
  );
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (settings) setValues(settings);
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    setMessage(null);
    try {
      await onSubmit(values);
      setMessage('저장했습니다.');
    } catch {
      setMessage('저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={values.parkingEnabled}
          onChange={(e) =>
            setValues((prev) => ({ ...prev, parkingEnabled: e.target.checked }))
          }
          className="h-5 w-5"
        />
        <span className="text-sm font-medium text-gray-800">
          주차 신청 기능 사용
        </span>
      </label>

      <div>
        <label className={labelClass} htmlFor="parking-weekday">
          평일 기본 주차 대수
        </label>
        <input
          id="parking-weekday"
          type="number"
          min={0}
          disabled={!values.parkingEnabled}
          value={values.parkingWeekdayCapacity}
          onChange={(e) =>
            setValues((prev) => ({
              ...prev,
              parkingWeekdayCapacity: Number(e.target.value),
            }))
          }
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="parking-weekend">
          주말 기본 주차 대수
        </label>
        <input
          id="parking-weekend"
          type="number"
          min={0}
          disabled={!values.parkingEnabled}
          value={values.parkingWeekendCapacity}
          onChange={(e) =>
            setValues((prev) => ({
              ...prev,
              parkingWeekendCapacity: Number(e.target.value),
            }))
          }
          className={inputClass}
        />
      </div>

      <p className="text-xs text-gray-500">
        운동 일정별로 대수를 따로 정하지 않으면 위 기본값이 적용됩니다.
      </p>

      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          disabled={!values.parkingEnabled}
          checked={values.parkingSmsEnabled}
          onChange={(e) =>
            setValues((prev) => ({
              ...prev,
              parkingSmsEnabled: e.target.checked,
            }))
          }
          className="h-5 w-5 mt-0.5"
        />
        <span>
          <span className="block text-sm font-medium text-gray-800">
            대기 → 확정 승격 시 문자 발송
          </span>
          <span className="block text-xs text-gray-500 mt-0.5">
            문자는 건당 비용이 발생합니다.
          </span>
        </span>
      </label>

      {message && <p className="text-sm text-gray-600">{message}</p>}

      <button
        type="submit"
        disabled={isSaving}
        className="w-full py-2 px-4 rounded-lg bg-blue-500 hover:bg-blue-600 text-white disabled:bg-gray-400"
      >
        {isSaving ? '저장 중...' : '저장'}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: 설정 페이지에 탭 추가**

`src/pages/clubs/[id]/custom/index.tsx`를 수정한다.

1. import 추가:
```tsx
import ParkingSettingsForm from '@/components/organisms/forms/ParkingSettingsForm';
import { ClubParkingSettingsResponse } from '@/types/parking.types';
```

2. `customSettings` 배열에 항목 추가 (`workout-schedule` 뒤):
```tsx
  {
    id: 'parking',
    name: '주차 신청',
    description: '주차 신청 기능 사용 여부와 기본 주차 대수를 설정합니다.',
  },
```

3. state 추가 (다른 `useState` 옆):
```tsx
  const [parkingSettings, setParkingSettings] =
    useState<ClubParkingSettingsResponse | null>(null);
```

4. 조회 effect 추가 (다른 effect들과 같은 패턴):
```tsx
  // 주차 설정 불러오기
  useEffect(() => {
    if (clubId && selectedSetting === 'parking') {
      axios
        .get(`/api/clubs/${clubId}/custom/parking`)
        .then(({ data }) => setParkingSettings(data))
        .catch((error) =>
          console.error('Error fetching parking settings:', error)
        );
    }
  }, [clubId, selectedSetting]);
```

5. 렌더 분기 추가 (다른 폼들이 렌더되는 곳과 같은 위치):
```tsx
        {selectedSetting === 'parking' && (
          <ParkingSettingsForm
            settings={parkingSettings}
            onSubmit={async (values) => {
              const { data } = await axios.put(
                `/api/clubs/${clubId}/custom/parking`,
                values
              );
              setParkingSettings(data);
            }}
          />
        )}
```

기존 파일의 렌더 구조를 먼저 읽고, 다른 폼들이 어떤 래퍼 안에 들어가는지 확인해 똑같이 맞춘다.

- [ ] **Step 3: 타입·린트 확인**

Run: `npx tsc --noEmit && npm run lint`
Expected: 이 파일들 관련 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add src/components/organisms/forms/ParkingSettingsForm.tsx "src/pages/clubs/[id]/custom/index.tsx"
git commit -m "feat(parking): 관리자 주차 설정 화면 추가

기능 사용 여부가 꺼져 있으면 나머지 입력을 비활성화하고,
문자 발송에는 비용 안내를 함께 보여준다."
```

---

## Task 6: 주차 신청/취소 API

**Files:**
- Create: `src/pages/api/workouts/[workoutId]/parking.ts`

**Interfaces:**
- Consumes: Task 2의 `resolveParkingCapacity`, Task 3의 `recalcParkingAssignments`, `PARKING_STATUS`
- Produces:
  - `POST /api/workouts/[workoutId]/parking` body `{ clubId: number }` → `{ status: 'CONFIRMED' | 'WAITLIST' }`
  - `DELETE /api/workouts/[workoutId]/parking` body `{ clubId: number }` → `{ status: 'cancelled' }`

**설계 메모:** 문자 발송은 Task 8에서 붙인다. 이 태스크에서는 `recalcParkingAssignments`의 반환값을 받아두기만 한다.

- [ ] **Step 1: API 작성**

`src/pages/api/workouts/[workoutId]/parking.ts`:

```ts
import { ClubAuthError, requireClubMember } from '@/lib/clubAuth';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import {
  PARKING_STATUS,
  recalcParkingAssignments,
} from '@/lib/workout/parkingAssignment';
import { resolveParkingCapacity } from '@/lib/workout/parkingCapacity';

import type { NextApiRequest, NextApiResponse } from 'next';

export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse
) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    res.setHeader('Allow', ['POST', 'DELETE']);
    return res.status(405).json({ error: '허용되지 않는 메소드입니다' });
  }

  const workoutId = Number(req.query.workoutId);
  const clubId = Number(req.body?.clubId);

  if (!Number.isInteger(workoutId) || !Number.isInteger(clubId)) {
    return res.status(400).json({ error: '잘못된 요청입니다' });
  }

  try {
    const member = await requireClubMember(req.user.id, clubId);

    const [workout, settings] = await Promise.all([
      prisma.workout.findUnique({
        where: { id: workoutId },
        select: { id: true, clubId: true, date: true, parkingCapacity: true },
      }),
      prisma.clubCustomSettings.findUnique({
        where: { clubId },
        select: {
          parkingEnabled: true,
          parkingWeekdayCapacity: true,
          parkingWeekendCapacity: true,
        },
      }),
    ]);

    if (!workout || workout.clubId !== clubId) {
      return res.status(404).json({ error: '운동 일정을 찾을 수 없습니다' });
    }

    if (!settings?.parkingEnabled) {
      return res
        .status(400)
        .json({ error: '이 클럽은 주차 신청을 사용하지 않습니다' });
    }

    const capacity = resolveParkingCapacity(workout, settings);

    if (req.method === 'POST') {
      // 주차 신청은 운동 참여를 전제로 한다.
      // 참여하지 않는 사람이 자리를 잡아두는 것을 막는다.
      const participant = await prisma.workoutParticipant.findUnique({
        where: {
          workoutId_userId: { workoutId, userId: req.user.id },
        },
        select: { id: true },
      });

      if (!participant) {
        return res
          .status(400)
          .json({ error: '운동에 먼저 참여해야 주차를 신청할 수 있습니다' });
      }

      const status = await prisma.$transaction(async (tx) => {
        const last = await tx.parkingRequest.findFirst({
          where: { workoutId },
          orderBy: { position: 'desc' },
          select: { position: true },
        });

        const created = await tx.parkingRequest.create({
          data: {
            workoutId,
            clubMemberId: member.id,
            position: (last?.position ?? 0) + 1,
            status: PARKING_STATUS.CONFIRMED,
          },
          select: { id: true },
        });

        await recalcParkingAssignments(tx, workoutId, capacity);

        const saved = await tx.parkingRequest.findUnique({
          where: { id: created.id },
          select: { status: true },
        });
        return saved?.status ?? PARKING_STATUS.WAITLIST;
      });

      return res.status(200).json({
        status,
        message:
          status === PARKING_STATUS.CONFIRMED
            ? '주차가 확정되었습니다'
            : '주차 대기 명단에 등록되었습니다',
      });
    }

    // DELETE
    await prisma.$transaction(async (tx) => {
      await tx.parkingRequest.deleteMany({
        where: { workoutId, clubMemberId: member.id },
      });
      await recalcParkingAssignments(tx, workoutId, capacity);
    });

    return res
      .status(200)
      .json({ status: 'cancelled', message: '주차 신청을 취소했습니다' });
  } catch (error) {
    if (error instanceof ClubAuthError) {
      return res.status(error.status).json({ error: error.message });
    }
    // 중복 신청(unique 제약 위반)
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return res.status(409).json({ error: '이미 주차를 신청했습니다' });
    }
    console.error('주차 신청/취소 중 오류 발생:', error);
    return res.status(500).json({ error: '처리 중 오류가 발생했습니다' });
  }
});
```

- [ ] **Step 2: 타입 확인**

Run: `npx tsc --noEmit`
Expected: 이 파일 관련 에러 없음

`requireClubMember`는 `ClubMemberContext = { id, role, status, name }`를 반환한다(`src/lib/clubAuth.ts:3-8`). 위 코드의 `member.id` 사용이 맞다.

- [ ] **Step 3: 커밋**

```bash
git add "src/pages/api/workouts/[workoutId]/parking.ts"
git commit -m "feat(parking): 주차 신청/취소 API 추가

운동 참여를 전제로 선착순 신청을 받고, 정원을 넘으면 대기로 배정한다.
신청과 취소 모두 트랜잭션 안에서 전체 재계산을 거친다."
```

---

## Task 7: 운동 목록 API에 주차 현황 추가

**Files:**
- Modify: `src/pages/api/clubs/[id]/workouts.ts`

**Interfaces:**
- Consumes: Task 2의 `resolveParkingCapacity`, Task 4의 `WorkoutParkingStatus`
- Produces: 목록 응답의 각 운동에 `parking: WorkoutParkingStatus` 필드

- [ ] **Step 1: 로그인 사용자를 옵션으로 얻는다**

이 API는 인증 없이 동작한다. 비로그인 사용자도 목록을 봐야 하므로 `withAuth`로 감싸면 안 된다.

`src/lib/session.ts`의 `getAuthUser(req)`는 로그인하지 않았으면 `null`을 반환하므로 그대로 쓸 수 있다. 시그니처는 `(req) => Promise<{ id: number } | null>`이다.

핸들러 상단에 추가:

```ts
    const authUser = await getAuthUser(req);
    const myClubMember = authUser
      ? await prisma.clubMember.findUnique({
          where: {
            clubId_userId: { clubId: clubIdNum, userId: authUser.id },
          },
          select: { id: true },
        })
      : null;
```

import 추가:
```ts
import { getAuthUser } from '@/lib/session';
```

`clubIdNum`은 기존 코드에 이미 선언되어 있다. 이 블록은 그 아래에 둔다.

- [ ] **Step 2: 클럽 주차 설정을 한 번만 조회한다**

`const clubIdNum = Number(id);` 아래에 추가:

```ts
    const parkingSettings = await prisma.clubCustomSettings.findUnique({
      where: { clubId: clubIdNum },
      select: {
        parkingEnabled: true,
        parkingWeekdayCapacity: true,
        parkingWeekendCapacity: true,
      },
    });
```

- [ ] **Step 3: 주차 신청을 N+1 없이 한 번에 조회한다**

게스트 조회가 N+1을 피하는 것과 같은 방식으로, 운동 ID 목록으로 한 번에 가져온다.

```ts
    const workoutIds = workouts.map((w) => w.id);
    const parkingRequests =
      !parkingSettings?.parkingEnabled || workoutIds.length === 0
        ? []
        : await prisma.parkingRequest.findMany({
            where: { workoutId: { in: workoutIds } },
            select: {
              workoutId: true,
              clubMemberId: true,
              status: true,
              position: true,
            },
            orderBy: { position: 'asc' },
          });

    const parkingByWorkoutId = parkingRequests.reduce<
      Record<number, typeof parkingRequests>
    >((acc, request) => {
      if (!acc[request.workoutId]) acc[request.workoutId] = [];
      acc[request.workoutId].push(request);
      return acc;
    }, {});
```

- [ ] **Step 4: 각 운동에 주차 현황을 붙인다**

`workoutsWithGuests`를 만드는 `map` 안에서 계산해 반환 객체에 넣는다.

```ts
      const requests = parkingByWorkoutId[workout.id] ?? [];
      const confirmed = requests.filter((r) => r.status === 'CONFIRMED');
      const waitlist = requests.filter((r) => r.status === 'WAITLIST');

      const myConfirmedIndex = myClubMember
        ? confirmed.findIndex((r) => r.clubMemberId === myClubMember.id)
        : -1;
      const myWaitlistIndex = myClubMember
        ? waitlist.findIndex((r) => r.clubMemberId === myClubMember.id)
        : -1;

      const parking = {
        enabled: Boolean(parkingSettings?.parkingEnabled),
        capacity: parkingSettings
          ? resolveParkingCapacity(workout, parkingSettings)
          : 0,
        confirmedCount: confirmed.length,
        waitlistCount: waitlist.length,
        overrideCapacity: workout.parkingCapacity,
        myStatus:
          myConfirmedIndex >= 0
            ? ('CONFIRMED' as const)
            : myWaitlistIndex >= 0
              ? ('WAITLIST' as const)
              : ('NONE' as const),
        myWaitlistOrder: myWaitlistIndex >= 0 ? myWaitlistIndex + 1 : null,
      };
```

기존 `prisma.workout.findMany`는 `select` 없이 `include`만 쓰므로 `parkingCapacity`가 자동으로 포함된다. 별도 수정이 필요 없다.

- [ ] **Step 5: import 추가**

```ts
import { resolveParkingCapacity } from '@/lib/workout/parkingCapacity';
```

- [ ] **Step 6: 타입 확인과 동작 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음

Run: `npm run dev` 후 브라우저에서 `/api/clubs/<클럽ID>/workouts` 호출
Expected: 각 운동에 `parking` 객체가 포함되고, 주차 기능이 꺼진 클럽은 `enabled: false`

- [ ] **Step 7: 커밋**

```bash
git add "src/pages/api/clubs/[id]/workouts.ts"
git commit -m "feat(parking): 운동 목록 응답에 주차 현황 추가

주차 신청을 운동 ID 묶음으로 한 번에 조회해 N+1을 피한다."
```

---

## Task 8: 승격 SMS 발송

**Files:**
- Create: `src/lib/workout/parkingSms.ts`
- Test: `src/lib/workout/parkingSms.test.ts`
- Modify: `src/pages/api/workouts/[workoutId]/parking.ts`

**Interfaces:**
- Consumes: `sendSMS(to: string, content: string)` from `src/lib/sms.ts`, Task 3의 승격 목록
- Produces: `notifyParkingPromotion(params: NotifyParams): Promise<void>`
  - `type NotifyParams = { clubMemberIds: number[]; workoutId: number; smsEnabled: boolean }`

**설계 메모:** 기존 `SmsNotificationLog`는 `guestPostId`가 필수이고 `GuestPost`에 FK로 묶여 있어 재사용할 수 없다. 중복 발송 방지는 `ParkingRequest.promotedSmsAt`으로 한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/workout/parkingSms.test.ts`:

```ts
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
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npm test -- parkingSms`
Expected: FAIL. `Cannot find module './parkingSms'`

- [ ] **Step 3: 구현 작성**

`src/lib/workout/parkingSms.ts`:

```ts
import { prisma } from '@/lib/prisma';
import { sendSMS } from '@/lib/sms';

/**
 * 주차 대기 → 확정 승격 문자.
 *
 * 기존 SmsNotificationLog는 guestPostId가 필수라 재사용할 수 없어,
 * 중복 발송 방지는 ParkingRequest.promotedSmsAt으로 한다.
 * 승격 후 강등됐다가 다시 승격되면 문자가 다시 나가는 것이 정상이며,
 * 강등 시 promotedSmsAt이 null로 초기화되어 그렇게 동작한다.
 */

type SendCondition = {
  smsEnabled: boolean;
  promotedSmsAt: Date | null;
  phoneNumber: string | null;
};

export function shouldSendPromotionSms({
  smsEnabled,
  promotedSmsAt,
  phoneNumber,
}: SendCondition): boolean {
  if (!smsEnabled) return false;
  if (promotedSmsAt) return false;
  if (!phoneNumber) return false;
  return true;
}

/** ClubMember.phoneNumber는 기본값이 '010-0000-0000'인 플레이스홀더라 걸러낸다 */
const PLACEHOLDER_PHONE = '01000000000';

export function normalizePhoneNumber(value: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  if (!digits || digits === PLACEHOLDER_PHONE) return null;
  return digits;
}

type MessageParams = {
  clubName: string;
  date: Date;
  location: string;
};

/**
 * 날짜·시간은 UTC 슬롯에 담긴 벽시계 값이므로 getUTC*로 꺼낸다.
 * (src/lib/workout/datetime.ts 참고)
 */
export function buildPromotionMessage({
  clubName,
  date,
  location,
}: MessageParams): string {
  const d = new Date(date);
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const hour = d.getUTCHours().toString().padStart(2, '0');
  const minute = d.getUTCMinutes().toString().padStart(2, '0');

  return `[${clubName}] 주차 신청이 확정되었습니다.\n${month}/${day} ${hour}:${minute} ${location}`;
}

type NotifyParams = {
  clubMemberIds: number[];
  workoutId: number;
  smsEnabled: boolean;
};

/**
 * 승격된 회원들에게 문자를 보낸다.
 * 트랜잭션 밖에서 호출한다. 외부 API 호출이 트랜잭션을 오래 붙잡으면
 * DB 커넥션이 묶이고, 발송 실패가 배정까지 되돌리는 것은 바람직하지 않다.
 */
export async function notifyParkingPromotion({
  clubMemberIds,
  workoutId,
  smsEnabled,
}: NotifyParams): Promise<void> {
  if (!smsEnabled || clubMemberIds.length === 0) return;

  try {
    const workout = await prisma.workout.findUnique({
      where: { id: workoutId },
      select: {
        date: true,
        location: true,
        club: { select: { name: true } },
      },
    });
    if (!workout) return;

    const requests = await prisma.parkingRequest.findMany({
      where: { workoutId, clubMemberId: { in: clubMemberIds } },
      select: {
        id: true,
        promotedSmsAt: true,
        clubMember: { select: { phoneNumber: true } },
      },
    });

    const message = buildPromotionMessage({
      clubName: workout.club?.name ?? '배드민턴 클럽',
      date: workout.date,
      location: workout.location,
    });

    for (const request of requests) {
      const phoneNumber = normalizePhoneNumber(
        request.clubMember?.phoneNumber ?? null
      );

      if (
        !shouldSendPromotionSms({
          smsEnabled,
          promotedSmsAt: request.promotedSmsAt,
          phoneNumber,
        })
      ) {
        continue;
      }

      try {
        await sendSMS(phoneNumber as string, message);
        await prisma.parkingRequest.update({
          where: { id: request.id },
          data: { promotedSmsAt: new Date() },
        });
      } catch (error) {
        // 한 건이 실패해도 나머지는 계속 보낸다.
        // 배정은 이미 유효하므로 문자 실패로 되돌리지 않는다.
        console.error('주차 승격 문자 발송 실패:', request.id, error);
      }
    }
  } catch (error) {
    console.error('주차 승격 문자 처리 중 오류 발생:', error);
  }
}
```

전화번호는 `ClubMember.phoneNumber`에서 가져온다(`prisma/schema/club.prisma:40`). `User.phoneNumber`는 선택 필드라 비어 있을 수 있는 반면 `ClubMember` 쪽은 가입 시 받으므로 더 정확하다. 다만 기본값이 `010-0000-0000`이라 `normalizePhoneNumber`로 걸러야 한다.

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- parkingSms`
Expected: PASS, 5개 테스트 통과

- [ ] **Step 5: 주차 API에 발송 연결**

`src/pages/api/workouts/[workoutId]/parking.ts`를 수정한다.

import 추가:
```ts
import { notifyParkingPromotion } from '@/lib/workout/parkingSms';
```

설정 조회 select에 `parkingSmsEnabled: true` 추가.

POST 분기: 트랜잭션이 승격 목록도 반환하게 바꾸고, **커밋 후** 발송한다.

```ts
      const { status, promoted } = await prisma.$transaction(async (tx) => {
        const last = await tx.parkingRequest.findFirst({
          where: { workoutId },
          orderBy: { position: 'desc' },
          select: { position: true },
        });

        const created = await tx.parkingRequest.create({
          data: {
            workoutId,
            clubMemberId: member.id,
            position: (last?.position ?? 0) + 1,
            status: PARKING_STATUS.CONFIRMED,
          },
          select: { id: true },
        });

        const promotedIds = await recalcParkingAssignments(
          tx,
          workoutId,
          capacity
        );

        const saved = await tx.parkingRequest.findUnique({
          where: { id: created.id },
          select: { status: true },
        });

        return {
          status: saved?.status ?? PARKING_STATUS.WAITLIST,
          promoted: promotedIds,
        };
      });

      await notifyParkingPromotion({
        clubMemberIds: promoted,
        workoutId,
        smsEnabled: settings.parkingSmsEnabled,
      });
```

DELETE 분기도 같은 방식으로 바꾼다.

```ts
    const promoted = await prisma.$transaction(async (tx) => {
      await tx.parkingRequest.deleteMany({
        where: { workoutId, clubMemberId: member.id },
      });
      return recalcParkingAssignments(tx, workoutId, capacity);
    });

    await notifyParkingPromotion({
      clubMemberIds: promoted,
      workoutId,
      smsEnabled: settings.parkingSmsEnabled,
    });
```

- [ ] **Step 6: 전체 테스트와 타입 확인**

Run: `npm test && npx tsc --noEmit`
Expected: 모두 통과

- [ ] **Step 7: 커밋**

```bash
git add src/lib/workout/parkingSms.ts src/lib/workout/parkingSms.test.ts "src/pages/api/workouts/[workoutId]/parking.ts"
git commit -m "feat(parking): 대기 승격 시 문자 발송 추가

문자 발송은 트랜잭션 밖에서 하며, 실패해도 배정을 되돌리지 않는다.
중복 발송은 promotedSmsAt으로 막고, 강등 시 초기화되어 재승격 때 다시 보낸다."
```

---

## Task 9: 출석체크 카드에 주차 영역 추가

**Files:**
- Modify: `src/components/organisms/workout/WorkoutListItem.tsx`
- Modify: `src/pages/clubs/[id]/attendance/index.tsx`
- Modify: `src/types/` 의 `Workout` 타입 (`WorkoutListItemProps`가 정의된 파일)

**Interfaces:**
- Consumes: Task 7의 `workout.parking`, Task 6의 신청/취소 API
- Produces: 카드의 주차 현황 줄과 신청 버튼

- [ ] **Step 1: `Workout` 타입에 `parking` 추가**

`WorkoutListItemProps`와 `Workout` 타입이 있는 파일을 찾는다.

```bash
grep -rn "WorkoutListItemProps" src/types/
```

`Workout` 인터페이스에 추가:
```ts
  parking?: WorkoutParkingStatus;
```

import 추가:
```ts
import { WorkoutParkingStatus } from './parking.types';
```

`WorkoutListItemProps`에 핸들러 추가:
```ts
  onParkingRequest?: (workoutId: number, isRequested: boolean) => void;
```

- [ ] **Step 2: 카드에 주차 현황 줄 추가**

`WorkoutListItem.tsx`의 참여 인원 `<p>` 아래에 넣는다.

```tsx
          {workout.parking?.enabled && (
            <p>
              🚗 주차: {workout.parking.confirmedCount}/
              {workout.parking.capacity}
              {workout.parking.waitlistCount > 0 &&
                ` (대기 ${workout.parking.waitlistCount}명)`}
            </p>
          )}
```

- [ ] **Step 3: 주차 버튼 추가**

참여 버튼 블록 아래, `isLoggedIn && membershipStatus.isMember` 조건 안에 넣는다.

```tsx
            {workout.parking?.enabled && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onParkingRequest?.(
                    workout.id,
                    workout.parking!.myStatus !== 'NONE'
                  );
                }}
                disabled={!isParticipating}
                className={`w-full mt-2 py-2 px-4 rounded-lg ${
                  !isParticipating
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : workout.parking.myStatus === 'CONFIRMED'
                      ? 'bg-green-500 hover:bg-green-600 text-white'
                      : workout.parking.myStatus === 'WAITLIST'
                        ? 'bg-amber-500 hover:bg-amber-600 text-white'
                        : 'bg-white border border-blue-500 text-blue-600 hover:bg-blue-50'
                }`}
              >
                {!isParticipating
                  ? '운동 참여 후 신청 가능'
                  : workout.parking.myStatus === 'CONFIRMED'
                    ? '주차 확정 · 취소하기'
                    : workout.parking.myStatus === 'WAITLIST'
                      ? `대기 ${workout.parking.myWaitlistOrder ?? ''}번 · 취소하기`
                      : workout.parking.confirmedCount >=
                          workout.parking.capacity
                        ? '🚗 주차 대기 신청'
                        : '🚗 주차 신청'}
              </button>
            )}
```

- [ ] **Step 4: 출석체크 페이지에 핸들러 추가**

`src/pages/clubs/[id]/attendance/index.tsx`의 `handleParticipate` 아래에 추가한다.

```tsx
  const handleParkingRequest = async (
    workoutId: number,
    isRequested: boolean
  ) => {
    try {
      const response = await fetch(`/api/workouts/${workoutId}/parking`, {
        method: isRequested ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clubId }),
      });
      if (response.ok) {
        await fetchWorkouts();
      } else {
        const result = await response.json();
        alert(result.error ?? '주차 신청에 실패했습니다.');
      }
    } catch (error) {
      console.error('주차 신청/취소 실패:', error);
    }
  };
```

`<WorkoutListItem>`에 prop 전달:
```tsx
          onParkingRequest={handleParkingRequest}
```

- [ ] **Step 5: 타입·린트 확인**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 6: 화면 확인**

Run: `npm run dev`

확인 항목:
- 주차 기능이 꺼진 클럽에서는 주차 줄과 버튼이 보이지 않는다
- 운동에 참여하지 않으면 버튼이 비활성이고 "운동 참여 후 신청 가능"이 보인다
- 신청하면 "주차 확정 · 취소하기"로 바뀐다
- 정원을 넘기면 "대기 N번 · 취소하기"가 보인다

- [ ] **Step 7: 커밋**

```bash
git add src/components/organisms/workout/WorkoutListItem.tsx "src/pages/clubs/[id]/attendance/index.tsx" src/types/
git commit -m "feat(parking): 출석체크 카드에 주차 신청 버튼 추가

운동 참여를 전제로 버튼을 활성화하고, 확정·대기 상태를 색으로 구분한다."
```

---

## Task 10: 운동 상세 주차 명단과 정원 변경

**Files:**
- Create: `src/pages/api/workouts/[workoutId]/parking/capacity.ts`
- Create: `src/components/organisms/workout/WorkoutParkingSection.tsx`
- Modify: `src/pages/clubs/[id]/workouts/[workoutId].tsx`

**Interfaces:**
- Consumes: Task 2·3의 함수, Task 4의 `ParkingRequestListItem`
- Produces: `PATCH /api/workouts/[workoutId]/parking/capacity` body `{ clubId: number; capacity: number | null }`

**주의:** Task 6이 `parking.ts` 파일을 만들었다면, Next.js Pages Router에서 `parking.ts`와 `parking/capacity.ts`는 공존할 수 있다. 충돌이 나면 `parking/index.ts`로 옮긴다.

- [ ] **Step 1: 정원 변경 API 작성**

`src/pages/api/workouts/[workoutId]/parking/capacity.ts`:

```ts
import { ClubAuthError, requireClubAdmin } from '@/lib/clubAuth';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import { recalcParkingAssignments } from '@/lib/workout/parkingAssignment';
import { resolveParkingCapacity } from '@/lib/workout/parkingCapacity';
import { notifyParkingPromotion } from '@/lib/workout/parkingSms';

import type { NextApiRequest, NextApiResponse } from 'next';

export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse
) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', ['PATCH']);
    return res.status(405).json({ error: '허용되지 않는 메소드입니다' });
  }

  const workoutId = Number(req.query.workoutId);
  const clubId = Number(req.body?.clubId);
  const rawCapacity = req.body?.capacity;

  if (!Number.isInteger(workoutId) || !Number.isInteger(clubId)) {
    return res.status(400).json({ error: '잘못된 요청입니다' });
  }

  // null은 "클럽 기본값을 따름", 숫자는 그날 지정값
  let capacityOverride: number | null = null;
  if (rawCapacity !== null && rawCapacity !== undefined) {
    const parsed = Number(rawCapacity);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return res.status(400).json({ error: '주차 대수는 0 이상이어야 합니다' });
    }
    capacityOverride = Math.floor(parsed);
  }

  try {
    await requireClubAdmin(req.user.id, clubId);

    const settings = await prisma.clubCustomSettings.findUnique({
      where: { clubId },
      select: {
        parkingEnabled: true,
        parkingWeekdayCapacity: true,
        parkingWeekendCapacity: true,
        parkingSmsEnabled: true,
      },
    });

    if (!settings?.parkingEnabled) {
      return res
        .status(400)
        .json({ error: '이 클럽은 주차 신청을 사용하지 않습니다' });
    }

    const promoted = await prisma.$transaction(async (tx) => {
      const workout = await tx.workout.update({
        where: { id: workoutId },
        data: { parkingCapacity: capacityOverride },
        select: { date: true, parkingCapacity: true },
      });

      const capacity = resolveParkingCapacity(workout, settings);
      return recalcParkingAssignments(tx, workoutId, capacity);
    });

    await notifyParkingPromotion({
      clubMemberIds: promoted,
      workoutId,
      smsEnabled: settings.parkingSmsEnabled,
    });

    return res.status(200).json({ message: '주차 대수를 변경했습니다' });
  } catch (error) {
    if (error instanceof ClubAuthError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('주차 대수 변경 중 오류 발생:', error);
    return res.status(500).json({ error: '처리 중 오류가 발생했습니다' });
  }
});
```

- [ ] **Step 2: 운동 상세 API가 주차 명단을 내려주게 한다**

상세 페이지는 `useState` + `fetch`로 `/api/workouts/${workoutId}`를 호출한다(`src/pages/clubs/[id]/workouts/[workoutId].tsx:52-54`). 그 API 파일(`src/pages/api/workouts/[workoutId].ts`)의 응답에 주차 명단과 현황을 추가한다.

Task 7과 같은 방식으로 클럽 설정을 조회하고 `resolveParkingCapacity`로 유효 정원을 구한 뒤, 아래 명단을 함께 내린다.

```ts
    const parkingRequests = await prisma.parkingRequest.findMany({
      where: { workoutId },
      select: {
        id: true,
        clubMemberId: true,
        status: true,
        position: true,
        clubMember: { select: { name: true } },
      },
      orderBy: { position: 'asc' },
    });
```

`ClubMember.name`은 `String?`이라 비어 있을 수 있다(`prisma/schema/club.prisma:38`). 응답을 만들 때 `name: request.clubMember?.name ?? '이름 없음'`으로 채운다.

- [ ] **Step 3: 명단 컴포넌트 작성**

`src/components/organisms/workout/WorkoutParkingSection.tsx`:

```tsx
import { useState } from 'react';

import { ParkingRequestListItem } from '@/types/parking.types';

interface WorkoutParkingSectionProps {
  capacity: number;
  overrideCapacity: number | null;
  requests: ParkingRequestListItem[];
  isAdmin: boolean;
  onCapacityChange: (capacity: number | null) => Promise<void>;
}

export function WorkoutParkingSection({
  capacity,
  overrideCapacity,
  requests,
  isAdmin,
  onCapacityChange,
}: WorkoutParkingSectionProps) {
  const [useDefault, setUseDefault] = useState(overrideCapacity === null);
  const [value, setValue] = useState(overrideCapacity ?? capacity);
  const [isSaving, setIsSaving] = useState(false);

  const confirmed = requests.filter((r) => r.status === 'CONFIRMED');
  const waitlist = requests.filter((r) => r.status === 'WAITLIST');

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await onCapacityChange(useDefault ? null : value);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="mt-6 p-4 border rounded-lg bg-white">
      <h3 className="font-semibold text-lg mb-3">🚗 주차 명단</h3>

      {isAdmin && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={useDefault}
              onChange={(e) => setUseDefault(e.target.checked)}
              className="h-4 w-4"
            />
            클럽 기본값 사용
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min={0}
              disabled={useDefault}
              value={useDefault ? capacity : value}
              onChange={(e) => setValue(Number(e.target.value))}
              className="w-24 rounded border border-gray-300 px-2 py-1 disabled:bg-gray-100 disabled:text-gray-400"
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-3 py-1 rounded bg-blue-500 text-white text-sm disabled:bg-gray-400"
            >
              {isSaving ? '저장 중...' : '대수 변경'}
            </button>
          </div>
          <p className="text-xs text-gray-500">
            대수를 줄이면 뒷순번 확정자가 대기로 내려갑니다.
          </p>
        </div>
      )}

      <div className="space-y-3 text-sm">
        <div>
          <p className="font-medium text-gray-700 mb-1">
            확정 {confirmed.length}/{capacity}
          </p>
          {confirmed.length === 0 ? (
            <p className="text-gray-400">아직 신청자가 없습니다.</p>
          ) : (
            <ol className="space-y-1">
              {confirmed.map((request, index) => (
                <li key={request.id} className="text-gray-800">
                  {index + 1}. {request.name}
                </li>
              ))}
            </ol>
          )}
        </div>

        {waitlist.length > 0 && (
          <div>
            <p className="font-medium text-gray-700 mb-1">
              대기 {waitlist.length}명
            </p>
            <ol className="space-y-1">
              {waitlist.map((request, index) => (
                <li key={request.id} className="text-gray-500">
                  대기 {index + 1}번. {request.name}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: 상세 페이지에 섹션 붙이기**

`src/pages/clubs/[id]/workouts/[workoutId].tsx`에서 주차 기능이 켜져 있을 때만 렌더한다. `onCapacityChange`는 `PATCH`를 호출하고 데이터를 다시 불러온다.

```tsx
        {parking?.enabled && (
          <WorkoutParkingSection
            capacity={parking.capacity}
            overrideCapacity={parking.overrideCapacity}
            requests={parkingRequests}
            isAdmin={isAdmin}
            onCapacityChange={async (capacity) => {
              await fetch(`/api/workouts/${workoutId}/parking/capacity`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clubId, capacity }),
              });
              await refetch();
            }}
          />
        )}
```

상세 페이지는 `fetchWorkoutDetail`이라는 함수로 데이터를 다시 불러온다(같은 파일 52행). `refetch` 자리에 그 함수를 쓴다. `useEffect` 안에 갇혀 있으면 `useCallback`으로 끌어올려 재사용한다.

- [ ] **Step 5: 타입·린트 확인**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 6: 화면 확인**

Run: `npm run dev`

확인 항목:
- 관리자에게만 대수 변경 영역이 보인다
- "클럽 기본값 사용"을 끄고 숫자를 줄이면 뒷순번이 대기로 내려간다
- 숫자를 늘리면 대기자가 확정으로 올라간다

- [ ] **Step 7: 커밋**

```bash
git add "src/pages/api/workouts/[workoutId]/parking/capacity.ts" src/components/organisms/workout/WorkoutParkingSection.tsx "src/pages/clubs/[id]/workouts/[workoutId].tsx"
git commit -m "feat(parking): 운동 상세 주차 명단과 대수 변경 추가

관리자가 명단을 보면서 그날 대수를 조정하고, 변경 즉시 재배정된다."
```

---

## Task 11: 운동 참여 취소 시 주차 연동

**Files:**
- Modify: `src/pages/api/workouts/[workoutId]/participate.ts`

**Interfaces:**
- Consumes: Task 2·3의 함수, Task 8의 `notifyParkingPromotion`
- Produces: 없음 (기존 동작 확장)

- [ ] **Step 1: DELETE 분기를 트랜잭션으로 감싼다**

현재 DELETE 분기는 `workoutParticipant.delete` 한 줄이다. 이를 다음으로 바꾼다.

```ts
      const workout = await prisma.workout.findUnique({
        where: { id: Number(workoutId) },
        select: { date: true, parkingCapacity: true },
      });

      const settings = await prisma.clubCustomSettings.findUnique({
        where: { clubId: Number(clubId) },
        select: {
          parkingEnabled: true,
          parkingWeekdayCapacity: true,
          parkingWeekendCapacity: true,
          parkingSmsEnabled: true,
        },
      });

      const clubMember = await prisma.clubMember.findUnique({
        where: {
          clubId_userId: { clubId: Number(clubId), userId: Number(req.user.id) },
        },
        select: { id: true },
      });

      const promoted = await prisma.$transaction(async (tx) => {
        await tx.workoutParticipant.delete({
          where: {
            workoutId_userId: {
              workoutId: Number(workoutId),
              userId: Number(req.user.id),
            },
          },
        });

        // 운동 참여를 취소하면 주차 신청도 함께 사라진다.
        // 참여하지 않는 사람이 자리를 차지하고 있으면 안 되기 때문이다.
        if (!settings?.parkingEnabled || !workout || !clubMember) return [];

        await tx.parkingRequest.deleteMany({
          where: {
            workoutId: Number(workoutId),
            clubMemberId: clubMember.id,
          },
        });

        const capacity = resolveParkingCapacity(workout, settings);
        return recalcParkingAssignments(tx, Number(workoutId), capacity);
      });

      await notifyParkingPromotion({
        clubMemberIds: promoted,
        workoutId: Number(workoutId),
        smsEnabled: Boolean(settings?.parkingSmsEnabled),
      });
```

- [ ] **Step 2: import 추가**

```ts
import { recalcParkingAssignments } from '@/lib/workout/parkingAssignment';
import { resolveParkingCapacity } from '@/lib/workout/parkingCapacity';
import { notifyParkingPromotion } from '@/lib/workout/parkingSms';
```

- [ ] **Step 3: 타입 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 4: 동작 확인**

Run: `npm run dev`

확인 절차:
1. 정원 2대인 운동에 세 명이 주차 신청 (2명 확정, 1명 대기)
2. 확정된 사람이 **운동 참여**를 취소
3. 주차 신청도 사라지고, 대기자가 확정으로 올라가는지 확인

- [ ] **Step 5: 커밋**

```bash
git add "src/pages/api/workouts/[workoutId]/participate.ts"
git commit -m "feat(parking): 운동 참여 취소 시 주차 신청도 함께 취소

참여하지 않는 사람이 자리를 차지하지 않도록 하고,
빈자리는 대기자에게 넘긴다."
```

---

## Task 12: 전체 검증

**Files:** 없음 (검증만)

- [ ] **Step 1: 전체 테스트**

Run: `npm test`
Expected: 전부 통과. 실패가 있으면 이 작업이 원인인지 기존 실패인지 확인한다.

- [ ] **Step 2: 타입 검사**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: 린트**

Run: `npm run lint`
Expected: 에러 없음

- [ ] **Step 4: 시나리오 통합 확인**

`npm run dev`로 띄우고 순서대로 확인한다.

| # | 확인 내용 | 기대 결과 |
|---|---|---|
| 1 | 주차 기능 끈 클럽의 출석체크 | 주차 영역이 전혀 안 보임 |
| 2 | 관리자 설정에서 기능 켜고 평일 5 / 주말 6 저장 | 저장됨 |
| 3 | 평일 운동 카드 | `주차: 0/5` |
| 4 | 주말 운동 카드 | `주차: 0/6` |
| 5 | 운동 미참여 상태의 주차 버튼 | 비활성, "운동 참여 후 신청 가능" |
| 6 | 참여 후 주차 신청 | "주차 확정 · 취소하기" |
| 7 | 정원까지 채운 뒤 추가 신청 | "대기 1번 · 취소하기" |
| 8 | 확정자가 주차만 취소 | 대기자가 확정으로 올라감 |
| 9 | 확정자가 운동 참여 취소 | 주차도 사라지고 대기자 승격 |
| 10 | 상세 화면에서 대수를 줄임 | 뒷순번이 대기로 내려감 |
| 11 | 상세 화면에서 대수를 늘림 | 대기자가 확정으로 올라감 |
| 12 | 문자 발송 켠 상태에서 승격 발생 | 문자 수신 (테스트 번호로 확인) |

- [ ] **Step 5: 최종 커밋 (변경이 있을 때만)**

```bash
git add -A
git commit -m "chore(parking): 주차 신청 기능 검증 후 마무리"
```

---

## 자체 점검 결과

**스펙 커버리지** — 설계 문서의 모든 절이 태스크에 대응한다.

| 스펙 절 | 태스크 |
|---|---|
| 3.1~3.2 필드 | Task 1 |
| 3.3 유효 정원 계산 | Task 2 |
| 3.4 ParkingRequest | Task 1 |
| 3.5 마이그레이션 | Task 1 (Step 5~8) |
| 4.1~4.3 신청·취소·정원변경 | Task 6, Task 10 |
| 4.4 참여 취소 연동 | Task 11 |
| 4.5 승격 SMS | Task 8 |
| 5.1 회원 카드 | Task 9 |
| 5.2 관리자 설정 | Task 5 |
| 5.3 주차 명단 | Task 10 |
| 6 API | Task 4, 6, 7, 10, 11 |
| 7 테스트 | Task 2, 3, 8 |

**계획 작성 중 확인한 기존 코드** — 모두 실제로 읽어 확정한 사실이다.

| 확인한 것 | 결과 | 근거 |
|---|---|---|
| `ClubAuthError`의 상태 코드 | `status: number` | `src/lib/clubAuth.ts:10-18` |
| `requireClubMember` 반환값 | `{ id, role, status, name }` | `src/lib/clubAuth.ts:3-8` |
| 회원 전화번호 | `ClubMember.phoneNumber` (필수, 기본값 `010-0000-0000`) | `prisma/schema/club.prisma:40` |
| 회원 이름 | `ClubMember.name` (`String?`) | `prisma/schema/club.prisma:38` |
| 비로그인 허용 인증 | `getAuthUser(req)` → `{ id } \| null` | `src/lib/session.ts:14` |
| 상세 페이지 조회 | `useState` + `fetch`, 함수명 `fetchWorkoutDetail` | `src/pages/clubs/[id]/workouts/[workoutId].tsx:52` |
| 날짜 저장 방식 | 벽시계 값을 UTC 슬롯에 담음 → `getUTCDay()` 필수 | `src/lib/workout/datetime.ts:1-8` |
| 테스트 러너 | Jest, `@jest/globals` import | `src/lib/rateLimit.test.ts:1` |

**설계 문서에서 조정한 것**

- 전화번호 출처를 `User.phoneNumber`가 아닌 `ClubMember.phoneNumber`로 정했다. 후자는 가입 시 반드시 받는 필수 필드라 더 정확하다. 대신 기본값 플레이스홀더(`010-0000-0000`)를 거르는 `normalizePhoneNumber`를 추가했다.
- 스펙의 `recalcParkingAssignments` 하나를 `assignParkingSlots`(순수 계산)와 `recalcParkingAssignments`(DB 반영) 둘로 나눴다. 순수 계산 부분을 Prisma 목 없이 테스트하기 위해서다.
