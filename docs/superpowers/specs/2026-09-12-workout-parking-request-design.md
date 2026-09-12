# 운동 출석 주차 신청 설계

작성일: 2026-09-12

## 1. 배경과 목적

기존에는 주차 공간이 없어 회원들이 인근에 불법 주차를 했고, 주차 위반 딱지가
반복해서 발부됐다. 이후 협의를 거쳐 **학교 정문 쪽에 제한된 수의 자리**를
쓸 수 있게 됐다. 다만 자리가 5~6대 수준으로 적고, 상황에 따라 그날 쓸 수 있는
대수가 달라진다.

이 작업은 운동 일정별로 **주차 자리를 미리 신청·배정**하는 기능을 추가한다.
회원은 출석체크 화면에서 주차를 신청하고, 자리가 차면 대기 순번을 받는다.
관리자는 클럽 단위로 기능을 켜고 끄며, 그날의 주차 대수를 조정한다.

### 1.1 이 작업이 하지 않는 것

| 제외 항목 | 사유 |
|---|---|
| 차량번호 수집 | 2단계로 미룸. 사전 등록 명단 제출 필요 여부 미확정 |
| 승격 SMS 알림 | 2단계. 1단계는 화면에서 상태 확인 |
| 게스트 주차 신청 | `GuestPost`는 계정이 없을 수 있어 범위가 크게 늘어남 |
| 관리자 강제 배정 | 예외 케이스가 실제로 발생하면 추가 |
| 당일 취소 마감 시각 | 규칙만 늘고 실익이 불확실 |

## 2. 확정된 요구사항

| 항목 | 결정 |
|---|---|
| 기능 활성화 단위 | 클럽별 on/off. 기본 **꺼짐** |
| 정원 설정 | 클럽 기본 대수 + 운동 일정별 덮어쓰기 |
| 정원 초과 시 | **대기 순번** 부여, 앞사람 취소 시 자동 승격 |
| 승격 알림 | 없음 (화면에서 확인) |
| 신청 전제 조건 | **운동 참여 신청을 먼저** 해야 주차 신청 가능 |
| 참여 취소 시 | 주차 신청도 함께 취소되고 대기자 승격 |
| 정원 축소 시 | 뒷순번 확정자를 대기로 강등 |
| 신청 대상 | 승인된 클럽 회원만 |

## 3. 데이터 모델

### 3.1 `ClubCustomSettings` 추가 필드

클럽마다 기능 사용 여부가 다르므로 기존 클럽 설정 모델에 둔다.

| 필드 | 타입 | 기본값 | 용도 |
|---|---|---|---|
| `parkingEnabled` | `Boolean` | `false` | 주차 신청 기능 사용 여부 |
| `parkingDefaultCapacity` | `Int` | `0` | 운동 일정의 기본 주차 대수 |

기본값이 `false`이므로 기존 클럽은 아무 영향을 받지 않는다.

### 3.2 `Workout` 추가 필드

| 필드 | 타입 | 기본값 | 용도 |
|---|---|---|---|
| `parkingCapacity` | `Int?` | `null` | 그날의 주차 대수. `null`이면 클럽 기본값 사용 |

"상황마다 5대 또는 6대"라는 요구를 이 필드가 담당한다. 관리자가 특정 날짜만
숫자를 덮어쓴다.

유효 정원을 구하는 규칙은 한 곳에서만 정의한다.

```
effectiveCapacity = workout.parkingCapacity ?? clubSettings.parkingDefaultCapacity
```

`0`과 `null`은 다르다. `0`은 "그날은 주차 자리가 없음"을 관리자가 명시한
상태이고, `null`은 "따로 정하지 않았으니 클럽 기본값을 따름"이다.

### 3.3 `ParkingRequest` 신규 모델

```prisma
model ParkingRequest {
  id           Int      @id @default(autoincrement())
  workoutId    Int
  clubMemberId Int
  status       String   @default("CONFIRMED") // CONFIRMED | WAITLIST
  position     Int      // 신청 순번 (1부터). 승격/강등 판정 기준
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  workout      Workout    @relation(fields: [workoutId], references: [id], onDelete: Cascade)
  clubMember   ClubMember @relation(fields: [clubMemberId], references: [id])

  @@unique([workoutId, clubMemberId])
  @@index([workoutId, position])
}
```

`status`와 `position`을 함께 저장한다. `status`만으로는 "다음에 승격할 사람"을
정할 수 없고, `position`만으로는 정원 축소로 강등된 상태를 표현할 수 없다.

`status`는 `WorkoutParticipant.status`가 이미 `String`인 전례를 따른다.
enum이 더 안전하나, 기존 코드와의 일관성을 우선한다.

### 3.4 마이그레이션

프로젝트 규칙(`CLAUDE.md`)에 따라 다음 순서로 진행한다.

1. `prisma/schema/workout.prisma`, `clubCustomSetting.prisma` 수정
2. `npm run build:schema`
3. `npx prisma migrate diff ... --script`로 변경 내역 확인
4. **diff 출력에서 이 작업에 필요한 SQL만 골라** 마이그레이션 파일 작성
5. 적용할 SQL과 영향 범위를 사용자에게 설명하고 **승인 대기**
6. 승인 후 `db execute` → `migrate resolve` → `generate`

기존 스키마 드리프트(`PostCategory`, `PostComment`, `PaymentRecord` 등의
인덱스·FK)가 diff에 함께 출력되므로 4번의 선별이 필수다.

## 4. 배정 로직

주차 배정은 세 군데에서 호출된다. 중복을 막기 위해 `src/lib/workout/parking.ts`에
순수 함수로 분리하고, Prisma 트랜잭션 클라이언트를 인자로 받는다.

```
recalcParkingAssignments(tx, workoutId, capacity)
```

이 함수는 해당 운동의 모든 `ParkingRequest`를 `position` 오름차순으로 읽어,
앞에서 `capacity`개를 `CONFIRMED`로, 나머지를 `WAITLIST`로 설정한다.
승격·강등을 개별 규칙으로 나누지 않고 **전체 재계산 한 가지로 통일**하면
세 경우가 모두 같은 코드로 처리된다.

### 4.1 신청 (POST)

트랜잭션 안에서 수행한다.

1. 클럽 회원 여부 확인, `parkingEnabled` 확인
2. 해당 운동에 `WorkoutParticipant`가 있는지 확인 (없으면 400)
3. 현재 최대 `position` + 1로 `ParkingRequest` 생성
4. `recalcParkingAssignments` 호출

`@@unique([workoutId, clubMemberId])`가 중복 신청을 DB 레벨에서 막는다.
동시에 마지막 자리를 누른 두 요청은 트랜잭션 직렬화로 순번이 갈린다.

### 4.2 취소 (DELETE)

1. 해당 `ParkingRequest` 삭제
2. `recalcParkingAssignments` 호출

취소된 건이 대기 상태였다면 재계산 결과는 앞사람들과 동일하므로
아무도 승격되지 않는다. 별도 분기가 필요 없다.

### 4.3 정원 변경 (PATCH)

1. `Workout.parkingCapacity` 갱신
2. 새 정원으로 `recalcParkingAssignments` 호출

6 → 5로 줄이면 `position`이 가장 큰 확정자 1명이 대기로 강등된다.
이미 확정된 사람을 유지하고 초과 상태를 허용하는 대안도 있으나,
실제 자리보다 많은 사람이 "확정"으로 표시되면 현장에서 문제가 되므로
강등을 택한다.

### 4.4 운동 참여 취소 연동

`/api/workouts/[workoutId]/participate`의 DELETE 분기를 트랜잭션으로 감싸
`WorkoutParticipant` 삭제와 함께 `ParkingRequest`를 삭제하고
`recalcParkingAssignments`를 호출한다.

## 5. 화면

### 5.1 회원 — 출석체크 페이지 운동 카드

`parkingEnabled`가 켜진 클럽에서만 주차 영역이 나타난다.

```
┌─────────────────────────────────┐
│ 수요일 정기운동          ⋯      │
│ 📅 2026-09-16                   │
│ ⏰ 19:00 - 22:00                │
│ 📍 OO초등학교 체육관            │
│ 👥 참여 인원: 12명              │
│ 🚗 주차: 5/5 (대기 2명)         │
├─────────────────────────────────┤
│ [      참여 취소      ]         │
│ [  🚗 주차 대기 신청  ]         │
└─────────────────────────────────┘
```

주차 버튼 상태:

| 상황 | 문구 | 동작 |
|---|---|---|
| 운동 미참여 | `운동 참여 후 신청 가능` | 비활성 |
| 참여 중, 자리 있음 | `🚗 주차 신청` | POST |
| 참여 중, 정원 참 | `🚗 주차 대기 신청` | POST |
| 확정됨 | `주차 확정 · 취소하기` | DELETE |
| 대기 중 | `대기 3번 · 취소하기` | DELETE |

### 5.2 관리자 — 클럽 설정

`/clubs/[id]/custom`에 `parking` 탭을 추가한다. 기존 탭들과 같은 구조로
`ParkingSettingsForm` 컴포넌트를 만든다. 입력은 두 개뿐이다.

- 주차 신청 기능 사용 (토글)
- 기본 주차 대수 (숫자)

### 5.3 관리자 — 운동별 주차 명단

`/clubs/[id]/workouts/[workoutId]` 상세 페이지에 주차 섹션을 추가한다.

- 그날 정원 입력란 (관리자만)
- 확정자 목록 (`position` 순)
- 대기자 목록 (`position` 순, 대기 번호 표시)

관리자가 당일 누가 주차하는지 확인하는 용도다. 이 화면이 없으면
DB를 직접 봐야 하므로 1단계에 포함한다.

## 6. API

| 경로 | 메서드 | 역할 | 권한 |
|---|---|---|---|
| `/api/workouts/[workoutId]/parking` | POST | 주차 신청 | 클럽 회원 |
| `/api/workouts/[workoutId]/parking` | DELETE | 주차 취소 | 본인 |
| `/api/workouts/[workoutId]/parking/capacity` | PATCH | 그날 정원 변경 | 관리자 |
| `/api/clubs/[id]/custom/parking` | GET | 클럽 주차 설정 조회 | 클럽 회원 |
| `/api/clubs/[id]/custom/parking` | PUT | 클럽 주차 설정 변경 | 관리자 |

기존 API 수정 2건:

| 경로 | 변경 |
|---|---|
| `/api/clubs/[id]/workouts` GET | 응답에 주차 현황(정원, 확정 수, 대기 수, 내 상태) 추가 |
| `/api/workouts/[workoutId]/participate` DELETE | 주차 신청 연동 취소 |

## 7. 테스트

`src/lib/` 아래에 `*.test.ts`가 이미 있으므로 같은 패턴을 따른다.
배정 로직을 순수 함수로 분리한 이유가 여기에 있다.

`src/lib/workout/parking.test.ts`:

- 정원 미달 상태의 신청은 `CONFIRMED`
- 정원이 찬 상태의 신청은 `WAITLIST`
- 확정자 취소 시 첫 대기자가 `CONFIRMED`로 승격
- 대기자 취소 시 다른 사람의 상태가 변하지 않음
- 정원 축소 시 뒷순번 확정자가 `WAITLIST`로 강등
- 정원 확대 시 대기자가 순번대로 승격
- 정원이 0이면 모든 신청이 `WAITLIST`

API 레벨은 운동 참여 취소가 주차 신청까지 지우는지를 확인한다.

## 8. 구현 순서

1. 스키마 변경 + 마이그레이션 (**사용자 승인 후 적용**)
2. `recalcParkingAssignments` + 테스트
3. 주차 신청/취소 API
4. 클럽 설정 API + 관리자 설정 탭
5. 출석체크 카드 UI
6. 운동 상세 주차 명단 + 정원 변경
7. 참여 취소 연동
