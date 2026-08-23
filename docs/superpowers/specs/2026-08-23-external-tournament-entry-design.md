# 대회 외부 참가자 신청 설계

작성일: 2026-08-23

## 1. 배경과 목적

현재 대회 신청은 **로그인 + 승인된 클럽 회원**만 가능하다
(`entries/index.ts`의 `withAuth` + `requireClubMember`).
그런데 실제 대회에서는 클럽 밖의 사람과 팀을 이뤄 출전하는 경우가 있고,
그 사람들은 이 시스템에 계정이 없다.

이 작업은 **로그인 없이 대회에 신청할 수 있는 경로**를 추가하고,
관리자가 그 신청을 회원 신청과 구분해 볼 수 있게 한다.

### 1.1 실제 규정에서 온 제약

영등포구 대회 모집 요강 기준, 외부 인원이 낀 조합은 다음과 같다.

| 조합 | 가능 여부 |
|---|---|
| 협회 미등록자 2명 | 가능 (2명 모두 당산클럽으로 신규 등록 시) |
| 타 지역 협회 등록자 2명 | **출전 불가** (타 구 등록자 2명 조합 불가) |

출전 자격은 대한배드민턴협회 등록 여부(BKPLAY 조회)로 갈리는데,
이는 **시스템이 알 수 없는 외부 정보**다.
따라서 시스템은 자격을 판정하지 않는다. 신청 페이지에 요강을 안내하고,
최종 판단은 관리자가 신청 목록을 보며 한다.

**이 작업이 하지 않는 것:**

- BKPLAY 연동, 협회 등록 여부 자동 판정
- 외부 참가자의 회원 가입·계정 생성
- 외부 신청 전용 마감일 (회원 신청과 같은 마감을 쓴다)
- 관리자 화면의 회원/외부 필터 (배지로 구분, 필터는 필요해지면 추가)

## 2. 확정된 요구사항

| 항목 | 결정 |
|---|---|
| 접근 방식 | 공개 링크 (URL을 아는 사람은 누구나) |
| 신청 후 조회 | 이름 + 휴대폰 뒷 4자리 |
| 대회별 활성화 | `allowExternalEntry` 플래그, 기본 `false` |
| 소속 체크박스 | 렌더링하되 **disabled + 항상 해제** |
| 추가금 부과 단위 | 관리자가 **1인당 / 팀당** 선택 |
| 팀당 부과 시 기준 | 외부 선수가 **1명이라도 있으면** 부과 |
| 최소 소속 인원 검증 | 외부 신청서는 **면제** |
| 중복 제출 | 이름 + 연락처로 차단 |
| 관리자 구분 | 목록 배지 + CSV 컬럼 |
| 관리자 권한 | 회원 신청서와 동일 (아래 4.2 참고) |

## 3. 데이터 모델

### 3.1 `Tournament` 추가 필드

| 필드 | 타입 | 기본값 | 용도 |
|---|---|---|---|
| `allowExternalEntry` | `Boolean` | `false` | 공개 신청 링크 활성화 |
| `surchargeUnit` | `SurchargeUnit` | `PER_PLAYER` | 추가금 부과 단위 |

`enums.prisma`에 추가:

```prisma
enum SurchargeUnit {
  PER_PLAYER  // 외부 선수 1인당 부과 (기존 동작)
  PER_TEAM    // 종목당 1회 부과 (외부 선수가 1명이라도 있으면)
}
```

두 필드의 기본값이 기존 동작과 같으므로 **운영 중인 대회·신청 기록은 영향받지 않는다.**

### 3.2 `TournamentEntry` 변경

| 변경 | 내용 | 이유 |
|---|---|---|
| `userId` | `Int` → `Int?` | 외부 신청서는 유저가 없다 |
| `clubMemberId` | `Int` → `Int?` | 동일 |
| `isExternal` | `Boolean @default(false)` 신규 | 신청 경로 구분 |
| `contactName` | `String?` 신규 | 외부 신청자 이름 (조회 키, 공백 제거 저장) |
| `contactPhone` | `String?` 신규 | 외부 신청자 연락처 (조회 키, `formatPhoneNumber` 정규화) |

`contactName`을 `depositorName`과 따로 두는 이유: 입금자명은 대리 입금 시
신청자 본인과 다를 수 있어 조회 키로 쓰면 어긋난다.

### 3.3 유니크 제약

기존 `@@unique([tournamentId, userId])`는 **유지한다.**
Postgres에서 NULL은 서로 다르게 취급되므로 외부 신청서(`userId = NULL`)는
이 제약에 걸리지 않고, 회원의 중복 제출 방지는 그대로 동작한다.

외부 신청의 중복 방지는 부분 유니크 인덱스로 따로 건다:

```sql
CREATE UNIQUE INDEX "TournamentEntry_external_unique"
  ON "TournamentEntry" ("tournamentId", "contactPhone", "contactName")
  WHERE "isExternal" = true;
```

`contactName`은 공백 제거(`"김 철수"` → `"김철수"`),
`contactPhone`은 기존 `formatPhoneNumber`로 정규화해 저장하므로
표기 흔들림으로 인한 우회를 줄인다.
위반 시 P2002를 잡아 "이미 신청하셨습니다. 신청 조회에서 확인해주세요."로 응답한다.

### 3.4 nullable 전환의 파급

`userId`가 nullable이 되면서 손봐야 할 곳:

| 파일 | 현재 | 변경 |
|---|---|---|
| `entries/my.ts` | `findUnique({ tournamentId_userId })` | `findFirst`로 변경 (nullable 복합키는 `findUnique` 불가) |
| `entries/[entryId]/index.ts:58` | `entry.userId !== req.user.id` | `entry.userId == null \|\| entry.userId !== req.user.id` 로 명시적 가드 |
| `entries/[entryId]/events/[entryEventId].ts:44` | 동일 | 동일 |
| `entries/index.ts` GET | `clubMember: { select: ... }` | nullable 대응, 표시명은 `clubMember?.name ?? contactName` |

`entry.userId !== req.user.id`는 `req.user.id`가 항상 number라 null과 비교해도
올바르게 거부되지만, 의도를 드러내기 위해 명시적 null 가드를 넣는다.

### 3.5 마이그레이션

`CLAUDE.md` 절차를 따른다. 컬럼 추가와 NOT NULL 완화라 기존 행의 데이터 손실은 없다.

1. `prisma/schema/tournament.prisma`, `enums.prisma` 수정
2. `npm run build:schema`
3. `npx prisma migrate diff ...` 로 영향 범위 확인 (읽기 전용)
4. **필요한 SQL만 골라** 마이그레이션 파일 작성
   (기존 스키마 드리프트가 diff에 섞여 나오므로 전체를 그대로 쓰지 않는다)
5. **여기서 멈추고 사용자에게 확인받는다**
6. 승인 후 `db execute` → `migrate resolve` → `generate`

## 4. 외부 신청 흐름

### 4.1 신규 페이지 (비로그인)

| 경로 | 역할 |
|---|---|
| `/clubs/[id]/tournaments/[tournamentId]/external-apply` | 외부 신청서 작성 |
| `/clubs/[id]/tournaments/[tournamentId]/external-entry` | 이름 + 뒷 4자리로 본인 신청 조회 |

### 4.2 신규 API (`withAuth` 없음)

| 엔드포인트 | 메서드 | 동작 |
|---|---|---|
| `.../external/tournament` | GET | 대회 공개 정보. `allowExternalEntry=false`면 404 |
| `.../external/entries` | POST | 외부 신청 제출 |
| `.../external/entries/lookup` | POST | 이름 + 뒷 4자리로 본인 신청서 조회 |

`lookup`이 POST인 이유: 개인정보를 URL 쿼리스트링·서버 로그에 남기지 않기 위해서다.

`external/tournament`는 **대회 메타데이터만** 반환한다.
신청 현황, 타인의 선수 명단·개인정보는 포함하지 않는다.

**관리자 권한 범위 (기존과 동일, 변경 없음):**
현재 코드상 신청서 수정·종목 취소는 **본인만** 가능하다
(`"본인만 수정할 수 있다 (임원도 수정 불가)"` — `entries/[entryId]/index.ts:57`).
관리자가 할 수 있는 것은 입금 상태 변경(`payment.ts`)뿐이다.
외부 신청서도 이 규칙을 그대로 따른다. 즉 외부 신청서의 수정·취소는
신청자 본인이 조회 화면에서 하고, 관리자는 입금 상태만 바꾼다.

### 4.3 비로그인 API 방어

공개 엔드포인트이므로 최소 방어를 넣는다.

| 위협 | 대응 |
|---|---|
| 비활성 대회 신청 | `allowExternalEntry` 검사 → 404 |
| 마감 후 신청 | 트랜잭션 내 `isAcceptingEntries` 재확인 (기존과 동일 패턴) |
| `lookup` 무차별 대입 | IP 기준 시도 횟수 제한 |

뒷 4자리는 엔트로피가 낮아(1만분의 1) 무제한 시도를 허용하면
타인의 신청서(생년월일·전화번호 포함)가 노출된다.
레포에 rate limit 유틸이 없으므로 인메모리 카운터로 시작한다
(`src/lib/rateLimit.ts` 신규). 서버리스 다중 인스턴스에서는 완벽하지 않으나,
자동화 도구를 상당히 느리게 만드는 것으로 1차 목적은 충족한다.

### 4.4 폼 차이 (회원 신청서 대비)

| 항목 | 회원 신청서 | 외부 신청서 |
|---|---|---|
| 소속 체크박스 | 활성, 사용자가 조작 | **disabled + 항상 해제** |
| 선수 1 자동 채움 | 로그인 정보로 채움 | 없음 |
| 신청자 이름·연락처 | 없음 (계정에서 유추) | 신규 입력 필드 (조회 키) |
| `minClubMembersPerTeam` | 적용 | **면제** |

`minClubMembersPerTeam` 면제가 필요한 이유: 외부 신청서는 선수 전원이
`isClubMember = false`이므로, 이 검증을 켜두면 **모든 외부 신청이 제출 불가**가 된다.

**컴포넌트 재사용**: `PlayerListField` / `EventListField` / `EntrySummary`에
`isExternal` prop을 추가해 위 차이만 분기한다. 폼을 복제하지 않는다.

**disabled 체크박스 구현 주의**: `disabled`된 input은 폼 제출값에서 빠져
`isClubMember`가 `undefined`가 된다. 시각적으로만 disabled 처리하고 값은
`false`로 고정하며, **서버에서도 외부 신청은 무조건 `isClubMember: false`로 덮는다**
(클라이언트 값 불신 — 기존 `useSurcharge` 처리와 같은 방식).

## 5. 참가비 계산

`calculateEventFee`에 `unit` 파라미터를 추가한다.
기본값 `PER_PLAYER`로 기존 호출부의 동작을 보존한다.

```ts
export type EventFeeInput = {
  baseFee: number;
  surcharge: number;
  unit?: SurchargeUnit;   // 기본 PER_PLAYER
  playerKeys: string[];
  players: SurchargeablePlayer[];
};
```

| unit | 추가금 |
|---|---|
| `PER_PLAYER` | `외부선수수 × surcharge` |
| `PER_TEAM` | 외부선수 ≥ 1명이면 `surcharge × 1`, 아니면 `0` |

기본 참가비 6만 / 추가금 1만 기준 예시:

| 종목 구성 | PER_PLAYER | PER_TEAM |
|---|---|---|
| 회원 2명 | 60,000 | 60,000 |
| 회원 1 + 외부 1 | 70,000 | 70,000 |
| 외부 2명 | 80,000 | **70,000** |

**호출부** (4곳, 모두 `tournament.surchargeUnit` 전달):
`entries/index.ts`, `entries/[entryId]/index.ts`, `EntrySummary.tsx`,
신규 `external/entries`.
회원·외부 신청이 **같은 계산 함수를 공유**하므로 금액이 어긋날 수 없다.

> ⚠️ **구현 시 실제로 놓쳤던 지점.** `calculateEventFee`의 `unit` 기본값이
> `PER_PLAYER`라, 서버 호출부에서 `unit`을 빼먹어도 **타입 오류 없이 조용히
> 1인당 계산으로 돌아간다.** 초기 구현에서 회원 경로 서버 2곳
> (`entries/index.ts`, `entries/[entryId]/index.ts`)이 이걸 빠뜨려,
> 클라이언트는 70,000원을 보여주고 서버는 80,000원을 저장하는 상태가 됐다.
> `EntryEvent.fee`가 스냅샷이라 한번 저장되면 영구히 어긋난다.
> 최종 리뷰에서 발견해 수정했다. 앞으로 이 함수의 호출부를 추가할 때는
> **4곳 전부가 `unit`을 넘기는지 grep으로 확인**할 것.

`EntryEvent.fee`는 계산 결과 스냅샷이므로, 관리자가 나중에 `surchargeUnit`을
바꿔도 기존 신청서 금액은 흔들리지 않는다.

**관리자 폼**: `TournamentForm.tsx`의 추가금 입력 옆에 부과 단위 라디오
("1인당" / "팀당")를 추가한다. `nonMemberSurcharge = 0`이면 의미가 없으므로 숨긴다
(기존 `memberLabel` 필수 검증과 같은 결).

## 6. 관리자 화면

| 위치 | 변경 |
|---|---|
| `EntryTable` | 신청서 행에 "외부 신청" 배지 |
| `EventGroupList` | 기존 `"{memberLabel} 아님"` 배지가 그대로 동작 (변경 없음) |
| `entries/export.ts` | CSV에 "신청 경로"(회원/외부), "연락처" 컬럼 추가 |
| `entries/index.ts` GET | `isExternal`, `contactName`, `contactPhone` 포함 |

신청자명 표시는 `clubMember?.name ?? contactName`으로 한다
(`clubMember`가 nullable이 되므로 null 참조 지점을 훑어야 한다).

## 7. 테스트

기존 Jest 패턴을 따른다 (`@jest/globals`, `npm test`).

| 대상 | 내용 |
|---|---|
| `fee.test.ts` | `PER_TEAM` 계산 — 외부 0/1/2명, `surcharge = 0`인 경우 |
| `validation.test.ts` | 외부 신청 시 `minClubMembersPerTeam` 면제, 그 외 규칙은 유지 |
| `externalEntry.test.ts` (신규) | 이름 정규화, 뒷 4자리 대조 |
| `rateLimit.test.ts` (신규) | 시도 횟수 제한 동작 |
| DOM 테스트 | 외부 폼의 체크박스가 disabled이고 값이 `false`로 제출되는지 |

## 8. 작업 순서

1. 스키마 변경 + 마이그레이션 SQL 작성 → **적용 전 확인받기**
2. 참가비 계산 (`fee.ts` + `surchargeUnit`) — 테스트 우선
3. 검증 규칙 (`validation.ts` 외부 신청 면제) — 테스트 우선
4. 외부 API 3종 + rate limit
5. 외부 신청·조회 페이지 (컴포넌트 재사용)
6. 관리자 표시 (배지, CSV) + nullable 파급 정리

## 9. 미해결 / 나중에

- 회원/외부 필터: 신청 건수가 늘면 추가
- rate limit의 다중 인스턴스 대응: 실제 남용이 관측되면 영속 저장소로 이전
- 외부 신청 전용 마감일: 요구가 생기면 추가
