# 탈퇴월·재가입 시작월 고르기 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 회원 관리에서 상태를 탈퇴로 바꾸거나 탈퇴에서 되돌릴 때 탈퇴월·다시 시작하는 달을 고르게 하고, "탈퇴일은 탈퇴 상태에만 있다"를 저장하는 두 API에서 지킨다.

**Architecture:** 순수 함수(`memberStatusChange.ts`)가 "어떤 변경에서 달을 묻나"와 달 문자열 변환을 맡고, 상태 API·기본값 API·회원 관리 화면이 함께 쓴다. 상태 API는 이전 상태를 DB에서 읽어 판단한다. 탈퇴일을 읽는 곳(매칭·확정 계획·이월)은 고치지 않는다.

**Tech Stack:** Next.js 15 Pages Router, Prisma 6, Jest(ts-jest, node·jsdom 프로젝트), Testing Library, Headless UI `Sheet`.

**Spec:** `docs/superpowers/specs/2026-11-25-leave-and-rejoin-month-design.md`

## Global Constraints

- 스키마 변경 없음. `.env`의 DB는 운영이다. 이 계획의 DB 접근은 읽기 전용 확인뿐이다.
- 커밋하지 않는다. 사용자가 요청할 때만 한다 (12번과 같은 규칙).
- 달은 `YYYY-MM` 문자열로 주고받고, 저장은 그 달 1일 00:00 UTC(`Date.UTC(y, m - 1, 1)`)다. DB의 달을 문자열로 바꿀 때는 `kstYearMonth`를 쓴다(예전 값 중 한국 자정으로 저장된 것이 있다).
- API는 `.claude/rules/api-handler-conventions.md`를 따른다: 메소드 가드 → path param → `Role.ADMIN` + `APPROVED_STATUS` 권한 → try/catch, 응답 `{ data, status, message }` / `{ error, status }`.
- 화면은 토큰과 기존 부품만 쓴다: `Sheet`, `FormField`, `Input type="month"`, `Button`. 원시 `<input>` 금지.
- 테스트 파일은 `src/pages/` 안에 두지 않는다.
- 사용자 문구는 설계 문서 그대로다:
  - 시트 제목 "탈퇴 처리" / "다시 가입 처리", 칸 이름 "탈퇴월" / "다시 시작하는 달", 버튼 "취소" / "탈퇴 처리" / "다시 가입 처리".
  - 안내 "마지막으로 회비를 낸 달입니다.", "이 달까지 회비를 내야 하는 달로 봅니다.", "낸 회비가 없습니다.", "이 달부터 회비를 냅니다.", "실수로 탈퇴 처리했다면 예전 시작월(YYYY-MM)을 고르세요."
  - 오류 "탈퇴월을 골라주세요", "다시 시작하는 달을 골라주세요", "탈퇴한 회원만 탈퇴일을 넣을 수 있습니다", "탈퇴월을 입력해주세요".

## Review Focus

- 탈퇴 → 탈퇴(같은 상태)를 API로 직접 보내면 탈퇴일이 지워지지 않아야 한다 → Task 2 테스트.
- 한국 자정으로 저장된 예전 날짜(`2024-12-31T15:00:00Z`)는 `2025-01`로 읽혀야 한다 → Task 1 테스트.
- `'2026-13'`, `'2026-1'`, `''`, 숫자 `202607` 같은 달 값은 400이어야 한다 → Task 1·2 테스트.
- 달 시트에서 [취소]하면 요청하지 않고 상태 고르기는 이전 값이어야 한다 → Task 5 테스트.
- 기본값을 못 불러와도 시트는 열리고, 칸이 비어 있으면 저장 버튼이 잠겨야 한다 → Task 5 테스트.

---

### Task 1: 달 변환·판단 순수 함수

**Files:**
- Create: `src/lib/membership-fee/memberStatusChange.ts`
- Create: `src/lib/membership-fee/memberStatusChange.test.ts`
- Modify: `src/lib/membership-fee/feeObligation.ts` (함수 추가), `src/lib/membership-fee/feeObligation.test.ts`
- Modify: `src/pages/api/clubs/[id]/join.ts:93-98` (계산을 새 함수로)

**Interfaces:**
- Produces (`memberStatusChange.ts`, prisma를 import하지 않는다 — 화면도 쓴다):
  - `type StatusMonthKind = 'leave' | 'rejoin'`
  - `statusMonthKind(prev: string, next: string): StatusMonthKind | null` — `prev !== 'LEFT' && next === 'LEFT'` → `'leave'`, `prev === 'LEFT' && (next === 'APPROVED' || next === 'ON_LEAVE')` → `'rejoin'`, 그 밖 `null`
  - `parseMonthInput(value: unknown): Date | null` — `/^\d{4}-(0[1-9]|1[0-2])$/`이고 연도 2000–2100이면 `new Date(Date.UTC(y, m - 1, 1))`, 아니면 `null`
  - `toMonthInput(date: Date): string` — `kstYearMonth`로 `YYYY-MM`
  - `latestPaidMonth(payments: { year: number; month: number }[]): string | null`
  - `interface StatusMonths { leftMonth?: string; feeStartMonth?: string }`
  - `interface MemberStatusDefaults { lastPaidMonth: string | null; rejoinStartMonth: string; previousStartMonth: string | null }`
- Produces (`feeObligation.ts`): `defaultFeeObligationStartAt(now: Date): Date` — `join.ts`의 규칙 그대로(UTC 날짜 15일 이하면 그 달 1일, 아니면 다음 달 1일, UTC)

- [ ] **Step 1: 실패하는 테스트를 쓴다** (`memberStatusChange.test.ts`)
  - `statusMonthKind`: `('APPROVED','LEFT')`·`('ON_LEAVE','LEFT')`·`('REJECTED','LEFT')` → `'leave'`; `('LEFT','APPROVED')`·`('LEFT','ON_LEAVE')` → `'rejoin'`; `('LEFT','LEFT')`·`('LEFT','REJECTED')`·`('LEFT','PENDING')`·`('APPROVED','ON_LEAVE')` → `null`.
  - `parseMonthInput('2026-07')`의 `toISOString()`이 `'2026-07-01T00:00:00.000Z'`; `'2026-13'`, `'2026-1'`, `''`, `202607`, `null`, `'1999-12'` → `null`.
  - `toMonthInput(new Date('2024-12-31T15:00:00.000Z'))` → `'2025-01'`; `toMonthInput(new Date('2026-07-01T00:00:00.000Z'))` → `'2026-07'`.
  - `latestPaidMonth([{year:2026,month:3},{year:2026,month:12},{year:2025,month:12}])` → `'2026-12'`; `[]` → `null`.
  - `feeObligation.test.ts`: `defaultFeeObligationStartAt(new Date('2026-11-15T12:00:00Z'))` → `2026-11-01T00:00:00.000Z`; `'2026-11-16T00:00:00Z'` → `2026-12-01…`; `'2026-12-20T00:00:00Z'` → `2027-01-01…`.

- [ ] **Step 2: 실행해 실패를 본다**
  Run: `npx jest src/lib/membership-fee/memberStatusChange.test.ts src/lib/membership-fee/feeObligation.test.ts`
  Expected: FAIL (모듈·함수 없음)

- [ ] **Step 3: 구현하고 `join.ts`가 `defaultFeeObligationStartAt(new Date())`를 쓰게 바꾼다**

- [ ] **Step 4: 통과를 본다**
  Run: `npx jest src/lib/membership-fee/memberStatusChange.test.ts src/lib/membership-fee/feeObligation.test.ts src/__tests__/api/clubs/join.test.ts`
  Expected: PASS

---

### Task 2: 상태 API와 기본값 API

**Files:**
- Modify: `src/pages/api/clubs/[id]/members/[userId]/status.ts`
- Create: `src/pages/api/clubs/[id]/members/[userId]/status-defaults.ts`
- Create: `src/__tests__/api/clubs/membership-fee/memberStatus.test.ts` (`fakeFeeDb` 사용, `memberFeeObligation.test.ts`와 같은 mock)

**Interfaces:**
- Consumes: Task 1의 `statusMonthKind`, `parseMonthInput`, `toMonthInput`, `latestPaidMonth`, `defaultFeeObligationStartAt`, `MemberStatusDefaults`
- Produces:
  - `PUT …/status` 본문 `{ status, leftMonth?, feeStartMonth? }`, 성공 응답과 메시지는 지금과 같다(`data.member`, "멤버 상태가 변경되었습니다").
  - `GET …/status-defaults` → `{ data: MemberStatusDefaults, status: 200, message: '기본값을 불러왔습니다' }`

- [ ] **Step 1: 실패하는 테스트를 쓴다** (`memberStatus.test.ts`)
  - 탈퇴: 승인 회원에 `{ status:'LEFT', leftMonth:'2026-07' }` → 200, 저장된 `leftAt`이 `2026-07-01T00:00:00.000Z`, `status` `'LEFT'`.
  - 탈퇴월 없음·`'2026-13'`·`202607` → 400 "탈퇴월을 골라주세요", 회원은 그대로.
  - 다시 가입: 탈퇴 회원(`leftAt` 2025-01, 시작 2024-03)에 `{ status:'APPROVED', feeStartMonth:'2026-12' }` → 200, `leftAt` null, `feeObligationStartAt` `2026-12-01T00:00:00.000Z`. `ON_LEAVE`로 되돌려도 같다.
  - 다시 시작하는 달 없음 → 400 "다시 시작하는 달을 골라주세요".
  - 그 밖: 승인 → 휴가중은 `leftAt` null, 시작월 그대로, 보낸 `leftMonth`는 무시.
  - 탈퇴 → 탈퇴: `leftAt`이 그대로 남는다.
  - 탈퇴 → 거절됨: `leftAt` null, 시작월 그대로.
  - 없는 회원 → 404 "회원을 찾을 수 없습니다". 관리자가 아니면 403.
  - 기본값: 납부 2026-03(입금), 2026-12(직접 추가, `addManualPayment`), 2025-11 → `lastPaidMonth` `'2026-12'`; 납부 없음 → `null`; `previousStartMonth`는 시작월(`toMonthInput`), 시작월이 없으면 `null`; `rejoinStartMonth`는 `jest.useFakeTimers().setSystemTime(new Date('2026-11-20T03:00:00Z'))`에서 `'2026-12'`.
  - 기본값 API도 관리자가 아니면 403, 없는 회원 404, GET이 아니면 405.

- [ ] **Step 2: 실행해 실패를 본다**
  Run: `npx jest src/__tests__/api/clubs/membership-fee/memberStatus.test.ts`
  Expected: FAIL

- [ ] **Step 3: 구현한다**
  - `status.ts`: 권한 확인 뒤 대상 회원을 `findUnique({ where: { clubId_userId } })`로 읽는다(없으면 404). `statusMonthKind(이전, 다음)`으로 나눠 `update` 데이터를 만든다: `'leave'` → `{ status, leftAt }`, `'rejoin'` → `{ status, leftAt: null, feeObligationStartAt }`, `null` → 다음이 `LEFT`면 `{ status }`, 아니면 `{ status, leftAt: null }`.
  - `status-defaults.ts`: 대상 회원과 그 회원의 `membershipPayment.findMany({ where: { clubMemberId }, select: { year, month } })`를 읽어 계산한다. 정렬은 `latestPaidMonth`가 한다(가짜 DB의 `findFirst`는 `orderBy`를 보지 않는다).

- [ ] **Step 4: 통과를 본다**
  Run: `npx jest src/__tests__/api/clubs/membership-fee/memberStatus.test.ts`
  Expected: PASS

---

### Task 3: 회비 설정 저장이 탈퇴일 약속을 지킴

**Files:**
- Modify: `src/pages/api/clubs/[id]/members/[userId]/fee-obligation.ts`
- Modify: `src/__tests__/api/clubs/membership-fee/memberFeeObligation.test.ts`

**Interfaces:**
- Consumes: 없음 (상태 문자열 `'LEFT'` 비교)

- [ ] **Step 1: 실패하는 테스트를 쓴다**
  - 승인 회원에 `{ leftAt: '2026-07-01T00:00:00.000Z' }` → 400 "탈퇴한 회원만 탈퇴일을 넣을 수 있습니다", 저장 안 됨.
  - 승인 회원에 `{ leftAt: null, feeObligationStartAt: … }` → 200 (회원 상세 화면이 보내는 모양).
  - 탈퇴 회원에 `{ leftAt: null }` → 400 "탈퇴월을 입력해주세요".
  - 탈퇴 회원에 `{ leftAt: '2026-05-01T00:00:00.000Z' }` → 200, 저장됨.
  - 없는 회원 → 404 "회원을 찾을 수 없습니다".

- [ ] **Step 2: 실행해 실패를 본다**
  Run: `npx jest src/__tests__/api/clubs/membership-fee/memberFeeObligation.test.ts`
  Expected: FAIL (새 테스트들)

- [ ] **Step 3: 구현한다** — 권한 확인 뒤 대상 회원을 읽고(없으면 404), `'leftAt' in body`일 때만 상태와 값을 견준다.

- [ ] **Step 4: 통과를 본다**
  Run: `npx jest memberFeeObligation memberDetail.dom`
  Expected: PASS

---

### Task 4: 회원 관리 훅

**Files:**
- Modify: `src/hooks/useMemberActions.ts`
- Modify: `src/__tests__/hooks/useMemberActions.dom.test.tsx`

**Interfaces:**
- Consumes: Task 1의 `StatusMonths`, `MemberStatusDefaults`; Task 2의 두 API
- Produces:
  - `changeStatus(userId: number, clubId: number, newStatus: Status, months?: StatusMonths): Promise<void>` — 본문 `{ status, ...months }`. 실패하면 응답 JSON의 `error`(읽지 못하면 "상태 변경에 실패했습니다")를 토스트로 보이고 목록을 되돌린다.
  - `loadStatusDefaults(userId: number, clubId: number): Promise<MemberStatusDefaults | null>` — 실패하면 `null`

- [ ] **Step 1: 실패하는 테스트를 쓴다**
  - `changeStatus(1, 1, Status.LEFT, { leftMonth: '2026-07' })`의 본문이 `{ status: 'LEFT', leftMonth: '2026-07' }`.
  - 실패 응답 `{ ok: false, json: async () => ({ error: '탈퇴월을 골라주세요' }) }` → 토스트 "탈퇴월을 골라주세요", 목록 되돌림. 기존 `{ ok: false }`(json 없음) 테스트는 "상태 변경에 실패했습니다" 그대로.
  - `loadStatusDefaults(1, 1)`이 `/api/clubs/1/members/1/status-defaults`를 GET하고 `data`를 돌려준다; 실패하면 `null`.

- [ ] **Step 2: 실행해 실패를 본다**
  Run: `npx jest src/__tests__/hooks/useMemberActions.dom.test.tsx`
  Expected: FAIL

- [ ] **Step 3: 구현한다**

- [ ] **Step 4: 통과를 본다**
  Run: `npx jest src/__tests__/hooks/useMemberActions.dom.test.tsx`
  Expected: PASS

---

### Task 5: 달 시트와 회원 관리 화면

**Files:**
- Create: `src/components/organisms/club/MemberStatusMonthSheet.tsx`
- Modify: `src/components/organisms/club/MembersView.tsx`
- Modify: `src/pages/clubs/[id]/members/index.tsx` (훅의 `loadStatusDefaults` 넘김)
- Modify: `src/pages/dev/admin-preview.tsx` (`members` 화면에 가짜 기본값, 시트만 보는 `member-status-month` 화면 추가)
- Modify: `src/__tests__/components/club/MembersView.dom.test.tsx`

**Interfaces:**
- Consumes: Task 1의 `statusMonthKind`, `StatusMonthKind`, `StatusMonths`, `MemberStatusDefaults`; Task 4의 두 함수 모양
- Produces:
  - `MembersView` props: `onStatusChange: (userId: number, clubId: number, status: Status, months?: StatusMonths) => void`, `onLoadStatusDefaults: (userId: number, clubId: number) => Promise<MemberStatusDefaults | null>`
  - `MemberStatusMonthSheet` props: `{ open: boolean; kind: StatusMonthKind; defaults: MemberStatusDefaults | null; onCancel: () => void; onConfirm: (month: string) => void }`

- [ ] **Step 1: 실패하는 테스트를 쓴다** (`MembersView.dom.test.tsx`)
  - 기존 "상태를 바꿀 수 있다" 테스트를 고친다: 승인 회원에서 휴가중을 고르면 시트 없이 바로 `onStatusChange(1, 1, Status.ON_LEAVE)`.
  - 승인 회원에서 탈퇴를 고르면 `onStatusChange`를 부르지 않고 "탈퇴 처리" 시트가 뜬다. "탈퇴월" 칸 값이 `'2026-07'`(가짜 `lastPaidMonth`), 안내 "마지막으로 회비를 낸 달입니다." [탈퇴 처리]를 누르면 `onStatusChange(1, 1, Status.LEFT, { leftMonth: '2026-07' })`.
  - `lastPaidMonth: null`이면 칸이 비고 "낸 회비가 없습니다."가 보이며 [탈퇴 처리]가 잠긴다. 달을 넣으면 풀린다.
  - 탈퇴 회원에서 승인됨을 고르면 "다시 가입 처리" 시트, 칸 값 `'2026-12'`(`rejoinStartMonth`), 안내 "실수로 탈퇴 처리했다면 예전 시작월(2024-03)을 고르세요." [다시 가입 처리] → `onStatusChange(4, 1, Status.APPROVED, { feeStartMonth: '2026-12' })`.
  - [취소]하면 `onStatusChange`를 부르지 않고 상태 고르기 값은 이전 그대로다.
  - `onLoadStatusDefaults`가 `null`을 주면 시트는 열리고 칸은 비며 저장 버튼이 잠긴다.

- [ ] **Step 2: 실행해 실패를 본다**
  Run: `npx jest src/__tests__/components/club/MembersView.dom.test.tsx`
  Expected: FAIL

- [ ] **Step 3: 구현한다**
  - `MembersView`의 상태 고르기 `onChange`에서 `statusMonthKind(현재, 다음)`이 있으면 `{ kind, userId, clubId, nextStatus }`를 상태에 두고 `onLoadStatusDefaults`를 불러 시트를 연다. 없으면 지금처럼 바로 `onStatusChange`.
  - `MemberStatusMonthSheet`는 상세 시트 위에 겹쳐 연다(Headless UI 중첩 Dialog). 칸 기본값은 `kind === 'leave' ? defaults?.lastPaidMonth : defaults?.rejoinStartMonth`, 없으면 `''`.
  - "마지막으로 회비를 낸 달입니다."는 칸 값이 `lastPaidMonth`와 같을 때만, "낸 회비가 없습니다."는 `lastPaidMonth`가 `null`일 때 보인다. 예전 시작월 안내는 `previousStartMonth`가 있고 `rejoinStartMonth`와 다를 때만 보인다.
  - 확인하면 시트를 닫고 `onStatusChange(…, { leftMonth })` 또는 `{ feeStartMonth }`.

- [ ] **Step 4: 통과를 본다**
  Run: `npx jest src/__tests__/components/club src/__tests__/guards src/__tests__/styles`
  Expected: PASS

- [ ] **Step 5: 화면을 본다**
  - `admin-preview`의 `SCREENS`에 `{ value: 'member-status-month', label: '탈퇴·재가입 달' }`을 더한다. 이 화면은 `MemberStatusMonthSheet`를 연 채로 그린다. `kind`는 쿼리 `?kind=rejoin`이면 다시 가입, 아니면 탈퇴다. 가짜 기본값은 `{ lastPaidMonth: '2026-07', rejoinStartMonth: '2026-12', previousStartMonth: '2024-03' }`.
  - scratchpad의 `shot-cdp.mjs`로 `/dev/admin-preview?screen=member-status-month`와 `…&kind=rejoin`, `/dev/admin-preview?screen=members`를 390·1280, 라이트·다크로 찍어 본다.
  Expected: 시트의 칸·안내·버튼이 잘리지 않고, 다크에서도 글자가 읽힌다.

---

### Task 6: 문서와 전체 확인

**Files:**
- Create: `docs/회비 정산/회원별 납부 현황/기능/탈퇴-재가입-처리.md` (배경 → 도입한 개선 → 설계 의사결정 → 백엔드 → 프런트·UX → 검증 → 변경 이력)
- Modify: `docs/회비 정산/회원별 납부 현황/회원별-납부현황-컨텍스트.md`, `docs/회비 정산/회원별 납부 현황/README.md` (링크)

- [ ] **Step 1: 문서를 쓴다**

- [ ] **Step 2: 전체를 돌린다**
  Run: `npx jest > .superpowers/sdd/2026-11-25-leave-and-rejoin-month/full.txt 2>&1; tail -5 .superpowers/sdd/2026-11-25-leave-and-rejoin-month/full.txt`, `npx tsc --noEmit`, `npm run lint`
  Expected: 전부 통과, tsc 오류 0, lint 오류 0

- [ ] **Step 3: 운영 DB를 읽기만 해서 약속이 지켜지는지 본다**
  - `status`가 `LEFT`인데 `leftAt`이 없는 회원 수, `LEFT`가 아닌데 `leftAt`이 있는 회원 수.
  Expected: 둘 다 0

- [ ] **Step 4: dev 서버에서 실제 API를 읽기만 해서 본다**
  - `GET …/status-defaults`를 회원 A(userId 13153)으로: `lastPaidMonth` `'2026-11'`, `previousStartMonth`는 그 회원의 시작월.
