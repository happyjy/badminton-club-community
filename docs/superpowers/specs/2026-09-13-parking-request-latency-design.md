# 주차·게스트 신청 응답 지연 개선 설계

작성일: 2026-09-13

## 1. 배경과 문제

주차 신청 기능 배포 후, **버튼을 눌러도 1~2초간 아무 반응이 없다**는 문제가 확인됐다.
반응이 없으니 회원들이 버튼을 여러 번 누른다.

중복 신청 자체는 DB 유니크 제약으로 막혀 409를 반환하지만,
`alert`로 "이미 주차를 신청했습니다"가 뜨는 것이 실제 증상이다.
데이터는 안전하나 사용자 경험이 나쁘다.

### 1.1 원인 분석

**원인 A — 왕복이 두 번이다.**

버튼 클릭 한 번에 요청이 두 개 나간다.

```
1. POST /api/workouts/[workoutId]/parking       (신청 처리)
2. GET  /api/clubs/[id]/workouts                (목록 전체 재조회)
```

2번이 무겁다. 주차 신청 응답이 `{ status, message }`뿐이라
화면 갱신에 필요한 정보가 없어, 8일치 운동 목록을 통째로 다시 불러온다.
운동·참가자·게스트·주차 신청이 전부 포함된다.

각 엔드포인트가 Prisma 쿼리를 5개씩 실행하므로, 클릭 한 번에 **최대 10개 쿼리**가
순차로 원격 Supabase를 왕복한다. 서울 리전이라도 왕복 지연이 누적되면
1~2초는 쉽게 나온다.

**원인 B — 문자 발송이 응답을 붙잡는다.**

주차 승격 문자와 게스트 신청 관련 문자 모두 `await`로 완료를 기다린 뒤 응답한다.
게스트 신청(`apply.ts`)은 문자와 이메일을 `Promise.allSettled`로 모두 기다린 다음
201을 반환한다(`apply.ts:205, 210`).

**원인 C — 버튼에 진행 표시가 없다.**

처리 중임을 알 수 없으니 다시 누른다.

### 1.2 검증한 사실

사용자 질문에 따라 코드에서 두 가지를 확인했다.

**주차 문자는 항상 발송되지 않는다.** 아래를 모두 만족해야 한다.

| 조건 | 미충족 시 동작 |
|---|---|
| 클럽 `parkingEnabled` | 요청 자체가 400으로 거부 |
| 클럽 `parkingSmsEnabled` | `notifyParkingPromotion` 즉시 반환 |
| 대기 → 확정 **실제 승격** | 승격 목록이 비어 즉시 반환 |
| 유효한 전화번호 | 해당 회원만 건너뜀 |

세 번째가 핵심이다. 자리가 남아 있을 때 신청하면 본인이 바로 확정되지만
이는 "승격"이 아니므로 `promotedClubMemberIds`가 비어 있고 **문자가 나가지 않는다.**
문자는 누군가 취소해 대기자가 올라갈 때만 발송된다.

**따라서 일반적인 신청의 지연은 문자 탓이 아니다.** 원인 A가 주범이다.
다만 승격이 발생하는 경우와 게스트 신청에서는 원인 B도 실제로 작용한다.

## 2. 확정된 요구사항

| 항목 | 결정 |
|---|---|
| 펜딩 표시 방식 | **아이콘(스피너)**. "처리 중" 같은 문구는 쓰지 않는다 |
| 중복 클릭 | 처리 중 버튼 비활성화로 물리적 차단 |
| 문자 발송 시점 | ~~응답 이후로 분리~~ → **제외**. `after()`가 Pages Router에서 동작하지 않음 (3.2 참고) |
| 문자 발송 실패 처리 | **로그만 남긴다** (아래 2.1 참고) |
| 목록 재조회 | **제거**. API 응답의 주차 현황으로 해당 운동만 갱신 |
| 다른 사용자의 변경 반영 | 즉시 반영하지 않는다 (트레이드오프 수용) |

### 2.1 문자 실패를 로그로만 남기는 이유

문자는 유일한 전달 경로가 아니다. 게스트 신청은 목록에 남아 임원이 확인할 수 있고,
주차 상태는 회원이 화면에서 직접 볼 수 있다.

**실패 기록을 DB에 저장하는 작업은 별도로 진행한다.** 현재 Vercel을 쓰고 있어
로그 보존 기간이 며칠뿐이라, 문자 실패만이 아니라 **에러 전반을 DB에 남기는 구조**를
따로 구성할 계획이다. 문자 발송 실패도 그 체계 안에서 다루는 것이 맞다.

## 3. 해결 방안

### 3.1 펜딩 아이콘 표시

버튼을 누르면 스피너 아이콘이 돌고 버튼이 잠긴다. 응답이 오면 원래 상태로 돌아간다.

기존 `src/components/atoms/Spinner.tsx`가 있으므로 재사용한다.

대상 버튼:

- 출석체크 카드의 주차 신청/취소 버튼
- 출석체크 카드의 운동 참여/취소 버튼 (같은 문제를 공유)

### 3.2 문자 발송을 응답 이후로 분리

응답을 먼저 보내고 문자는 그 뒤에 발송한다.

| 파일 | 현재 |
|---|---|
| `api/workouts/[workoutId]/parking.ts` | `await notifyParkingPromotion` 후 응답 |
| `api/workouts/[workoutId]/parking/capacity.ts` | 동일 |
| `api/workouts/[workoutId]/participate.ts` | 동일 |
| `api/clubs/[id]/guests/apply.ts` | 문자+이메일 모두 대기 후 201 |
| `api/clubs/[id]/guests/[guestId]/status.ts` | `await sendStatusUpdateSms` |
| `api/clubs/[id]/guests/[guestId]/comments/index.ts` | `await sendCommentAddedSms` |

#### 서버리스 제약과 해결책

**단순히 `await`를 떼면 안 된다.** Vercel 같은 서버리스 환경은 응답을 반환하는 순간
함수 실행을 종료할 수 있다. `void notifyParkingPromotion(...)` 식으로 던져두면
문자가 아예 발송되지 않을 수 있고, 더 나쁘게는 **어떤 날은 가고 어떤 날은 안 가는**
비결정적 동작이 된다.

Next.js 15.5의 `after()`를 쓴다. 확인 결과 이 프로젝트에서 사용 가능하다.

```ts
import { after } from 'next/server';

// 응답을 먼저 보낸다
res.status(200).json({ status, message, parking });

// 응답 이후에 실행되며, 플랫폼이 함수 생존을 보장한다
after(async () => {
  await notifyParkingPromotion({ clubMemberIds: promoted, workoutId, smsEnabled });
});
```

- `next/server`에서 export됨 (`node_modules/next/server.d.ts:16`)
- 시그니처: `after<T>(task: Promise<T> | (() => T | Promise<T>)): void`

#### 검증 결과: `after()`는 쓸 수 없다 (2026-09-13 확인)

임시 엔드포인트를 만들어 실제로 호출한 결과, **Pages Router API Routes에서는
`after()`가 동작하지 않는다.** 500 에러가 발생한다.

```
Error: `after` was called outside a request scope.
  at after (next/dist/server/after/after.js:16:37)
  at handler (src/pages/api/_after-probe.ts:11:53)
  at apiResolver (next/dist/compiled/next-server/pages-api.runtime.dev.js)
```

`after()`는 App Router의 요청 컨텍스트에 의존하는데, Pages Router API Routes는
그 컨텍스트를 만들지 않는다. **타입 체크는 통과하므로 런타임에서만 드러나는
종류의 실패다.** 배포 후에야 알았다면 문자가 전부 500으로 실패했을 것이다.

#### 결론: 문자 발송 분리는 이번 범위에서 제외한다

남은 대안을 검토했으나 모두 채택하지 않는다.

| 대안 | 방식 | 왜 안 쓰나 |
|---|---|---|
| `res.on('finish')` | Node 응답 이벤트 후 발송 | Vercel이 응답 직후 함수를 종료해 발송이 보장되지 않음 |
| `void promise` | `await` 없이 던져둠 | 위와 동일. 비결정적으로 문자가 누락됨 |
| 큐/작업 테이블 | 발송 요청을 DB에 쌓고 별도 워커가 처리 | 인프라가 늘어남. 이 문제에 비해 과함 |

**문자 분리 없이도 목표는 달성된다.** 1.2에서 확인했듯 일반적인 주차 신청은
애초에 문자를 발송하지 않는다(승격이 아니므로). 지연의 주범은 원인 A이고,
3.3이 그것을 해결한다.

게스트 신청(`apply.ts`)은 문자·이메일을 기다리므로 실제로 느리지만,
이는 **임원이 가끔 쓰는 화면**이라 회원이 매번 겪는 주차 신청과 체감 비중이 다르다.
필요해지면 별도 작업으로 큐 방식을 검토한다.

향후 2.1의 에러 로그 DB 저장 작업에서 작업 테이블이 생긴다면,
그 위에서 문자 발송 큐를 함께 다루는 것이 자연스럽다.

### 3.3 목록 전체 재조회 제거

주차 API 응답에 갱신된 주차 현황을 담는다.

```ts
// 현재
{ status: 'CONFIRMED', message: '주차가 확정되었습니다' }

// 변경 후
{
  status: 'CONFIRMED',
  message: '주차가 확정되었습니다',
  parking: {
    enabled: true,
    capacity: 5,
    confirmedCount: 3,
    waitlistCount: 0,
    overrideCapacity: null,
    myStatus: 'CONFIRMED',
    myWaitlistOrder: null,
  }
}
```

`WorkoutParkingStatus` 타입이 이미 `src/types/parking.types.ts`에 있으므로 재사용한다.

클라이언트는 `fetchWorkouts()` 대신 해당 운동의 `parking`만 교체한다.

```ts
setWorkouts((prev) =>
  prev.map((w) => (w.id === workoutId ? { ...w, parking: result.parking } : w))
);
```

서버는 재계산을 이미 마쳤으므로 현황 집계에 드는 추가 쿼리는 1회뿐이다.

### 3.4 수용한 트레이드오프

목록 전체를 다시 불러오지 않으므로 **다른 회원이 그사이 신청한 내용은 화면에
즉시 반영되지 않는다.** 내 카드의 주차 현황만 정확해진다.

주차를 신청하는 시점에 다른 운동의 참가자 수가 실시간으로 맞아야 할 이유는 없다.
페이지를 다시 열거나 새로고침하면 최신 상태가 된다.

## 4. 검토했으나 채택하지 않은 것

**낙관적 업데이트(optimistic update)** — 누르는 즉시 화면을 바꾸고 실패 시 되돌리는 방식.
가장 빠르지만 클라이언트가 확정/대기 여부와 대기 순번을 추측해야 한다.
그사이 다른 회원이 취소하면 서버 재계산 결과와 어긋난다.

**주차 순번은 회원이 아침에 차를 몰지 결정하는 근거다.** 틀린 숫자를 보여주는
위험을 감수할 만한 이득이 아니다.

**단일 운동 재조회** — 목록 대신 해당 운동만 다시 조회하는 방식.
왕복이 여전히 두 번이라 3.3보다 이득이 적다.

## 5. 이 작업이 하지 않는 것

| 제외 항목 | 사유 |
|---|---|
| 문자 발송 분리 | `after()`가 Pages Router에서 동작하지 않음. 대안은 모두 과하거나 불안정 (3.2 참고) |
| 에러 로그 DB 저장 | 별도 작업으로 계획 중 (2.1 참고) |
| 낙관적 업데이트 | 4장 참고 |
| 실시간 동기화 | 폴링·웹소켓은 이 문제에 과한 해법 |
| 게스트 신청 화면의 펜딩 표시 | 이번 범위는 출석체크 화면. 필요해지면 추가 |
