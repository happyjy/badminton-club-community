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

| 제외 항목           | 사유                                                 |
| ------------------- | ---------------------------------------------------- |
| 차량번호 수집       | 2단계로 미룸. 사전 등록 명단 제출 필요 여부 미확정   |
| 앱 내 알림          | 2단계. 알림 저장·읽음 처리·표시 영역이 별도 작업     |
| 게스트 주차 신청    | `GuestPost`는 계정이 없을 수 있어 범위가 크게 늘어남 |
| 관리자 강제 배정    | 예외 케이스가 실제로 발생하면 추가                   |
| 당일 취소 마감 시각 | 규칙만 늘고 실익이 불확실                            |

## 2. 확정된 요구사항

| 항목             | 결정                                          |
| ---------------- | --------------------------------------------- |
| 기능 활성화 단위 | 클럽별 on/off. 기본 **꺼짐**                  |
| 정원 설정        | 평일/주말 기본 대수 + 운동 일정별 덮어쓰기    |
| 정원 초과 시     | **대기 순번** 부여, 앞사람 취소 시 자동 승격  |
| 승격 알림        | **SMS 문자**. 클럽별로 발송 여부 on/off       |
| 신청 전제 조건   | **운동 참여 신청을 먼저** 해야 주차 신청 가능 |
| 참여 취소 시     | 주차 신청도 함께 취소되고 대기자 승격         |
| 정원 축소 시     | 뒷순번 확정자를 대기로 강등                   |
| 신청 대상        | 승인된 클럽 회원만                            |

## 3. 데이터 모델

### 3.1 `ClubCustomSettings` 추가 필드

클럽마다 기능 사용 여부가 다르므로 기존 클럽 설정 모델에 둔다.

| 필드                     | 타입      | 기본값  | 용도                            |
| ------------------------ | --------- | ------- | ------------------------------- |
| `parkingEnabled`         | `Boolean` | `false` | 주차 신청 기능 사용 여부      |
| `parkingWeekdayCapacity` | `Int`     | `0`     | 평일(월~금) 기본 주차 대수    |
| `parkingWeekendCapacity` | `Int`     | `0`     | 주말(토·일) 기본 주차 대수    |
| `parkingSmsEnabled`      | `Boolean` | `false` | 대기 → 확정 승격 시 문자 발송 |

평일과 주말로 대수가 규칙적으로 갈리는 경우가 있어 기본값을 두 개로 나눈다.
매주 같은 값을 손으로 고치는 일을 없애기 위해서다.
운동 일정 생성 폼(`WorkoutScheduleForm`)이 이미 시작·종료 시간을
평일/주말로 나눠 받고 있어 사용자에게 익숙한 구분이다.

기본값이 `false`이므로 기존 클럽은 아무 영향을 받지 않는다.

`parkingSmsEnabled`를 별도 토글로 둔 이유는 **문자가 건당 과금**이기 때문이다.
주차 기능은 쓰되 문자 비용은 부담하지 않으려는 클럽이 있을 수 있다.
`parkingEnabled`가 꺼져 있으면 이 값과 무관하게 문자는 발송되지 않는다.

### 3.2 `Workout` 추가 필드

| 필드              | 타입   | 기본값 | 용도                                          |
| ----------------- | ------ | ------ | --------------------------------------------- |
| `parkingCapacity` | `Int?` | `null` | 그날의 주차 대수. `null`이면 클럽 기본값 사용 |

"상황마다 5대 또는 6대"라는 요구를 이 필드가 담당한다. 관리자가 특정 날짜만
숫자를 덮어쓴다.

`0`과 `null`은 다르다. `0`은 "그날은 주차 자리가 없음"을 관리자가 명시한
상태이고, `null`은 "따로 정하지 않았으니 클럽 기본값을 따름"이다.

### 3.3 유효 정원 계산

주차 대수는 세 군데에 흩어져 있다. 그날 지정값, 주말 기본값, 평일 기본값이다.
**어느 값을 쓸지 판정하는 코드는 함수 하나에만 존재한다.**

```ts
// src/lib/workout/parking.ts
export function resolveParkingCapacity(
  workout: { date: Date; parkingCapacity: number | null },
  settings: { parkingWeekdayCapacity: number; parkingWeekendCapacity: number }
): number;
```

현재 구현은 구체적인 쪽이 이기는 3단 구조다.

```
workout.parkingCapacity                    // 1. 그날 지정이 있으면 그것
?? isWeekend(workout.date)                 // 2. 없으면 요일로 갈림
     ? settings.parkingWeekendCapacity
     : settings.parkingWeekdayCapacity
```

적용 예시:

| 운동 일정         | 그날 입력값 | 실제 적용 | 근거            |
| ----------------- | ----------- | --------- | --------------- |
| 9월 16일 (수)     | 없음        | 5대       | 평일 기본값     |
| 9월 19일 (토)     | 없음        | 6대       | 주말 기본값     |
| 9월 20일 (일)     | 3           | 3대       | 그날만 덮어씀   |
| 9월 23일 (수)     | 없음        | 5대       | 다시 평일 기본값 |

#### 왜 함수로 고정하는가

지금은 평일/주말 두 구분으로 충분하지만, 앞으로 요일별 설정이나 기간 한정
규칙이 필요해질 수 있다. 그때 **이 함수의 내부만 교체하면 된다.**
API·화면·배정 로직은 모두 이 함수만 호출하므로 한 줄도 바뀌지 않는다.

구글 캘린더식 반복 규칙(RRULE)을 지금 도입하지 않는 이유는 비용이다.
규칙 파서, 규칙 간 우선순위, 예외 처리, 규칙 편집 UI가 모두 따라온다.
주차 대수 하나를 정하는 데 그만한 구조는 과하고, 아직 확정되지 않은
요구사항에 맞춰 설계하게 된다.

확장이 실제로 필요해지면 두 방향이 열려 있다.

| 방식        | 저장 형태               | 적합한 경우                  |
| ----------- | ----------------------- | ---------------------------- |
| 요일별 7칸  | 설정에 칸 7개           | "수요일만 3대" 같은 고정 규칙 |
| 규칙 테이블 | 우선순위를 가진 행 여러 개 | 기간 한정, 격주, 복잡한 조합 |

어느 쪽으로 가도 **기존 데이터는 버려지지 않는다.** 평일값과 주말값은
요일 7칸으로 펼치면 그대로 옮겨지고, 규칙 테이블로 가면
"평일 규칙 1개 + 주말 규칙 1개"로 변환된다.

### 3.4 `ParkingRequest` 신규 모델


```prisma
model ParkingRequest {
  id           Int      @id @default(autoincrement())
  workoutId    Int
  clubMemberId Int
  status       String   @default("CONFIRMED") // CONFIRMED | WAITLIST
  position     Int      // 신청 순번 (1부터). 승격/강등 판정 기준
  promotedSmsAt DateTime? // 승격 문자 발송 시각. 중복 발송 방지용
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

### 3.5 마이그레이션

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

인자로 받는 `capacity`는 호출하는 쪽에서 `resolveParkingCapacity`(3.3)로
구한 값이다. 이 함수는 평일/주말 판정을 알지 못한다.
정원을 **정하는 일**과 정원에 맞춰 **배정하는 일**을 나눠 두면,
나중에 정원 규칙이 복잡해져도 배정 로직은 손대지 않는다.

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

### 4.5 승격 SMS 알림

대기 중이던 회원이 확정으로 바뀌면 문자로 알린다. 주차는 당일 아침에
차를 몰지 결정하는 문제라, 회원이 직접 화면을 확인하기 전에 알려야 실효가 있다.

**발송 조건** — 아래를 모두 만족할 때만 보낸다.

1. 클럽의 `parkingEnabled`가 `true`
2. 클럽의 `parkingSmsEnabled`가 `true`
3. 해당 건의 상태가 `WAITLIST` → `CONFIRMED`로 **바뀐 경우**
4. 회원에게 `phoneNumber`가 있음

`CONFIRMED` → `WAITLIST` 강등이나 상태가 그대로인 경우는 발송하지 않는다.

**재계산 함수와의 관계** — `recalcParkingAssignments`는 순수 함수로 유지한다.
함수는 상태를 갱신하고 **승격된 `clubMemberId` 목록을 반환**하며,
문자 발송은 호출한 API가 담당한다. 이렇게 나누면 배정 로직을 문자 발송
없이 테스트할 수 있다.

```
const promoted = await recalcParkingAssignments(tx, workoutId, capacity)
// 트랜잭션 커밋 후
await sendParkingPromotionSms(promoted, workout)
```

문자 발송은 **트랜잭션 밖에서** 한다. 외부 API 호출이 트랜잭션을 오래 붙잡으면
DB 커넥션이 묶이고, 발송 실패가 배정까지 되돌리는 건 바람직하지 않다.
문자가 실패해도 배정은 유효하며, 실패는 로그로 남긴다.

**기존 SMS 인프라의 제약** — `SmsNotificationLog`는 `guestPostId`가 필수이고
`GuestPost`에 FK로 묶여 있어 주차 알림에 재사용할 수 없다.
발송 함수(`src/lib/sms.ts`의 `sendSMS`)는 그대로 쓰고,
중복 발송 방지는 `ParkingRequest`에 필드를 하나 두어 해결한다.

| 필드            | 타입        | 용도                                   |
| --------------- | ----------- | -------------------------------------- |
| `promotedSmsAt` | `DateTime?` | 승격 문자를 보낸 시각. `null`이면 미발송 |

승격 후 강등됐다가 다시 승격되는 경우 문자가 두 번 나가는 것은 정상이다.
`promotedSmsAt`은 **같은 승격 건에 대한 중복 발송**만 막는다.
강등 시 이 값을 `null`로 되돌린다.

**문자 내용**

```
[당산배드민턴] 주차 신청이 확정되었습니다.
9/18(금) 19:00 OO초등학교
```

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

| 상황               | 문구                     | 동작   |
| ------------------ | ------------------------ | ------ |
| 운동 미참여        | `운동 참여 후 신청 가능` | 비활성 |
| 참여 중, 자리 있음 | `🚗 주차 신청`           | POST   |
| 참여 중, 정원 참   | `🚗 주차 대기 신청`      | POST   |
| 확정됨             | `주차 확정 · 취소하기`   | DELETE |
| 대기 중            | `대기 3번 · 취소하기`    | DELETE |

### 5.2 관리자 — 클럽 설정

`/clubs/[id]/custom`에 `parking` 탭을 추가한다. 기존 탭들과 같은 구조로
`ParkingSettingsForm` 컴포넌트를 만든다. 입력은 두 개뿐이다.

- 주차 신청 기능 사용 (토글)
- 평일 기본 주차 대수 (숫자)
- 주말 기본 주차 대수 (숫자)
- 승격 시 문자 발송 (토글)

문자 발송 토글은 기능 사용이 켜져 있을 때만 조작할 수 있게 하고,
건당 비용이 발생한다는 안내 문구를 함께 둔다.

### 5.3 관리자 — 운동별 주차 명단

`/clubs/[id]/workouts/[workoutId]` 상세 페이지에 주차 섹션을 추가한다.

- 그날 정원 입력란 (관리자만)
- 확정자 목록 (`position` 순)
- 대기자 목록 (`position` 순, 대기 번호 표시)

관리자가 당일 누가 주차하는지 확인하는 용도다. 이 화면이 없으면
DB를 직접 봐야 하므로 1단계에 포함한다.

## 6. API

| 경로                                         | 메서드 | 역할                | 권한      |
| -------------------------------------------- | ------ | ------------------- | --------- |
| `/api/workouts/[workoutId]/parking`          | POST   | 주차 신청           | 클럽 회원 |
| `/api/workouts/[workoutId]/parking`          | DELETE | 주차 취소           | 본인      |
| `/api/workouts/[workoutId]/parking/capacity` | PATCH  | 그날 정원 변경      | 관리자    |
| `/api/clubs/[id]/custom/parking`             | GET    | 클럽 주차 설정 조회 | 클럽 회원 |
| `/api/clubs/[id]/custom/parking`             | PUT    | 클럽 주차 설정 변경 | 관리자    |

기존 API 수정 2건:

| 경로                                           | 변경                                                   |
| ---------------------------------------------- | ------------------------------------------------------ |
| `/api/clubs/[id]/workouts` GET                 | 응답에 주차 현황(정원, 확정 수, 대기 수, 내 상태) 추가 |
| `/api/workouts/[workoutId]/participate` DELETE | 주차 신청 연동 취소                                    |

## 7. 테스트

`src/lib/` 아래에 `*.test.ts`가 이미 있으므로 같은 패턴을 따른다.
배정 로직을 순수 함수로 분리한 이유가 여기에 있다.

`src/lib/workout/parking.test.ts`:

`resolveParkingCapacity` — 정원을 정하는 규칙:

- 평일 운동은 `parkingWeekdayCapacity`를 쓴다
- 주말 운동은 `parkingWeekendCapacity`를 쓴다
- `workout.parkingCapacity`가 있으면 요일과 무관하게 그 값이 이긴다
- `workout.parkingCapacity`가 `0`이면 기본값으로 넘어가지 않고 `0`이다

`recalcParkingAssignments` — 정원에 맞춰 배정하는 규칙:

- 정원 미달 상태의 신청은 `CONFIRMED`
- 정원이 찬 상태의 신청은 `WAITLIST`
- 확정자 취소 시 첫 대기자가 `CONFIRMED`로 승격
- 대기자 취소 시 다른 사람의 상태가 변하지 않음
- 정원 축소 시 뒷순번 확정자가 `WAITLIST`로 강등
- 정원 확대 시 대기자가 순번대로 승격
- 정원이 0이면 모든 신청이 `WAITLIST`
- 승격된 회원 목록을 반환한다
- 강등만 발생한 경우 반환 목록이 비어 있다
- 상태가 변하지 않으면 반환 목록이 비어 있다

문자 발송 조건도 함께 검증한다.

- `parkingSmsEnabled`가 꺼져 있으면 발송하지 않는다
- `promotedSmsAt`이 이미 있으면 재발송하지 않는다
- 강등 시 `promotedSmsAt`이 `null`로 초기화된다

API 레벨은 운동 참여 취소가 주차 신청까지 지우는지를 확인한다.

## 8. 구현 순서

1. 스키마 변경 + 마이그레이션 (**사용자 승인 후 적용**)
2. `resolveParkingCapacity` + `recalcParkingAssignments` + 테스트
3. 주차 신청/취소 API
4. 클럽 설정 API + 관리자 설정 탭
5. 출석체크 카드 UI
6. 운동 상세 주차 명단 + 정원 변경
7. 참여 취소 연동
8. 승격 SMS 발송
