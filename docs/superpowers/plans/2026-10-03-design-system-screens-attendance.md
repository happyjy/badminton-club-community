# 휴대폰 화면 옮기기 ① 출석체크 · 운동 상세 (4단계) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 출석체크와 운동 상세 화면의 안쪽 모양을 새 디자인(묶음 리스트, 토큰 색, 한 가지 아이콘 세트)으로 옮긴다.

**Architecture:** 화면에서 "데이터를 읽는 부분"(페이지)과 "그리는 부분"(props만 받는 컴포넌트)을 나눈다. 그리는 부분은 가짜 데이터로도 그릴 수 있어서 테스트와 개발용 미리보기에서 로그인 없이 확인할 수 있다. 기능·문구·API 호출은 그대로 둔다. 옮긴 파일에 옛 색·이모지·그라디언트가 다시 들어오지 못하게 지킴이 테스트에 파일을 등록한다.

**Tech Stack:** Next.js 15 (pages router) · React 19 · Tailwind CSS 3.4 · lucide-react · @headlessui/react 2.2 · Jest 30 + @testing-library/react 16

**Spec:** `docs/superpowers/specs/2026-10-03-design-system-design.md` (2장 원칙, 4장 부품, 5-2 화면 배치, 6장 모노크롬 보완 원칙 W1–W4, 7장 4단계)
**앞 계획:** `2026-10-03-design-system-foundation.md` · `…-adoption.md` · `…-app-shell.md` (부품의 props)

**이 계획의 형식에 대해:** 앞 계획들과 달리 구현 코드를 문서에 통째로 싣지 않는다. 과제마다 파일·인터페이스·화면 구성·**테스트가 고정해야 할 동작 목록**을 적고, 코드는 실행하면서 테스트를 먼저 쓰는 방식(TDD)으로 만든다. 같은 사람이 계획하고 바로 실행하며, 화면 코드는 기존 파일을 읽어 가며 옮겨야 해서 미리 써 둔 코드가 곧 낡기 때문이다.

## 범위

| 포함 | 제외 |
| --- | --- |
| 출석체크: 운동 카드, 화면 제목, 빈 화면, 로딩 표시, 운영진 메뉴 | 게스트 · 게시판 · 대회 · 내 정보 · 로그인 → 4단계의 다음 계획들 |
| 운동 상세: 일정 정보, 방문 게스트, 참여자, 도움 기록, 주차 명단 | 회원 화면 PC 폭을 `max-w-2xl`로 좁히기 → 4단계 화면을 다 옮긴 뒤 한 번에 |
| `CircleMenu` → 이름이 붙은 시트, `WorkoutListItem` → `WorkoutCard` | 운동 일정 **만들기** 화면(클럽 설정 안) → 5단계 |
| 개발용 화면 미리보기, 옮긴 화면 지킴이 테스트 | API·DB·정렬 로직·권한 규칙 변경 |

## Global Constraints

- **기능은 그대로다.** 참여·취소, 주차 신청·취소, 일정 수정·삭제, 도움 기록, 주차 대수 변경의 호출 조건·인자·API 경로를 바꾸지 않는다. 버튼이 눌리지 않는 조건(처리 중, 인원 마감, 미참여 시 주차)도 그대로다.
- 옮긴 파일에는 Tailwind 기본 색 이름(`gray-`, `blue-`, `red-` 등), 색 값, 이모지, 그라디언트, `shadow-sm/md/lg`를 쓰지 않는다. 토큰 클래스만 쓴다.
- 색은 상태를 알릴 때만 쓴다(설계 P2). 주 버튼은 화면에서 가장 중요한 동작 하나에만 쓴다.
- 글자 크기는 7단계 토큰만. 누를 수 있는 요소의 터치 영역은 44 × 44 이상. 아이콘은 `lucide-react`(도움 기록의 그림 5개는 기존 svg를 그대로 쓴다).
- 화면 제목은 `PageHeader`로 하나만(h1). 목록이 비면 `EmptyState`, 불러오는 중이면 `Skeleton` 또는 `Spinner`.
- 테스트는 `@jest/globals`에서 가져오고 `@testing-library/jest-dom` 매처를 쓰지 않는다. 테스트 출력에 `console.error`가 없어야 한다.
- 타입 검사: `npx tsc --noEmit` — `src/lib/sms-notification.test.ts`의 기존 오류 13건 외에 새 오류가 없어야 한다.
- 전체 테스트: `npx jest "$(pwd)/src"` — 같은 파일의 기존 실패 6건 외에 실패가 없어야 한다.
- `npm run build`는 마지막 과제에서만. 빌드가 바꾸는 `public/` 아래 파일은 되돌린다.
- DB를 건드리지 않는다. `prisma` 명령을 실행하지 않는다.
- 커밋 메시지는 한국어 `feat(ui): …` / `refactor(ui): …`. AI 도구 서명을 넣지 않는다. 브랜치는 `feat/design-system-foundation`에서 이어서.

## Review Focus

1. **아주 긴 운동 제목·설명·장소** — 카드가 가로로 넘치거나 다른 요소를 밀어내지 않아야 한다. 제목은 한 줄, 설명은 두 줄에서 자른다. (Task 2)
2. **참여자 0명 / 게스트 0명 / 주차 꺼짐** — 빈 묶음이나 "0명 + 게스트 0명" 같은 군더더기 없이 해당 부분을 그리지 않거나 빈 화면 안내를 보여 준다. (Task 2, 4)
3. **요청이 처리되는 동안 버튼을 또 누른다** — 참여·주차·대수 변경 버튼은 처리 중에 눌리지 않아야 하고, 콜백이 두 번 불리면 안 된다. (Task 2, 4)
4. **클럽 회원 정보가 없는 참여자** — `clubMember`가 없는 참여자는 지금처럼 목록에서 빼되, 번호는 지금과 같은 규칙(전체에서의 순서)을 따른다. 도움 기록 시트는 `clubMemberId`가 없으면 열지 않는다. (Task 4)
5. **날짜가 자정 근처 / 문자열로 온다** — API는 날짜를 문자열로 준다. 요일이 하루 밀리지 않아야 하고, 잘못된 값이면 화면이 깨지지 않고 빈 글자가 나온다. (Task 1)

---

## File Structure

| 파일 | 하는 일 | 과제 |
| --- | --- | --- |
| `src/lib/workout/datetime.ts` (수정) | `formatWorkoutDateLabel` 추가 | 1 |
| `src/components/molecules/list/ListGroup.tsx` (수정) | `tone` 속성 (흰 시트 안에서는 연회색 묶음) | 1 |
| `src/components/organisms/navigation/MoreSheet.tsx` (수정) | 위 속성을 쓰도록 | 1 |
| `src/components/organisms/workout/WorkoutCard.tsx` (신규) | 출석체크의 운동 카드. `WorkoutListItem`을 대신한다 | 2 |
| `src/pages/clubs/[id]/attendance/index.tsx` (수정) | 그리는 부분만 교체 | 2 |
| `src/components/organisms/workout/WorkoutListItem.tsx` (삭제) | | 2 |
| `src/components/molecules/PersonInfo.tsx` (수정) | 토큰으로 다시 칠함 | 3 |
| `src/components/organisms/workout/HelperSheet.tsx` (신규) | 도움 기록 시트. `CircleMenu`를 대신한다 | 3 |
| `src/components/molecules/CircleMenu.tsx` (삭제) | | 4 |
| `src/components/organisms/workout/WorkoutParkingSection.tsx` (수정) | 토큰으로 다시 칠함 | 4 |
| `src/components/organisms/workout/WorkoutDetailView.tsx` (신규) | 운동 상세의 그리는 부분 | 4 |
| `src/pages/clubs/[id]/workouts/[workoutId].tsx` (수정) | 데이터만 읽어 `WorkoutDetailView`에 넘김 | 4 |
| `src/pages/dev/screen-preview.tsx` (신규) | 로그인 없이 두 화면을 가짜 데이터로 본다 | 5 |
| `src/constants/layoutVariant.ts` (수정) | 미리보기 경로를 `none`으로 | 5 |
| `src/__tests__/guards/migratedScreens.test.ts` (신규) | 옮긴 파일에 옛 색·이모지가 없는지 지킨다 | 2, 4 |
| `src/__tests__/guards/noRawControls.test.ts` (수정) | `CircleMenu`를 미룬 목록에서 뺀다 | 4 |

---

### Task 1: 날짜 이름과 `ListGroup`의 바탕 속성

**Files:**
- Modify: `src/lib/workout/datetime.ts`
- Modify: `src/components/molecules/list/ListGroup.tsx`, `src/components/organisms/navigation/MoreSheet.tsx`
- Test: `src/__tests__/lib/workoutDatetime.test.ts`, `src/__tests__/components/ui/List.dom.test.tsx`(추가)

**Interfaces:**
- Produces:
  - `formatWorkoutDateLabel(value: Date | string): string` — `'10월 4일 토요일'`. 이 레포는 운동 날짜·시간을 "벽시계 시각을 UTC 칸에 그대로 담는" 방식으로 저장하므로 UTC 값으로 읽는다(같은 파일의 `toDateInput`과 같은 규칙).
  - `ListGroup`에 `tone?: 'surface' | 'inset'`(기본 `'surface'`). `inset`이면 묶음 바탕이 `bg-bg`(연회색) — 흰 시트 안에서 묶음이 구분되게 한다.

**테스트가 고정할 동작:**

| 대상 | 동작 |
| --- | --- |
| `formatWorkoutDateLabel` | `2026-10-04T00:00:00.000Z` → `10월 4일 일요일` · 문자열과 `Date` 모두 받는다 · `2026-10-03T23:30:00.000Z`(자정 직전)도 `10월 3일 토요일`(하루 밀리지 않음) · 한 자리 월·일에 0을 붙이지 않는다 · 잘못된 값(`'abc'`)이면 빈 문자열 |
| `ListGroup` | 기본은 `bg-surface` · `tone="inset"`이면 `bg-bg`이고 `bg-surface`가 없다 |
| `MoreSheet` | 기존 테스트가 그대로 통과 (`[&_section>div]:bg-bg` 꼼수를 지우고 `tone="inset"`을 쓴다) |

- [ ] **Step 1:** 위 동작을 테스트로 쓴다 → 실패 확인
- [ ] **Step 2:** 구현 → 통과 확인 (`npx jest "$(pwd)/src/__tests__/lib" "$(pwd)/src/__tests__/components/ui/List.dom.test.tsx" "$(pwd)/src/__tests__/components/navigation"`)
- [ ] **Step 3:** `npx tsc --noEmit` 기준선 확인 후 커밋 — `feat(ui): 운동 날짜 이름과 ListGroup 바탕 속성 추가`

---

### Task 2: 출석체크 — `WorkoutCard`

**Files:**
- Create: `src/components/organisms/workout/WorkoutCard.tsx`
- Modify: `src/pages/clubs/[id]/attendance/index.tsx` (`return` 부분과 import)
- Delete: `src/components/organisms/workout/WorkoutListItem.tsx`
- Create: `src/__tests__/guards/migratedScreens.test.ts`
- Test: `src/__tests__/components/workout/WorkoutCard.dom.test.tsx`

**Interfaces:**
- Consumes: `WorkoutListItemProps`(`@/types`), `formatWorkoutDateLabel`, `formatToKoreanTime`, `Button`, `IconButton`, `StatusChip`, `Sheet`, `ListGroup`(`tone`), `ListRow`
- Produces: `WorkoutCard(props: WorkoutListItemProps & { detailHref: string })` — `router`를 쓰지 않는다. 상세로 가는 주소는 페이지가 넘긴다.

**화면 구성 (카드 하나):**

```
┌──────────────────────────────────────────┐
│ 10월 4일 토요일   [참석]              ⋯  │  ← 날짜(headline) + 내 상태 칩 + 운영진 메뉴
│ 토요 정기 운동                            │  ← 제목 (한 줄에서 자름)
│ 셔틀콕 제공                               │  ← 설명 (있을 때만, 두 줄에서 자름)
│ ◷ 오후 07:00 – 오후 10:00                │
│ ⌖ 당산초 체육관                           │
│ ☺ 24명 + 게스트 2명                       │
│ ⛍ 주차 3/5 (대기 1명)                     │  ← 주차가 켜져 있을 때만
├──────────────────────────────────────────┤
│ [        참여하기 (검정)         ]        │
│ [        주차 신청 (회색)        ]        │  ← 주차가 켜져 있을 때만
└──────────────────────────────────────────┘
```

- 구분선 위 전체가 상세로 가는 링크다(운영진 메뉴 버튼 제외).
- 버튼의 모양: 참여 전 `primary` "참여하기" / 참여 중 `secondary` "참여 취소" / 정원이 찼고 미참여면 비활성 "인원 마감". 주차 버튼은 늘 `secondary`. 색으로 구분하던 주차 상태는 글자로 구분한다.
- 내 상태 칩: 참여 중이면 `positive` "참석", 정원이 찼고 미참여면 `neutral` "마감", 그 밖에는 없음.
- 운영진 메뉴(`⋯`)는 작은 드롭다운 대신 시트("운동 일정 관리": 수정 / 삭제). 삭제는 빨강 글자.

**테스트가 고정할 동작:**

| 구분 | 동작 |
| --- | --- |
| 내용 | 날짜 이름·제목·시간 범위·장소를 보여 준다 · 설명이 없으면 그 줄이 없다 · 참여 인원은 `WorkoutParticipant.length`, 게스트가 있을 때만 `+ 게스트 N명` · 주차가 켜져 있을 때만 `주차 3/5`, 대기가 있을 때만 `(대기 N명)` · 참여자 목록이 없어도(`undefined`) `0명`으로 그린다 |
| 링크 | 카드 윗부분이 `detailHref`로 가는 링크다 |
| 칩 | 내가 참여 중이면 "참석" · 정원이 찼고 미참여면 "마감" · 그 밖에는 칩이 없다 |
| 참여 버튼 | 미참여: "참여하기", 누르면 `onParticipate(id, false)` · 참여 중: "참여 취소", 누르면 `onParticipate(id, true)` · 정원이 찼고 미참여: "인원 마감", 눌리지 않는다 · 정원이 찼어도 참여 중이면 취소할 수 있다 · `isParticipatePending`이면 눌리지 않고 콜백이 불리지 않는다 |
| 주차 버튼 | 주차가 꺼져 있으면 없다 · 미참여면 눌리지 않고 "운동 참여 후 신청 가능"이 보인다 · `myStatus` NONE + 자리 있음: "주차 신청", 누르면 `onParkingRequest(id, false)` · NONE + 자리 없음: "주차 대기 신청" · CONFIRMED: "주차 확정 · 취소하기", 누르면 `onParkingRequest(id, true)` · WAITLIST: "대기 2번 · 취소하기" · `isParkingPending`이면 눌리지 않는다 |
| 회원 여부 | 로그인하지 않았으면 버튼 영역이 없다 · 승인 대기 중이면 비활성 "승인 대기중" · 회원이 아니면 비활성 "클럽 가입 필요" |
| 운영진 | 운영진이 아니면 메뉴 버튼이 없다 · 메뉴를 누르면 시트가 열리고 상세로 이동하지 않는다 · "수정"을 누르면 `onEdit(workout)`이 불리고 시트가 닫힌다 · "삭제"도 같다 |
| 긴 글 | 제목에 `truncate`, 설명에 `line-clamp-2` |

**출석체크 페이지:** `return` 부분만 바꾼다. 데이터·핸들러·스크롤 복원은 그대로.

- 맨 위에 `<PageHeader title="출석체크" />`
- 불러오는 중: 카드 모양 `Skeleton` 세 개
- 운동이 없으면 `EmptyState`(아이콘 `CalendarX`, "등록된 운동이 아직 없어요", "일정이 올라오면 여기에 보여요")
- 목록: `grid gap-4 md:grid-cols-2`. 카드마다 `detailHref={`/clubs/${clubId}/workouts/${workout.id}`}`

**지킴이 테스트 `migratedScreens.test.ts`:** 등록된 파일을 읽어 아래가 없는지 본다. 이 과제에서는 `WorkoutCard.tsx`, `attendance/index.tsx`, `WorkoutEditSheet.tsx`, `WorkoutDeleteSheet.tsx`를 등록한다.

| 금지 | 정규식 |
| --- | --- |
| Tailwind 기본 색 | `\b(?:bg|text|border|ring|from|to|via|divide|placeholder)-(?:gray|slate|zinc|blue|red|green|yellow|amber|orange|purple|pink|indigo|teal|lime|sky|emerald)-\d{2,3}\b` |
| `bg-white` · `bg-black` · `text-white` · `text-black` | 그대로 |
| 그라디언트 · 옛 그림자 | `bg-gradient-` · `shadow-(?:sm|md|lg|xl)` |
| 이모지 | 그림 문자 범위 (`new RegExp('[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}]', 'u')`) |
| 색 값 | `#[0-9a-fA-F]{6}\b` |

- [ ] **Step 1:** `WorkoutCard.dom.test.tsx`와 `migratedScreens.test.ts`를 쓴다 → 실패 확인
- [ ] **Step 2:** `WorkoutCard.tsx` 구현 → 카드 테스트 통과
- [ ] **Step 3:** 출석체크 페이지의 그리는 부분 교체, `WorkoutListItem.tsx` 삭제(`git rm`), 다른 곳에서 쓰지 않는지 `grep`
- [ ] **Step 4:** 지킴이 테스트 통과, `npx tsc --noEmit`, `npx jest "$(pwd)/src"` 기준선 확인
- [ ] **Step 5:** 커밋 — `feat(ui): 출석체크를 새 디자인의 운동 카드로 교체`

---

### Task 3: `PersonInfo` 다시 칠하기, 도움 기록 시트

**Files:**
- Modify: `src/components/molecules/PersonInfo.tsx`
- Create: `src/components/organisms/workout/HelperSheet.tsx`
- Test: `src/__tests__/components/ui/PersonInfo.dom.test.tsx`(추가), `src/__tests__/components/workout/HelperSheet.dom.test.tsx`

**Interfaces:**
- Produces:
  - `PersonInfo` — props는 지금과 같다. 달라지는 모양: 파란 배경 칩(성별·나이대·급수) → 이름 아래 한 줄 설명(`남성 · 30대 · 지역 C`). "가입희망"은 `positive` 칩. "신청자: …"는 설명 줄 아래 한 줄.
  - `type SelectedIcon = 'net' | 'broomStick' | 'shuttlecock' | 'key' | 'mop'` (`CircleMenu`에서 옮겨 옴)
  - `HELPER_OPTIONS: Array<{ value: SelectedIcon; label: string; icon: StaticImageData }>` — 네트 설치 · 바닥 청소 · 셔틀콕 정리 · 열쇠 · 걸레질
  - `HelperIcons({ icons: SelectedIcon[] })` — 참여자 행에 붙는 작은 그림들(16px). 그림마다 `alt`는 위 이름
  - `HelperSheet({ open, onClose, name, selected: SelectedIcon[], onToggle: (icon: SelectedIcon) => void })`

**도움 기록 시트:** 제목은 `{name}님의 도움 기록`. 다섯 항목이 그림 + 이름으로 나오고, 고른 항목은 체크 표시가 붙는다. 항목을 눌러도 시트는 닫히지 않는다(여러 개를 연달아 고를 수 있게). 아래 고정 영역의 "완료"로 닫는다. — **동작 변경:** 옛 `CircleMenu`는 하나를 누르면 바로 닫혔다. 한 사람에 최대 3개까지 기록하므로 연달아 고르는 쪽이 편하다고 보고 바꾼다.

**테스트가 고정할 동작:**

| 대상 | 동작 |
| --- | --- |
| `PersonInfo` | 성별·나이대·급수를 ` · `로 이은 한 줄로 보여 준다 · 급수는 전국만 / 지역만 / 둘 다의 세 경우 글자가 지금과 같다(`전국 A`, `지역 C`, `전국A/지역C`) · 정보가 하나도 없으면 설명 줄이 없다 · 가입 희망이면 "가입희망" 칩 · 번호가 있으면 `1. 이름` · "신청자: …"를 보여 준다 · 옛 색 클래스가 없다 · (기존 아바타 테스트 5개는 그대로 통과) |
| `HELPER_OPTIONS` | 다섯 가지이고 값이 `net, broomStick, shuttlecock, key, mop` 순서다(서버에 보내는 값이므로 바뀌면 안 된다) |
| `HelperIcons` | 넘긴 순서대로 그림을 그리고 `alt`가 이름이다 · 빈 배열이면 아무것도 그리지 않는다 |
| `HelperSheet` | 제목에 이름이 들어간다 · 다섯 항목이 이름과 함께 보인다 · 고른 항목만 `aria-pressed="true"` · 항목을 누르면 `onToggle(값)`이 불리고 시트는 열린 채다 · "완료"와 ESC는 `onClose`를 부른다 · 닫혀 있으면 아무것도 그리지 않는다 |

- [ ] **Step 1:** 테스트 → 실패 확인
- [ ] **Step 2:** 구현 → 통과 확인
- [ ] **Step 3:** `npx tsc --noEmit` 확인 후 커밋 — `feat(ui): PersonInfo를 토큰으로 정리하고 도움 기록 시트 추가`

---

### Task 4: 운동 상세 — `WorkoutDetailView`

**Files:**
- Modify: `src/components/organisms/workout/WorkoutParkingSection.tsx`
- Create: `src/components/organisms/workout/WorkoutDetailView.tsx`
- Modify: `src/pages/clubs/[id]/workouts/[workoutId].tsx`
- Delete: `src/components/molecules/CircleMenu.tsx`
- Modify: `src/__tests__/guards/migratedScreens.test.ts`, `src/__tests__/guards/noRawControls.test.ts`
- Test: `src/__tests__/components/workout/WorkoutDetailView.dom.test.tsx`, `src/__tests__/components/workout/WorkoutParkingSection.dom.test.tsx`

**Interfaces:**
- Consumes: Task 1–3의 것, `PageHeader`, `ListGroup`, `Select`, `EmptyState`, `StatusChip`
- Produces:

```ts
interface WorkoutDetailViewProps {
  workout: Workout;
  /** 출석체크로 돌아가는 주소 */
  backHref: string;
  /** 정렬이 끝난 참여자. 페이지가 정렬 컨텍스트에서 꺼내 넘긴다 */
  participants: WorkoutParticipant[];
  sortOption: SortOption;
  onChangeSort: (option: SortOption) => void;
  /** userId → 그 사람이 한 도움 */
  participantIcons: Record<string, SelectedIcon[]>;
  getAttendanceCount: (clubMemberId: number | undefined) => number;
  getHelperCount: (clubMemberId: number | undefined) => number;
  isAdmin: boolean;
  onToggleHelper: (userId: number, clubMemberId: number | undefined, icon: SelectedIcon) => void;
  onParkingCapacityChange: (capacity: number | null) => Promise<void>;
}
```

- `WorkoutParkingSection`의 props는 지금과 같다.

**화면 구성:**

```
‹ 뒤로
토요 정기 운동                      ← PageHeader (제목 = 운동 제목)
10월 4일 토요일                     ← 부제

일정
┌─────────────────────────────────┐
│ ◷ 오후 07:00 – 오후 10:00       │
│ ⌖ 당산초 체육관                  │
│ ☺ 24명 + 게스트 2명              │
└─────────────────────────────────┘

방문 게스트 2명                      ← 게스트가 있을 때만
┌─────────────────────────────────┐
│ (아바타) 1. 홍길동  [가입희망]    │
│          남성 · 30대 · 지역 C    │
│          신청자: 김민수          │
└─────────────────────────────────┘

참여자 24명                [정렬 ▾]
┌─────────────────────────────────┐
│ (사진) 1. 김민수  🏸🧹   출석 12 │  ← 누르면 도움 기록 시트
│        남성 · 30대 · 지역 C  도움 3│
└─────────────────────────────────┘

주차 명단                            ← 주차가 켜져 있을 때만
```

- 그라디언트 배지(📒 12회, 🤝 3회) → `neutral` 칩 `출석 12` · `도움 3`. 0이면 그리지 않는다.
- 참여자 행 전체가 버튼이다. `clubMember`가 없는 참여자는 지금처럼 그리지 않는다. 번호는 넘겨받은 목록에서의 순서(1부터)다.
- 참여자가 한 명도 없으면 묶음 대신 `EmptyState`("아직 참여자가 없어요").
- 한 사람에 도움은 최대 3개라는 규칙은 지금처럼 페이지의 `handleIconSelect`가 맡는다.

**주차 명단:** 내용과 문구는 그대로, 모양만 토큰으로. "대수 변경"은 `Button`(`secondary`, 처리 중 `pending`). 이모지 `🚗` 제거.

**테스트가 고정할 동작:**

| 대상 | 동작 |
| --- | --- |
| 머리 | 운동 제목이 h1, 부제가 날짜 이름, "뒤로"가 `backHref`로 간다 |
| 일정 | 시간 범위·장소·인원을 보여 준다 · 게스트가 있을 때만 `+ 게스트 N명` |
| 게스트 | 게스트가 없으면 "방문 게스트" 묶음이 없다 · 있으면 이름과 "신청자: …"(없으면 "본인작성")를 보여 준다 |
| 참여자 | 넘긴 순서대로 `1. 이름`을 그린다 · 이름이 없으면 닉네임 · `clubMember`가 없는 참여자는 그리지 않고 번호는 건너뛴다(전체에서의 순서 유지) · 출석·도움 횟수가 0이면 칩이 없고, 있으면 `출석 12` · `도움 3` · 참여자가 없으면 빈 화면 안내 |
| 정렬 | 선택칸의 값이 `sortOption`이고, 바꾸면 `onChangeSort(값)`이 불린다 · 항목 다섯 개와 값이 지금과 같다(`createdAt, name, gender, localLevel, nationalLevel`) |
| 도움 기록 | 참여자를 누르면 그 사람 이름의 시트가 열린다 · 항목을 누르면 `onToggleHelper(userId, clubMemberId, 값)`이 불린다 · 그 사람이 이미 한 도움은 눌린 상태로 보인다 · "완료"를 누르면 닫힌다 |
| 주차 | 주차가 꺼져 있으면 "주차 명단"이 없다 · 켜져 있으면 확정 `n/정원`과 이름 목록 · 대기가 있을 때만 대기 목록 |
| `WorkoutParkingSection` | 운영진이 아니면 대수 변경 칸이 없다 · "클럽 기본값 사용"을 켜면 입력칸이 잠기고 저장 시 `onCapacityChange(null)` · 끄고 숫자를 넣으면 `onCapacityChange(숫자)`(소수는 내림) · 빈 값이면 저장 버튼이 눌리지 않고 안내가 보인다 · 음수면 눌리지 않고 안내가 보인다 · 저장 중에는 다시 눌리지 않는다 |

**페이지:** 데이터 읽기·`handleIconSelect`·정렬 컨텍스트·랭킹 훅은 그대로 두고, `WorkoutDetailContent`가 `WorkoutDetailView`를 그리게 한다. `selectedParticipant` 상태는 `WorkoutDetailView` 안으로 옮긴다. 불러오는 중은 `Spinner`, 오류는 `text-negative` 글자(둘 다 `min-h-screen`을 쓰지 않는다).

- [ ] **Step 1:** 두 테스트 파일을 쓴다 → 실패 확인
- [ ] **Step 2:** `WorkoutParkingSection` 다시 칠하기, `WorkoutDetailView` 구현 → 통과
- [ ] **Step 3:** 페이지 연결, `CircleMenu.tsx` 삭제(`git rm`), 지킴이 테스트에 파일 등록(`WorkoutDetailView.tsx`, `WorkoutParkingSection.tsx`, `HelperSheet.tsx`, `PersonInfo.tsx`, `workouts/[workoutId].tsx`)과 미룬 목록에서 `CircleMenu` 제거
- [ ] **Step 4:** `npx tsc --noEmit`, `npx jest "$(pwd)/src"` 기준선 확인
- [ ] **Step 5:** 커밋 — `feat(ui): 운동 상세를 묶음 리스트와 도움 기록 시트로 교체`

---

### Task 5: 화면 미리보기와 마지막 검증

**Files:**
- Create: `src/pages/dev/screen-preview.tsx`
- Modify: `src/constants/layoutVariant.ts`, `src/__tests__/constants/layoutVariant.test.ts`

**미리보기:** `/dev/screen-preview?screen=attendance|workout`. `AppShell` 안에 가짜 데이터로 `WorkoutCard` 목록과 `WorkoutDetailView`를 그린다. 버튼을 누르면 가짜 상태가 바뀌어(참여 ↔ 취소, 도움 기록 켜고 끄기) 눌러 볼 수 있다. 운영에서는 404(`getServerSideProps`). 바깥 뼈대는 `none`.

가짜 데이터는 상태를 고루 담는다: 참여 중 + 주차 확정 / 미참여 + 주차 자리 없음 / 정원 마감 / 설명이 긴 운동 / 주차 꺼짐.

- [ ] **Step 1:** `layoutVariant.test.ts`에 `/dev/screen-preview` → `none` 경우 추가 → 실패 확인 → 구현
- [ ] **Step 2:** 미리보기 화면 작성, `npx tsc --noEmit`, lint
- [ ] **Step 3:** 전체 검증 — `npx tsc --noEmit` / `npx jest "$(pwd)/src"` / `npm run build` (빌드 뒤 `git checkout -- public/ && git clean -fq public/`)
- [ ] **Step 4:** 브라우저 확인 (`npx next dev -p 3111`)

| 폭 | 화면 | 확인 |
| --- | --- | --- |
| 390 | `?screen=attendance` | 카드가 한 줄에 하나. 가로 스크롤 없음. 긴 제목·설명이 잘림. "참여하기"를 누르면 "참석" 칩이 붙고 버튼이 "참여 취소"로 바뀜. 운영진 메뉴가 시트로 열림. 마지막 카드가 탭바에 가리지 않음 |
| 390 | `?screen=workout` | 뒤로·제목·일정·게스트·참여자·주차가 묶음으로 보임. 참여자를 누르면 시트가 올라오고 항목을 누르면 체크가 붙음. 버튼·행의 높이 44 이상 |
| 1280 | 두 화면 | 사이드바 옆에 본문. 출석체크는 카드 두 줄 |
| 운영 빌드 | `/dev/screen-preview` | 404 |

- [ ] **Step 5:** 커밋 — `feat(ui): 출석체크·운동 상세 미리보기 화면 추가`

---

## 이 계획이 끝나면

| 상태 | 내용 |
| --- | --- |
| 바뀐 것 | 출석체크와 운동 상세가 새 디자인. 이모지·그라디언트·파랑/빨강 버튼 없음. 도움 기록이 이름 붙은 시트 |
| 아직 그대로 | 게스트 · 게시판 · 대회 · 내 정보 · 로그인 · 클럽 홈 |
| 다음 | 4단계 ② 게스트 신청·상세 (신청 모달 `JoinModal`을 시트로 옮기는 것 포함) |
