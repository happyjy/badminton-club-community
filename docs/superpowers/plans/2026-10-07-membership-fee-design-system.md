# 회비 관리 화면의 디자인 시스템 전환 — 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 회비 관리 화면 8개와 회원 상세 화면 1개를 디자인 시스템의 토큰·부품·관리용 화면 틀로 옮기고, 옮긴 뒤에도 기존 기능이 그대로인지 확인한다.

**Architecture:** 데이터 훅·API·계산 로직은 그대로 두고 그리는 층만 바꾼다. 행 안 편집과 펼침 패널은 상세 `Sheet`로 옮기고, 표는 `DataTable`로 바꾼다. 큰 화면 셋은 그리는 부분을 `…View`로 떼어 테스트와 미리보기에서 가짜 데이터로 그린다.

**Tech Stack:** Next.js Pages Router, React, Tailwind(토큰), `@headlessui/react`(Sheet), `react-hot-toast`, `@tanstack/react-query`, Jest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-07-membership-fee-design-system-design.md`

**먼저 읽을 것:** `docs/가이드/디자인-시스템.md`, `src/components/organisms/club/MembersView.tsx`(관리 화면의 본보기), `src/__tests__/components/club/MembersView.dom.test.tsx`(View 테스트의 본보기).

## Global Constraints

- DB 상태를 바꾸는 명령을 실행하지 않는다. `.env`의 `DATABASE_URL`은 프로덕션이다. `prisma` 명령을 쓸 일이 없다.
- `src/pages/api/**`, `src/lib/membership-fee/**`, `prisma/**`를 고치지 않는다.
- `src/hooks/membership-fee/`에서는 `useBulkPaymentActions.ts`만 고친다.
- 화면이 부르는 훅, 넘기는 값, 요청 본문을 바꾸지 않는다.
- 색·크기는 토큰만 쓴다. `bg-blue-500`, `bg-white`, `#hex`, `text-sm`, `shadow-md`를 쓰지 않는다.
- 원시 `<input>`·`<select>`·`<textarea>`, `confirm()`·`alert()`, 직접 만든 `fixed inset-0` 막을 쓰지 않는다.
- 이모지를 쓰지 않는다. 아이콘은 `lucide-react`.
- 지킴이 테스트의 예외 목록에 파일을 넣지 않는다.
- 사용자 문구를 바꾸지 않는다. 아래 Rulings에 적힌 것만 예외이고, 그 밖에 바꾼 것이 있으면 보고한다.
- 테스트 파일을 `src/pages/` 안에 두지 않는다. 페이지를 import할 때는 `@/` 절대 경로를 쓴다.
- 화면의 바깥 여백(`max-w-* mx-auto p-6`)을 주지 않는다. `Layout`이 그린다.
- 커밋 메시지에 `Co-Authored-By` 트레일러를 넣지 않는다. 커밋은 Task 하나마다 한다.
- 기준 커밋은 `7c9ab20`(전환 전)이다. 전환 전 전체 테스트는 "3 failed, 118 passed / 33 failed, 1590 passed"이고, 실패는 모두 지킴이 테스트다.

## Rulings (미리 정한 것)

- **한 건 동작의 오류 알림은 `toast.error`로 통일한다.** 지금은 `alert`와 `toast`가 섞여 있다. 문구는 그대로다.
- **일괄 처리 결과는 실패가 없으면 `toast.success`, 있으면 `confirm({ hideCancel: true })`.** 문구(`N건 확정, M건 실패` + 사유 목록)는 그대로다.
- **대시보드 격자의 `O`·`X`·`-`와 휴회 이모지(🏥)는 lucide 아이콘으로 바꾼다.** `Check`·`X`·`Minus`·`Hospital`. 칸의 `title`은 그대로 둔다. 보고 대상.
- **`upload.tsx`의 "회비 설정" 이동 경로가 없는 화면(`/membership-fee/settings`)을 가리킨다.** 대시보드의 같은 안내가 가리키는 `/membership-fee/settings/fee-types`로 고친다. 기능 변경이므로 보고 대상. — 틀리면: 한 줄 되돌리기.
- **회원 상세의 화면 안 메시지(`message` 상태)는 `toast`로 바꾼다.** 문구는 그대로다.
- **`DataTable`에 행별 선택 불가를 더하지 않는다.** 매칭 회원이 없는 MATCHED 행은 서버가 실패 사유로 돌려준다. — 틀리면: `selection.disabled?: (row) => boolean`을 더한다.
- **`PaymentRecordFilters`의 접기·펼치기는 유지한다.** `Toolbar`의 `search`에는 입금자명만 올리고, 금액·매칭 회원은 지금처럼 펼침 영역에 둔다.

## Review Focus

1. **확인창을 거절하거나 닫으면 일괄 동작이 실행되지 않는가.** `useConfirm`은 화면이 바뀌거나 다른 확인창이 뜨면 `false`로 끝난다. `false`일 때 mutation이 불리지 않아야 한다. (Task 2)
2. **상세 Sheet를 연 채 다른 행의 데이터가 갱신돼도 Sheet가 옛 값을 보여 주지 않는가.** Sheet는 행 객체가 아니라 id를 들고 있다가 최신 `records`에서 찾아야 한다. 회원을 수정한 직후 "최종 납부"·"차기월"이 새 값으로 보여야 한다. (Task 3)
3. **고른 월을 추가(+)하지 않은 채 확정을 누를 수 없는가.** 지금의 안전장치다. Sheet로 옮기며 빠지기 쉽다. (Task 3)
4. **탭을 바꾸면 선택이 비워지는가.** MATCHED 탭에서 고른 것이 CONFIRMED 탭의 "확정 취소"로 넘어가면 안 된다. (Task 3)
5. **일괄 확정 Sheet에서 확정한 뒤 실패 건만 선택에 남고 Sheet가 닫히는가.** 닫히지 않으면 같은 요청을 두 번 보내기 쉽다. (Task 3)

## 파일 구조

| 구분 | 경로 | 역할 |
| --- | --- | --- |
| 만들기 | `src/components/molecules/Notice.tsx` | 안내 상자 (`tone`) |
| 만들기 | `src/components/organisms/membership-fee/PaymentRecordsView.tsx` | 입금 내역 표 + 상세 Sheet |
| 만들기 | `src/components/organisms/membership-fee/PaymentRecordSheet.tsx` | 한 건 상세·확정 |
| 만들기 | `src/components/organisms/membership-fee/BulkConfirmSheet.tsx` | 일괄 확정의 연도·월 선택 |
| 만들기 | `src/components/organisms/membership-fee/FeeDashboardView.tsx` | 대시보드 본문 |
| 만들기 | `src/components/organisms/membership-fee/MemberFeeDetailView.tsx` | 회원 상세 본문 |
| 만들기 | `src/components/organisms/membership-fee/FeeTypeFormSheet.tsx` | `fee-types.tsx` 안의 모달을 떼어 Sheet로 |
| 이름 바꾸기 | `CoupleHistoryUpsertModal.tsx` → `CoupleHistoryUpsertSheet.tsx` | Sheet로 |
| 이름 바꾸기 | `ExemptionRegisterModal.tsx` → `ExemptionRegisterSheet.tsx` | Sheet로 |
| 삭제 | `molecules/membership-fee/RecordStatusBadge.tsx`, `PaymentStatusCell.tsx`(쓰는 곳이 없으면) | `StatusChip`으로 대체 |
| 삭제 | `organisms/membership-fee/PaymentRecordTable.tsx`, `BulkActionBar.tsx`, `CoupleHistoryManageList.tsx`, `ExemptionManageList.tsx`, `CoupleManageList.tsx`, `CoupleRegisterModal.tsx` | `DataTable`·Sheet로 대체, 뒤 둘은 쓰는 곳 없음 |
| 테스트 | `src/__tests__/components/membership-fee/*.dom.test.tsx` | 새 부품·View |
| 테스트 | `src/__tests__/pages/clubs/[id]/membership-fee/bulkPaymentActions.dom.test.tsx` | 실제 훅 검증으로 다시 씀 |

`PaymentRecordTable.tsx`가 내보내던 타입 `YearMonthSelection`, `PaymentRecordSortBy`는 `PaymentRecordsView.tsx`와 `src/lib/membership-fee/processView.ts`(이미 `PaymentRecordSortOrder`가 있다)에서 가져오도록 import만 고친다. `processView.ts`의 내용은 고치지 않는다.

## 클래스 대응표 (모든 Task가 쓴다)

| 옛 클래스 | 토큰 |
| --- | --- |
| `bg-white` (카드) | `bg-surface` |
| `bg-gray-50` | `bg-surface-muted` |
| `bg-gray-100`, `bg-gray-200` (받침) | `bg-fill` |
| `text-gray-900`, `text-gray-800`, `text-gray-700` | `text-primary` |
| `text-gray-600`, `text-gray-500` | `text-secondary` |
| `text-gray-400`, `text-gray-300` | `text-tertiary` |
| `border`, `border-gray-200`, `border-b` | `border border-border`, `border-b border-border` |
| `text-green-*` | `text-positive` |
| `text-red-*` | `text-negative` |
| `text-yellow-*`, `text-amber-*` | `text-warning` |
| `text-blue-*`, `text-pink-*`, `text-purple-*`, `text-teal-*` | `text-secondary` (강조가 필요하면 `text-primary`) |
| `bg-green-50`, `bg-red-50`, `bg-yellow-50` | `bg-positive-soft`, `bg-negative-soft`, `bg-warning-soft` |
| `bg-blue-50`, `bg-blue-100` | `bg-surface-muted` 또는 `bg-fill` |
| `text-2xl font-bold` (화면 제목) | `PageHeader`가 그린다 |
| `text-lg font-semibold` | `text-headline text-primary` |
| `text-sm` | `text-footnote` (본문이면 `text-callout`) |
| `text-xs` | `text-caption` |
| `rounded`, `rounded-lg` | `rounded-sm`, `rounded-md` |
| `shadow-*` | 삭제 (떠 있는 것만 `shadow-overlay`) |
| 직접 만든 `<button className="… bg-blue-500 …">` | `Button` (`primary`) |
| 직접 만든 회색·테두리 버튼 | `Button variant="secondary"` |
| 직접 만든 빨강 버튼 | `Button variant="destructive"` |
| 아이콘만 있는 버튼 (`title="수정"`) | `IconButton aria-label="수정"` |
| `disabled={x}` + `"저장 중..."` 글자 바꾸기 | `Button pending={x}` (글자가 달라지면 `pendingText`) |

판단이 필요한 색은 이 표가 아니라 `StatusChip`(`domain="feeRecord"`)을 쓴다.

---

### Task 0: 기능 목록 (전환 전 기준선)

**Files:**
- Create: `docs/회비 정산/디자인-시스템-전환-기능-목록.md`

**Interfaces:**
- Produces: Task 8이 이 표의 각 줄을 전환 뒤 코드와 대조한다.

- [ ] **Step 1: 기준 수치를 적어 둔다**

Run: `npx jest 2>&1 | tail -6`
Expected: `Test Suites: 3 failed, 118 passed, 121 total` / `Tests: 33 failed, 1590 passed, 1623 total`. 다르면 멈추고 보고한다.

- [ ] **Step 2: 화면별 기능 표를 쓴다**

전환 전 코드(지금의 작업 폴더)를 읽고 아래 형식으로 9개 화면을 모두 채운다. 한 줄이 한 기능이다. 링크, 빈 상태 문구, 비활성 조건도 한 줄씩 넣는다.

```markdown
## 입금 내역 처리 (`process.tsx`)

| # | 사용자 동작 | 불리는 것 | 넘기는 값 | 보이는·쓸 수 있는 조건 | 결과 알림 |
| --- | --- | --- | --- | --- | --- |
| P1 | 회원 수정 | `updateMutation.mutateAsync` | `{ recordId, data: { matchedMemberIds } }` | 상태가 CONFIRMED·SKIPPED가 아닐 때 | 실패: "회원 수정에 실패했습니다." |
| P2 | 확정 | `confirmMutation.mutateAsync` | 선택 1개면 `{ recordId, data: { year, months } }`, 여러 개면 `{ recordId, data: { selections } }` | 상태가 CONFIRMED·SKIPPED가 아니고 매칭 회원이 1명 이상 | 실패: "확정에 실패했습니다." |
```

빠뜨리지 않을 것:

| 화면 | 꼭 들어갈 기능 |
| --- | --- |
| `process.tsx` | 회원 수정, 확정(열 때 기본 월 규칙 3단계, 여러 연도 추가, + 안 누르면 확정 불가), 건너뛰기, 확정 취소, 건너뜀 해제, 상태 탭 6개와 URL(`?status=`, `?batchId=`), 필드 필터 3종과 초기화, 건수 문구 2종, 정렬 5열, 탭별 일괄 동작 5종, "매칭된 항목 일괄 확정"의 대상 규칙, 배치 삭제(확정 건 경고 문구), 거래일 범위(프리셋 4개, 1년 초과 막기), 탭 전환 시 선택 초기화, 뒤로 가기 경로 2종 |
| `upload.tsx` | 파일 고르기·끌어 놓기·업로드, 결과 숫자 4칸, 검토 표의 한 건 동작 5종(낙관적 갱신 포함), "전체 내역 보기", 회비 설정이 없을 때의 안내와 이동 |
| `index.tsx` | 최근 업로드 카드, 바로가기 6개, 회비 설정 안내, 연도, 보기 방식 3종과 "N월까지", 빈 문구 2종, 격자의 칸 종류 6가지(납부·미납·면제·휴회·의무 없음·탈퇴), 회원 이름 링크(`?from=&fromLabel=`) |
| `batches.tsx` | 행 → 처리 화면(`?batchId=`), 상태별 건수 5종, 빈 상태의 업로드 링크 |
| `report.tsx` | 요약 4칸, 월별 표와 합계 줄, 회원별 n/12, 미납 회원 월 선택, 빈 문구 |
| `fee-types.tsx` | 추가, 수정, 삭제(확인 문구), 이름 필수 검증, 금액 저장(`bulkRatesMutation`) 순서 |
| `couples.tsx` | 등록, 수정, 삭제, 폼의 검증 규칙 전부 |
| `exemptions.tsx` | 등록(이미 면제된 회원 제외), 삭제, 연도 |
| `members/[userId].tsx` | 입금 시작 저장, 탈퇴 정보 저장, 휴회 추가·수정·삭제, 검증 문구, 뒤로 가기(`from`·`fromLabel`), 저장 뒤 무효화하는 쿼리 |

- [ ] **Step 3: 커밋**

```bash
git add "docs/회비 정산/디자인-시스템-전환-기능-목록.md"
git commit -m "docs: 디자인 시스템 전환 전 회비 화면 기능 목록 추가"
```

---

### Task 1: 공통 부품

**Files:**
- Create: `src/components/molecules/Notice.tsx`
- Test: `src/__tests__/components/membership-fee/Notice.dom.test.tsx`
- Modify: `src/components/molecules/membership-fee/YearSelector.tsx`, `MonthSelector.tsx`, `MemberSelectDropdown.tsx`, `MemberMultiSelectDropdown.tsx`, `TransactionDateRangeBanner.tsx`, `PaymentRecordFilters.tsx`, `ProcessStatusFilterTabs.tsx`
- Modify: `src/components/organisms/membership-fee/DashboardSummaryCard.tsx`, `LatestUploadCard.tsx`, `FileUploadZone.tsx`
- Modify: `src/pages/dev/ui-kit.tsx` (`Notice` 보기 추가)

**Interfaces:**
- Produces:
  - `Notice({ tone?: 'neutral' | 'warning' | 'negative'; children: ReactNode; action?: ReactNode; className?: string })`
  - 고친 부품의 props는 **하나도 바꾸지 않는다.** 뒤 Task가 지금 시그니처 그대로 쓴다.

- [ ] **Step 1: `Notice`의 실패하는 테스트를 쓴다**

```tsx
import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react';

import { Notice } from '@/components/molecules/Notice';

describe('Notice', () => {
  it('내용과 동작을 그린다', () => {
    render(<Notice action={<button type="button">배치 삭제</button>}>배치 필터 적용 중</Notice>);
    expect(screen.getByText('배치 필터 적용 중')).toBeTruthy();
    expect(screen.getByRole('button', { name: '배치 삭제' })).toBeTruthy();
  });

  it('tone에 따라 바탕 토큰이 달라진다', () => {
    const { rerender } = render(<Notice>기본</Notice>);
    expect(screen.getByRole('note').className).toContain('bg-surface-muted');
    rerender(<Notice tone="warning">주의</Notice>);
    expect(screen.getByRole('note').className).toContain('bg-warning-soft');
    rerender(<Notice tone="negative">오류</Notice>);
    expect(screen.getByRole('note').className).toContain('bg-negative-soft');
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx jest src/__tests__/components/membership-fee/Notice`
Expected: FAIL — `Cannot find module '@/components/molecules/Notice'`

- [ ] **Step 3: `Notice`를 만든다**

```tsx
import { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface NoticeProps {
  tone?: 'neutral' | 'warning' | 'negative';
  children: ReactNode;
  /** 오른쪽 동작. 보통 Button 하나 */
  action?: ReactNode;
  className?: string;
}

// Tailwind가 클래스를 찾을 수 있게 완성된 문자열로 적는다.
const TONE_CLASS = {
  neutral: 'bg-surface-muted text-secondary',
  warning: 'bg-warning-soft text-warning',
  negative: 'bg-negative-soft text-negative',
} as const;

/** 화면 위쪽의 안내 상자. 상태를 알리거나 다음에 할 일을 안내한다. */
export function Notice({ tone = 'neutral', children, action, className }: NoticeProps) {
  return (
    <div
      role="note"
      className={cn(
        'mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md px-4 py-3 text-footnote',
        TONE_CLASS[tone],
        className
      )}
    >
      <div className="min-w-0">{children}</div>
      {action}
    </div>
  );
}

export default Notice;
```

- [ ] **Step 4: 통과를 확인한다**

Run: `npx jest src/__tests__/components/membership-fee/Notice`
Expected: PASS (2 tests)

- [ ] **Step 5: 부품 10개에 토큰과 부품을 입힌다**

클래스는 위 대응표를 따른다. 부품마다 따로 정한 것:

| 부품 | 바꾸는 것 |
| --- | --- |
| `YearSelector` | 두 버튼 → `IconButton`(`aria-label="이전 연도"`, `"다음 연도"`). 연도 글자 `text-headline text-primary` |
| `MonthSelector` | 월 버튼의 고른 것 `bg-accent text-on-accent`, 안 고른 것 `bg-fill text-secondary`, 이미 납부(`paidMonths`) `bg-positive-soft text-positive`. Shift·Ctrl 범위 선택 로직과 `title`은 그대로 |
| `MemberSelectDropdown`, `MemberMultiSelectDropdown` | 검색 `<input>` → `Input`, 항목의 체크 표시 `<input type="checkbox">` → `Checkbox`. 펼침 목록 `bg-surface border border-border rounded-md shadow-overlay z-dropdown`. 바깥 누르면 닫기, 탈퇴 회원 표시, 정렬 로직은 그대로 |
| `TransactionDateRangeBanner` | 바깥을 `Notice`로 감싸지 않는다(입력이 많다). `rounded-md bg-surface px-4 py-3`. 날짜 `<input type="date">` → `Input type="date"`. 프리셋 버튼 4개 → `Button size="sm"`(고른 것 `variant="primary"`, 나머지 `variant="secondary"`). 적용 → `Button size="sm"`. 1년 초과 경고 `text-negative` |
| `PaymentRecordFilters` | `<input>` 3개 → `Input`(금액은 `type="number"` 그대로). 접기 버튼과 초기화 → `Button variant="plain" size="sm"`. `INITIAL_FILTERS`와 타입 내보내기는 그대로 |
| `ProcessStatusFilterTabs` | 6칸 격자 → `flex flex-wrap gap-1.5`의 칩. 각 칩은 `<button type="button" aria-pressed={isActive}>`이고 글자는 `{label} {count}`. 모양은 `StatusFilter.tsx`의 칩 클래스를 그대로 쓴다(고른 것 `bg-accent text-on-accent`, 나머지 `bg-fill text-secondary`). `TAB_CONFIG`의 `activeClass`·`inactiveClass`·`textClass`는 지운다 |
| `DashboardSummaryCard` | 카드 `rounded-md bg-surface p-4`, 숫자 `text-title text-primary`, 이름 `text-footnote text-secondary` |
| `LatestUploadCard` | 같은 방식. 업로드 링크 2개는 `Link`에 `buttonVariants({ variant: 'secondary', size: 'sm' })` 클래스를 준다. `href`는 그대로 |
| `FileUploadZone` | 끌어 놓는 영역 `rounded-md border border-dashed border-border bg-surface-muted`, 끌어 올린 동안 `bg-fill`. `<input type="file">`은 지킴이가 허용하므로 그대로. 지우기·업로드 → `Button`(`secondary`, `primary` + `pending={isUploading}`) |

- [ ] **Step 6: `/dev/ui-kit`에 `Notice` 세 가지 tone을 올린다**

`src/pages/dev/ui-kit.tsx`의 다른 부품 보기와 같은 모양의 구역을 하나 더한다.

```tsx
<section className="space-y-2">
  <h2 className="text-headline text-primary">Notice</h2>
  <Notice>배치 필터 적용 중 · 12건</Notice>
  <Notice tone="warning">2026년 회비 설정이 필요합니다.</Notice>
  <Notice tone="negative" action={<Button size="sm" variant="destructive">배치 삭제</Button>}>
    확정된 납부 3건이 포함되어 있습니다.
  </Notice>
</section>
```

- [ ] **Step 7: 고친 파일이 지킴이를 통과하는지 본다**

Run: `npx jest src/__tests__/guards 2>&1 | grep -E "YearSelector|MonthSelector|MemberSelectDropdown|MemberMultiSelectDropdown|TransactionDateRangeBanner|PaymentRecordFilters|ProcessStatusFilterTabs|DashboardSummaryCard|LatestUploadCard|FileUploadZone|Notice"`
Expected: 출력 없음 (이 파일들은 더 이상 위반 목록에 없다)

Run: `npx tsc --noEmit && npx jest "src/__tests__/pages/clubs/\[id\]/membership-fee"`
Expected: 타입 오류 없음, 기존 회비 테스트 3개 PASS

- [ ] **Step 8: 커밋**

```bash
git add src/components src/pages/dev/ui-kit.tsx src/__tests__/components/membership-fee
git commit -m "refactor(membership-fee): 공통 부품에 디자인 토큰 적용, Notice 추가"
```

---

### Task 2: 일괄 처리 훅의 알림 전환

**Files:**
- Modify: `src/hooks/membership-fee/useBulkPaymentActions.ts`
- Rewrite: `src/__tests__/pages/clubs/[id]/membership-fee/bulkPaymentActions.dom.test.tsx`
- Modify: `.claude/rules/bulk-action-pattern.md` (8절)

**Interfaces:**
- Consumes: `useConfirm(): (options: ConfirmOptions) => Promise<boolean>` (`@/components/organisms/sheet/ConfirmProvider`), `toast` (`react-hot-toast`)
- Produces: `UseBulkPaymentActionsResult`에서 **한 가지만 바뀐다.**
  - `handleBulkConfirmSelected: () => Promise<boolean>` — 요청을 보내 결과를 받았으면 `true`, 검증에 걸리거나 거절·오류면 `false`. Task 3의 `BulkConfirmSheet`가 `true`일 때 닫는다.
  - 나머지 필드와 인자는 그대로다.

- [ ] **Step 1: 테스트를 실제 훅을 검증하도록 다시 쓴다**

지금 테스트는 훅 로직을 파일 안에 복사해 두고(`useBulkPaymentActionsUnderTest`) 그것을 검증한다. 복사본을 지우고 실제 훅을 부른다. 파일 머리를 아래로 바꾼다.

```tsx
import { useState } from 'react';

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react';
import { toast } from 'react-hot-toast';

import { useBulkPaymentActions } from '@/hooks/membership-fee/useBulkPaymentActions';

import type { PaymentRecord } from '@/types/membership-fee.types';

type BulkResult = {
  results: { success: string[]; failed: { recordId: string; reason: string }[] };
  summary: { total: number; processed: number; success: number; failed: number };
};
type BulkMutation = jest.Mock<(input: any) => Promise<BulkResult>>;

const bulkConfirm: BulkMutation = jest.fn();
const bulkUnconfirm: BulkMutation = jest.fn();
const bulkSkip: BulkMutation = jest.fn();
const bulkUnskip: BulkMutation = jest.fn();
const confirmMock = jest.fn<(options: any) => Promise<boolean>>();

jest.mock('@/hooks/membership-fee/usePaymentRecords', () => ({
  useBulkConfirmPayments: () => ({ mutateAsync: bulkConfirm, isPending: false }),
  useBulkUnconfirmPayments: () => ({ mutateAsync: bulkUnconfirm, isPending: false }),
  useBulkSkipPayments: () => ({ mutateAsync: bulkSkip, isPending: false }),
  useBulkUnskipPayments: () => ({ mutateAsync: bulkUnskip, isPending: false }),
}));
jest.mock('@/components/organisms/sheet/ConfirmProvider', () => ({
  useConfirm: () => confirmMock,
}));
jest.mock('react-hot-toast', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

function makeRecord(id: string, depositorName: string): PaymentRecord {
  return {
    id, batchId: 'b1', clubId: 1, transactionDate: new Date('2025-05-01'),
    depositorName, amount: 30000, memo: null, matchedMemberId: null,
    status: 'PENDING', errorReason: null, createdAt: new Date(), updatedAt: new Date(),
  } as PaymentRecord;
}

function makeBulkResult(success: string[], failed: { recordId: string; reason: string }[]): BulkResult {
  return {
    results: { success, failed },
    summary: { total: success.length + failed.length, processed: success.length + failed.length, success: success.length, failed: failed.length },
  };
}

const RECORDS = [makeRecord('r1', '홍길동'), makeRecord('r2', '김철수'), makeRecord('r3', '이영희')];

/** 선택 상태를 함께 들고 있는 받침. 훅이 선택을 어떻게 고치는지 보려고 쓴다. */
function setup(initialSelected: string[]) {
  return renderHook(() => {
    const [selectedRecordIds, setSelectedRecordIds] = useState(initialSelected);
    const bulk = useBulkPaymentActions({
      clubIdStr: '1', records: RECORDS, selectedRecordIds, setSelectedRecordIds, year: 2025,
    });
    return { bulk, selectedRecordIds };
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  confirmMock.mockResolvedValue(true);
});
```

기존 `describe` 묶음은 그대로 두고, 검증만 아래 대응으로 바꾼다. 테스트 수(23개)는 줄이지 않는다.

| 옛 검증 | 새 검증 |
| --- | --- |
| `expect(alertSpy).toHaveBeenCalledWith('선택된 항목이 없습니다.')` | `expect(toast.error).toHaveBeenCalledWith('선택된 항목이 없습니다.')` |
| `expect(alertSpy).toHaveBeenCalledWith('적용할 월을 선택해주세요.')` | `expect(toast.error).toHaveBeenCalledWith('적용할 월을 선택해주세요.')` |
| `confirmSpy.mockReturnValue(false)` | `confirmMock.mockResolvedValue(false)` |
| `expect(confirmSpy).toHaveBeenCalledWith('2건을 2025년 5월로 …')` | `expect(confirmMock).toHaveBeenCalledWith(expect.objectContaining({ title: '2건을 2025년 5월로 일괄 확정하시겠습니까?' }))` |
| 전부 성공 `alert('2건 확정, 0건 실패')` | `expect(toast.success).toHaveBeenCalledWith('2건 확정, 0건 실패')` |
| 일부 실패 `alert('1건 확정, 1건 실패\n\n실패 사유:\n• 김철수: …')` | `expect(confirmMock).toHaveBeenLastCalledWith({ title: '1건 확정, 1건 실패', message: '실패 사유:\n• 김철수: …', hideCancel: true })` |
| mutation이 throw → `alert(error.message)` | `expect(toast.error).toHaveBeenCalledWith(error.message)` |
| `result.current.handleBulkSkipSelected()` | `result.current.bulk.handleBulkSkipSelected()` |
| `result.current.selectedRecordIds` | 그대로 |

월 선택이 필요한 테스트는 `act(() => result.current.bulk.setBulkSelectionMonths([5]))`와 `setBulkSelectionYear(2025)`를 먼저 부른다.

Review Focus 1·5를 잠그는 테스트 3개를 더한다.

```tsx
describe('확인창과 반환값', () => {
  it('skipSelected — 확인창이 false로 끝나면 mutation을 부르지 않는다', async () => {
    confirmMock.mockResolvedValue(false);
    const { result } = setup(['r1', 'r2']);
    await act(async () => {
      await result.current.bulk.handleBulkSkipSelected();
    });
    expect(bulkSkip).not.toHaveBeenCalled();
    expect(result.current.selectedRecordIds).toEqual(['r1', 'r2']);
  });

  it('confirmSelected — 결과를 받으면 true, 실패 건만 선택에 남긴다', async () => {
    bulkConfirm.mockResolvedValue(makeBulkResult(['r1'], [{ recordId: 'r2', reason: '이미 납부된 월입니다' }]));
    const { result } = setup(['r1', 'r2']);
    act(() => result.current.bulk.setBulkSelectionMonths([5]));
    let done = false;
    await act(async () => {
      done = await result.current.bulk.handleBulkConfirmSelected();
    });
    expect(done).toBe(true);
    expect(result.current.selectedRecordIds).toEqual(['r2']);
  });

  it('confirmSelected — 거절·오류면 false', async () => {
    confirmMock.mockResolvedValue(false);
    const { result } = setup(['r1']);
    act(() => result.current.bulk.setBulkSelectionMonths([5]));
    let done = true;
    await act(async () => {
      done = await result.current.bulk.handleBulkConfirmSelected();
    });
    expect(done).toBe(false);

    confirmMock.mockResolvedValue(true);
    bulkConfirm.mockRejectedValue(new Error('서버 오류'));
    await act(async () => {
      done = await result.current.bulk.handleBulkConfirmSelected();
    });
    expect(done).toBe(false);
    expect(toast.error).toHaveBeenCalledWith('서버 오류');
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx jest "bulkPaymentActions"`
Expected: FAIL — 훅이 아직 `alert`·`confirm`을 부르므로 `toast.error`·`confirmMock` 검증이 실패한다.

- [ ] **Step 3: 훅을 고친다**

import에 두 줄을 더한다.

```ts
import { toast } from 'react-hot-toast';

import { useConfirm } from '@/components/organisms/sheet/ConfirmProvider';
```

훅 본문 첫 줄에 `const confirm = useConfirm();`을 더하고, `reportResultAndPrune`을 아래로 바꾼다.

```ts
  /**
   * 결과 알림 + 선택 목록 정리.
   * 실패가 없으면 토스트, 있으면 사유 목록을 읽을 수 있게 확인창으로 보여 준다.
   * 성공한 record만 선택에서 빼 실패 건은 재시도할 수 있도록 남긴다.
   */
  const reportResultAndPrune = (
    result: BulkResultData,
    actionLabel: string
  ) => {
    const recordById = new Map((records ?? []).map((r) => [r.id, r]));
    const failedDetail = result.results.failed
      .map((f) => {
        const depositor =
          recordById.get(f.recordId)?.depositorName ?? '(알 수 없음)';
        return `• ${depositor}: ${f.reason}`;
      })
      .join('\n');
    const summary = `${result.summary.success}건 ${actionLabel}, ${result.summary.failed}건 실패`;

    if (failedDetail) {
      // 기다리지 않는다. 선택 정리가 확인창을 닫을 때까지 미뤄지면 안 된다.
      void confirm({
        title: summary,
        message: `실패 사유:\n${failedDetail}`,
        hideCancel: true,
      });
    } else {
      toast.success(summary);
    }
    setSelectedRecordIds((prev) =>
      prev.filter((id) => !result.results.success.includes(id))
    );
  };
```

핸들러 5개는 같은 꼴로 바꾼다. `handleBulkConfirmSelected`는 `boolean`을 돌려준다.

```ts
  const handleBulkConfirmSelected = async (): Promise<boolean> => {
    if (selectedRecordIds.length === 0) {
      toast.error('선택된 항목이 없습니다.');
      return false;
    }
    if (bulkSelectionMonths.length === 0) {
      toast.error('적용할 월을 선택해주세요.');
      return false;
    }
    const ok = await confirm({
      title: `${selectedRecordIds.length}건을 ${bulkSelectionYear}년 ${bulkSelectionMonths.join(', ')}월로 일괄 확정하시겠습니까?`,
    });
    if (!ok) return false;

    try {
      const result = await bulkConfirmMutation.mutateAsync({
        recordIds: selectedRecordIds,
        year,
        selections: [{ year: bulkSelectionYear, months: bulkSelectionMonths }],
      });
      reportResultAndPrune(result, '확정');
      setBulkSelectionMonths([]);
      return true;
    } catch (error: any) {
      toast.error(error.message || '선택 항목 일괄 확정에 실패했습니다.');
      return false;
    }
  };
```

나머지 넷의 대응:

| 핸들러 | `confirm({ … })` | `destructive` |
| --- | --- | --- |
| `handleBulkUnconfirmSelected` | `title: \`${n}건의 확정을 취소하시겠습니까?\``, `message: '회원·월 수정 후 다시 확정해야 합니다.'` | `true` |
| `handleBulkSkipSelected` | `title: \`${n}건을 건너뛰기 처리하시겠습니까?\``, `message: '정산 대상에서 제외됩니다.'` | 없음 |
| `handleBulkUnskipSelected` | `title: \`${n}건의 건너뛰기를 해제하시겠습니까?\`` | 없음 |
| `handleBulkConfirmAllMatched` | `title: \`${n}건의 입금 내역을 일괄 확정하시겠습니까?\`` | 없음 |

빈 선택의 `alert` → `toast.error`(문구 그대로), `catch`의 `alert` → `toast.error`(문구 그대로). 인터페이스의 `handleBulkConfirmSelected` 타입을 `() => Promise<boolean>`으로 고치고, 파일 머리 주석의 "confirm 다이얼로그"·"결과 alert"를 "확인창"·"결과 알림"으로 고친다.

Step 1의 표에서 확정 취소·건너뛰기의 `confirmMock` 검증은 이 표의 `title`·`message`로 맞춘다.

- [ ] **Step 4: 통과를 확인한다**

Run: `npx jest "bulkPaymentActions"`
Expected: PASS (26 tests)

Run: `npx jest src/__tests__/guards/noNativeDialogs 2>&1 | grep useBulkPaymentActions`
Expected: 출력 없음

- [ ] **Step 5: 옛 `BulkActionBar`가 타입 오류 없이 돌게 한다**

`handleBulkConfirmSelected`의 반환형이 바뀌어 `onClick={bulk.handleBulkConfirmSelected}`에 타입 오류가 나면 `onClick={() => void bulk.handleBulkConfirmSelected()}`로 고친다. 이 파일은 Task 3에서 지운다.

Run: `npx tsc --noEmit`
Expected: 오류 없음

- [ ] **Step 6: 규칙 문서 8절을 고친다**

`.claude/rules/bulk-action-pattern.md`의 "8. 호출부 결과 표시" 코드 블록을 아래로 바꾸고, 첫 문장을 "`useBulkPaymentActions`의 `reportResultAndPrune`과 동일한 형식:"으로 고친다.

```ts
const recordById = new Map((records ?? []).map((r) => [r.id, r]));
const failedDetail = result.results.failed
  .map((f) => {
    const depositor =
      recordById.get(f.recordId)?.depositorName ?? '(알 수 없음)';
    return `• ${depositor}: ${f.reason}`;
  })
  .join('\n');
const summary = `${result.summary.success}건 처리, ${result.summary.failed}건 실패`;

if (failedDetail) {
  void confirm({ title: summary, message: `실패 사유:\n${failedDetail}`, hideCancel: true });
} else {
  toast.success(summary);
}
setSelectedRecordIds((prev) =>
  prev.filter((id) => !result.results.success.includes(id))
);
```

핵심 포인트에 한 줄을 더한다: "`alert()`·`confirm()`은 쓰지 않는다. 확인은 `useConfirm`, 결과는 실패가 없으면 `toast.success`, 있으면 `hideCancel` 확인창."

- [ ] **Step 7: 커밋**

```bash
git add src/hooks/membership-fee/useBulkPaymentActions.ts "src/__tests__/pages/clubs/[id]/membership-fee/bulkPaymentActions.dom.test.tsx" src/components/organisms/membership-fee/BulkActionBar.tsx .claude/rules/bulk-action-pattern.md
git commit -m "refactor(membership-fee): 일괄 처리 훅의 alert·confirm을 useConfirm·toast로 전환"
```

---

### Task 3: 입금 내역 처리

**Files:**
- Create: `src/components/organisms/membership-fee/PaymentRecordsView.tsx`, `PaymentRecordSheet.tsx`, `BulkConfirmSheet.tsx`
- Test: `src/__tests__/components/membership-fee/PaymentRecordsView.dom.test.tsx`
- Modify: `src/pages/clubs/[id]/membership-fee/process.tsx`, `upload.tsx`
- Modify: `src/pages/dev/admin-preview.tsx`
- Modify: `src/__tests__/pages/clubs/[id]/membership-fee/processView.dom.test.tsx` (import 경로만, 필요하면)
- Delete: `src/components/organisms/membership-fee/PaymentRecordTable.tsx`, `BulkActionBar.tsx`, `src/components/molecules/membership-fee/RecordStatusBadge.tsx`

**Interfaces:**
- Consumes: `UseBulkPaymentActionsResult`(Task 2), `Notice`(Task 1), `DataTable`·`Toolbar`·`BulkActionBar`(`@/components/organisms/table/*`), `Sheet`, `StatusChip`, `MonthSelector`, `MemberMultiSelectDropdown`
- Produces:

```ts
// PaymentRecordsView.tsx
export type YearMonthSelection = { year: number; months: number[] };
export type PaymentRecordSortBy = 'transactionDate' | 'depositorName' | 'amount' | 'matchedMember' | 'status';

export const FEE_RECORD_STATUS_LABEL: Record<PaymentRecordStatus, string>;
// { PENDING: '대기', MATCHED: '매칭됨', CONFIRMED: '확정', ERROR: '에러', SKIPPED: '건너뜀' }

interface PaymentRecordsViewProps {
  records: PaymentRecord[];
  members: Member[]; // { id; name; status?; leftAt? }
  year: number;
  onUpdateMember: (recordId: string, memberIds: number[]) => void;
  onConfirm: (recordId: string, selections: YearMonthSelection[]) => void;
  onUnconfirm: (recordId: string) => void;
  onSkip: (recordId: string) => void;
  onUnskip: (recordId: string) => void;
  isUpdating?: boolean;
  /** 있으면 표에 체크박스 열이 생긴다 */
  selection?: { selected: string[]; onChange: (ids: string[]) => void };
}

// PaymentRecordSheet.tsx
interface PaymentRecordSheetProps {
  record: PaymentRecord | null; // null이면 닫힌다
  onClose: () => void;
  // + PaymentRecordsViewProps의 members, year, on* 5개, isUpdating
}

// BulkConfirmSheet.tsx
interface BulkConfirmSheetProps {
  open: boolean;
  onClose: () => void;
  count: number;
  year: number; // 연도 선택지의 기준 (year-1, year, year+1)
  bulk: UseBulkPaymentActionsResult;
}
```

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/__tests__/components/membership-fee/PaymentRecordsView.dom.test.tsx`

```tsx
import { ComponentProps } from 'react';

import { describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen, within } from '@testing-library/react';

import { PaymentRecordsView } from '@/components/organisms/membership-fee/PaymentRecordsView';

import type { PaymentRecord } from '@/types/membership-fee.types';

const record = (id: string, overrides: Partial<PaymentRecord> = {}) =>
  ({
    id, batchId: 'b1', clubId: 1, transactionDate: new Date('2025-05-01T00:00:00Z'),
    depositorName: `입금자${id}`, amount: 30000, memo: null, matchedMemberId: null,
    status: 'PENDING', errorReason: null, createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  }) as PaymentRecord;

const matched = (id: string, overrides: Partial<PaymentRecord> = {}) =>
  record(id, {
    status: 'MATCHED',
    matchedMembers: [{ id: `m${id}`, clubMemberId: 10, clubMember: { id: 10, name: '가온' } }],
    ...overrides,
  });

type Props = ComponentProps<typeof PaymentRecordsView>;
const base: Props = {
  records: [], members: [{ id: 10, name: '가온' }], year: 2025,
  onUpdateMember: () => {}, onConfirm: () => {}, onUnconfirm: () => {}, onSkip: () => {}, onUnskip: () => {},
};

const table = () => within(screen.getByTestId('data-table-table'));
const openRow = async (name: string) => {
  await act(async () => {
    fireEvent.click(table().getByText(name));
  });
  return within(screen.getByRole('dialog'));
};

describe('PaymentRecordsView', () => {
  it('행이 없으면 빈 문구를 보인다', () => {
    render(<PaymentRecordsView {...base} />);
    expect(screen.getByText('입금 내역이 없습니다.')).toBeTruthy();
  });

  it('selection이 없으면 체크박스가 없다', () => {
    render(<PaymentRecordsView {...base} records={[matched('1')]} />);
    expect(table().queryByRole('checkbox')).toBeNull();
  });

  it('selection이 있으면 고른 id를 문자열 배열로 알린다', async () => {
    const onChange = jest.fn();
    render(<PaymentRecordsView {...base} records={[matched('1'), matched('2')]} selection={{ selected: [], onChange }} />);
    await act(async () => {
      fireEvent.click(table().getAllByRole('checkbox')[1]);
    });
    expect(onChange).toHaveBeenCalledWith(['1']);
  });

  it('행을 누르면 상세 시트가 열리고, 대기 건에는 확정이 없고 건너뛰기만 있다', async () => {
    render(<PaymentRecordsView {...base} records={[record('1')]} />);
    const sheet = await openRow('입금자1');
    expect(sheet.queryByRole('button', { name: '확정' })).toBeNull();
    expect(sheet.getByRole('button', { name: '건너뛰기' })).toBeTruthy();
  });

  it('차기 의무월이 기본으로 골라져 있고, 확정하면 그 값으로 불린다', async () => {
    const onConfirm = jest.fn();
    render(
      <PaymentRecordsView
        {...base}
        onConfirm={onConfirm}
        records={[matched('1', { lastPaidYearMonth: { year: 2025, month: 4 }, nextSuggestedYearMonth: { year: 2025, month: 6 } })]}
      />
    );
    const sheet = await openRow('입금자1');
    expect(sheet.getByText('2025년 6월')).toBeTruthy();
    await act(async () => {
      fireEvent.click(sheet.getByRole('button', { name: '확정' }));
    });
    expect(onConfirm).toHaveBeenCalledWith('1', [{ year: 2025, months: [6] }]);
  });

  it('차기 의무월이 없으면 최종 납부월의 다음 달을 고른다 (12월 → 다음 해 1월)', async () => {
    const onConfirm = jest.fn();
    render(<PaymentRecordsView {...base} onConfirm={onConfirm} records={[matched('1', { lastPaidYearMonth: { year: 2025, month: 12 } })]} />);
    const sheet = await openRow('입금자1');
    await act(async () => {
      fireEvent.click(sheet.getByRole('button', { name: '확정' }));
    });
    expect(onConfirm).toHaveBeenCalledWith('1', [{ year: 2026, months: [1] }]);
  });

  it('고른 월을 추가하지 않은 채로는 확정할 수 없다', async () => {
    render(<PaymentRecordsView {...base} records={[matched('1', { nextSuggestedYearMonth: { year: 2025, month: 6 } })]} />);
    const sheet = await openRow('입금자1');
    await act(async () => {
      fireEvent.click(sheet.getByRole('button', { name: '7월' }));
    });
    expect((sheet.getByRole('button', { name: '확정' }) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => {
      fireEvent.click(sheet.getByRole('button', { name: '선택한 연도·월 추가' }));
    });
    expect((sheet.getByRole('button', { name: '확정' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('확정된 건은 확정 월을 보이고 확정 취소만 할 수 있다', async () => {
    const onUnconfirm = jest.fn();
    render(
      <PaymentRecordsView
        {...base}
        onUnconfirm={onUnconfirm}
        records={[matched('1', { status: 'CONFIRMED', payments: [{ id: 'p1', year: 2025, month: 5 }] })]}
      />
    );
    const sheet = await openRow('입금자1');
    expect(sheet.getByText('확정됨 (2025년 5월)')).toBeTruthy();
    expect(sheet.queryByRole('button', { name: '회원 수정' })).toBeNull();
    await act(async () => {
      fireEvent.click(sheet.getByRole('button', { name: '확정 취소 후 수정' }));
    });
    expect(onUnconfirm).toHaveBeenCalledWith('1');
  });

  it('건너뛴 건은 해제만 할 수 있다', async () => {
    const onUnskip = jest.fn();
    render(<PaymentRecordsView {...base} onUnskip={onUnskip} records={[record('1', { status: 'SKIPPED' })]} />);
    const sheet = await openRow('입금자1');
    await act(async () => {
      fireEvent.click(sheet.getByRole('button', { name: '건너뛰기 해제 후 수정' }));
    });
    expect(onUnskip).toHaveBeenCalledWith('1');
    expect(sheet.queryByRole('button', { name: '건너뛰기' })).toBeNull();
  });

  it('시트를 연 채 records가 바뀌면 새 값을 보인다', async () => {
    const { rerender } = render(<PaymentRecordsView {...base} records={[matched('1', { lastPaidYearMonth: { year: 2025, month: 4 } })]} />);
    const sheet = await openRow('입금자1');
    expect(sheet.getByText(/최종 납부월:/).textContent).toContain('2025년 4월');
    rerender(<PaymentRecordsView {...base} records={[matched('1', { lastPaidYearMonth: { year: 2025, month: 9 } })]} />);
    expect(within(screen.getByRole('dialog')).getByText(/최종 납부월:/).textContent).toContain('2025년 9월');
  });

  it('에러 사유를 표와 시트에 보인다', async () => {
    render(<PaymentRecordsView {...base} records={[record('1', { status: 'ERROR', errorReason: '금액 불일치' })]} />);
    expect(table().getByText('금액 불일치')).toBeTruthy();
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx jest src/__tests__/components/membership-fee/PaymentRecordsView`
Expected: FAIL — `Cannot find module '@/components/organisms/membership-fee/PaymentRecordsView'`

- [ ] **Step 3: `PaymentRecordSheet`를 만든다**

옛 `PaymentRecordTable.tsx`에서 아래를 **그대로 옮긴다**(로직을 다시 쓰지 않는다): `getRecordMemberIds`, `formatMatchedMembers`, `formatConfirmedMonths`, `getNextMonth`, `handleAddSelection`, `handleRemoveSelection`, 확정 가능 조건.

상태와 초기화:

```tsx
const [editingMember, setEditingMember] = useState(false);
const [selections, setSelections] = useState<YearMonthSelection[]>([]);
const [addYear, setAddYear] = useState(year);
const [addMonths, setAddMonths] = useState<number[]>([]);

// 다른 건을 열 때만 기본값을 다시 잡는다. 같은 건의 데이터가 갱신될 때는 고르던 것을 지키지 않고
// 추천값도 다시 계산하지 않는다 (옛 handleStartConfirm이 "열 때 한 번"이었다).
const recordId = record?.id ?? null;
useEffect(() => {
  if (!record) return;
  setEditingMember(false);
  setAddMonths([]);
  const lastPaid = record.lastPaidYearMonth ?? null;
  // 백엔드가 휴회/탈퇴 반영해 내려준 차기 의무월을 우선 사용. fallback은 +1개월.
  const nextDefault = record.nextSuggestedYearMonth ?? (lastPaid ? getNextMonth(lastPaid) : null);
  if (nextDefault) {
    setSelections([{ year: nextDefault.year, months: [nextDefault.month] }]);
    setAddYear(nextDefault.year);
  } else {
    const suggested = record.suggestedMonths ?? [];
    setSelections(suggested.length > 0 ? [{ year, months: suggested }] : []);
    setAddYear(year);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [recordId]);
```

그리는 것(위에서 아래로):

| 구역 | 내용 | 조건 |
| --- | --- | --- |
| 제목 | `Sheet title={record.depositorName}` | — |
| 요약 | 거래일 · 금액 · `StatusChip domain="feeRecord"` + 에러 사유(`text-negative`) | — |
| 매칭 회원 | 이름들 또는 `미매칭`(`text-negative`) + `IconButton aria-label="회원 수정"`(`Edit2`). 누르면 `MemberMultiSelectDropdown` + `Button variant="plain" size="sm"` "취소" | 수정 버튼은 CONFIRMED·SKIPPED가 아닐 때만 |
| 납부월 안내 | `최종 납부월: Y년 M월 · 차기월(권장): …` 과 사유 줄(`└ …`). 옛 코드의 세 갈래(있음 / `nextSuggestedYearMonth === null` / 최종 납부 없음)를 그대로 | 매칭 회원이 있을 때 |
| 고른 월 | `{sel.year}년 {sel.months.join(', ')}월` 칩(`bg-fill`) + `IconButton aria-label="제거"`(`X`) | CONFIRMED·SKIPPED가 아니고 매칭 회원이 있을 때 |
| 월 추가 | `Select aria-label="연도"`(year-1, year, year+1) + `IconButton aria-label="선택한 연도·월 추가"`(`Plus`, `addMonths`가 비면 disabled) + `MonthSelector` + 안내 두 줄(문구 그대로) | 위와 같음 |
| 확정됨 | `확정됨 (2025년 5월)` 또는 `확정됨` | CONFIRMED |

테스트의 `'2025년 6월'`은 고른 월 칩의 글자다. 칩은 `{sel.year}년 {sel.months.map((m) => \`${m}월\`).join(', ')}`가 아니라 옛 문구(`2025년 6월` = `{sel.year}년 {sel.months.join(', ')}월`)를 그대로 쓴다.

`footer`의 버튼:

| 상태 | 버튼 |
| --- | --- |
| PENDING·MATCHED·ERROR, 매칭 회원 있음 | `Button variant="secondary"` "건너뛰기" + `Button` "확정" (`disabled={totalMonthsCount === 0 \|\| isUpdating \|\| addMonths.length > 0}`) |
| PENDING·MATCHED·ERROR, 매칭 회원 없음 | "건너뛰기"만 |
| CONFIRMED | `Button variant="secondary"` "확정 취소 후 수정" |
| SKIPPED | `Button variant="secondary"` "건너뛰기 해제 후 수정" |

확정·건너뛰기·확정 취소·해제를 누르면 콜백을 부른 뒤 `onClose()`를 부른다. 회원 수정은 닫지 않는다(바뀐 추천을 이어서 본다).

- [ ] **Step 4: `PaymentRecordsView`를 만든다**

```tsx
export function PaymentRecordsView({ records, selection, ...actions }: PaymentRecordsViewProps) {
  // 행 객체가 아니라 id를 들고 있는다. 회원을 고치면 records가 새로 오는데,
  // 그때 시트가 옛 추천월을 보여 주면 안 된다.
  const [openId, setOpenId] = useState<string | null>(null);
  const openRecord = records.find((r) => r.id === openId) ?? null;

  return (
    <>
      <DataTable
        aria-label="입금 내역"
        rows={records}
        rowKey={(r) => r.id}
        columns={COLUMNS}
        list={{
          title: (r) => r.depositorName,
          subtitle: (r) => `${formatDate(r.transactionDate)} · ${r.amount.toLocaleString()}원 · ${formatMatchedMembers(r) || '미매칭'}`,
          trailing: (r) => <StatusChip domain="feeRecord" status={r.status}>{FEE_RECORD_STATUS_LABEL[r.status]}</StatusChip>,
        }}
        onRowClick={(r) => setOpenId(r.id)}
        empty="입금 내역이 없습니다."
        selection={
          selection && {
            selected: new Set<RowKey>(selection.selected),
            onChange: (next) => selection.onChange(Array.from(next, String)),
            label: (r) => r.depositorName,
          }
        }
      />
      <PaymentRecordSheet record={openRecord} onClose={() => setOpenId(null)} {...actions} />
    </>
  );
}
```

`formatDate`는 옛 표와 같은 `new Date(d).toLocaleDateString('ko-KR')`.

열 정의(`COLUMNS`, 부품 밖 상수):

| key | header | cell | sortValue | align |
| --- | --- | --- | --- | --- |
| `transactionDate` | 거래일 | 날짜 | `new Date(r.transactionDate).getTime()` | — |
| `depositorName` | 입금자명 | 이름 | `r.depositorName` | — |
| `amount` | 금액 | `30,000원` | `r.amount` | right |
| `matchedMember` | 매칭 회원 | 이름들 또는 `미매칭`(`text-negative`), 아래에 `최종 납부: Y년 M월` / `최종 납부: 없음`(`text-caption text-secondary`, 매칭 회원이 있을 때만) | `formatMatchedMembers(r)` | — |
| `status` | 상태 | `StatusChip` + 에러 사유(`text-caption text-negative`) | `r.status` | — |
| `months` | 작업 | CONFIRMED면 `확정됨 (…)`, SKIPPED면 `건너뜀`, 그 밖은 빈칸 | — | — |

마지막 열의 머리글은 옛 표와 같은 "작업"을 쓴다(문구 유지).

- [ ] **Step 5: View 테스트의 통과를 확인한다**

Run: `npx jest src/__tests__/components/membership-fee/PaymentRecordsView`
Expected: PASS (11 tests)

- [ ] **Step 6: `BulkConfirmSheet`를 만들고 테스트를 더한다**

```tsx
export function BulkConfirmSheet({ open, onClose, count, year, bulk }: BulkConfirmSheetProps) {
  const onSubmit = async () => {
    // 결과를 받았을 때만 닫는다. 거절·오류면 고른 월을 지킨 채 남는다.
    if (await bulk.handleBulkConfirmSelected()) onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="선택 항목 확정"
      footer={
        <Button
          type="button"
          className="w-full"
          onClick={onSubmit}
          pending={bulk.isBulkConfirmPending}
          disabled={bulk.bulkSelectionMonths.length === 0}
        >
          선택 항목 확정
        </Button>
      }
    >
      <div className="space-y-3">
        <p className="text-callout text-primary">선택 {count}건</p>
        <FormField label="연도">
          <Select
            placeholder={null}
            value={String(bulk.bulkSelectionYear)}
            onChange={(e) => bulk.setBulkSelectionYear(Number(e.target.value))}
            options={[year - 1, year, year + 1].map((y) => ({ value: String(y), label: `${y}년` }))}
          />
        </FormField>
        <MonthSelector selectedMonths={bulk.bulkSelectionMonths} onMonthsChange={bulk.setBulkSelectionMonths} />
        <p className="text-caption text-secondary">
          선택한 회원들에게 위에서 고른 연도·월을 동일하게 적용합니다. (의무월 외 / 이미 납부된 월은 자동으로 실패 처리됩니다)
        </p>
      </div>
    </Sheet>
  );
}
```

같은 테스트 파일에 더한다.

```tsx
describe('BulkConfirmSheet', () => {
  const bulk = (overrides = {}) =>
    ({
      bulkSelectionYear: 2025, setBulkSelectionYear: jest.fn(),
      bulkSelectionMonths: [5], setBulkSelectionMonths: jest.fn(),
      handleBulkConfirmSelected: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
      isBulkConfirmPending: false,
      ...overrides,
    }) as unknown as UseBulkPaymentActionsResult;

  it('결과를 받으면 닫는다', async () => {
    const onClose = jest.fn();
    render(<BulkConfirmSheet open onClose={onClose} count={2} year={2025} bulk={bulk()} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '선택 항목 확정' }));
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('거절·오류면 닫지 않는다', async () => {
    const onClose = jest.fn();
    const handle = jest.fn<() => Promise<boolean>>().mockResolvedValue(false);
    render(<BulkConfirmSheet open onClose={onClose} count={2} year={2025} bulk={bulk({ handleBulkConfirmSelected: handle })} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '선택 항목 확정' }));
    });
    expect(handle).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('월을 고르지 않으면 확정할 수 없다', () => {
    render(<BulkConfirmSheet open onClose={() => {}} count={2} year={2025} bulk={bulk({ bulkSelectionMonths: [] })} />);
    expect((screen.getByRole('button', { name: '선택 항목 확정' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
```

Run: `npx jest src/__tests__/components/membership-fee/PaymentRecordsView`
Expected: PASS (14 tests)

- [ ] **Step 7: `process.tsx`를 옮긴다**

1–4구역(라우팅, 상태, 훅, 파생 값)과 핸들러의 **로직은 그대로 둔다.** 바꾸는 것만 적는다.

| 지우는 것 | 이유 |
| --- | --- |
| `sortBy`, `sortOrder` 상태, `onSortChange` | `DataTable`이 정렬한다 |
| `showDeleteModal`, `isDeleting` 상태와 모달 JSX | `useConfirm` |
| `STATUS_LABELS` | `FEE_RECORD_STATUS_LABEL`을 가져온다 |
| `router.push`로 만든 뒤로 가기 버튼 | `PageHeader backHref` |

```tsx
// 기본 순서: 거래일 내림차순. 머리글을 누르면 DataTable이 그 위에서 다시 정렬한다.
const sortedRecords = useMemo(
  () => applySort(filteredRecords, 'transactionDate', 'desc'),
  [filteredRecords]
);
```

한 건 동작의 `alert(...)` 3곳은 `toast.error(...)`로 바꾼다(문구 그대로).

배치 삭제:

```tsx
const confirm = useConfirm();

const handleDeleteBatch = async () => {
  if (!clubIdStr || !batchId) return;
  const ok = await confirm({
    title: '배치 삭제',
    message:
      confirmedInBatch > 0
        ? `이 배치에 확정된 납부 ${confirmedInBatch}건이 포함되어 있습니다. 삭제하면 해당 납부 내역도 함께 삭제됩니다. 정말 삭제하시겠습니까?`
        : `이 배치(${records?.length ?? 0}건)를 삭제하시겠습니까?`,
    confirmLabel: '삭제',
    destructive: true,
  });
  if (!ok) return;
  // try 안은 지금 그대로 (axios.delete → invalidate 2개 → toast.success → router.push)
};
```

그리는 부분:

```tsx
if (isLoading) {
  return (
    <>
      <PageHeader title="입금 내역 처리" backHref={backHref} />
      <Skeleton className="h-64 w-full" />
    </>
  );
}

return (
  <>
    <PageHeader title="입금 내역 처리" backHref={backHref} />

    {!batchId && <TransactionDateRangeBanner {...지금과 같은 props} />}

    {batchId && (
      <Notice
        action={
          <Button type="button" size="sm" variant="destructive" onClick={handleDeleteBatch}>
            <Trash2 aria-hidden className="h-4 w-4" />
            배치 삭제
          </Button>
        }
      >
        <span className="font-semibold">배치 필터 적용 중</span>
        {' · '}
        {records?.length ?? 0}건
      </Notice>
    )}

    <ProcessStatusFilterTabs {...지금과 같은 props} />

    <Toolbar
      summary={<>{/* 지금의 <p> 안 내용 그대로: 상태 라벨 · "전체 N건 중 필터 결과 M건" / "M건 표시 중" */}</>}
      actions={
        statusCounts.matched > 0 && (
          <Button type="button" size="sm" onClick={handleBulkConfirm} pending={bulk.isBulkConfirmPending}>
            <CheckCircle aria-hidden className="h-4 w-4" />
            매칭된 항목 일괄 확정 ({statusCounts.matched}건)
          </Button>
        )
      }
    >
      <YearSelector year={year} onYearChange={setYear} />
    </Toolbar>

    <PaymentRecordFilters filters={filters} onFiltersChange={setFilters} members={members} />

    <PaymentRecordsView
      records={sortedRecords}
      members={members}
      year={year}
      onUpdateMember={handleUpdateMember}
      onConfirm={handleConfirm}
      onUnconfirm={handleUnconfirm}
      onSkip={handleSkip}
      onUnskip={handleUnskip}
      isUpdating={/* 지금의 9개 pending 합 그대로 */}
      selection={isBulkSelectionTab ? { selected: selectedRecordIds, onChange: setSelectedRecordIds } : undefined}
    />

    <BulkActionBar count={selectedRecordIds.length} unit="건" onClear={() => setSelectedRecordIds([])}>
      {statusFilter === 'MATCHED' && (
        <Button type="button" size="sm" onClick={() => setIsBulkConfirmOpen(true)}>선택 항목 확정</Button>
      )}
      {(statusFilter === 'PENDING' || statusFilter === 'MATCHED' || statusFilter === 'ERROR') && (
        <Button type="button" size="sm" variant="secondary" onClick={bulk.handleBulkSkipSelected} pending={bulk.isBulkSkipPending}>
          선택 항목 건너뛰기
        </Button>
      )}
      {statusFilter === 'CONFIRMED' && (
        <Button type="button" size="sm" variant="destructive" onClick={bulk.handleBulkUnconfirmSelected} pending={bulk.isBulkUnconfirmPending}>
          선택 항목 확정 취소
        </Button>
      )}
      {statusFilter === 'SKIPPED' && (
        <Button type="button" size="sm" onClick={bulk.handleBulkUnskipSelected} pending={bulk.isBulkUnskipPending}>
          선택 항목 건너뜀 해제
        </Button>
      )}
    </BulkActionBar>

    <BulkConfirmSheet
      open={isBulkConfirmOpen}
      onClose={() => setIsBulkConfirmOpen(false)}
      count={selectedRecordIds.length}
      year={year}
      bulk={bulk}
    />
  </>
);
```

`backHref`는 지금 규칙 그대로다: `batchId ? \`/clubs/${clubId}/membership-fee/batches\` : \`/clubs/${clubId}/membership-fee\``.

옛 `BulkActionBar`가 탭마다 보이던 설명 문장(SKIPPED·PENDING/ERROR·CONFIRMED 탭의 `<p>`)은 옛 파일에서 문구를 그대로 가져와, 선택이 있을 때 `BulkActionBar` 바로 위에 `<p className="mt-2 text-caption text-secondary">`로 둔다. MATCHED 탭의 설명은 `BulkConfirmSheet`에 이미 있고, 뒤쪽의 "정산에서 제외하려면 [선택 항목 건너뛰기]를 사용하세요."만 이 자리에 둔다.

탭 전환 시 선택 초기화(`useEffect`)에 `setIsBulkConfirmOpen(false)`를 더한다.

- [ ] **Step 8: `upload.tsx`를 옮긴다**

로직은 그대로 두고 아래만 바꾼다.

| 지금 | 바꾼 뒤 |
| --- | --- |
| 뒤로 가기 + `<h1>` (두 군데: 설정 없음 화면, 본 화면) | `PageHeader title="입금 내역 업로드" backHref={\`/clubs/${clubId}/membership-fee\`}` |
| 회비 설정이 없을 때의 상자와 이동 버튼 | `Notice tone="warning"` + `action`에 `Button size="sm"`. 문구 그대로. 이동 경로는 Rulings대로 `/membership-fee/settings/fee-types` |
| 카드 3개(`bg-white rounded-lg border p-6`) | `<section className="mb-3 rounded-md bg-surface p-4">` + `<h2 className="mb-3 text-headline text-primary">` |
| 회비 설정 요약 상자 | `Notice`(neutral) |
| 결과 숫자 4칸 | `grid grid-cols-4 gap-2`, 칸은 `rounded-md bg-surface-muted p-3 text-center`, 숫자 `text-title`(전체·대기 `text-primary`, 매칭됨 `text-positive`, 에러 `text-negative`) |
| "전체 내역 보기" 버튼 | `Button size="sm"` + `ArrowRight` |
| `<PaymentRecordTable … />` | `<PaymentRecordsView … />` (같은 props, `selection` 없음) |
| `alert(...)` 4곳 | `toast.error(...)` (문구 그대로) |
| 로딩 스피너 | `Skeleton` |

- [ ] **Step 9: 옛 부품을 지우고 import를 고친다**

```bash
git rm src/components/organisms/membership-fee/PaymentRecordTable.tsx src/components/organisms/membership-fee/BulkActionBar.tsx src/components/molecules/membership-fee/RecordStatusBadge.tsx
grep -rn "PaymentRecordTable\|membership-fee/BulkActionBar\|RecordStatusBadge" src docs/가이드 .claude/rules
```

Expected: `src` 아래에 남은 참조가 없다. 타입 `YearMonthSelection`·`PaymentRecordSortBy`를 가져오던 곳은 `PaymentRecordsView`에서 가져오도록 고친다.

- [ ] **Step 10: 미리보기에 올린다**

`src/pages/dev/admin-preview.tsx`의 `Screen`에 `'fee-process'`를 더하고, 고르는 `SegmentedControl`의 항목에도 더한다. 가짜 데이터는 다섯 상태가 모두 들어가게 만든다.

```tsx
const FEE_STATUSES = ['PENDING', 'MATCHED', 'CONFIRMED', 'ERROR', 'SKIPPED'] as const;

const FEE_RECORDS = NAMES.map((name, index) => {
  const status = FEE_STATUSES[index % FEE_STATUSES.length];
  const hasMember = status !== 'PENDING' && status !== 'ERROR';
  return {
    id: `rec${index}`, batchId: 'b1', clubId: 1,
    transactionDate: new Date(2026, 8, 1 + index),
    depositorName: name, amount: index % 4 ? 30000 : 50000, memo: null,
    matchedMemberId: null, status,
    errorReason: status === 'ERROR' ? '금액 불일치' : null,
    createdAt: new Date(), updatedAt: new Date(),
    matchedMembers: hasMember ? [{ id: `mm${index}`, clubMemberId: (index + 1) * 10, clubMember: { id: (index + 1) * 10, name } }] : [],
    lastPaidYearMonth: hasMember ? { year: 2026, month: 8 } : null,
    nextSuggestedYearMonth: hasMember ? { year: 2026, month: index % 3 ? 9 : 10 } : undefined,
    nextSuggestedReasons: hasMember && index % 3 === 0 ? ['2026년 9월 휴회'] : [],
    payments: status === 'CONFIRMED' ? [{ id: `p${index}`, year: 2026, month: 9 }] : [],
  } as unknown as PaymentRecord;
});

function FeeProcessPreview() {
  const [records, setRecords] = useState(FEE_RECORDS);
  const [selected, setSelected] = useState<string[]>([]);
  const setStatus = (id: string, status: PaymentRecord['status']) =>
    setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));

  return (
    <>
      <PageHeader title="입금 내역 처리" />
      <PaymentRecordsView
        records={records}
        members={NAMES.map((name, index) => ({ id: (index + 1) * 10, name }))}
        year={2026}
        onUpdateMember={() => {}}
        onConfirm={(id) => setStatus(id, 'CONFIRMED')}
        onUnconfirm={(id) => setStatus(id, 'MATCHED')}
        onSkip={(id) => setStatus(id, 'SKIPPED')}
        onUnskip={(id) => setStatus(id, 'PENDING')}
        selection={{ selected, onChange: setSelected }}
      />
      <BulkActionBar count={selected.length} unit="건" onClear={() => setSelected([])}>
        <Button size="sm">선택 항목 확정</Button>
      </BulkActionBar>
    </>
  );
}
```

- [ ] **Step 11: 확인한다**

Run: `npx tsc --noEmit && npm run lint`
Expected: 오류 없음

Run: `npx jest "membership-fee" && npx jest src/__tests__/guards 2>&1 | grep -E "process\.tsx|upload\.tsx|PaymentRecord|BulkConfirm"`
Expected: 회비 테스트 PASS, grep 출력 없음

개발 서버를 띄워 `/dev/admin-preview`의 "fee-process"를 390·1280 폭, 라이트·다크로 본다. 다섯 상태의 행을 모두 열어 footer 버튼이 Step 3의 표와 같은지 확인한다.

- [ ] **Step 12: 커밋**

```bash
git add -A src
git commit -m "refactor(membership-fee): 입금 내역 처리 화면을 DataTable과 상세 Sheet로 전환"
```

---

### Task 4: 대시보드, 리포트, 업로드 이력

**Files:**
- Create: `src/components/organisms/membership-fee/FeeDashboardView.tsx`
- Test: `src/__tests__/components/membership-fee/FeeDashboardView.dom.test.tsx`
- Modify: `src/components/organisms/membership-fee/PaymentDashboardTable.tsx`
- Modify: `src/pages/clubs/[id]/membership-fee/index.tsx`, `report.tsx`, `batches.tsx`
- Modify: `src/pages/dev/admin-preview.tsx`
- Delete: `src/components/molecules/membership-fee/PaymentStatusCell.tsx` (쓰는 곳이 없을 때만)

**Interfaces:**
- Consumes: `Notice`, `YearSelector`, `DashboardSummaryCard`, `LatestUploadCard`(Task 1), `FEE_RECORD_STATUS_LABEL`(Task 3)
- Produces:

```ts
interface FeeDashboardViewProps {
  clubId: string;
  year: number;
  onYearChange: (year: number) => void;
  dashboard: PaymentDashboardData & { feeSettings: MembershipFeeSettings | null }; // usePaymentDashboard의 data 타입 그대로
  memberFilter: 'all' | 'unpaid' | 'paid';
  onMemberFilterChange: (filter: 'all' | 'unpaid' | 'paid') => void;
  throughMonth: number;
  onThroughMonthChange: (month: number) => void;
}
```

두 타입은 `@/types/membership-fee.types`에 있다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

```tsx
import { ComponentProps } from 'react';

import { describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { FeeDashboardView } from '@/components/organisms/membership-fee/FeeDashboardView';

import { pickOption } from '@/__tests__/helpers/optionPicker';

type Props = ComponentProps<typeof FeeDashboardView>;

const months = (paidThrough: number) =>
  Array.from({ length: 12 }, (_, i) => ({ month: i + 1, isPaid: i < paidThrough, isObligated: true }));

const DASHBOARD = {
  latestUpload: null,
  feeSettings: { year: 2026, regularAmount: 30000, coupleAmount: 50000 },
  summary: { yearTotal: 360000, totalMembers: 2, exemptMembers: 0, coupleGroups: 0 },
  members: [
    { id: 1, userId: 1, name: '가온', type: 'regular', months: months(12) },
    { id: 2, userId: 2, name: '나래', type: 'regular', months: months(2) },
  ],
} as unknown as Props['dashboard'];

const base: Props = {
  clubId: '1', year: 2026, onYearChange: () => {}, dashboard: DASHBOARD,
  memberFilter: 'all', onMemberFilterChange: () => {}, throughMonth: 6, onThroughMonthChange: () => {},
};

describe('FeeDashboardView', () => {
  it('바로가기 6개가 각 화면을 가리킨다', () => {
    render(<FeeDashboardView {...base} />);
    const href = (name: string) => screen.getByRole('link', { name: new RegExp(name) }).getAttribute('href');
    expect(href('회비 유형 관리')).toBe('/clubs/1/membership-fee/settings/fee-types');
    expect(href('부부 관리')).toBe('/clubs/1/membership-fee/settings/couples');
    expect(href('면제 관리')).toBe('/clubs/1/membership-fee/settings/exemptions');
    expect(href('입금 내역 처리')).toBe('/clubs/1/membership-fee/process');
    expect(href('리포트')).toBe('/clubs/1/membership-fee/report');
    expect(href('업로드 이력')).toBe('/clubs/1/membership-fee/batches');
  });

  it('회비 설정이 없으면 안내를 보인다', () => {
    render(<FeeDashboardView {...base} dashboard={{ ...DASHBOARD, feeSettings: null } as Props['dashboard']} />);
    expect(screen.getByRole('note').textContent).toContain('2026년 회비 설정이 필요합니다.');
  });

  it('보기 방식을 바꾸면 알린다', async () => {
    const onMemberFilterChange = jest.fn();
    render(<FeeDashboardView {...base} onMemberFilterChange={onMemberFilterChange} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: '미납 있음' }));
    });
    expect(onMemberFilterChange).toHaveBeenCalledWith('unpaid');
  });

  it('미납 보기에서는 기준 달까지 미납이 있는 회원만 보이고, 기준 달을 바꿀 수 있다', async () => {
    const onThroughMonthChange = jest.fn();
    render(<FeeDashboardView {...base} memberFilter="unpaid" onThroughMonthChange={onThroughMonthChange} />);
    expect(screen.queryByText('가온')).toBeNull();
    expect(screen.getByText('나래')).toBeTruthy();
    await pickOption('미납 판정 기준 마지막 달', '3월까지');
    expect(onThroughMonthChange).toHaveBeenCalledWith(3);
  });

  it('해당 회원이 없으면 빈 문구를 보인다', () => {
    render(<FeeDashboardView {...base} memberFilter="unpaid" throughMonth={2} />);
    expect(screen.getByText('2026년 1~2월 사이 미납이 있는 일반·부부 회원이 없습니다.')).toBeTruthy();
  });
});
```

`SegmentedControl`의 항목은 `role="radio"`다. `months`의 필드 이름은 `MemberPaymentStatus` 타입에 맞춘다.

- [ ] **Step 2: 실패를 확인한다**

Run: `npx jest src/__tests__/components/membership-fee/FeeDashboardView`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: `FeeDashboardView`를 만들고 `index.tsx`를 얇게 만든다**

`index.tsx`의 `return (…)` 안을 View로 옮긴다. 페이지에는 상태(`year`, `memberFilter`, `throughMonth`), `usePaymentDashboard`, 로딩 처리만 남긴다.

```tsx
// index.tsx
return (
  <>
    <PageHeader title="회비 관리" />
    {isLoading || !dashboard || !clubIdStr ? (
      <Skeleton className="h-64 w-full" />
    ) : (
      <FeeDashboardView
        clubId={clubIdStr}
        year={year}
        onYearChange={setYear}
        dashboard={dashboard}
        memberFilter={memberFilter}
        onMemberFilterChange={setMemberFilter}
        throughMonth={throughMonth}
        onThroughMonthChange={setThroughMonth}
      />
    )}
  </>
);
```

지금 `dashboard`가 없을 때 바로가기와 설정 안내만 보이던 동작이 있으면 그대로 지킨다(View의 `dashboard`를 `| undefined`로 받고 아래쪽만 조건부로 그린다).

View의 구성:

| 구역 | 부품 |
| --- | --- |
| 최근 업로드 | `LatestUploadCard` (있을 때만) |
| 바로가기 | `ListGroup className="lg:grid lg:grid-cols-2"` + `ListRow title href leading={<Icon aria-hidden className="h-5 w-5 text-secondary" />}` 6개. 아이콘은 지금의 것(`Settings`, `Users`, `UserX`, `FileText`, `FileText`, `Clock`). `lg:grid`가 `ListGroup`의 구분선과 어긋나면 `ListGroup` 2개를 `grid lg:grid-cols-2 gap-3`으로 나눈다 |
| 설정 안내 | `Notice tone="warning"`. 문구와 링크 그대로. 링크는 `className="font-semibold underline"` |
| 연도 줄 | `Toolbar summary={일반: …원 / 부부: …원}` 안에 `YearSelector` |
| 요약 | `DashboardSummaryCard` |
| 납부 현황 | `<section className="rounded-md bg-surface p-4">` + `<h2 className="text-headline text-primary">회원별 납부 현황</h2>` + `SegmentedControl aria-label="목록 보기 방식"` + (`unpaid`·`paid`일 때) 설명 글자와 `OptionPicker` + `PaymentDashboardTable` 또는 빈 문구 |

```tsx
const VIEW_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'unpaid', label: '미납 있음' },
  { value: 'paid', label: '납부 완료' },
] as const;

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1}월까지`,
}));

<OptionPicker
  aria-label={memberFilter === 'paid' ? '납부 완료 기준 마지막 달' : '미납 판정 기준 마지막 달'}
  options={MONTH_OPTIONS}
  value={String(throughMonth)}
  onChange={(value) => onThroughMonthChange(Number(value))}
/>
```

`OptionPicker`는 `overflow-hidden` 상자 안에 두지 않는다(안내서 3절). 회원을 거르는 함수 `memberHasAnyUnpaidMonthThroughMonth`·`memberFullyPaidThroughMonth`는 지금 가져오는 곳에서 그대로 가져온다.

- [ ] **Step 4: `PaymentDashboardTable`에 토큰을 입힌다**

구조(`<table>`, 이름 열 `sticky left-0`, 가로 스크롤)와 칸을 정하는 조건 분기는 그대로 둔다.

| 지금 | 바꾼 뒤 |
| --- | --- |
| 머리글 줄 `bg-gray-50 border-b` | `border-b border-border bg-surface-muted`, 글자 `text-caption text-secondary` |
| 이름 칸 `sticky left-0 bg-white` / 탈퇴 `bg-gray-50` | `bg-surface` / `bg-surface-muted` (고정 열은 바탕이 꼭 있어야 한다) |
| 납부 `O` (초록) | `<Check aria-label="납부완료" className="mx-auto h-4 w-4 text-positive" />` |
| 미납 `X` (빨강) | `<X aria-label="미납" className="mx-auto h-4 w-4 text-negative" />` |
| 아직 안 온 달·의무 없음 `-` / 회색 `X` | `<Minus aria-hidden className="mx-auto h-4 w-4 text-tertiary" />` |
| 면제 `-` (파랑) | `<Minus aria-label="면제" className="mx-auto h-4 w-4 text-secondary" />` |
| 휴회 `🏥` | `<Hospital aria-label="휴회/병가" className="mx-auto h-4 w-4 text-secondary" />` |
| 입금 시작월·탈퇴월의 테두리 색 | `border-border` (굵기와 방향은 그대로) |
| 유형 글자(부부 분홍 등) | `text-secondary` |
| 회원 이름 `Link` | `href`·`title` 그대로, `className="text-primary underline-offset-2 hover:underline"` |

`<td>`의 `title` 분기는 한 글자도 바꾸지 않는다. `PaymentStatusCell`을 여기서 쓰고 있으면 위 아이콘으로 풀어 쓰고, 다른 곳에서 안 쓰면 지운다.

```bash
grep -rn "PaymentStatusCell" src
```

- [ ] **Step 5: `report.tsx`를 옮긴다**

| 구역 | 바꾼 뒤 |
| --- | --- |
| 머리 | `PageHeader title="회비 리포트" backHref={\`/clubs/${clubId}/membership-fee\`}` |
| 연도 | `Toolbar` 안에 `YearSelector` |
| 요약 4칸 | `grid grid-cols-2 gap-2 lg:grid-cols-4`, 칸 `rounded-md bg-surface p-4`, 이름 `text-footnote text-secondary`, 숫자 `text-title text-primary` |
| 월별 납부 현황 | `<h2 className="mb-2 mt-6 text-headline text-primary">` + `DataTable aria-label="월별 납부 현황"` |
| 회원별 연간 납부 | 같은 방식, `aria-label="회원별 연간 납부"` |
| 미납 회원 목록 | `<h2>` 줄에 `OptionPicker aria-label="미납 회원 기준 달"`(1월–12월, 글자 `N월`) + `ListGroup label={\`${year}년 ${selectedMonth}월 미납: ${n}명\`}` + `ListRow title subtitle`. 없으면 `EmptyState title={\`${selectedMonth}월 미납 회원이 없습니다.\`}` |

월별 표:

```tsx
<DataTable
  aria-label="월별 납부 현황"
  rows={[...monthlyStats, TOTAL_ROW]}
  rowKey={(row) => row.month}
  columns={[
    { key: 'month', header: '월', cell: (row) => (row.month === 0 ? '합계' : `${row.month}월`) },
    { key: 'paid', header: '납부', cell: (row) => (row.month === 0 ? '-' : <span className="text-positive">{row.paidCount}명</span>) },
    { key: 'unpaid', header: '미납', cell: (row) => (row.month === 0 ? '-' : <span className="text-negative">{row.totalCount - row.paidCount}명</span>) },
    { key: 'amount', header: '수입', align: 'right', cell: (row) => `${row.amount.toLocaleString()}원` },
  ]}
  list={{
    title: (row) => (row.month === 0 ? '합계' : `${row.month}월`),
    subtitle: (row) => (row.month === 0 ? undefined : `납부 ${row.paidCount}명 · 미납 ${row.totalCount - row.paidCount}명`),
    trailing: (row) => `${row.amount.toLocaleString()}원`,
  }}
  empty="월별 납부 현황이 없습니다."
/>
```

`TOTAL_ROW = { month: 0, paidCount: 0, totalCount: 0, amount: dashboard?.summary.yearTotal ?? 0 }`. 합계 줄이 정렬에 섞이지 않도록 이 표의 열에는 `sortValue`를 주지 않는다.

회원별 표의 부부 표시 `(부부 · 배우자)`는 문구 그대로, 색만 `text-caption text-secondary`.

- [ ] **Step 6: `batches.tsx`를 옮긴다**

`StatusBadge`·`BatchRow` 부품을 지우고 `DataTable`로 바꾼다. `formatDate`·`formatDateTimeRange`는 그대로 쓴다.

```tsx
const STAT_KEYS = [
  { key: 'confirmed', status: 'CONFIRMED', label: '확정' },
  { key: 'pending', status: 'PENDING', label: '대기' },
  { key: 'matched', status: 'MATCHED', label: '매칭' },
  { key: 'skipped', status: 'SKIPPED', label: '건너뜀' },
  { key: 'error', status: 'ERROR', label: '에러' },
] as const;

const stats = (batch: UploadBatchItem) => (
  <span className="flex flex-wrap justify-end gap-1">
    {STAT_KEYS.map(({ key, status, label }) => (
      <StatusChip key={key} domain="feeRecord" status={status}>
        {label} {batch.stats[key]}
      </StatusChip>
    ))}
  </span>
);

<PageHeader title="업로드 이력" backHref={`/clubs/${clubId}/membership-fee`} />
{isLoading ? (
  <Skeleton className="h-48 w-full" />
) : (
  <DataTable
    aria-label="업로드 이력"
    rows={batches ?? []}
    rowKey={(batch) => batch.id}
    columns={[
      { key: 'uploadedAt', header: '업로드일', cell: (b) => formatDate(b.uploadedAt), sortValue: (b) => new Date(b.uploadedAt).getTime() },
      { key: 'fileName', header: '파일명', cell: (b) => b.fileName },
      { key: 'uploadedBy', header: '업로드', cell: (b) => b.uploadedByName ?? '' },
      { key: 'count', header: '건수', align: 'right', cell: (b) => `${b.recordCount}건`, sortValue: (b) => b.recordCount },
      { key: 'range', header: '거래일', cell: (b) => formatDateTimeRange(b.minTransactionDate, b.maxTransactionDate) },
      { key: 'stats', header: '상태', cell: stats },
    ]}
    list={{
      title: (b) => formatDate(b.uploadedAt),
      subtitle: (b) => `${b.fileName} · ${b.recordCount}건`,
      trailing: stats,
    }}
    onRowClick={(b) => router.push(`/clubs/${clubIdStr}/membership-fee/process?batchId=${b.id}`)}
    empty={
      <EmptyState
        title="아직 업로드된 입금 내역이 없습니다."
        action={
          <Link href={`/clubs/${clubId}/membership-fee/upload`} className={buttonVariants({ size: 'md' })}>
            입금 내역 업로드
          </Link>
        }
      />
    }
  />
)}
```

머리글이 "업로드일 / 파일명"·"상태" 두 개에서 여섯 개로 늘어난다(같은 정보를 열로 나눈 것). 보고 대상.

- [ ] **Step 7: 미리보기에 대시보드를 올리고 확인한다**

`admin-preview.tsx`에 `'fee-dashboard'` 화면을 더한다. 가짜 `dashboard`는 Step 1의 `DASHBOARD` 모양으로 회원 12명(`NAMES`)을 만들고, 칸 종류 여섯 가지(납부·미납·면제·휴회·의무 없음·탈퇴)가 모두 나오게 한다.

Run: `npx tsc --noEmit && npm run lint && npx jest src/__tests__/components/membership-fee`
Expected: 오류 없음, PASS

Run: `npx jest src/__tests__/guards 2>&1 | grep -E "membership-fee/(index|report|batches)\.tsx|PaymentDashboardTable|FeeDashboardView"`
Expected: 출력 없음

미리보기를 네 조합으로 본다. 다크에서 고정된 이름 열의 바탕이 비치지 않는지 확인한다.

- [ ] **Step 8: 커밋**

```bash
git add -A src
git commit -m "refactor(membership-fee): 대시보드·리포트·업로드 이력을 디자인 시스템으로 전환"
```

---

### Task 5: 설정 화면 3개

**Files:**
- Create: `src/components/organisms/membership-fee/FeeTypeFormSheet.tsx`
- Rename + Modify: `CoupleHistoryUpsertModal.tsx` → `CoupleHistoryUpsertSheet.tsx`, `ExemptionRegisterModal.tsx` → `ExemptionRegisterSheet.tsx`
- Test: `src/__tests__/components/membership-fee/settingsSheets.dom.test.tsx`
- Modify: `src/pages/clubs/[id]/membership-fee/settings/fee-types.tsx`, `couples.tsx`, `exemptions.tsx`
- Delete: `CoupleHistoryManageList.tsx`, `ExemptionManageList.tsx`, `CoupleManageList.tsx`, `CoupleRegisterModal.tsx`

**Interfaces:**
- Consumes: `Sheet`, `FormField`, `Input`, `Select`, `Button`, `useConfirm`, `DataTable`, `Toolbar`, `YearSelector`, `MemberSelectDropdown`
- Produces: 세 Sheet 모두 **지금 모달의 props에 `onDelete`만 더한다.**

```ts
// FeeTypeFormSheet: { open; clubId; year; feeType: FeeType | null; onClose; onSuccess; onDelete?: (feeType: FeeType) => void }
// CoupleHistoryUpsertSheet: 지금 props(isOpen, onClose, onSubmit, members, editing, isSubmitting) + onDelete?: (historyId: number) => void
// ExemptionRegisterSheet: 지금 props 그대로 (등록 전용)
```

- [ ] **Step 1: 실패하는 테스트를 쓴다**

Sheet로 옮기며 폼의 제출 값이 바뀌지 않았는지 잠근다.

```tsx
import { describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { CoupleHistoryUpsertSheet } from '@/components/organisms/membership-fee/CoupleHistoryUpsertSheet';
import { ExemptionRegisterSheet } from '@/components/organisms/membership-fee/ExemptionRegisterSheet';

const MEMBERS = [
  { id: 1, name: '가온' },
  { id: 2, name: '나래' },
  { id: 3, name: '다람' },
];

describe('ExemptionRegisterSheet', () => {
  it('사유를 적지 않으면 등록할 수 없다', () => {
    render(
      <ExemptionRegisterSheet isOpen onClose={() => {}} onSubmit={() => {}} members={MEMBERS} exemptedMemberIds={[]} year={2026} />
    );
    expect((screen.getByRole('button', { name: '등록' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('닫혀 있으면 그리지 않는다', () => {
    render(
      <ExemptionRegisterSheet isOpen={false} onClose={() => {}} onSubmit={() => {}} members={MEMBERS} exemptedMemberIds={[]} year={2026} />
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('CoupleHistoryUpsertSheet', () => {
  it('수정으로 열면 삭제 버튼이 있고, 누르면 그 이력의 id로 알린다', async () => {
    const onDelete = jest.fn();
    const editing = {
      id: 7, memberAId: 1, memberBId: 2, startYear: 2025, startMonth: 3, endYear: null, endMonth: null,
    } as never;
    render(
      <CoupleHistoryUpsertSheet isOpen onClose={() => {}} onSubmit={() => {}} members={MEMBERS} editing={editing} onDelete={onDelete} />
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '삭제' }));
    });
    expect(onDelete).toHaveBeenCalledWith(7);
  });

  it('새로 등록할 때는 삭제 버튼이 없다', () => {
    render(<CoupleHistoryUpsertSheet isOpen onClose={() => {}} onSubmit={() => {}} members={MEMBERS} editing={null} />);
    expect(screen.queryByRole('button', { name: '삭제' })).toBeNull();
  });
});
```

`editing`의 필드 이름과 제출 버튼 글자("등록")는 지금 모달 파일을 보고 맞춘다. 지금 모달에 있는 검증(같은 회원 두 번 선택, 종료가 시작보다 앞섬 등)마다 "그 상태에서는 `onSubmit`이 불리지 않는다"는 테스트를 하나씩 더한다. 검증 목록은 Task 0의 기능 목록 `couples.tsx` 줄에 있다.

- [ ] **Step 2: 실패를 확인한다**

Run: `npx jest src/__tests__/components/membership-fee/settingsSheets`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 모달 3개를 Sheet로 바꾼다**

```bash
git mv src/components/organisms/membership-fee/CoupleHistoryUpsertModal.tsx src/components/organisms/membership-fee/CoupleHistoryUpsertSheet.tsx
git mv src/components/organisms/membership-fee/ExemptionRegisterModal.tsx src/components/organisms/membership-fee/ExemptionRegisterSheet.tsx
```

공통 규칙:

| 지금 | 바꾼 뒤 |
| --- | --- |
| `if (!isOpen) return null;` + `fixed inset-0` 막 + 흰 상자 + 제목 + X 버튼 | `<Sheet open={isOpen} onClose={onClose} title="…" footer={…}>`. 제목 글자는 지금 `<h2>`의 글자 그대로 |
| `<label>` + `<input>`/`<select>` | `<FormField label="…" required>` + `Input`/`Select`. `*`를 글자로 붙이던 라벨은 `required`로 |
| `<form onSubmit>` 안의 제출·취소 버튼 | `<form id="…" onSubmit>`은 본문에 두고, `footer`에 `Button type="submit" form="…" pending={isSubmitting}` + `Button type="button" variant="secondary"` "취소" |
| 상태 초기화(`useEffect` 등)와 검증, `onSubmit`에 넘기는 값 | **그대로** |

`FeeTypeFormSheet`는 `fee-types.tsx` 안의 `FeeTypeFormModal`을 새 파일로 옮긴 것이다. 훅 3개(`useCreateFeeType`, `useUpdateFeeType`, `useBulkUpsertFeeRates`)를 부르는 순서와 값은 그대로 두고, `alert('유형 이름을 입력해주세요.')`와 `alert(message)`만 `toast.error`로 바꾼다. `PERIOD_LABELS`도 함께 옮겨 내보낸다. 지금은 `{modalOpen && <FeeTypeFormModal />}`로 열 때마다 새로 만들어 상태가 초기화된다. Sheet는 닫히는 애니메이션 때문에 늘 떠 있어야 하므로, `open`과 `feeType?.id`가 바뀔 때 `useEffect`로 `name`·`description`·`rates`를 다시 채운다.

수정으로 열었을 때 `footer` 왼쪽에 삭제 버튼을 둔다.

```tsx
footer={
  <div className="flex gap-2">
    {editing && onDelete && (
      <Button type="button" variant="destructive" onClick={() => onDelete(editing.id)} disabled={isSubmitting}>
        삭제
      </Button>
    )}
    <Button type="button" variant="secondary" className="ml-auto" onClick={onClose} disabled={isSubmitting}>
      취소
    </Button>
    <Button type="submit" form="couple-history-form" pending={isSubmitting}>
      {/* 지금 버튼의 글자 그대로 */}
    </Button>
  </div>
}
```

- [ ] **Step 4: 화면 3개를 옮긴다**

세 화면 공통: `PageHeader`(`backHref={\`/clubs/${clubId}/membership-fee\`}`, `action`에 등록 버튼) + `DataTable` + Sheet. 삭제는 `useConfirm`.

```tsx
// couples.tsx
const confirm = useConfirm();

const handleDelete = async (historyId: number) => {
  const ok = await confirm({ title: '정말 이 부부 관계를 삭제하시겠습니까?', confirmLabel: '삭제', destructive: true });
  if (!ok) return;
  try {
    await deleteHistory.mutateAsync(historyId);
    setIsModalOpen(false);
    setEditing(null);
  } catch {
    toast.error('부부 관계 삭제에 실패했습니다.');
  }
};
```

| 화면 | `PageHeader` | 표의 열 | 행을 누르면 | 확인 문구 |
| --- | --- | --- | --- | --- |
| `fee-types` | title "회비 유형 관리", action "회비 유형 추가" | 유형 / 설명 / `{year}년 금액` (지금의 `rateSummary`) | `FeeTypeFormSheet`(수정) | `title: \`"${name}" 유형을 삭제하시겠습니까?\``, `message: '(사용 중인 회원이 있으면 삭제할 수 없습니다)'` |
| `couples` | title "부부 회원 관리", action "등록" | `CoupleHistoryManageList`가 보이던 것 그대로(회원 두 명, 시작, 종료, 진행 중 표시) | `CoupleHistoryUpsertSheet`(수정) | 위 코드 |
| `exemptions` | title "회비 면제 관리", action "면제 등록" | `ExemptionManageList`가 보이던 것 그대로(회원, 사유, 등록자·등록일) | 삭제 확인창을 바로 연다(수정이 없다) | `title: '정말 이 면제를 삭제하시겠습니까?'`, `message: \`${회원 이름} · ${사유}\`` |

- 설명 문단("두 회원의 시작·종료를 시점 단위로 관리합니다…", "임원, 명예회원 등…")은 `PageHeader` 아래 `<p className="mb-3 text-footnote text-secondary">`로 문구 그대로 둔다.
- 연도가 있는 화면(`fee-types`, `exemptions`)은 `Toolbar` 안에 `YearSelector`를 둔다.
- 빈 문구는 지금 것을 `DataTable`의 `empty`로 그대로 넘긴다(`fee-types`: `등록된 회비 유형이 없습니다. "회비 유형 추가"를 눌러 등록해주세요.`).
- 진행 중인 부부 관계처럼 색으로 표시하던 것은 `StatusChip tone="positive"`(진행 중) / `tone="neutral"`(종료)로 바꾼다. 글자는 지금 것 그대로.
- `alert(...)` → `toast.error(...)` (문구 그대로).
- 면제는 행을 누르면 확인창이 바로 뜨므로, 표에 "삭제" 열을 두지 않는다. 휴대폰 리스트에서도 같다.

- [ ] **Step 5: 옛 부품을 지운다**

```bash
git rm src/components/organisms/membership-fee/CoupleHistoryManageList.tsx src/components/organisms/membership-fee/ExemptionManageList.tsx src/components/organisms/membership-fee/CoupleManageList.tsx src/components/organisms/membership-fee/CoupleRegisterModal.tsx
grep -rn "CoupleHistoryManageList\|ExemptionManageList\|CoupleManageList\|CoupleRegisterModal\|UpsertModal\|RegisterModal\|FeeTypeFormModal" src
```

Expected: 출력 없음. `useCouples.ts` 훅이 지운 부품에서만 쓰였더라도 **지우지 않는다**(`src/hooks/membership-fee`는 `useBulkPaymentActions.ts`만 고친다). 쓰는 곳이 없어졌으면 보고한다.

- [ ] **Step 6: 확인한다**

Run: `npx tsc --noEmit && npm run lint && npx jest src/__tests__/components/membership-fee`
Expected: 오류 없음, PASS

Run: `npx jest src/__tests__/guards/noRawControls`
Expected: "직접 만든 모달" 테스트 PASS. "원시 입력 요소"에는 `pages/clubs/[id]/members/[userId].tsx`만 남는다.

- [ ] **Step 7: 커밋**

```bash
git add -A src
git commit -m "refactor(membership-fee): 설정 화면 3개를 DataTable과 Sheet로 전환"
```

---

### Task 6: 회원 상세

**Files:**
- Create: `src/components/organisms/membership-fee/MemberFeeDetailView.tsx`
- Test: `src/__tests__/components/membership-fee/MemberFeeDetailView.dom.test.tsx`
- Modify: `src/pages/clubs/[id]/members/[userId].tsx`
- Modify: `src/pages/dev/admin-preview.tsx`

**Interfaces:**
- Produces:

```ts
export interface ClubMemberDetail { id: number; name: string | null; status: string; createdAt: string; feeObligationStartAt: string | null; leftAt: string | null }
export interface MemberLeaveItem { id: number; clubMemberId: number; startYear: number; startMonth: number; endYear: number | null; endMonth: number | null; reason: string | null; createdAt: string }
export interface LeaveFormValue { editingId: number | null; start: string; end: string; reason: string } // start·end는 'YYYY-MM'

interface MemberFeeDetailViewProps {
  member: ClubMemberDetail;
  leaves: MemberLeaveItem[];
  saving: boolean;
  feeStartInput: string;
  onChangeFeeStart: (value: string) => void;
  onSaveFeeStart: () => void;
  leftAtInput: string;
  onChangeLeftAt: (value: string) => void;
  feeEndInput: string;
  onChangeFeeEnd: (value: string) => void;
  onSaveLeftInfo: () => void;
  onSubmitLeave: (value: LeaveFormValue) => Promise<boolean>; // 성공하면 true → 시트를 닫는다
  onDeleteLeave: (leaveId: number) => void;
}
```

두 타입은 지금 페이지 안에 있는 것을 View 파일로 옮겨 내보낸다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

```tsx
import { ComponentProps } from 'react';

import { describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen, within } from '@testing-library/react';

import { MemberFeeDetailView } from '@/components/organisms/membership-fee/MemberFeeDetailView';

type Props = ComponentProps<typeof MemberFeeDetailView>;

const base: Props = {
  member: { id: 10, name: '가온', status: 'APPROVED', createdAt: '2025-01-02T00:00:00.000Z', feeObligationStartAt: null, leftAt: null },
  leaves: [{ id: 5, clubMemberId: 10, startYear: 2026, startMonth: 3, endYear: 2026, endMonth: 5, reason: '부상', createdAt: '2026-03-01T00:00:00.000Z' }],
  saving: false,
  feeStartInput: '2025-02', onChangeFeeStart: () => {}, onSaveFeeStart: () => {},
  leftAtInput: '', onChangeLeftAt: () => {}, feeEndInput: '', onChangeFeeEnd: () => {}, onSaveLeftInfo: () => {},
  onSubmitLeave: async () => true, onDeleteLeave: () => {},
};

describe('MemberFeeDetailView', () => {
  it('입금 시작 연월을 바꾸면 알리고, 저장을 누르면 저장을 부른다', async () => {
    const onChangeFeeStart = jest.fn();
    const onSaveFeeStart = jest.fn();
    render(<MemberFeeDetailView {...base} onChangeFeeStart={onChangeFeeStart} onSaveFeeStart={onSaveFeeStart} />);
    const group = within(screen.getByRole('group', { name: '입금 시작' }));
    fireEvent.change(group.getByDisplayValue('2025-02'), { target: { value: '2025-04' } });
    expect(onChangeFeeStart).toHaveBeenCalledWith('2025-04');
    await act(async () => {
      fireEvent.click(group.getByRole('button', { name: '저장' }));
    });
    expect(onSaveFeeStart).toHaveBeenCalled();
  });

  it('휴회 기간을 누르면 그 값이 채워진 시트가 열리고, 저장하면 editingId와 함께 알린다', async () => {
    const onSubmitLeave = jest.fn<Props['onSubmitLeave']>().mockResolvedValue(true);
    render(<MemberFeeDetailView {...base} onSubmitLeave={onSubmitLeave} />);
    await act(async () => {
      fireEvent.click(screen.getByText(/2026년 3월/));
    });
    const sheet = within(screen.getByRole('dialog'));
    expect(sheet.getByDisplayValue('2026-03')).toBeTruthy();
    expect(sheet.getByDisplayValue('부상')).toBeTruthy();
    await act(async () => {
      fireEvent.click(sheet.getByRole('button', { name: '저장' }));
    });
    expect(onSubmitLeave).toHaveBeenCalledWith({ editingId: 5, start: '2026-03', end: '2026-05', reason: '부상' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('저장이 실패하면 시트를 닫지 않는다', async () => {
    const onSubmitLeave = jest.fn<Props['onSubmitLeave']>().mockResolvedValue(false);
    render(<MemberFeeDetailView {...base} onSubmitLeave={onSubmitLeave} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /휴회.*추가/ }));
    });
    await act(async () => {
      fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '저장' }));
    });
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('시트에서 삭제를 누르면 그 휴회의 id로 알린다', async () => {
    const onDeleteLeave = jest.fn();
    render(<MemberFeeDetailView {...base} onDeleteLeave={onDeleteLeave} />);
    await act(async () => {
      fireEvent.click(screen.getByText(/2026년 3월/));
    });
    await act(async () => {
      fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '삭제' }));
    });
    expect(onDeleteLeave).toHaveBeenCalledWith(5);
  });
});
```

버튼 글자("저장", "휴회 … 추가", "삭제")와 휴회 줄의 글자 꼴(`2026년 3월`)은 지금 페이지의 문구를 보고 맞춘다. `ListGroup`의 `label`이 `role="group"`의 이름이 되지 않으면 `ListGroup` 안의 `<section aria-label>`을 찾도록 고친다.

- [ ] **Step 2: 실패를 확인한다**

Run: `npx jest src/__tests__/components/membership-fee/MemberFeeDetailView`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: View를 만들고 페이지를 얇게 만든다**

페이지에 남기는 것: 라우팅, `fetchMember`·`fetchLeaves`, 입력 상태 3개, `saving`, 핸들러 5개(요청 주소와 본문, 저장 뒤 무효화하는 쿼리는 그대로).

페이지에서 바꾸는 것:

| 지금 | 바꾼 뒤 |
| --- | --- |
| `message` 상태와 화면 안 메시지 상자 | `toast.success(text)` / `toast.error(text)`. 문구 그대로 |
| `leaveForm` 상태(`open`·`editingId`·`start`·`end`·`reason`) | View 안으로 옮긴다. 페이지의 `onSubmitLeave(value)`가 값을 받아 지금의 본문을 만든다 |
| `onSubmitLeave` | 검증 실패·요청 실패면 `false`, 성공이면 `true`를 돌려준다 |
| `window.confirm('이 휴회 기간을 삭제할까요?')` | `await confirm({ title: '이 휴회 기간을 삭제할까요?', confirmLabel: '삭제', destructive: true })` |
| `← {fromLabel}` 링크와 `<h1>` | `PageHeader title={member.name ?? …} backHref={backHref}`. `fromLabel`은 `PageHeader`가 받지 못하므로 쓰지 않게 된다. 보고 대상 |
| 로딩·"회원을 찾을 수 없습니다" 화면 | `Skeleton` / `EmptyState`(문구 그대로) + `PageHeader backHref` |

View의 구성:

| 묶음 | 내용 |
| --- | --- |
| `ListGroup label="기본 정보"` | `ListRow title="…" trailing={값}` — 지금 보이는 항목(상태, 가입일 등) 그대로. 상태는 `StatusChip domain="member"` |
| `ListGroup label="회비 설정"` | 안에 `<div role="group" aria-label="입금 시작" className="space-y-2 px-4 py-3">` — 설명 문구 + `Input type="month"` + `Button size="sm" pending={saving}` "저장". 아래에 `aria-label="탈퇴 종료"` 묶음 — `Input type="date"`(탈퇴일) + `Input type="month"`(납부 종료) + 저장 |
| `ListGroup label="휴회/병가 기간"` | `ListRow title="2026년 3월 ~ 2026년 5월" subtitle={reason} onClick={열기}` 반복. 없으면 지금의 빈 문구. `footer`에 `Button variant="secondary" size="sm"` 추가 버튼 |
| `Sheet` | `FormField label="시작" required` + `Input type="month"`, `FormField label="종료"` + `Input type="month"`, `FormField label="사유"` + `Input`. `footer`: 수정일 때 `Button variant="destructive"` "삭제", `Button variant="secondary"` "취소", `Button pending={saving}` "저장" |

묶음의 제목, 설명 문구, 라벨, 버튼 글자는 지금 것을 그대로 쓴다. 표의 제목은 지금 `<h2>`·`<h3>`의 글자다.

- [ ] **Step 4: 통과를 확인한다**

Run: `npx jest src/__tests__/components/membership-fee/MemberFeeDetailView`
Expected: PASS (4 tests)

- [ ] **Step 5: 미리보기에 올린다**

`admin-preview.tsx`에 `'member-fee'` 화면을 더한다. `useState`로 `leaves`를 들고, `onSubmitLeave`가 목록에 더하거나 고치고 `true`를 돌려주게 한다.

- [ ] **Step 6: 지킴이 테스트가 모두 통과하는지 본다**

Run: `npx jest src/__tests__/guards src/__tests__/styles`
Expected: `Test Suites: 5 passed, 5 total`, 실패 0

실패가 남으면 그 파일을 대응표대로 고친다. 예외 목록에 넣지 않는다.

- [ ] **Step 7: 커밋**

```bash
git add -A src
git commit -m "refactor(members): 회원 상세의 회비·휴회 관리를 디자인 시스템으로 전환"
```

---

### Task 7: 문서와 전체 확인

**Files:**
- Create: `docs/회비 정산/입금 내역 처리/기능/디자인-시스템-전환.md`
- Modify: `docs/회비 정산/입금 내역 처리/입금내역-처리-컨텍스트.md`, `docs/회비 정산/부부 회원 관리/부부회원관리-컨텍스트.md`, `docs/회비 정산/회원별 납부 현황/회원별-납부현황-컨텍스트.md`
- Modify: `docs/가이드/디자인-시스템.md` (3절 표에 `Notice` 한 줄, 4절 "참고할 실제 화면"에 `PaymentRecordsView`)

- [ ] **Step 1: 기능 문서를 쓴다**

문서 정책(`CLAUDE.md`)의 순서를 따른다: 배경 → 도입한 개선 → 설계 의사결정 → 프런트 처리 → UX 디테일 → 검증 → 변경 이력. 주장과 근거는 계층 bullet로, 2축 비교는 표로 쓴다. 반드시 들어갈 것:

- 행 동작을 상세 Sheet로 옮긴 이유(휴대폰 리스트에서도 같은 흐름)와 잃은 것(한 건 건너뛰기가 2번 클릭).
- 일괄 동작이 PC 전용인 이유(`DataTable`의 체크박스가 표에만 있다).
- 정렬이 페이지 상태에서 `DataTable` 머리글 정렬로 바뀐 것.
- 알림 방식의 대응표(Task 2).
- 색이 바뀐 곳(매칭됨 파랑 → 초록, 건너뜀 노랑 → 회색)과 근거(`statusTone.ts`).
- 부품 이름의 옛 → 새 대응표.
- 설계 문서와 이 계획 문서로 가는 링크.

- [ ] **Step 2: 화면 컨텍스트 3개를 고친다**

각 문서에서 지운 부품 이름을 찾아 새 이름과 흐름으로 고치고, 새 기능 문서로 가는 링크를 더한다.

```bash
grep -rn "PaymentRecordTable\|BulkActionBar\|RecordStatusBadge\|ManageList\|UpsertModal\|RegisterModal\|alert\|confirm(" "docs/회비 정산"/*/*-컨텍스트.md "docs/회비 정산"/*/README.md
```

`기능/` 아래의 기존 문서는 시점 기록이라 고치지 않는다.

- [ ] **Step 3: 전체 확인을 돌린다**

Run: `npx tsc --noEmit`
Expected: 오류 없음

Run: `npm run lint`
Expected: 오류 없음

Run: `npx jest 2>&1 | tail -6`
Expected: 실패 0. 통과 수는 기준(1590)에서 지킴이 33개가 통과로 넘어오고 새 테스트가 더해져 1623보다 많다. 줄었으면 사라진 테스트를 찾아 보고한다.

Run: `npm run build`
Expected: 성공. `Property 'default' is missing` 오류가 나면 테스트 파일이 `src/pages/` 안에 있는 것이다.

- [ ] **Step 4: 커밋**

```bash
git add docs
git commit -m "docs: 회비 관리 디자인 시스템 전환 기능 문서 추가, 화면 컨텍스트 갱신"
```

---

### Task 8: 기능 보존 확인

**Files:**
- Modify: `docs/회비 정산/디자인-시스템-전환-기능-목록.md` (결과 열 추가)

이 Task는 코드를 고치지 않는다. 문제를 찾으면 해당 Task의 파일을 고치고 테스트를 더한 뒤, 이 Task를 처음부터 다시 한다.

- [ ] **Step 1: 손대지 않기로 한 곳이 그대로인지 본다**

```bash
git diff --stat 7c9ab20 -- src/pages/api src/lib/membership-fee prisma
git diff --stat 7c9ab20 -- src/hooks/membership-fee
```

Expected: 첫 줄은 출력 없음. 둘째 줄은 `useBulkPaymentActions.ts` 한 파일만.

- [ ] **Step 2: 화면이 부르는 훅과 요청이 그대로인지 기계로 대조한다**

```bash
for ref in 7c9ab20 HEAD; do
  echo "== $ref"
  git grep -h -o -E "use[A-Z][A-Za-z]+\(|axios\.(get|post|put|patch|delete)\([^,)]*" $ref -- 'src/pages/clubs/\[id\]/membership-fee' 'src/pages/clubs/\[id\]/members/\[userId\].tsx' 'src/components/organisms/membership-fee' 'src/components/molecules/membership-fee' | sort | uniq -c
done
```

Expected: 두 목록에서 데이터 훅(`usePaymentRecords`, `useConfirmPayment` 등)과 `axios` 요청 주소가 같다. 달라도 되는 것은 `useConfirm`(늘어남)과 `useState`·`useMemo`·`useEffect`의 횟수뿐이다. 데이터 훅이 사라졌으면 기능이 빠진 것이다.

- [ ] **Step 3: 전환 전후를 독립 검토로 대조한다**

구현하지 않은 검토자(새 에이전트)에게 맡긴다. 화면 단위로 나눠 아래를 준다.

- 전환 전 코드: `git show 7c9ab20:<경로>` (화면 파일과 그 화면이 쓰던 부품)
- 전환 뒤 코드: 지금의 화면 파일과 부품
- 기능 목록의 해당 화면 표
- 의도한 변경 목록: 설계 문서 3–5절과 이 계획의 Rulings

요청할 것: "기능 목록의 각 줄을 전환 뒤 코드에서 찾아라. 같은 훅이 같은 값으로 불리는가, 같은 조건에서 쓸 수 있는가, 문구가 같은가. 목록에 없지만 전환 전 코드에 있던 동작이 사라진 것이 있는가. 각 줄을 `같음` / `의도한 변경` / `문제`로 판정하고, `문제`에는 파일과 줄 번호를 붙여라. 결론을 미리 정하지 말고 코드만 보고 판정하라."

검토자에게 "문제 없을 것"이라는 예상을 주지 않는다.

- [ ] **Step 4: 결과를 기능 목록에 적는다**

각 표에 `전환 뒤` 열을 더해 `같음` / `의도한 변경(무엇)` / `문제(무엇)`을 적는다. `문제`가 하나라도 있으면 고치고 Step 1로 돌아간다.

- [ ] **Step 5: 미리보기에서 눌러 본다**

개발 서버를 띄우고 `/dev/admin-preview`의 `fee-process`·`fee-dashboard`·`member-fee`를 연다. 390과 1280 폭, 라이트와 다크로 기능 목록을 따라 누른다.

| 볼 것 | 기대 |
| --- | --- |
| 처리: 다섯 상태의 행을 차례로 연다 | footer 버튼이 Task 3 Step 3의 표와 같다 |
| 처리: 월을 고르고 + 를 누르지 않는다 | "확정"이 눌리지 않고 안내 문구가 보인다 |
| 처리: 390 폭 | 리스트로 보이고 행을 누르면 아래 시트가 올라온다. 체크박스는 없다 |
| 처리: 1280 폭에서 행을 고른다 | 아래에 `N건 선택됨` 막대가 뜬다 |
| 대시보드: 격자를 가로로 민다 | 이름 열이 고정되고 다크에서 바탕이 비치지 않는다 |
| 대시보드: 칸 종류 여섯 가지 | 아이콘이 다르고 `title`이 뜬다 |
| 회원 상세: 휴회를 추가·수정·삭제한다 | 시트가 열리고 닫히며 목록이 바뀐다 |
| 모든 화면 | 가로 스크롤이 생기지 않는다(대시보드 격자 안쪽은 예외). 다크에서 읽히지 않는 글자가 없다 |

- [ ] **Step 6: 실제 화면은 읽기만 확인한다**

로그인해 여는 실제 화면은 프로덕션 DB를 읽는다. 아래만 한다.

- 9개 화면을 열어 오류 없이 그려지는지, 목록의 건수와 숫자가 나오는지 본다.
- 처리 화면에서 상태 탭·필터·정렬·거래일 범위를 바꿔 본다(읽기).
- 행을 눌러 시트를 열고 닫는다. **확정·건너뛰기·확정 취소·해제·회원 수정을 누르지 않는다.**
- 삭제, 등록, 저장, 업로드를 누르지 않는다.

쓰기 동작을 실제 데이터로 확인해야 한다고 판단되면 멈추고 사용자에게 묻는다.

- [ ] **Step 7: 결과를 보고하고 커밋한다**

보고에 넣을 것: 자동 검사 결과(수치), 기능 목록의 판정 합계(`같음` N, `의도한 변경` N, `문제` 0), 문구·동작이 바뀐 곳 목록(Rulings의 항목과 Task 4·6의 "보고 대상"), 확인하지 못한 것(실제 데이터의 쓰기 동작).

```bash
git add "docs/회비 정산/디자인-시스템-전환-기능-목록.md"
git commit -m "docs: 회비 화면 기능 목록에 전환 뒤 대조 결과 기록"
```
