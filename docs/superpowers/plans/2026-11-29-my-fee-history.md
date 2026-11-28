# 회원별 납부 이력 (내 회비) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 회원은 메뉴의 "내 회비"에서, 임원은 회원 상세에서 같은 달별 납부 이력·미납 요약·월 회비·확인 중인 입금·반영 시각을 본다.

**Architecture:** 계산은 순수 함수(`memberFeeHistory.ts`)와 기존 `loadMemberYearData`·`buildMemberYearStatus`를 재사용한다. API 하나(`GET …/members/[userId]/fee-history`)가 "임원이거나 본인"만 통과시키고, 화면 부품 하나(`MemberFeeHistoryView`)를 회원 상세와 새 페이지 `/clubs/[id]/my-fee`가 같이 쓴다.

**Tech Stack:** Next.js Pages Router, Prisma, React Query, Tailwind 토큰, Jest(+ `fakeFeeDb` 메모리 DB), Testing Library

**Spec:** `docs/superpowers/specs/2026-11-28-my-fee-history-design.md`

## Global Constraints

- DB 변경·마이그레이션 없음. 로컬 dev 서버도 운영 DB를 쓴다 — 쓰기 요청을 보내는 확인은 하지 않는다.
- 문서·미리보기·테스트에 실제 회원 이름을 쓰지 않는다(공개 저장소). "회원 A"나 지어낸 이름(`가나다` 등)을 쓴다.
- 색·크기는 토큰만(`bg-surface`, `text-secondary`, `text-footnote` …). 원시 `<input>`·`<select>`, `confirm()`·`alert()`, 이모지 아이콘 금지(`lucide-react`).
- 상태 색은 `src/constants/statusTone.ts`에서만 정하고 화면은 `StatusChip`에 `domain`·`status`를 넘긴다.
- 회원용 화면은 `PageHeader` + `ListGroup`. 화면 보는 방식(연도)은 `OptionPicker`.
- API 응답: 성공 `{ data, status: 200, message }`, 실패 `{ error, status }`, 한국어 메시지(`.claude/rules/api-handler-conventions.md`).
- 테스트 파일을 `src/pages/` 안에 두지 않는다. 페이지 import는 `@/` 경로.
- 날짜는 한국 시각으로 읽고 적는다(서버는 UTC). 연·월은 `kstYearMonth`, 화면 표기는 `timeZone: 'Asia/Seoul'`.
- 사용자가 보는 기존 문구는 바꾸지 않는다.
- 커밋 메시지는 한국어, `Co-Authored-By` 트레일러 없음.

## Review Focus

- **한국 시각 경계** — 11월 20일 14:30(KST) 거래는 UTC로 05:30이다. 반영 시각·입금일이 "11월 20일 오후 2:30"·"11월 20일"로 나와야 한다. → Task 3 `formatAsOf`·`formatDepositDate` 테스트
- **임원이 탈퇴 회원 상세를 연다** — 회원 한 명 조회 경로가 상태로 거르면 탈퇴 회원이 404·빈 목록이 된다. 200과 탈퇴 전 달의 칸이 나와야 한다. → Task 2 테스트
- **그 해 단가가 없는 해를 고름**(예: 2027년에 미리 낸 회원) — 금액 없이 "미납 N달", 월 회비 줄 숨김. 500이 나면 안 된다. → Task 1·Task 2 테스트
- **회비 시작월·이름이 비어 있는 회원** — 고를 수 있는 연도가 올해 하나, 입금자명 비교가 `null`에서 터지지 않는다. → Task 1·Task 2 테스트
- **잘못된 `year` 쿼리**(`abc`, `0`) — 400 "연도를 확인해주세요". 없으면 올해. → Task 2 테스트

---

### Task 1: 납부 이력 계산 함수

**Files:**
- Create: `src/lib/membership-fee/memberFeeHistory.ts`
- Test: `src/lib/membership-fee/memberFeeHistory.test.ts`

**Interfaces:**
- Consumes: `suggestedManualAmount(rates, isCouple)`(`manualPayment.ts`), `MANUAL_PAYMENT_REASONS`, `FeeRateSettings`(`confirmPlanner.ts`), `CellStatus`·`MemberYearStatus`(`memberYearStatus.ts`), `kstYearMonth`(`kst.ts`)
- Produces:
  ```ts
  export interface MonthlyFeeRange { fromMonth: number; toMonth: number; amount: number; isCouple: boolean }
  export interface FeeHistorySummary { unpaidCount: number; unpaidAmount: number | null; monthlyFee: MonthlyFeeRange[] }
  export function buildFeeSummary(
    status: Pick<MemberYearStatus, 'cells' | 'obligationMonths' | 'exemptMonths'>,
    rates: FeeRateSettings | null,
    isCoupleAt: (month: number) => boolean
  ): FeeHistorySummary
  export function selectableYears(feeStartAt: Date | null, paymentYears: number[], currentYear: number): number[]
  export function visibleManualReason(reason: string | null, isAdmin: boolean): string | null
  ```

규칙(스펙 5.2):
- `unpaidCount` = 1~12월 중 `cells[m] === 'UNPAID'`인 달 수. `unpaidAmount` = 그 달들의 `suggestedManualAmount(rates, isCoupleAt(m))` 합, `rates`가 `null`이면 `null`.
- `monthlyFee`: 의무월에서 면제 달을 뺀 달을 오름차순으로 훑어, `(amount, isCouple)`이 바뀔 때마다 새 구간. 빠진 달(휴회 등)은 구간을 끊지 않는다. `rates`가 `null`이거나 그런 달이 없으면 `[]`.
- `selectableYears`: `feeStartAt`의 한국 연도(없으면 `currentYear`)·`paymentYears`·`currentYear` 중 가장 작은 해부터 가장 큰 해까지, **내림차순**.
- `visibleManualReason`: 임원이면 그대로. 아니면 `'다른 계좌로 보냄'`·`'현금으로 받음'`만 그대로, 그 밖의 글은 `null`.

- [ ] **Step 1: 실패하는 테스트 작성** — 단가는 `{ regularMonthly: 25000, coupleMonthly: 45000, regularAnnual: null, coupleAnnual: null, joiningFeeAmounts: [] }`

```ts
it('미납 달 수와 금액을 센다 — 부부였던 달은 부부 단가의 반', () => {
  const s = buildFeeSummary(
    { cells: { ...allNone, 1: 'PAID', 2: 'UNPAID', 6: 'UNPAID' }, obligationMonths: [1, 2, 6], exemptMonths: [] },
    RATES, (m) => m >= 6);
  expect(s.unpaidCount).toBe(2);
  expect(s.unpaidAmount).toBe(25000 + 22500);
});
it('단가가 없으면 금액은 null, 월 회비는 빈 목록', () => {
  const s = buildFeeSummary({ cells: { ...allNone, 3: 'UNPAID' }, obligationMonths: [3], exemptMonths: [] }, null, () => false);
  expect(s).toEqual({ unpaidCount: 1, unpaidAmount: null, monthlyFee: [] });
});
it('해 중간에 부부가 되면 월 회비가 두 구간으로 나뉜다', () => {
  const s = buildFeeSummary({ cells: allPaid, obligationMonths: [1,2,3,4,5,6,7,8,9,10,11,12], exemptMonths: [] }, RATES, (m) => m >= 5);
  expect(s.monthlyFee).toEqual([
    { fromMonth: 1, toMonth: 4, amount: 25000, isCouple: false },
    { fromMonth: 5, toMonth: 12, amount: 22500, isCouple: true },
  ]);
});
it('휴회로 빠진 달은 구간을 끊지 않고, 면제 달은 뺀다', () => {
  const s = buildFeeSummary({ cells: allPaid, obligationMonths: [1,2,5,6,7,8,9,10,11,12], exemptMonths: [11, 12] }, RATES, () => false);
  expect(s.monthlyFee).toEqual([{ fromMonth: 1, toMonth: 10, amount: 25000, isCouple: false }]);
});
it('고를 수 있는 연도: 시작월의 해부터 올해·미리 낸 해까지 내림차순', () => {
  expect(selectableYears(kstDate(2025, 3, 1), [2025, 2026], 2026)).toEqual([2026, 2025]);
  expect(selectableYears(kstDate(2025, 3, 1), [2027], 2026)).toEqual([2027, 2026, 2025]);
  expect(selectableYears(null, [], 2026)).toEqual([2026]);
});
it('직접 쓴 사유는 임원에게만 보인다', () => {
  expect(visibleManualReason('현금으로 받음', false)).toBe('현금으로 받음');
  expect(visibleManualReason('총무가 대신 받아 둠', false)).toBeNull();
  expect(visibleManualReason('총무가 대신 받아 둠', true)).toBe('총무가 대신 받아 둠');
  expect(visibleManualReason(null, true)).toBeNull();
});
```

- [ ] **Step 2: 실패 확인** — `npx jest src/lib/membership-fee/memberFeeHistory.test.ts` → FAIL (모듈 없음)
- [ ] **Step 3: `memberFeeHistory.ts`에 위 세 함수와 두 타입 구현**
- [ ] **Step 4: 통과 확인** — 같은 명령 → PASS
- [ ] **Step 5: 커밋** — `git commit -m "feat(membership-fee): 회원 납부 이력의 미납 요약·월 회비·연도 계산"`

---

### Task 2: 납부 이력 API

**Files:**
- Create: `src/pages/api/clubs/[id]/members/[userId]/fee-history.ts`
- Modify: `src/lib/membership-fee/memberYearStatusLoader.ts` (`loadMemberYearData`에 선택 인자)
- Modify: `src/types/membership-fee.types.ts` (응답 타입)
- Test: `src/__tests__/api/clubs/membership-fee/feeHistory.test.ts`

**Interfaces:**
- Consumes: Task 1 전부. `buildMemberYearStatus`, `feeRateSettingsFromTypes`, `wasCoupleAt`·`yearMonthToStartedAt`(`coupleHistory.ts`), `isActiveMemberStatus`(`@/constants/memberStatus`), `APPROVED_STATUS`(`@/lib/clubAuth`), `kstYearMonth`
- Produces:
  ```ts
  // membership-fee.types.ts
  export interface FeeHistoryPayment { amount: number; transactionDate: string | null; depositorName: string | null; manualReason: string | null }
  export interface FeeHistoryMonth { month: number; status: CellStatus; leaveReason: string | null; isCouple: boolean; payments: FeeHistoryPayment[] }
  export interface FeeHistoryLeave { startYear: number; startMonth: number; endYear: number | null; endMonth: number | null; reason: string | null }
  export interface MemberFeeHistory {
    member: { name: string | null; feeExcluded: boolean };
    year: number; years: number[]; asOf: string | null;
    summary: FeeHistorySummary;            // Task 1
    months: FeeHistoryMonth[];             // 1~12월 모두. 숨기는 건 화면 몫
    pendingDeposits: { transactionDate: string; amount: number }[];  // 거래일 최근 순
    leaves: FeeHistoryLeave[];             // 고른 해와 겹치는 휴회
  }
  // memberYearStatusLoader.ts
  loadMemberYearData(prisma, clubId, year, options?: { clubMemberId?: number }): Promise<MemberYearData>
  ```
  `GET /api/clubs/[id]/members/[userId]/fee-history?year=` → `{ data: MemberFeeHistory, status: 200, message: '납부 이력을 불러왔습니다' }`

처리 순서와 규칙:
1. 메서드 가드(GET) → `id`·`userId` 숫자 검증(400 "클럽 ID와 회원 ID가 필요합니다") → `year`: 없으면 `kstYearMonth(new Date()).year`, 있는데 정수 1 이상이 아니면 400 "연도를 확인해주세요".
2. 권한: 요청자 `clubMember.findUnique({ where: { clubId_userId: { clubId, userId: req.user.id } } })`. 임원 = `role === 'ADMIN' && status === APPROVED_STATUS`. 본인 = `req.user.id === userId && isActiveMemberStatus(status)`. 둘 다 아니면 403 "권한이 없습니다".
3. 대상 회원 없으면 404 "회원을 찾을 수 없습니다".
4. `loadMemberYearData(..., { clubMemberId })`: 이 인자가 있으면 회원 조회 `where`를 `{ clubId, id: clubMemberId }`로 바꾼다(상태·`feeExcluded`로 거르지 않음 — 휴가중·탈퇴 회원도 계산). 휴회·면제·납부 조회에도 `clubMemberId`를 건다. 인자가 없을 때 동작은 그대로.
5. 칸은 `buildMemberYearStatus(year, input)`의 `cells`·`leaveReasons`. `isCouple`은 `wasCoupleAt(id, yearMonthToStartedAt(year, m), histories).isCouple`.
6. 납부: 그 회원의 모든 해 납부를 한 번 읽어(`years`에도 씀) 고른 해 것을 달별로 묶고, 묶인 입금은 `paymentRecord.findMany({ where: { id: { in } } })`로 거래일·입금자명을 붙인다. 입금자명이 회원 이름과 같으면(`trim` 비교) `null`. 직접 추가는 `transactionDate: null`, `manualReason: visibleManualReason(…, isAdmin)`.
7. 확인 중: `paymentRecordMatchedMember.findMany({ where: { clubMemberId } })`의 id로 `paymentRecord.findMany({ where: { id: { in }, clubId, status: { in: ['MATCHED', 'ERROR'] }, kind: 'FEE', needsReview: false } })`. (관계 조건은 `fakeFeeDb`가 보지 않으므로 id로 건다)
8. `asOf`: `paymentRecord.aggregate({ where: { clubId }, _max: { transactionDate: true } })`.
9. `feeExcluded` 회원: `months: []`, `summary: { unpaidCount: 0, unpaidAmount: null, monthlyFee: [] }`, `pendingDeposits: []`.

- [ ] **Step 1: 실패하는 테스트 작성** — `jest.mock('@/lib/session')`의 `withAuth`가 `mockUserId`(기본 7)를 `req.user.id`로 넣게 한다. `afterEach`에서 `jest.useRealTimers()`. 시각은 `jest.useFakeTimers({ now: new Date('2026-11-20T03:00:00Z') })`. 회원은 `fakeDb.addMember({ id: 1, name: '가나다', feeObligationStartAt: new Date(2026, 0, 1) })`(userId 1001).

```ts
it('본인은 자기 이력을 읽는다', async () => { mockUserId = 1001; expect((await get(1001)).statusCode).toBe(200); });
it('다른 회원의 이력은 403', async () => { addMember({ id: 2, name: '라마바' }); mockUserId = 1002; expect((await get(1001)).statusCode).toBe(403); });
it('임원은 탈퇴 회원도 읽는다', async () => {
  addMember({ id: 3, name: '사아자', status: 'LEFT', leftAt: new Date(2026, 4, 1) });
  const res = await get(1003, { year: '2026' });
  expect(res.statusCode).toBe(200);
  expect(res.body.data.months[0].status).toBe('UNPAID');   // 1월
  expect(res.body.data.months[6].status).toBe('NONE');     // 7월
});
it('휴가중 회원 본인은 읽고 칸도 계산된다', /* status 'ON_LEAVE', 1월 납부 → months[0].status 'PAID' */);
it('탈퇴·대기 회원 본인은 403', /* LEFT, PENDING 각각 */);
it('칸 상태가 대시보드와 같다', async () => {
  // 1월 납부, 3월 휴회, 6월 면제 기간. 같은 데이터로 dashboard 핸들러를 불러
  // members.find(m => m.id === 1).cells[m] 와 months[m-1].status를 1~12월 모두 비교
});
it('입금일·입금자명·직접 추가를 붙인다', async () => {
  // 한 입금(5/1 KST, 입금자 '라마바')이 5·6월 두 납부 → 두 달 모두 같은 transactionDate, depositorName '라마바'
  // 입금자 '가나다 ' 인 납부 → depositorName null
  // 직접 추가(manualReason '총무가 받음') → 회원이 보면 null, 임원이 보면 그대로
  // 한 달 두 건 → payments.length 2
});
it('확인 중 입금은 MATCHED·ERROR이고 회비·확실한 매칭만', async () => {
  // addRecord: MATCHED·ERROR·CONFIRMED·SKIPPED·needsReview true·kind EVENT·다른 회원 매칭 각 1건
  // MATCHED 25,000원(11/18), ERROR 30,000원(11/19)만 남고 거래일 최근 순
  expect(res.body.data.pendingDeposits.map(d => d.amount)).toEqual([30000, 25000]);
});
it('반영 시각은 클럽의 가장 늦은 거래일시', /* 상태 무관 최댓값 ISO */);
it('미납 요약과 월 회비', async () => {
  // 회원 1: 2026년 1월부터 의무, 1~9월 납부. 회원 2를 더하고 5월부터 부부(addCouple(1, 2, new Date(2026, 4, 1)))
  expect(res.body.data.summary.unpaidCount).toBe(2);           // 10·11월 (오늘 11/20)
  expect(res.body.data.summary.unpaidAmount).toBe(22500 * 2);
});
it('단가 없는 해(2027)는 금액 null, 월 회비 빈 목록', /* year '2027', 2027년 3월 납부 있음 → 200, years에 2027 포함 */);
it('회비 시작월·이름이 없는 회원도 읽힌다', /* feeObligationStartAt null, name null → 200, years [2026] */);
it('year가 숫자가 아니면 400, 없으면 올해', /* 'abc' → 400 '연도를 확인해주세요'; 없음 → data.year 2026 */);
it('회비 대상 아님 회원은 빈 목록', /* feeExcluded true → months [] , member.feeExcluded true */);
```

- [ ] **Step 2: 실패 확인** — `npx jest src/__tests__/api/clubs/membership-fee/feeHistory.test.ts` → FAIL
- [ ] **Step 3: 로더 선택 인자 구현 후 대시보드·내보내기 회귀 확인** — `npx jest src/__tests__/api/clubs/membership-fee/dashboard.test.ts src/__tests__/api/clubs/membership-fee/export.test.ts src/__tests__/api/clubs/membership-fee/exportSheet.test.ts` → PASS
- [ ] **Step 4: 타입과 핸들러 구현** (위 1~9)
- [ ] **Step 5: 통과 확인** — Step 2 명령 → PASS
- [ ] **Step 6: 커밋** — `git commit -m "feat(membership-fee): 회원 본인과 임원이 읽는 납부 이력 API"`

---

### Task 3: 납부 이력 화면 부품

**Files:**
- Create: `src/components/organisms/membership-fee/memberFeeHistoryDisplay.ts`
- Create: `src/components/organisms/membership-fee/MemberFeeHistoryView.tsx`
- Create: `src/hooks/membership-fee/useMemberFeeHistory.ts` (+ `src/hooks/membership-fee/index.ts`에 export)
- Modify: `src/constants/statusTone.ts` (domain `feeMonth`)
- Test: `src/__tests__/components/membership-fee/memberFeeHistoryDisplay.test.ts`, `src/__tests__/components/membership-fee/MemberFeeHistoryView.dom.test.tsx`

**Interfaces:**
- Consumes: Task 2 `MemberFeeHistory` 타입들
- Produces:
  ```ts
  // memberFeeHistoryDisplay.ts
  export const MONTH_STATUS_LABEL: Record<CellStatus, string>  // PAID '낸 달', UNPAID '미납', LEAVE '휴회', EXEMPT '면제', NONE '해당 없음', FUTURE '아직'
  export function formatAsOf(iso: string | null, now?: Date): string
  export function formatDepositDate(iso: string): string          // "5월 1일"
  export function formatUnpaidSummary(year: number, summary: FeeHistorySummary): string
  export function formatMonthlyFee(ranges: MonthlyFeeRange[]): string | null
  export function visibleMonths(months: FeeHistoryMonth[]): FeeHistoryMonth[]
  // useMemberFeeHistory.ts
  export const MEMBER_FEE_HISTORY_KEY = 'memberFeeHistory';
  export function useMemberFeeHistory(clubId: string, userId: number | undefined, year: number | undefined): UseQueryResult<MemberFeeHistory>
  // queryKey [MEMBER_FEE_HISTORY_KEY, clubId, userId, year], enabled: !!clubId && userId != null
  // MemberFeeHistoryView.tsx
  export function MemberFeeHistoryView(props: { history: MemberFeeHistory; onChangeYear: (year: number) => void; showLeaves: boolean }): JSX.Element
  ```

표기 규칙(스펙 5.1~5.4):
- `formatAsOf`: `null` → "아직 올라온 통장 내역이 없어요". 아니면 "통장 거래 {M}월 {D}일 {오전|오후} {h}:{mm}까지 반영", 한국 연도가 `now`와 다르면 앞에 "{YYYY}년 ".
- `formatUnpaidSummary`: 0달 → "{year}년 미납 없음", 금액 있으면 "{year}년 미납 {n}달 · {금액}원", 금액 `null`이면 "{year}년 미납 {n}달".
- `formatMonthlyFee`: `[]` → `null`. 한 구간이면 "월 {금액}원"(+ " (부부)"). 여러 구간이면 앞 구간은 "{a}~{b}월 {금액}원"(a=b면 "{a}월 …"), 마지막 구간은 "{a}월부터 {금액}원", 부부 구간 뒤에 " (부부)", 구간 사이 " · ".
- `visibleMonths`: `FUTURE`·`NONE`이면서 납부가 없는 달을 뺀다.
- 한 달 줄: `ListRow` title "{m}월", trailing `StatusChip domain="feeMonth"`. subtitle은 납부마다 "{금액}원 · {입금일} 입금"(입금자명 있으면 " · 입금자 {이름}", 부부면 " · 부부"), 직접 추가면 "{금액}원 · 직접 추가"(+ " · {사유}"). `LEAVE`는 사유를, 의무 없는 칸(`LEAVE`·`NONE`)의 납부엔 " · 의무 없는 달에 낸 회비", `EXEMPT` 칸의 납부엔 " · 면제 달에 낸 회비".
- 묶음 순서: 반영 시각 줄과 연도 `OptionPicker`(aria-label "연도") → 요약 두 줄 → "확인 중인 입금"(없으면 숨김, 줄 끝 "재무님 확인 중") → "{year}년 납부 이력" → `showLeaves`면 "휴회"(없으면 숨김, "{YYYY.MM} ~ {YYYY.MM|미정} · 사유").
- `member.feeExcluded`면 요약·목록 대신 `EmptyState` "회비 대상이 아니에요".
- `feeMonth` 톤: PAID positive, UNPAID negative, LEAVE·EXEMPT·NONE·FUTURE neutral.

- [ ] **Step 1: 표기 함수 실패 테스트 작성**

```ts
expect(formatAsOf('2026-11-20T05:30:00Z', new Date('2026-11-29T00:00:00Z'))).toBe('통장 거래 11월 20일 오후 2:30까지 반영');
expect(formatAsOf('2026-10-31T15:10:00Z', new Date('2026-11-29T00:00:00Z'))).toBe('통장 거래 11월 1일 오전 12:10까지 반영');
expect(formatAsOf('2025-12-20T05:30:00Z', new Date('2026-11-29T00:00:00Z'))).toBe('통장 거래 2025년 12월 20일 오후 2:30까지 반영');
expect(formatAsOf(null)).toBe('아직 올라온 통장 내역이 없어요');
expect(formatDepositDate('2026-04-30T15:30:00Z')).toBe('5월 1일');
expect(formatUnpaidSummary(2026, { unpaidCount: 2, unpaidAmount: 50000, monthlyFee: [] })).toBe('2026년 미납 2달 · 50,000원');
expect(formatUnpaidSummary(2027, { unpaidCount: 1, unpaidAmount: null, monthlyFee: [] })).toBe('2027년 미납 1달');
expect(formatUnpaidSummary(2026, { unpaidCount: 0, unpaidAmount: 0, monthlyFee: [] })).toBe('2026년 미납 없음');
expect(formatMonthlyFee([{ fromMonth: 1, toMonth: 12, amount: 25000, isCouple: false }])).toBe('월 25,000원');
expect(formatMonthlyFee([
  { fromMonth: 1, toMonth: 4, amount: 25000, isCouple: false },
  { fromMonth: 5, toMonth: 12, amount: 22500, isCouple: true },
])).toBe('1~4월 25,000원 · 5월부터 22,500원 (부부)');
expect(formatMonthlyFee([])).toBeNull();
// 1월 PAID, 2월 NONE(납부 없음), 3월 NONE(납부 1건), 12월 FUTURE(납부 없음)
expect(visibleMonths(months).map(m => m.month)).toEqual([1, 3]);
```

- [ ] **Step 2: 실패 확인** — `npx jest src/__tests__/components/membership-fee/memberFeeHistoryDisplay.test.ts` → FAIL
- [ ] **Step 3: `memberFeeHistoryDisplay.ts` 구현** — 날짜는 `Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', … })`
- [ ] **Step 4: 통과 확인** — 같은 명령 → PASS
- [ ] **Step 5: 화면 부품 실패 테스트 작성** (`MemberFeeHistoryView.dom.test.tsx`)
  - 요약 두 줄, 반영 시각, "확인 중인 입금" 묶음과 "재무님 확인 중"이 보인다.
  - 미납 달 줄에 "미납", 낸 달에 "25,000원 · 5월 1일 입금 · 입금자 라마바".
  - 휴회 칸에 걸린 납부에 "의무 없는 달에 낸 회비".
  - 확인 중 입금이 없으면 그 묶음 제목이 없다. `showLeaves={false}`면 "휴회" 묶음이 없다.
  - 연도를 고르면 `onChangeYear(2025)`가 불린다.
  - `feeExcluded`면 "회비 대상이 아니에요"만 보인다.
- [ ] **Step 6: 실패 확인** — `npx jest src/__tests__/components/membership-fee/MemberFeeHistoryView.dom.test.tsx` → FAIL
- [ ] **Step 7: `statusTone.ts`의 `feeMonth`, `MemberFeeHistoryView`, `useMemberFeeHistory` 구현** — 훅은 `axios.get('/api/clubs/{clubId}/members/{userId}/fee-history', { params: { year } })`의 `data.data`를 돌려준다(`year`가 `undefined`면 쿼리에서 뺌).
- [ ] **Step 8: 통과·지킴이 확인** — `npx jest src/__tests__/components/membership-fee src/__tests__/guards src/__tests__/styles` → PASS
- [ ] **Step 9: 커밋** — `git commit -m "feat(membership-fee): 납부 이력 화면 부품과 조회 훅"`

---

### Task 4: 회원 상세에 납부 이력 붙이기

**Files:**
- Create: `src/components/organisms/membership-fee/MemberFeeHistorySection.tsx`
- Modify: `src/components/organisms/membership-fee/MemberFeeDetailView.tsx` (슬롯 prop)
- Modify: `src/pages/clubs/[id]/members/[userId].tsx`
- Modify: `src/pages/dev/admin-preview.tsx` (`fee-member` 화면에 가짜 이력)
- Test: `src/__tests__/components/membership-fee/MemberFeeDetailView.dom.test.tsx` (기존 파일에 추가)

**Interfaces:**
- Consumes: Task 3 `MemberFeeHistoryView`, `useMemberFeeHistory`, `MEMBER_FEE_HISTORY_KEY`
- Produces:
  ```ts
  // MemberFeeHistorySection.tsx — 데이터를 읽어 View에 넘기는 그릇. 내 회비 페이지도 쓴다
  export function MemberFeeHistorySection(props: { clubId: string; userId: number; title?: string; showLeaves: boolean }): JSX.Element
  // MemberFeeDetailViewProps에 추가
  historySlot?: ReactNode   // "휴회/병가 기간" 묶음(이월 안내 포함) 바로 위에 그린다
  ```

- `MemberFeeHistorySection`: 연도 상태(처음 `undefined` → 응답의 `year`로 표시), 로딩은 `Skeleton`, 실패는 `EmptyState`(서버 `error` 문구, 없으면 "납부 이력을 불러올 수 없습니다"). `title`이 있으면 맨 위에 섹션 제목으로 그린다.
- 회원 상세: `historySlot={<MemberFeeHistorySection clubId={clubId} userId={Number(userId)} title="납부 이력" showLeaves={false} />}`.
- 회원 상세가 `['paymentDashboard', clubId]`를 무효화하는 모든 곳에서 `[MEMBER_FEE_HISTORY_KEY, clubId]`도 무효화한다(휴회 저장·삭제, 이월, 직접 추가·삭제, 시작월·탈퇴 정보 저장).

- [ ] **Step 1: 실패 테스트** — `MemberFeeDetailView`에 `historySlot={<p>이력 자리</p>}`를 주면 그 글이 "휴회/병가 기간" 머리글보다 앞에 나온다(`compareDocumentPosition`). 주지 않으면 이전과 같다.
- [ ] **Step 2: 실패 확인** — `npx jest src/__tests__/components/membership-fee/MemberFeeDetailView.dom.test.tsx` → FAIL
- [ ] **Step 3: 슬롯 prop, `MemberFeeHistorySection`, 페이지 연결, 무효화 구현**
- [ ] **Step 4: 미리보기** — `admin-preview`의 `fee-member` 화면에서 `MemberFeeDetailView`에 `historySlot={<MemberFeeHistoryView history={가짜} … showLeaves={false} />}`(가짜 데이터: 지어낸 이름, 부부 전환·휴회·직접 추가·확인 중 입금 포함).
- [ ] **Step 5: 통과·타입 확인** — `npx jest src/__tests__/components/membership-fee && npx tsc --noEmit -p .` → PASS, 타입 오류 0
- [ ] **Step 6: 눈으로 확인** — `npm run dev` 후 `http://localhost:3001/dev/admin-preview?screen=fee-member`를 390·1280, 라이트·다크로 본다(가짜 데이터라 운영 DB에 쓰지 않음).
- [ ] **Step 7: 커밋** — `git commit -m "feat(membership-fee): 회원 상세에 달별 납부 이력 표시"`

---

### Task 5: 회원용 "내 회비" 화면과 메뉴, 문서

**Files:**
- Create: `src/pages/clubs/[id]/my-fee.tsx`
- Modify: `src/constants/navItems.ts` (`NavContext.feeMenuEnabled?: boolean`, 항목 `myFee`)
- Modify: `src/pages/api/clubs/[id]/custom/menu.ts` (GET에 `feeMenuEnabled`)
- Modify: `src/types/custom-settings.types.ts`(`MenuSettings`에 `feeMenuEnabled?: boolean`), `src/components/templates/Layout.tsx`
- Modify: `src/pages/dev/screen-preview.tsx` (화면 "내 회비" 추가)
- Modify: 문서 — `docs/회비 정산/회원별 납부 현황/회원별-납부현황-컨텍스트.md`, `README.md`; Create `docs/회비 정산/회원별 납부 현황/기능/내-회비-납부-이력.md`
- Test: `src/__tests__/constants/navItems.test.ts`, `src/__tests__/api/clubs/custom/menu.test.ts`(새 파일), `src/__tests__/pages/clubs/[id]/my-fee.dom.test.tsx`(스토어·QueryClient·라우터 mock은 `src/__tests__/pages/clubs/[id]/members/memberDetail.dom.test.tsx`를 따른다)

**Interfaces:**
- Consumes: Task 4 `MemberFeeHistorySection`
- Produces: 메뉴 항목 `{ key: 'myFee', label: '내 회비', href: '/clubs/{id}/my-fee', icon: Wallet, section: 'main', tab: false }` — `isMember && feeMenuEnabled`일 때만, 게시판·대회 뒤. `GET /api/clubs/[id]/custom/menu` → `{ tournamentMenuEnabled: boolean, feeMenuEnabled: boolean }`.

- `feeMenuEnabled` = `prisma.feeType.count({ where: { clubId, isActive: true } }) > 0`. 설정 행이 없어도 계산한다. PUT 응답은 그대로.
- `Layout`: `feeMenuEnabled: menuSettings?.feeMenuEnabled ?? false`.
- 페이지: `withAuth(MyFeePage)`. `PageHeader title="내 회비"` + `MemberFeeHistorySection clubId userId={user.id} showLeaves`(제목 없음). `user`가 없으면 아무것도 그리지 않는다(withAuth가 로그인으로 보냄).

- [ ] **Step 1: 실패 테스트**
  - navItems: 회원+`feeMenuEnabled: true` → '내 회비'가 게시판 뒤에, 탭 아님. `feeMenuEnabled` 없음/false → 없음. 비회원 → 없음. 기존 "회원은 홈·출석체크·게스트·게시판·대회를 이 순서로 본다"는 `feeMenuEnabled` 없이 그대로 통과.
  - menu API: 활성 회비 유형이 있으면 `feeMenuEnabled: true`, 없거나 모두 비활성이면 `false`, 설정 행이 없을 때도 두 값이 온다(prisma는 `jest.mock`으로 `clubCustomSettings.findUnique`·`feeType.count`만 흉내).
  - 페이지: 스토어에 로그인 사용자(id 1001)를 넣고 axios를 mock하면 `/api/clubs/1/members/1001/fee-history`를 부르고 "내 회비" 제목과 요약이 보인다. API가 403 `{ error: '권한이 없습니다' }`면 그 문구가 보인다.
- [ ] **Step 2: 실패 확인** — `npx jest src/__tests__/constants/navItems.test.ts src/__tests__/api/clubs/custom src/__tests__/pages/clubs` → FAIL
- [ ] **Step 3: 메뉴 API·`navItems`·`Layout`·페이지 구현**
- [ ] **Step 4: 미리보기** — `screen-preview`에 "내 회비" 화면을 더한다. 화면 고르기가 다섯 개가 되므로 `SegmentedControl`을 `OptionPicker`(aria-label "미리 볼 화면")로 바꾼다(2–4개 규칙). 메뉴에 '내 회비'가 보이게 `feeMenuEnabled: true`.
- [ ] **Step 5: 전체 확인** — `npx jest && npx tsc --noEmit -p . && npm run lint` → 모두 통과
- [ ] **Step 6: 눈으로 확인** — `http://localhost:3001/dev/screen-preview?screen=my-fee`를 390·1280, 라이트·다크로 본다. 사용자 승인 없이 운영 데이터로 `/clubs/1/my-fee`를 열어 보는 것은 읽기만이라 괜찮다.
- [ ] **Step 7: 문서** — 문서화 정책대로 기능 문서(배경 → 도입한 개선 → 설계 의사결정 → 백엔드/프런트 처리 → UX 디테일 → 검증 → 변경 이력)를 쓰고, 컨텍스트 문서에 "회원 상세의 납부 이력"과 "내 회비" 절·링크를 더한다. 실명 없이.
- [ ] **Step 8: 커밋** — `git commit -m "feat(membership-fee): 회원이 자기 납부 이력을 보는 내 회비 화면과 메뉴"` (문서는 `docs(membership-fee): …`로 따로 커밋해도 된다)
