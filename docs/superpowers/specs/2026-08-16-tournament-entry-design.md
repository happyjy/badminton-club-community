# 배드민턴 대회 참가 신청 시스템 설계

작성일: 2026-08-16

## 1. 배경과 목적

클럽 회원들이 **외부에서 열리는 배드민턴 대회**에 참가 신청할 때, 클럽 임원이 신청을 취합해 주최측에 명단을 제출한다. 현재는 게시판 게시글 + 댓글로 신청을 받고 있으나, 댓글에 생년월일·전화번호가 담겨 **모든 회원에게 개인정보가 노출**되는 문제가 있다.

이 시스템은 별도 도메인으로 신청을 받아 민감정보를 관리자만 열람하게 하고, 임원의 명단 취합·입금 대조 업무를 CSV 추출로 지원한다.

**이 시스템이 하지 않는 것:**

- 대회 주최 (클럽은 참가자일 뿐 주최측이 아님)
- 대진표 편성, 경기 결과 기록
- 온라인 결제 (계좌 이체 후 임원이 수동 확인)
- 알림 발송 (이메일·SMS 미사용)

## 2. 확정된 요구사항

| 항목 | 결정 |
|---|---|
| 신청 대상 | 클럽 회원 (로그인 + 승인된 멤버) |
| 신청 방식 | 신청자가 모든 선수 정보를 직접 입력 |
| 선수 수 | 종목별로 1명 또는 2명 (관리자가 종목 정의 시 지정) |
| 양식 유연성 | 고정 스키마 + 선택지 커스텀 (동적 폼 빌더 아님) |
| 열람 권한 | 회원에게는 마스킹 목록 공개, 민감정보는 ADMIN만 |
| 수정·취소 | 마감 전까지 본인이 수정·취소 가능, 종목 단위 부분 취소 허용 |
| 신청 상태 | 입금대기 / 입금확인 / 취소 |
| 대회 상태 | 마감일시 자동 전환 + 관리자 수동 개폐 |
| 명단 추출 | 테이블 조회 + 필터/정렬 + CSV 다운로드 |
| 참가비 | 종목별 금액 정의, 신청 시 자동 합산 |
| 중복 신청 | 가능 (신청서 1건 안에 여러 종목) |
| 보관 기간 | 정책 없음 (관리자 수동 삭제) |

## 3. 도메인 모델

`prisma/schema/tournament.prisma` 를 신규 추가한다. 기존 `guest.prisma`, `board.prisma` 와 동일하게 도메인별 파일 분리 방식을 따른다.

### 3.1 구조

```
Tournament (대회)
  └ TournamentEventOption (종목 옵션)
  └ TournamentEntry (신청서)
       └ EntryPlayer (선수 명단)
       └ EntryEvent (신청 종목)
            └ EntryEventPlayer (종목 ↔ 선수 배정)
```

신청서 1건의 실제 형태:

```
[신청서]
  입금자명: 홍길동
  선수 명단:
    - 홍길동 / 남 / 1990-01-01 / 010-xxxx / 티셔츠 L
    - 김철수 / 남 / 1988-05-05 / 010-xxxx / 티셔츠 XL
    - 이영희 / 여 / 1992-03-03 / 010-xxxx / 티셔츠 M
  신청 종목:
    - 남자복식 / 30대부 / A조  → 홍길동, 김철수   (30,000원)
    - 혼합복식 / 40대부 / B조  → 홍길동, 이영희   (30,000원)
  합계: 60,000원
```

선수 명단을 먼저 만들고 종목에 배정하는 구조인 이유: 같은 선수가 여러 종목에 나가도 **티셔츠는 1장**이어야 하므로, 선수를 신청서 단위로 한 번만 등록해야 중복 인원을 시스템이 인식할 수 있다.

### 3.2 모델별 필드

**Tournament**

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | String (cuid) | |
| `clubId` | Int | FK → Club |
| `title` | String | 대회명 |
| `hostName` | String? | 주최 (예: ○○시 배드민턴협회) |
| `description` | String? | 모집 요강 (참가비 안내, 유의사항) |
| `tournamentDate` | String? | 대회 일자 |
| `location` | String? | 대회 장소 |
| `applyStartAt` | DateTime? | 신청 시작 일시 |
| `applyDeadline` | DateTime | 신청 마감 일시 (필수) |
| `status` | TournamentStatus | DRAFT / OPEN / CLOSED — 관리자의 수동 의도 |
| `useTeamName` | Boolean @default(false) | 팀명 입력 사용 여부 |
| `tshirtSizes` | String[] | 티셔츠 사이즈 옵션. 빈 배열이면 티셔츠 항목 미사용 |
| `bankAccount` | String? | 입금 계좌 안내 |
| `createdBy` | Int | ClubMember id |
| `createdAt` / `updatedAt` | DateTime | |

인덱스: `@@index([clubId])`, `@@index([clubId, status])`

**TournamentEventOption**

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | String (cuid) | |
| `tournamentId` | String | FK → Tournament (onDelete: Cascade) |
| `eventType` | String | 종목 (남자복식, 혼합복식 등) |
| `ageGroup` | String | 연령 (30대부 등) |
| `level` | String @default("") | 급수 (A조 등). 없는 대회도 있음 |
| `playerCount` | Int | 1 또는 2 |
| `fee` | Int | 참가비 (원) |
| `order` | Int @default(0) | 표시 순서 |
| `isActive` | Boolean @default(true) | 비활성 시 신규 선택 불가 |

인덱스: `@@index([tournamentId])`
제약: `@@unique([tournamentId, eventType, ageGroup, level])`

**TournamentEntry**

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | String (cuid) | |
| `tournamentId` | String | FK → Tournament (onDelete: Cascade) |
| `userId` | Int | FK → User |
| `clubMemberId` | Int | FK → ClubMember |
| `depositorName` | String | 입금자명 (필수) |
| `teamName` | String? | 팀명 (useTeamName 일 때만) |
| `paymentStatus` | EntryPaymentStatus | PENDING / CONFIRMED / CANCELED |
| `totalFee` | Int @default(0) | ACTIVE 종목 fee 합계 (서버 계산) |
| `privacyAgreedAt` | DateTime | 개인정보 동의 시각 |
| `createdAt` / `updatedAt` | DateTime | |

인덱스: `@@index([tournamentId])`, `@@index([userId])`
제약: `@@unique([tournamentId, userId])` — 한 회원은 대회당 신청서 1건

**EntryPlayer**

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | String (cuid) | |
| `entryId` | String | FK → TournamentEntry (onDelete: Cascade) |
| `name` | String | |
| `gender` | String | |
| `birthDate` | String | 민감정보 |
| `phoneNumber` | String | 민감정보 |
| `tshirtSize` | String? | 민감정보 (대회가 티셔츠 미사용이면 null) |
| `order` | Int @default(0) | |

인덱스: `@@index([entryId])`

**EntryEvent**

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | String (cuid) | |
| `entryId` | String | FK → TournamentEntry (onDelete: Cascade) |
| `eventOptionId` | String | FK → TournamentEventOption |
| `fee` | Int | **신청 시점 참가비 스냅샷** |
| `status` | EntryEventStatus | ACTIVE / CANCELED |
| `canceledAt` | DateTime? | |

인덱스: `@@index([entryId])`, `@@index([eventOptionId])`

**EntryEventPlayer**

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | String (cuid) | |
| `entryEventId` | String | FK → EntryEvent (onDelete: Cascade) |
| `entryPlayerId` | String | FK → EntryPlayer (onDelete: Cascade) |

제약: `@@unique([entryEventId, entryPlayerId])`

### 3.3 enum 추가

`prisma/schema/enums.prisma` 에 추가한다.

```prisma
enum TournamentStatus {
  DRAFT     // 임시저장
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

기존 `Club` 모델에 `tournaments Tournament[]` 관계 필드를 추가한다.

### 3.4 설계 판단 근거

**참가비 스냅샷 (`EntryEvent.fee`)**
관리자가 나중에 참가비를 수정해도 기존 신청자의 청구 금액이 바뀌지 않는다. 입금 대조의 근거가 되므로 필수다.

**종목 옵션을 별도 테이블로**
`Tournament` 에 JSON으로 넣지 않는다. `EntryEvent` 가 FK로 참조해야 종목별 신청 집계를 쿼리로 얻고, CSV 추출·필터링이 가능하다.

**부분 취소는 상태 변경**
`EntryEvent` 를 삭제하지 않고 `status: CANCELED` 로 둔다. 취소 이력이 남고 이미 입금된 건의 정산 근거가 된다. `totalFee` 는 ACTIVE 종목만 합산해 재계산한다.

**신청서 단위 상태와 종목 단위 상태의 관계**
`TournamentEntry.paymentStatus` 와 `EntryEvent.status` 는 별개의 축이다. 규칙은 다음과 같다.

| 동작 | 결과 |
|---|---|
| 종목 일부 취소 (ACTIVE 종목이 1개 이상 남음) | 해당 `EntryEvent.status = CANCELED`, `totalFee` 재계산. `paymentStatus` 는 **변경하지 않음** |
| 모든 종목 취소 (ACTIVE 종목 0개) | `paymentStatus = CANCELED`, `totalFee = 0` 으로 함께 변경 |
| 신청서 전체 취소 | 모든 ACTIVE `EntryEvent` 를 CANCELED 로, `paymentStatus = CANCELED`, `totalFee = 0` |

입금확인(CONFIRMED) 상태에서 종목을 취소하면 `paymentStatus` 는 CONFIRMED 로 유지되고 `totalFee` 만 줄어든다. 임원이 화면에서 "입금액 > 청구액" 을 보고 환불을 판단한다. 환불 처리는 시스템 범위 밖이다.

**제3자 개인정보**
`EntryPlayer` 는 파트너(타 클럽 사람 포함)의 정보를 신청자가 대신 입력하는 구조다. 개인정보 동의 문구에 "타 선수 정보 입력 시 해당 선수의 동의를 받았음을 확인합니다"를 포함한다.

## 4. 화면 구조

기존 라우팅 컨벤션(`/clubs/[id]/guest`, `/clubs/[id]/board`)을 따라 `/clubs/[id]/tournaments` 아래 배치한다.

### 4.1 신청자 화면

| 경로 | 화면 | 권한 |
|---|---|---|
| `/clubs/[id]/tournaments` | 대회 목록 — 모집중/마감 배지, 마감일, D-day | 회원 |
| `/clubs/[id]/tournaments/[tid]` | 대회 상세 — 모집 요강, 참가비 표, 계좌 안내, 마스킹 참가자 목록, [신청하기] | 회원 |
| `/clubs/[id]/tournaments/[tid]/apply` | 신청 폼 (신규·수정 겸용) | 회원 |
| `/clubs/[id]/tournaments/[tid]/my` | 내 신청 확인 — 내역, 납부 금액, 입금 상태, [수정] / [종목별 취소] | 본인 |

### 4.2 관리자 화면

| 경로 | 화면 | 권한 |
|---|---|---|
| `/clubs/[id]/tournaments/new` | 대회 생성 | ADMIN |
| `/clubs/[id]/tournaments/[tid]/edit` | 대회 수정 | ADMIN |
| `/clubs/[id]/tournaments/[tid]/admin` | 신청 현황 — 테이블, 필터, 입금 상태 토글, CSV, 종목별 집계 | ADMIN |

### 4.3 대회 상세 — 마스킹 참가자 목록

회원 전체가 보되 `이름 / 종목 / 연령 / 급수` 만 노출한다. 생년월일·전화번호·티셔츠 사이즈는 **API 응답에서 select 하지 않는다** (프론트 마스킹 아님). 파트너를 구할 때 "누가 어디 나가는지" 확인하는 용도다.

### 4.4 신청 폼 — 3단 구성

```
① 선수 명단          [+ 선수 추가]
   본인은 프로필에서 자동 채움 (수정 가능)
   각 선수: 이름 / 성별 / 생년월일 / 전화번호 / 티셔츠 사이즈

② 신청 종목          [+ 종목 추가]
   각 줄: 종목 선택(드롭다운) → 선수 배정(①에서 선택, playerCount 만큼)
   줄마다 참가비 표시

③ 입금 정보
   합계 금액 (자동 계산) / 입금자명 / 팀명(설정 시) / 개인정보 동의
```

**신규·수정 판별:** `/apply` 진입 시 `GET .../entries/my` 를 호출한다. 신청서가 없으면 빈 폼 + `POST`, 있으면 기존 값을 채운 폼 + `PATCH` 로 동작한다. 별도 라우트를 두지 않는 이유는 한 회원당 신청서가 1건뿐이라 편집 대상이 유일하기 때문이다.

### 4.5 관리자 신청 현황 — 두 개 뷰

- **신청서 단위**: 신청자, 입금자명, 총액, 입금 상태 → 통장 대조용
- **종목 단위(펼침)**: 종목별로 그룹핑된 선수 명단 → 주최측 제출용. CSV는 이 형태로 추출

### 4.6 컴포넌트 배치

기존 atomic 구조를 따른다.

```
src/components/organisms/tournament/
  TournamentCard.tsx           대회 목록 아이템
  TournamentInfoSection.tsx    모집 요강·참가비·계좌 표시
  ParticipantList.tsx          마스킹된 참가자 목록
  entry/
    PlayerListField.tsx        ① 선수 명단 동적 리스트
    EventListField.tsx         ② 종목 동적 리스트
    EntrySummary.tsx           ③ 합계·입금 정보
  admin/
    TournamentForm.tsx         대회 생성/수정
    EventOptionEditor.tsx      종목 옵션 편집기
    EntryTable.tsx             신청 현황 테이블
```

**기존 패턴과 다른 점:** 기존 `JoinModal` 은 Context로 필드 상태를 공유하지만, 신청 폼은 **react-hook-form 의 `useFieldArray`** 를 사용한다. 선수·종목이 동적 리스트이고 항목별 검증이 필요해 `useFieldArray` 가 적합하다. 두 라이브러리 모두 이미 의존성에 있다.

## 5. API 설계

`src/pages/api/clubs/[id]/...` 구조를 따른다. 모든 핸들러는 `withAuth` 로 감싼다.

### 5.1 엔드포인트

| Method | 경로 | 설명 | 권한 |
|---|---|---|---|
| GET | `/api/clubs/[id]/tournaments` | 대회 목록 | 회원 |
| POST | `/api/clubs/[id]/tournaments` | 대회 생성 (종목 옵션 포함) | ADMIN |
| GET | `/api/clubs/[id]/tournaments/[tid]` | 대회 상세 + 종목 옵션 + 마스킹 참가자 | 회원 |
| PATCH | `/api/clubs/[id]/tournaments/[tid]` | 대회 수정 / 수동 개폐 | ADMIN |
| DELETE | `/api/clubs/[id]/tournaments/[tid]` | 대회 삭제 | ADMIN |
| POST | `/api/clubs/[id]/tournaments/[tid]/entries` | 신청서 제출 | 회원 |
| GET | `/api/clubs/[id]/tournaments/[tid]/entries` | 전체 신청 현황 (민감정보 포함) | ADMIN |
| GET | `/api/clubs/[id]/tournaments/[tid]/entries/my` | 내 신청서 | 본인 |
| PATCH | `/api/clubs/[id]/tournaments/[tid]/entries/[eid]` | 신청서 수정 | 본인(마감 전) |
| PATCH | `.../entries/[eid]/events/[eeid]` | 종목 부분 취소 | 본인(마감 전) |
| PATCH | `.../entries/[eid]/payment` | 입금 상태 변경 | ADMIN |
| GET | `.../entries/export` | CSV 다운로드 | ADMIN |

### 5.2 권한 처리

`src/utils/permissions.ts` 의 기존 함수(`checkClubAdminPermission` 등)는 이미 조회된 `ClubMember` 객체를 받는 **클라이언트용** 헬퍼다. 서버용 헬퍼를 신규 추가한다:

```ts
// src/lib/tournament/auth.ts (또는 src/lib/clubAuth.ts)
requireClubMember(userId, clubId)  // → ClubMember | throw 401/403
requireClubAdmin(userId, clubId)   // → ClubMember | throw 401/403
```

**민감정보 차단은 API 레이어의 `select` 로 한다.** 프론트에서 숨기지 않는다.

```ts
// 대회 상세(회원용) — 참가자 목록은 이 필드만
players: { select: { name: true } }
entryEvents: { select: { eventOption: true } }
```

응답 타입을 `ParticipantPublic` / `EntryAdmin` 으로 분리해 타입 레벨에서도 섞이지 않게 한다.

### 5.3 신청 제출 검증 (`POST /entries`)

zod 로 검증하되, 서버에서 반드시 재검증한다:

| 검증 | 이유 |
|---|---|
| 대회가 OPEN 이고 `applyDeadline` 미경과 | 마감 후 제출 차단 |
| `eventOptionId` 가 이 대회 소속이고 `isActive` | 타 대회 종목 ID 주입 방지 |
| 종목별 배정 선수 수 == `playerCount` | 복식에 1명만 넣는 것 방지 |
| 배정된 `entryPlayerId` 가 같은 신청서 내 선수 | 남의 선수 참조 방지 |
| `fee` 는 클라이언트 값 무시, 서버가 DB 조회해 스냅샷 | 참가비 위조 방지 |
| `totalFee` = ACTIVE 종목 fee 합계 (서버 계산) | 동일 |
| 개인정보 동의 체크 | 필수 |

화면에 보이는 금액은 표시용이며, 저장은 서버가 종목 옵션에서 직접 읽어 계산한다.

### 5.4 트랜잭션

신청서는 4개 테이블에 걸쳐 쓰므로 `prisma.$transaction` 으로 묶는다.

수정(PATCH) 시:
- `EntryPlayer`: 전체 교체 (이력 불필요)
- `EntryEvent`: ACTIVE 인 것만 교체, CANCELED 는 보존

### 5.5 대회 상태 자동 전환

별도 스케줄러 없이 **조회 시점에 계산**한다.

```ts
const effectiveStatus =
  status === 'DRAFT'  ? 'DRAFT'
  : status === 'CLOSED' ? 'CLOSED'        // 수동 마감 우선
  : now > applyDeadline ? 'CLOSED'        // 마감일 경과
  : applyStartAt && now < applyStartAt ? 'UPCOMING'
  : 'OPEN';
```

DB의 `status` 는 관리자의 수동 의도만 담고, 노출 상태는 마감일과 조합해 파생한다. cron 이 불필요하고 시계 오차 문제가 없다. 마감일 이후 재오픈하려면 마감일을 미룬다.

**주의:** 파생 상태의 타입은 `'DRAFT' | 'UPCOMING' | 'OPEN' | 'CLOSED'` 이다. 이 중 `UPCOMING` 은 DB `TournamentStatus` enum 에 없고 응답 타입에만 존재한다. DB 에 저장되는 값은 `DRAFT / OPEN / CLOSED` 세 가지뿐이다.

`DRAFT` 인 대회는 목록·상세 API 에서 ADMIN 에게만 노출한다. 일반 회원 조회 시에는 결과에서 제외한다.

### 5.6 응답 형식

기존 API 들이 `{ success, message }` 와 `{ data, message }` 를 혼용하고 있다. 새 도메인은 하나로 통일한다.

```ts
// 성공
{ data: T, message: string }
// 실패
{ error: string, status: number }
```

기존 API 는 건드리지 않는다 (범위 밖).

## 6. 관리자 대회 생성 화면

### 6.1 구성

```
① 대회 기본 정보
   대회명 *              [외부 주최 대회 이름]
   주최                  [○○시 배드민턴협회]
   대회 일자             [날짜]
   장소                  [체육관]
   모집 요강             [textarea — 참가비 안내, 유의사항 등]
   입금 계좌             [○○은행 123-456 (클럽명)]

② 신청 기간 · 상태
   신청 시작             [일시]
   신청 마감 *           [일시]
   상태                  ( ) 임시저장  (•) 모집 열기  ( ) 마감

③ 신청 양식 설정
   [ 종목 옵션 ]
   ┌────────────────────────────────────────────────────┐
   │ 종목      연령      급수    인원   참가비    [삭제] │
   │ 남자복식  30대부    A조     2명    30,000   [ ✕ ]  │
   │ 남자복식  30대부    B조     2명    30,000   [ ✕ ]  │
   │ 혼합복식  40대부    A조     2명    30,000   [ ✕ ]  │
   │ 남자단식  일반부    -       1명    20,000   [ ✕ ]  │
   └────────────────────────────────────────────────────┘
   [+ 종목 추가]

   팀명 입력받기          [ ] 사용
   티셔츠 사이즈 옵션     [S] [M] [L] [XL] [XXL]   태그 추가/삭제
                          [ ] 티셔츠 항목 사용 안 함
```

### 6.2 종목 옵션 편집기

한 줄이 `TournamentEventOption` 한 행에 대응한다.

| 컬럼 | 입력 방식 | 비고 |
|---|---|---|
| 종목 (`eventType`) | 자유 텍스트 + 자동완성 | |
| 연령 (`ageGroup`) | 자유 텍스트 | |
| 급수 (`level`) | 자유 텍스트, 비워둘 수 있음 | |
| 인원 (`playerCount`) | 1 또는 2 선택 | 종목명에 "복식" 포함 시 2로 자동 제안 |
| 참가비 (`fee`) | 숫자 | 천 단위 콤마 표시 |

**자유 텍스트인 이유:** 외부 대회는 주최측마다 종목·급수 명칭이 제각각이다 ("A조/B조" vs "1부/2부" vs "초급/중급"). enum 고정 시 매번 코드 수정이 필요하다. 대신 **같은 클럽의 직전 대회에서 사용한 값을 자동완성으로 제안**해 오타와 반복 입력을 줄인다.

### 6.3 반복 입력 부담 줄이기

**직전 대회 복사 (우선순위 높음)**
대회 목록에서 [복사해서 새로 만들기]. 종목 옵션·티셔츠 사이즈·폼 설정만 복제하고 날짜와 신청 내역은 비운다. 시즌마다 구성이 유사해 가장 효과적이다.

**종목 일괄 추가 (있으면 좋음)**
"남자복식 × [30대부, 40대부] × [A조, B조]" 조합을 골라 4줄을 한 번에 생성한다.

### 6.4 신청이 있는 대회의 수정 제약

| 상황 | 처리 |
|---|---|
| 신청 0건 | 자유롭게 수정·삭제 |
| 신청 있는 종목 **삭제** 시도 | 삭제 대신 `isActive: false`. 기존 신청 유지, 신규 선택만 차단. "신청 N건 있음 — 비활성화됩니다" 안내 |
| 신청 있는 종목 **참가비 변경** | 허용. "기존 신청 N건의 금액은 유지됩니다" 경고. 스냅샷 덕분에 안전 |
| 신청 있는 종목 **인원수 변경** | 차단. 기존 배정이 무효화됨 |

### 6.5 유효성 검증

- 종목 옵션 최소 1개 필수
- 종목 + 연령 + 급수 조합 중복 금지
- 신청 마감 > 신청 시작
- 참가비 0 이상 (무료 대회 허용)

## 7. 에러 처리

| 상황 | 코드 | 사용자 메시지 |
|---|---|---|
| 비로그인 | 401 | 로그인 페이지로 리다이렉트 |
| 클럽 회원 아님 | 403 | "클럽 회원만 신청할 수 있습니다" |
| ADMIN 아닌데 관리자 API 호출 | 403 | "권한이 없습니다" |
| 마감 후 제출/수정/취소 | 400 | "신청이 마감되었습니다" |
| 종목 인원수 불일치 | 400 | 해당 종목 줄에 인라인 에러 |
| 비활성 종목 선택 | 400 | "선택할 수 없는 종목입니다" |
| 중복 제출 | 409 | "이미 신청하셨습니다. 내 신청에서 수정해주세요" |
| DB 오류 | 500 | "일시적인 오류가 발생했습니다" + 서버 로그 |

**마감 직전 동시성:** 트랜잭션 안에서 마감일을 재확인한다. 폼을 열어둔 채 마감이 지나는 경우를 서버가 잡는다.

**중복 제출 방지:** `@@unique([tournamentId, userId])` 로 DB 레벨에서 차단한다. 더블클릭에 의한 이중 생성도 함께 막힌다.

**프론트 표시:**
- 폼 검증: react-hook-form + zod resolver, 필드 인라인 에러
- API 오류: `react-hot-toast` (기존 사용 중)
- 로딩/실패: `@tanstack/react-query` (기존 사용 중)

## 8. 테스트 전략

`jest` + `@testing-library/react` 가 이미 구성되어 있다. 커버리지를 넓게 가져가기보다 **틀리면 돈·개인정보 문제가 되는 로직**에 집중한다.

### 8.1 순수 함수 단위 테스트 (우선순위 1)

로직을 API 핸들러에서 분리해 `src/lib/tournament/` 에 두고 테스트한다.

| 대상 | 테스트 내용 |
|---|---|
| `calculateTotalFee(entryEvents)` | ACTIVE 만 합산, CANCELED 제외, 빈 배열 = 0 |
| `resolveEntryStatusAfterCancel(entry, canceledEventId)` | 일부 취소 시 paymentStatus 유지, 전체 취소 시 CANCELED + totalFee 0 |
| `resolveTournamentStatus(tournament, now)` | 수동 마감 우선, 마감일 경과, 시작 전, 정상 모집중 |
| `validateEntrySubmission(input, eventOptions)` | 인원수 불일치, 타 대회 종목 ID, 비활성 종목, 신청서 밖 선수 참조 |
| `toCsvRows(entries)` | 종목별 전개, 취소 건 제외, 한글 인코딩(BOM) |
| `toPublicParticipants(entries)` | 민감 필드가 결과에 **없음**을 단언 |

마지막 항목이 중요하다. 개인정보 노출이 이 프로젝트에서 가장 비싼 실수이므로, "생년월일·전화번호 키가 응답 객체에 존재하지 않는다"를 명시적으로 테스트한다.

### 8.2 컴포넌트 테스트 (우선순위 2)

- `PlayerListField` / `EventListField`: 추가·삭제, 종목 변경 시 선수 배정 슬롯 수 변화
- `EntrySummary`: 종목 선택에 따른 합계 금액 갱신

### 8.3 API 통합 테스트 (우선순위 3)

Prisma 를 모킹해 권한 분기만 검증한다: 비회원 403, 일반회원의 관리자 API 접근 403, 마감 후 제출 400.

E2E 는 이 프로젝트에 인프라가 없어 범위에서 제외한다.

## 9. 구현 순서

1. 스키마 + 마이그레이션
2. 순수 로직 (`src/lib/tournament/`) + 단위 테스트
3. 관리자 대회 생성/수정 (API + 화면)
4. 신청 폼 (API + 화면) — 가장 무거움
5. 내 신청 확인 / 수정 / 부분 취소
6. 관리자 신청 현황 + CSV
7. 대회 목록·상세 + 마스킹 참가자 목록

3번을 먼저 하는 이유는 대회를 만들 수 없으면 신청 기능을 테스트할 수 없기 때문이다.

## 10. 기존 코드와의 관계

| 기존 자산 | 활용 방식 |
|---|---|
| 게스트 신청 (`GuestPost`) | 구조적 참고만. 코드 공유 없음 (신청 단위·상태·권한이 다름) |
| `withAuth` (`src/lib/session.ts`) | 그대로 사용 |
| `src/utils/permissions.ts` | 클라이언트용. 서버용 `requireClubAdmin` 은 신규 작성 |
| `prisma` 싱글톤 (`src/lib/prisma.ts`) | 그대로 사용 |
| atoms/molecules (Input, Select, FormField 등) | 재사용 |
| `TournamentFields.tsx` | **무관.** 회원의 개인 급수(구대회/전국대회 신청 가능 급수) 입력 필드이며 이 시스템과 관련 없음 |
| 이메일·SMS 인프라 | 사용하지 않음 |
