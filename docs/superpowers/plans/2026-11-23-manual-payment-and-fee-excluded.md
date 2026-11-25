# 납부 직접 추가 · 회비 대상 아님 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 통장 입금 없이 낸 것으로 칠 달을 회원 상세에서 넣고("납부 직접 추가"), 코치처럼 회비 표에 없는 회원을 회비 화면에서 빼는("회비 대상 아님") 기능을 만든다.

**Architecture:** `MembershipPayment.paymentRecordId`를 nullable로 바꿔 "입금 없는 납부 = 직접 추가"로 두고, 납부를 읽는 기존 코드(현황·내보내기·미납·확정 계획·이월)가 그대로 완납으로 보게 한다. 대시보드 총 수입만 입금에 묶인 납부로 좁힌다. `ClubMember.feeExcluded`를 대시보드·내보내기가 함께 쓰는 로더와 미납 API의 회원 조회에서 거른다.

**Tech Stack:** Next.js 15 Pages Router, Prisma(PostgreSQL), zod, React, Jest + Testing Library, 메모리 DB(`src/__tests__/api/clubs/membership-fee/fakeFeeDb.ts`).

**Spec:** `docs/superpowers/specs/2026-11-23-manual-payment-and-fee-excluded-design.md`

## Global Constraints

- `.env`의 DB는 운영 Supabase다. 마이그레이션 적용과 실제 데이터 입력은 사용자 승인 뒤에만 한다. `prisma migrate dev`는 쓰지 않는다 (CLAUDE.md "스키마를 바꾸는 안전한 순서").
- 커밋은 사용자가 요청할 때만 한다. 이 계획에는 커밋 단계를 두지 않는다.
- API는 `.claude/rules/api-handler-conventions.md`를 따른다: `import { prisma } from '@/lib/prisma'`, `withAuth`, 메서드 → 경로 값 → 관리자 권한 순서, 성공 `{ data, status, message }`, 실패 `{ error, status }`, 메시지는 한국어.
- 화면은 `docs/가이드/디자인-시스템.md`를 따른다: 토큰만, `src/components`의 부품, `useConfirm`·`toast`(브라우저 `confirm`·`alert` 금지), 이모지 아이콘 금지(`lucide-react`). 원시 `<input>`은 radio만 허용된다.
- 테스트 파일은 `src/pages/` 안에 두지 않는다.
- 사유 목록은 정확히 `['다른 계좌로 보냄', '현금으로 받음', '기타']`. 기타는 직접 쓴 글(100자까지)을 저장한다.
- 막는 경우의 문구: "이미 납부가 있는 달입니다", "회비 의무가 없는 달입니다", "면제 기간인 달입니다", "금액을 확인해주세요", "사유를 입력해주세요".
- 화면 문구(안): 체크 "회비 대상 아님 (코치 등)", 설명 "켜면 납부 현황·엑셀·미납자 목록에서 빠집니다.", 목록 이름 "직접 추가한 납부", 목록 설명 "통장 입금 없이 낸 것으로 칠 달입니다. 납부 현황에는 완납으로 보이고, 총 수입에는 넣지 않습니다.", 버튼 "납부 직접 추가", 대시보드 줄 "직접 추가 {N}건 · {금액}원 (총 수입에 넣지 않음)". 바꾸면 사용자에게 보고한다.
- 탈퇴일(`leftAt`)은 회원 상태가 `LEFT`일 때만 본다 (`memberYearStatus.ts`와 같다).

## Review Focus

- 다시 돌아온 회원(APPROVED)에게 예전 `leftAt`이 남아 있으면, 그 뒤 달도 직접 추가할 수 있어야 한다 → Task 2 테스트.
- 같은 달을 두 번 넣으면(관리자 둘이 거의 동시에) 두 번째는 400이어야 한다. 트랜잭션 안에서 다시 검사한다 → Task 3 테스트.
- 금액을 문자열("25,000")·0·소수로 보내면 400과 "금액을 확인해주세요" → Task 3 테스트.
- 입금으로 확정된 납부를 직접 추가 삭제 API로 지우려 하면 거절해야 한다 → Task 3 테스트.
- 회비 대상 아님 회원의 통장 입금은 실제로 통장에 들어온 돈이라 총 수입에는 남아야 한다 → Task 6 테스트.

---

### Task 1: 스키마와 마이그레이션 (적용은 사용자 승인 뒤)

**Files:**
- Modify: `prisma/schema/membershipFee.prisma` (model `MembershipPayment`)
- Modify: `prisma/schema/club.prisma` (model `ClubMember`, `position` 근처)
- Create: `prisma/migrations/20261123120000_manual_payment_and_fee_excluded/migration.sql`
- Modify: `src/types/membership-fee.types.ts:184-194` (`MembershipPayment`)

**Interfaces:**
- Produces: Prisma 필드 `MembershipPayment.paymentRecordId: string | null`, `MembershipPayment.paymentRecord: PaymentRecord | null`, `MembershipPayment.manualReason: string | null`, `ClubMember.feeExcluded: boolean`. 타입 `MembershipPayment`에 `paymentRecordId: string | null`, `manualReason: string | null`.

- [ ] **Step 1: 스키마를 고친다**
  - `MembershipPayment`: `paymentRecordId String?`, `paymentRecord PaymentRecord? @relation(fields: [paymentRecordId], references: [id], onDelete: Cascade)`, `manualReason String? // 직접 추가한 납부의 사유. 입금 없는 납부(paymentRecordId 없음)에만 있다`.
  - `ClubMember`: `feeExcluded Boolean @default(false) // 회비 대상 아님 (코치 등). 납부 현황·내보내기·미납자 목록에서 뺀다`.
- [ ] **Step 2: 통합 스키마를 빌드한다**
  Run: `npm run build:schema`
  Expected: `prisma/schema.prisma`가 다시 만들어진다.
- [ ] **Step 3: 바뀌는 SQL을 본다 (읽기만)**
  Run: `npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script`
  Expected: 아래 두 문장만 나온다. 다른 SQL이 섞이면 멈추고 사용자에게 알린다.
  ```sql
  ALTER TABLE "ClubMember" ADD COLUMN "feeExcluded" BOOLEAN NOT NULL DEFAULT false;
  ALTER TABLE "MembershipPayment" ADD COLUMN "manualReason" TEXT, ALTER COLUMN "paymentRecordId" DROP NOT NULL;
  ```
- [ ] **Step 4: diff 출력 그대로 `migration.sql`을 쓴다**
- [ ] **Step 5: STOP — 사용자에게 SQL과 영향 범위를 보이고 승인을 받는다**
  - 영향: 칼럼 추가 2개(기존 행은 `false`·`NULL`), 기존 납부 781건은 그대로. 백업 상태를 확인하도록 안내한다.
- [ ] **Step 6: 승인 뒤 적용한다**
  Run: `npx prisma db execute --file prisma/migrations/20261123120000_manual_payment_and_fee_excluded/migration.sql --schema prisma/schema.prisma && npx prisma migrate resolve --applied 20261123120000_manual_payment_and_fee_excluded && npx prisma generate`
  Expected: 세 명령 모두 성공. 다시 Step 3 명령을 돌리면 `-- This is an empty migration.`
- [ ] **Step 7: 타입을 고치고 타입 검사를 돌린다**
  `src/types/membership-fee.types.ts`의 `MembershipPayment`를 위 Interfaces대로 바꾼다.
  Run: `npx tsc --noEmit -p tsconfig.json`
  Expected: 통과. 실패하면 null을 다루지 않는 곳이니 그 자리에서 고친다.

### Task 2: 직접 추가 판정 함수

**Files:**
- Create: `src/lib/membership-fee/manualPayment.ts`
- Test: `src/lib/membership-fee/manualPayment.test.ts`

**Interfaces:**
- Consumes: `isMonthObligated(year, month, feeObligationStartAt, leavePeriods, leftAt)` (`feeObligation.ts`), `isMonthExempt(periods, year, month)` (`exemption.ts`), `splitEvenly(total, n)` (`feeAmountResolver.ts`), `FeeRateSettings` (`transactionClassifier.ts`).
- Produces:
  ```ts
  export const MANUAL_PAYMENT_REASONS = ['다른 계좌로 보냄', '현금으로 받음', '기타'] as const;
  export interface ManualPaymentTarget {
    status: string;
    feeObligationStartAt: Date | null;
    leftAt: Date | null;
    leavePeriods: LeavePeriod[];
    exemptions: ExemptionPeriod[];
    /** 이미 납부가 있는 달 (입금이든 직접 추가든) */
    paidMonths: { year: number; month: number }[];
  }
  /** 넣을 수 없으면 그 까닭(화면에 보일 문구), 넣을 수 있으면 null */
  export function manualPaymentBlockReason(target: ManualPaymentTarget, year: number, month: number): string | null;
  /** 그 달의 기본 금액. 부부면 부부 월 단가를 둘로 나눈 몫(입금 확정과 같다) */
  export function suggestedManualAmount(rates: FeeRateSettings, isCouple: boolean): number;
  ```

- [ ] **Step 1: 실패하는 테스트를 쓴다**
  기본 대상: `status 'APPROVED'`, 시작 `new Date(2026, 0, 1)`, `leftAt null`, 휴회·면제·납부 없음.
  ```ts
  it('의무가 있고 납부가 없는 달은 넣을 수 있다', () => expect(block(target(), 2026, 9)).toBeNull());
  it('이미 납부가 있는 달은 막는다', () =>
    expect(block(target({ paidMonths: [{ year: 2026, month: 9 }] }), 2026, 9)).toBe('이미 납부가 있는 달입니다'));
  it('가입 전·휴회 달은 의무가 없어 막는다', () => {
    expect(block(target({ feeObligationStartAt: new Date(2026, 9, 1) }), 2026, 9)).toBe('회비 의무가 없는 달입니다');
    expect(block(target({ leavePeriods: [{ startYear: 2026, startMonth: 9, endYear: 2026, endMonth: 9 }] }), 2026, 9)).toBe('회비 의무가 없는 달입니다');
  });
  it('탈퇴 회원은 탈퇴월 뒤를 막고, 다시 돌아온 회원은 예전 탈퇴일을 보지 않는다', () => {
    expect(block(target({ status: 'LEFT', leftAt: new Date(2026, 7, 20) }), 2026, 9)).toBe('회비 의무가 없는 달입니다');
    expect(block(target({ status: 'APPROVED', leftAt: new Date(2026, 7, 20) }), 2026, 9)).toBeNull();
  });
  it('면제 기간의 달은 막는다', () =>
    expect(block(target({ exemptions: [{ year: 2026, startMonth: 4, endMonth: 12 }] }), 2026, 9)).toBe('면제 기간인 달입니다'));
  it('기본 금액은 일반 월 단가, 부부면 부부 월 단가의 반이다', () => {
    const rates = { regularMonthly: 25000, coupleMonthly: 45000, regularAnnual: null, coupleAnnual: null, joiningFeeAmounts: [] };
    expect(suggestedManualAmount(rates, false)).toBe(25000);
    expect(suggestedManualAmount(rates, true)).toBe(22500);
  });
  ```
- [ ] **Step 2: 실패를 확인한다**
  Run: `npx jest src/lib/membership-fee/manualPayment.test.ts`
  Expected: FAIL (모듈 없음)
- [ ] **Step 3: `manualPayment.ts`를 만든다**
  검사 순서: 이미 납부 → 의무 없음(`leftAt`은 `status === 'LEFT'`일 때만 넘긴다) → 면제.
- [ ] **Step 4: 통과를 확인한다**
  Run: `npx jest src/lib/membership-fee/manualPayment.test.ts`
  Expected: PASS

### Task 3: 직접 추가 목록·추가·삭제 API

**Files:**
- Modify: `src/schemas/membership-fee.schema.ts` (`memberLeaveSchema` 아래)
- Modify: `src/types/membership-fee.types.ts` (`ManualPaymentItem` 추가)
- Modify: `src/__tests__/api/clubs/membership-fee/fakeFeeDb.ts`
- Create: `src/pages/api/clubs/[id]/members/[userId]/manual-payments/index.ts`
- Create: `src/pages/api/clubs/[id]/members/[userId]/manual-payments/[paymentId].ts`
- Test: `src/__tests__/api/clubs/membership-fee/manualPayments.test.ts`

**Interfaces:**
- Consumes: Task 2의 `manualPaymentBlockReason`, `ManualPaymentTarget`.
- Produces:
  ```ts
  // membership-fee.schema.ts
  export const manualPaymentSchema = z.object({
    year: z.number().int().min(2020).max(2100),
    month: z.number().int().min(1).max(12),
    amount: z.number({ invalid_type_error: '금액을 확인해주세요' }).int('금액을 확인해주세요').min(1, '금액을 확인해주세요'),
    reason: z.string().trim().min(1, '사유를 입력해주세요').max(100),
  });
  // membership-fee.types.ts
  export interface ManualPaymentItem {
    id: string; year: number; month: number; amount: number;
    reason: string;
    /** ISO 문자열 */
    confirmedAt: string;
    confirmedByName: string | null;
  }
  ```
  - `GET …/manual-payments` → 200 `{ data: { payments: ManualPaymentItem[] } }`, 최근 달부터(연·월 내림차순), `paymentRecordId: null`인 납부만.
  - `POST …/manual-payments` body `{ year, month, amount, reason }` → 201 `{ data: { payment: ManualPaymentItem }, message: '납부를 직접 추가했습니다' }`. 막히면 400 `{ error: <문구> }`.
  - `DELETE …/manual-payments/[paymentId]` → 200 `{ message: '직접 추가한 납부를 지웠습니다' }`. 그 회원의 납부가 없으면 404 '납부를 찾을 수 없습니다', 입금에 묶였으면 400 '입금으로 확정된 납부는 여기서 지울 수 없습니다'.

- [ ] **Step 1: 메모리 DB를 넓힌다**
  - `emptyState`의 관리자와 `addMember` 기본값에 `feeExcluded: false`.
  - `membershipPayment.findFirst({ where })`를 더한다 (`findMany`와 같은 조건 비교).
  - `addManualPayment(data: Row & { clubMemberId; year; month }): string` — `paymentRecordId: null`, `manualReason: '다른 계좌로 보냄'`, `confirmedById: ADMIN_MEMBER_ID`, `confirmedAt: new Date(2026, 9, 1)`, `amount: 25000` 기본.
- [ ] **Step 2: 실패하는 API 테스트를 쓴다** (`memberLeaves.test.ts`의 `jest.mock`·`call` 모양을 따른다. 회원 1 가나다, userId 1001, 시작 2026-01)
  ```ts
  it('직접 추가한 납부만 최근 달부터 돌려준다', /* addPayment(9월, 입금), addManualPayment(10월), addManualPayment(11월) → GET → months [11, 10], reason '다른 계좌로 보냄', confirmedByName '관리자' */);
  it('넣으면 입금 없는 납부로 저장한다', /* POST {2026, 9, 25000, '다른 계좌로 보냄'} → 201, fakeDb.state.payments에 { clubMemberId: 1, year: 2026, month: 9, amount: 25000, paymentRecordId: null, manualReason: '다른 계좌로 보냄', confirmedById: ADMIN_MEMBER_ID, period: 'MONTHLY' } */);
  it('같은 달을 두 번 넣으면 두 번째는 막는다', /* POST 9월 두 번 → 두 번째 400, error '이미 납부가 있는 달입니다', 납부 1건 */);
  it('휴회·면제 달은 막는다', /* addLeave(1, 2026-09) → 400 '회비 의무가 없는 달입니다'; exemptions에 {clubMemberId:1, year:2026, startMonth:10, endMonth:12} → 10월 400 '면제 기간인 달입니다' */);
  it('금액이 문자열·0·소수면 막는다', /* amount '25,000' | 0 | 2500.5 → 각각 400, error '금액을 확인해주세요' */);
  it('사유가 비면 막는다', /* reason '  ' → 400 '사유를 입력해주세요' */);
  it('직접 추가한 납부를 지운다', /* addManualPayment → DELETE → 200, payments 0건 */);
  it('입금으로 확정된 납부는 지우지 않는다', /* addPayment(입금) → DELETE → 400, 1건 남음 */);
  it('다른 회원의 납부 id면 404다', /* 회원 2의 addManualPayment를 회원 1 경로로 DELETE → 404 */);
  it('관리자가 아니면 403이다', /* 관리자 role을 'MEMBER'로 바꾸고 GET → 403 */);
  ```
- [ ] **Step 3: 실패를 확인한다**
  Run: `npx jest src/__tests__/api/clubs/membership-fee/manualPayments.test.ts`
  Expected: FAIL (핸들러 없음)
- [ ] **Step 4: 스키마·타입을 더하고 핸들러 두 개를 만든다**
  - 구조는 `leaves/index.ts`를 따른다 (관리자 확인 → `findUnique({ where: { clubId_userId } })` 404).
  - POST: zod 실패면 `error.errors[0].message`로 400. `prisma.$transaction` 안에서 `` tx.$queryRaw`SELECT "id" FROM "ClubMember" WHERE "id" = ${member.id} FOR UPDATE` `` → 그 회원의 휴회·면제·그 해 납부를 읽어 `manualPaymentBlockReason` → 막히면 전용 에러를 던져 밖에서 400 → 아니면 `tx.membershipPayment.create({ data: { clubMemberId, year, month, amount, period: 'MONTHLY', paymentRecordId: null, manualReason: reason, confirmedById: adminMember.id } })`.
  - GET의 `confirmedByName`은 `confirmedById`들로 `clubMember.findMany({ where: { id: { in } } })`를 한 번 더 읽어 붙인다.
  - DELETE: `findFirst({ where: { id: paymentId, clubMemberId: member.id } })` 404 → `paymentRecordId != null`이면 400 → `deleteMany({ where: { id: paymentId, paymentRecordId: null } })`.
- [ ] **Step 5: 통과를 확인한다**
  Run: `npx jest src/__tests__/api/clubs/membership-fee`
  Expected: PASS (기존 회비 API 테스트 포함)

### Task 4: 기본 금액 API

**Files:**
- Create: `src/pages/api/clubs/[id]/members/[userId]/manual-payments/suggest.ts`
- Test: `src/__tests__/api/clubs/membership-fee/manualPayments.test.ts` (같은 파일에 describe 추가)

**Interfaces:**
- Consumes: `feeRateSettingsFromTypes(feeTypes, year)` (`confirmPlanner.ts`), `wasCoupleAt(clubMemberId, date, histories)`·`yearMonthToStartedAt(year, month)` (`coupleHistory.ts`), Task 2의 `suggestedManualAmount`.
- Produces: `GET …/manual-payments/suggest?year=&month=` → 200 `{ data: { amount: number | null, isCouple: boolean } }`. 그 해 단가가 없으면 `amount: null`. `year`·`month`가 숫자가 아니면 400 '연월을 확인해주세요'.

- [ ] **Step 1: 실패하는 테스트를 쓴다**
  ```ts
  it('일반 회원은 일반 월 단가다', /* GET year=2026&month=9 → { amount: 25000, isCouple: false } */);
  it('그 달에 부부였으면 부부 월 단가의 반이다', /* addMember 2, addCouple(1, 2) → { amount: 22500, isCouple: true } */);
  it('그 해 단가가 없으면 금액을 비운다', /* year=2030 → { amount: null } */);
  it('연월이 없으면 400이다', /* query에 year 없음 → 400 */);
  ```
- [ ] **Step 2: 실패를 확인한다** — Run: `npx jest src/__tests__/api/clubs/membership-fee/manualPayments.test.ts -t 기본` / Expected: FAIL
- [ ] **Step 3: `suggest.ts`를 만든다**
  `feeType.findMany({ where: { clubId }, include: { rates: true } })`, `coupleHistory.findMany({ where: { clubId, clubMemberId: member.id } })`.
- [ ] **Step 4: 통과를 확인한다** — 같은 명령 / Expected: PASS

### Task 5: 회비 대상 아님 (서버)

**Files:**
- Modify: `src/pages/api/clubs/[id]/members/[userId]/fee-obligation.ts` (직책 처리 앞)
- Modify: `src/lib/membership-fee/memberYearStatusLoader.ts` (회원 조회 `where`, `exemptMemberCount`)
- Modify: `src/pages/api/clubs/[id]/membership-fee/unpaid.ts` (회원 조회 `where`)
- Test: `src/__tests__/api/clubs/membership-fee/memberFeeObligation.test.ts`, `dashboard.test.ts`, `export.test.ts`, `unpaid.test.ts`

**Interfaces:**
- Produces: `PATCH …/fee-obligation` body에 `feeExcluded?: boolean`. 있으면 그 칸만 고친다. 불리언이 아니면 400 '회비 대상 여부를 확인해주세요'.

- [ ] **Step 1: 실패하는 테스트를 쓴다**
  ```ts
  // memberFeeObligation.test.ts
  it('회비 대상 아님만 보내면 그 칸만 고친다', /* PATCH { feeExcluded: true } → 200, 회원 feeExcluded true, feeObligationStartAt·position 그대로 */);
  it('회비 대상 아님이 불리언이 아니면 400이다', /* { feeExcluded: 'yes' } → 400 */);
  // dashboard.test.ts
  it('회비 대상 아님 회원은 납부 현황·회원 수·면제 수에서 빠진다', /* 회원 2를 feeExcluded true + 2026 면제 → members에 없음, totalMembers·exemptMembers가 그만큼 적음 */);
  // export.test.ts
  it('회비 대상 아님 회원은 엑셀에 싣지 않는다', /* 시트의 이름 열에 그 회원이 없음 */);
  // unpaid.test.ts
  it('회비 대상 아님 회원은 미납자 목록에 없다');
  ```
- [ ] **Step 2: 실패를 확인한다**
  Run: `npx jest src/__tests__/api/clubs/membership-fee -t "회비 대상 아님"`
  Expected: FAIL
- [ ] **Step 3: 고친다**
  - 로더·미납의 회원 조회 `where`에 `feeExcluded: false`를 더한다 (로더는 `OR`와 나란히 맨 위 단계).
  - `exemptMemberCount`는 조회된 회원(`memberIds`) 가운데 면제가 있는 회원 수로 센다.
- [ ] **Step 4: 통과를 확인한다**
  Run: `npx jest src/__tests__/api/clubs/membership-fee`
  Expected: PASS

### Task 6: 총 수입에서 직접 추가 분리

**Files:**
- Modify: `src/lib/membership-fee/memberYearStatusLoader.ts` (`MemberYearData`, 납부 조회 `select`에 `paymentRecordId`)
- Modify: `src/pages/api/clubs/[id]/membership-fee/dashboard.ts` (`summary`)
- Modify: `src/types/membership-fee.types.ts` (`DashboardSummary`)
- Modify: `src/components/organisms/membership-fee/DashboardSummaryCard.tsx`
- Modify(fixture): `src/pages/dev/admin-preview.tsx`, `src/pages/clubs/[id]/membership-fee/report.tsx`(쓰면), 그리고 `yearTotal`을 만드는 테스트 fixture들 (`FeeDashboardView.dom.test.tsx`, `FeeDashboardView.export.dom.test.tsx`, `report.dom.test.tsx`)
- Test: `dashboard.test.ts`, `src/__tests__/components/membership-fee/FeeDashboardView.dom.test.tsx`

**Interfaces:**
- Produces:
  - `MemberYearData.amountsByMonth` — 입금에 묶인 납부만. `MemberYearData.manualPayments: { count: number; amount: number }` — 그 해 직접 추가.
  - `DashboardSummary.manualPayments: { count: number; amount: number }`.

- [ ] **Step 1: 실패하는 테스트를 쓴다**
  ```ts
  // dashboard.test.ts
  it('직접 추가한 납부는 완납으로 세되 총 수입에는 넣지 않는다', /* 회원 1: addPayment(9월 입금 25000), addManualPayment(10월 25000)
     → members[0].payments[10] true, monthlyStats[9].amount 0, monthlyStats[8].amount 25000, yearTotal 25000, summary.manualPayments { count: 1, amount: 25000 } */);
  it('회비 대상 아님 회원의 통장 입금은 총 수입에 남는다', /* 회원 2 feeExcluded true + addPayment(9월) → yearTotal에 포함 */);
  // FeeDashboardView.dom.test.tsx
  it('직접 추가가 있으면 총 수입 아래에 따로 적는다', /* manualPayments { count: 2, amount: 50000 } → '직접 추가 2건 · 50,000원 (총 수입에 넣지 않음)' 보임; count 0이면 '직접 추가' 글자 없음 */);
  ```
- [ ] **Step 2: 실패를 확인한다**
  Run: `npx jest src/__tests__/api/clubs/membership-fee/dashboard.test.ts src/__tests__/components/membership-fee/FeeDashboardView.dom.test.tsx`
  Expected: FAIL
- [ ] **Step 3: 고친다**
  - 로더: `paymentRecordId == null`이면 `manualPayments`에 더하고 `amountsByMonth`에는 넣지 않는다. 납부 달(`paidMonthsOf`)에는 둘 다 넣는다.
  - 카드: 총 수입 칸의 금액 아래 `text-caption text-secondary` 한 줄, `count > 0`일 때만.
  - `DashboardSummary`에 필드를 더한 뒤 `npx tsc --noEmit -p tsconfig.json`이 가리키는 fixture에 `manualPayments: { count: 0, amount: 0 }`를 채운다.
- [ ] **Step 4: 통과를 확인한다**
  Run: `npx jest src/__tests__/api/clubs/membership-fee src/__tests__/components/membership-fee src/__tests__/pages && npx tsc --noEmit -p tsconfig.json`
  Expected: PASS, tsc 오류 없음

### Task 7: 직접 추가한 납부 화면 부품

**Files:**
- Create: `src/components/organisms/membership-fee/ManualPaymentSection.tsx`
- Test: `src/__tests__/components/membership-fee/ManualPaymentSection.dom.test.tsx`

**Interfaces:**
- Consumes: `ManualPaymentItem` (Task 3), `MANUAL_PAYMENT_REASONS` (Task 2).
- Produces:
  ```ts
  export interface ManualPaymentFormValue { year: number; month: number; amount: number; reason: string }
  interface ManualPaymentSectionProps {
    payments: ManualPaymentItem[];
    saving: boolean;
    /** 연월을 고르면 부른다. 금액 칸을 미리 채운다 (null이면 비워 둔다) */
    onSuggestAmount: (year: number, month: number) => Promise<number | null>;
    /** 저장에 성공하면 true. 그때 시트를 닫는다 */
    onAdd: (value: ManualPaymentFormValue) => Promise<boolean>;
    onDelete: (paymentId: string) => void;
  }
  export function ManualPaymentSection(props: ManualPaymentSectionProps): JSX.Element;
  ```
  - 행 제목: `2026.09 · 25,000원 · 다른 계좌로 보냄`. 행을 누르면 시트(연월·금액·사유·넣은 날·넣은 사람, [삭제]). [삭제]는 `onDelete(id)`만 부른다(확인은 페이지가 `useConfirm`으로).
  - 추가 시트: 연월 `Input type="month"`, 금액 `Input type="number" min=1`, 사유 라디오 3개(`ExemptionRegisterSheet`의 사유 fieldset 모양) + 기타면 글 칸(`maxLength=100`). 기타면 쓴 글을, 아니면 고른 글자를 `reason`으로 보낸다. 연월·금액·사유가 다 차야 [저장]이 눌린다.

- [ ] **Step 1: 실패하는 화면 테스트를 쓴다**
  ```ts
  it('직접 추가한 납부를 한 줄씩 보인다', /* payments 2건 → '2026.10 · 25,000원 · 재무 표 기준', '2026.09 · 25,000원 · 다른 계좌로 보냄' */);
  it('없으면 목록 없이 추가 버튼만 보인다');
  it('연월을 고르면 기본 금액을 채운다', /* onSuggestAmount → 25000, 연월 '2026-09' 입력 → 금액 칸 값 '25000', 호출 인자 (2026, 9) */);
  it('기타를 고르면 쓴 글을 사유로 보낸다', /* 기타 + '재무 표 기준' → onAdd({ year: 2026, month: 10, amount: 25000, reason: '재무 표 기준' }) */);
  it('저장에 성공하면 시트를 닫는다', /* onAdd → true → 시트 제목 '납부 직접 추가' 사라짐 */);
  it('행을 눌러 삭제하면 그 id로 onDelete를 부른다');
  ```
- [ ] **Step 2: 실패를 확인한다** — Run: `npx jest src/__tests__/components/membership-fee/ManualPaymentSection.dom.test.tsx` / Expected: FAIL
- [ ] **Step 3: 부품을 만든다** — `ListGroup`(label "직접 추가한 납부", footer는 Global Constraints의 목록 설명) + `ListRow` + `Sheet` + `Button`(`Plus` 아이콘). `MemberFeeDetailView`의 휴회 목록·시트를 본뜬다.
- [ ] **Step 4: 통과와 지킴이를 확인한다**
  Run: `npx jest src/__tests__/components/membership-fee/ManualPaymentSection.dom.test.tsx src/__tests__/guards src/__tests__/styles`
  Expected: PASS

### Task 8: 회원 상세에 붙이기 (회비 대상 아님 체크 포함)

**Files:**
- Modify: `src/components/organisms/membership-fee/MemberFeeDetailView.tsx` (`ClubMemberDetail`, props, "회비 설정" 그룹)
- Modify: `src/pages/clubs/[id]/members/[userId].tsx`
- Modify: `src/pages/dev/admin-preview.tsx` (가짜 데이터로 두 부품을 함께 보인다)
- Test: `src/__tests__/components/membership-fee/MemberFeeDetailView.dom.test.tsx`

**Interfaces:**
- Consumes: Task 3·4 API, Task 5의 `feeExcluded` PATCH, Task 7의 `ManualPaymentSection`.
- Produces: `ClubMemberDetail.feeExcluded?: boolean`, `MemberFeeDetailView` prop `onToggleFeeExcluded: (next: boolean) => void`.

- [ ] **Step 1: 실패하는 화면 테스트를 쓴다**
  ```ts
  it('회비 대상 아님 체크를 보이고 바꾸면 새 값으로 알린다', /* member.feeExcluded false → 체크박스 '회비 대상 아님 (코치 등)' 해제 상태, 클릭 → onToggleFeeExcluded(true) */);
  it('회비 대상 아님이면 체크된 채로 보인다');
  ```
- [ ] **Step 2: 실패를 확인한다** — Run: `npx jest src/__tests__/components/membership-fee/MemberFeeDetailView.dom.test.tsx` / Expected: FAIL
- [ ] **Step 3: 뷰에 체크를 더한다** — "회비 설정" 그룹의 입금 시작 아래, `Checkbox` + 설명 한 줄. 저장 버튼과 무관하게 바로 `onToggleFeeExcluded`.
- [ ] **Step 4: 페이지를 잇는다**
  - `fetchManualPayments()` — 회원을 읽은 뒤 `GET manual-payments`.
  - `onToggleFeeExcluded(next)` — `PATCH fee-obligation { feeExcluded: next }`, 성공 토스트 "회비 대상 아님으로 바꿨습니다." / "회비 대상으로 바꿨습니다.", 실패면 서버 `error` 토스트.
  - `onSuggestAmount` — `GET manual-payments/suggest`, 실패면 `null`.
  - `onAdd` — `POST`, 성공 토스트 "납부를 직접 추가했습니다.", 목록 다시 읽기. 실패면 서버 `error` 토스트, `false`.
  - `onDelete` — `useConfirm({ title: '이 납부를 지울까요?', confirmLabel: '삭제', destructive: true })` → `DELETE` → 토스트 "직접 추가한 납부를 지웠습니다.", 목록 다시 읽기.
  - 렌더: `MemberFeeDetailView`와 `ManualPaymentSection`을 `<div className="space-y-6">`로 함께 감싼다.
- [ ] **Step 5: 전체 검사를 돌린다**
  Run: `npx jest && npx tsc --noEmit -p tsconfig.json && npm run lint`
  Expected: 모두 통과
- [ ] **Step 6: 네 가지 화면으로 본다**
  dev 서버의 `/dev/admin-preview`를 휴대폰(390)·PC(1280), 라이트·다크로 캡처한다(헤드리스 Chrome `--headless --screenshot --window-size=…`, 다크는 `--force-dark-mode`). 글자 잘림·대비·간격을 확인한다.

### Task 9: 문서

**Files:**
- Create: `docs/회비 정산/회원별 납부 현황/기능/납부-직접-추가.md`
- Create: `docs/회비 정산/회원별 납부 현황/기능/회비-대상-아님.md`
- Modify: `docs/회비 정산/회원별 납부 현황/회원별-납부현황-컨텍스트.md`, `docs/회비 정산/회원별 납부 현황/README.md`
- Modify: `docs/회비 정산/회원별 납부 현황/기능/납부현황-내보내기.md` (변경 이력: 회비 대상 아님 회원은 싣지 않음)

- [ ] **Step 1: 기능 문서 두 개를 쓴다** — CLAUDE.md 문서화 정책의 순서(배경 → 도입한 개선 → 설계 의사결정 → 백엔드/프런트 처리 → UX 디테일 → 검증 → 변경 이력). 결정과 버린 대안은 spec §3·§7에서 옮긴다.
- [ ] **Step 2: 컨텍스트·README에 링크와 바뀐 흐름을 더한다**

### Task 10: 실제 데이터 채우기 (사용자 승인 뒤)

- [ ] **Step 1: STOP — 넣을 값을 보이고 승인을 받는다**
  - 회원 A(userId는 clubMember 151로 찾는다) 2026-09 25,000원 "다른 계좌로 보냄".
  - 회원 B(clubMember 79) 2026-10·11 각 25,000원. 재무님 답이 없으면 기타 "재무 표 기준".
  - 코치 C(userId 17589)·코치 D(userId 11079) 회비 대상 아님 켜기.
  - 코치 D의 2026 면제(id 6)를 지울지 함께 묻는다.
- [ ] **Step 2: 승인 뒤 화면과 같은 API로 넣는다** (스크립트는 scratchpad, 회원 상세 저장과 같은 경로)
- [ ] **Step 3: 확인한다**
  - 내보낸 엑셀: 회원 A 9월·회원 B 10·11월이 완납, 코치 C·코치 D 줄 없음.
  - 대시보드: 총 수입이 넣기 전과 같고, "직접 추가 3건 · 75,000원 (총 수입에 넣지 않음)"이 보임.
  - 11/4 재무 표 대조 스크립트(`q10-left.ts`·`q10-extra.ts`)의 남은 차이가 예상 목록(회원 H 1–12, 회원 I 11, 회원 J·회원 K 8–12)뿐인지 본다.
