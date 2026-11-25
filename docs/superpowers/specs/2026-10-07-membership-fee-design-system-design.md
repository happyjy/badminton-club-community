# 회비 관리 화면의 디자인 시스템 전환 — 설계

- 작성일: 2026-10-07
- 브랜치: `feat/membership-fee-on-main`
- 따르는 문서: [디자인 시스템 안내서](../../가이드/디자인-시스템.md), [디자인 시스템 설계](./2026-10-03-design-system-design.md)

## 1. 배경과 목표

회비 관리 기능은 디자인 시스템이 생기기 전에 만든 브랜치(`feat/mgmt-membership-fee`)를 그대로 병합해 온 것이다. 그래서 옛 색·크기 클래스, 원시 입력 요소, `alert()`·`confirm()`, 직접 만든 모달이 남아 있고 지킴이 테스트가 실패한다.

- **목표: 회비 관리 화면 8개와 회원 상세 화면 1개를 디자인 시스템의 토큰·부품·관리용 화면 틀로 옮긴다.**
  - 동작, API, DB는 바꾸지 않는다.
  - 사용자 문구는 바꾸지 않는다(5.1의 납부 표시 아이콘만 예외).
- **완료 기준**
  - `npx jest src/__tests__/guards src/__tests__/styles`가 예외 목록 추가 없이 통과한다(전환 전 33개 실패).
  - `npx tsc --noEmit`, `npm run lint`, `npx jest`, `npm run build`가 통과한다.
  - 9절의 기능 보존 확인을 모두 마친다.
  - 휴대폰(390)·PC(1280) × 라이트·다크 네 조합으로 본다.

### 전환 전 위반 현황

| 지킴이 | 위반 | 내용 |
| --- | --- | --- |
| `confirm()`·`alert()` | 35곳 | `useBulkPaymentActions` 17, 회비 화면 5개 17, 회원 상세 1 |
| 원시 `<input>`·`<select>` | 28곳 | 회비 부품·화면 22, 회원 상세 6 |
| 직접 만든 모달 | 5개 파일 | 모달 부품 3개, `process.tsx`, `fee-types.tsx` |
| 옛 색·크기 클래스 | 회비 관련 거의 모든 파일 | `bg-white`, `text-sm`, `bg-green-500` 등 |

`layoutVariant.ts`의 `ADMIN`, `navItems.ts`, `statusTone.ts`의 `feeRecord` 도메인은 이미 등록돼 있어 손대지 않는다.

## 2. 범위

| 구분 | 대상 |
| --- | --- |
| 화면 | `src/pages/clubs/[id]/membership-fee/` 아래 `index`, `process`, `upload`, `batches`, `report`, `settings/fee-types`, `settings/couples`, `settings/exemptions` |
| 화면 | `src/pages/clubs/[id]/members/[userId].tsx` |
| 부품 | `src/components/molecules/membership-fee/*`, `src/components/organisms/membership-fee/*` |
| 훅 | `src/hooks/membership-fee/useBulkPaymentActions.ts` (알림 방식만) |
| 규칙 문서 | `.claude/rules/bulk-action-pattern.md` 8절 |

건드리지 않는 것:

- `src/pages/api/**` 전부
- `src/lib/membership-fee/**`의 계산 로직
- `useBulkPaymentActions`를 뺀 데이터 훅의 요청·캐시 처리
- `prisma/**` (스키마 변경·마이그레이션 없음)

## 3. 공통 규칙

| 지금 | 바꾼 뒤 |
| --- | --- |
| `confirm('…')` | `await confirm({ title, message, destructive })` (`useConfirm`) |
| `alert(오류)`, `alert('선택된 항목이 없습니다')` | `toast.error(…)` |
| 일괄 처리 결과 `alert` | 실패 0건이면 `toast.success`, 실패가 있으면 `confirm({ hideCancel: true, message })`로 사유 목록 표시 |
| 직접 만든 모달 5개 | `Sheet` (제출 버튼은 `footer`) |
| 뒤로 가기 버튼 + `<h1>` | `PageHeader` (`backHref`) |
| 화면마다 준 `max-w-* mx-auto p-6` | 삭제 (`Layout`이 그린다) |
| `RecordStatusBadge`, 배치 화면의 색 배지 | `StatusChip domain="feeRecord"` |
| 로딩 스피너 | `Skeleton` |
| 노란·파란 안내 상자 | 새 부품 `Notice` (`molecules`, `tone`) |

- **색이 바뀌는 곳이 있다.**
  - `statusTone.ts` 기준으로 매칭됨은 파랑 → 초록(positive), 건너뜀은 노랑 → 회색(neutral)이 된다.
  - 초록 확정 버튼, 노랑 건너뛰기 버튼, 색색 바로가기 아이콘은 `Button`의 primary·secondary·destructive와 모노크롬 아이콘으로 정리한다.
  - 색으로만 구분하던 글자(분홍 "부부", 초록 납부, 빨강 미납)는 `text-secondary`·`text-positive`·`text-negative`를 쓴다.
- **일괄 처리 결과 문구는 그대로 둔다.**
  - `N건 확정, M건 실패` + `• 입금자명: 사유` 목록. 담는 그릇만 바뀐다.
  - 성공한 건만 선택에서 빼는 동작도 유지한다.

## 4. 입금 내역 처리 (`process.tsx`, `upload.tsx`)

```
PageHeader  "입금 내역 처리"   [배치 삭제]              ← 배치로 들어왔을 때만
거래일 범위 줄 (Input type=date + 1·3·6·12개월 + 적용)   ← 배치가 아닐 때만
상태 탭  전체 · 대기 · 매칭됨 · 확정 · 에러 · 건너뜀 (건수 포함)
Toolbar  [입금자명 검색] [금액] [매칭 회원]   "N건 표시 중"   [매칭된 항목 일괄 확정]
DataTable  거래일 | 입금자명 | 금액 | 매칭 회원 | 상태 | 확정 월
BulkActionBar  "N건 선택됨"  [탭별 일괄 동작]
```

### 4.1 부품 구성

| 부품 | 역할 | 대체하는 것 |
| --- | --- | --- |
| `PaymentRecordsView` | 표 + 상세 Sheet. `process`·`upload`가 함께 쓴다 | `PaymentRecordTable` |
| `PaymentRecordSheet` | 한 건의 회원 수정, 납부월 안내, 연도·월 선택, 확정·건너뛰기·확정 취소·건너뜀 해제 | 행 안 편집, 행 아래 펼침 패널 |
| `BulkConfirmSheet` | MATCHED 탭의 일괄 확정에서 연도·월을 고른다 | 옛 `BulkActionBar` 안의 연도·월 선택 |
| `ProcessStatusFilterTabs` | 건수가 붙은 칩 줄 (고른 것 `bg-accent`, 나머지 `bg-fill`) | 상태별 색 타일 |
| `organisms/table/BulkActionBar` | 탭별 일괄 동작 버튼 | `organisms/membership-fee/BulkActionBar` |

### 4.2 정한 것

- **행 동작을 모두 상세 Sheet로 옮긴다.**
  - 행에는 동작 버튼을 두지 않는다 → 그래서 휴대폰 리스트에서도 같은 흐름이 된다.
  - 한 건 건너뛰기가 1번 클릭에서 2번(행 → 버튼)으로 늘어난다. 여러 건은 일괄 동작으로 처리한다.
- **Sheet 안의 확정 규칙은 지금과 같다.**
  - 열 때 기본값: `nextSuggestedYearMonth` → 없으면 최종 납부월 + 1 → 없으면 `suggestedMonths`.
  - `nextSuggestedYearMonth === null`이면 차기월을 추천하지 않는다.
  - 고른 월을 추가(+)하지 않은 채로는 확정할 수 없다.
  - 선택이 1개면 `{ year, months }`, 여러 개면 `{ selections }`로 보낸다.
  - CONFIRMED·SKIPPED 상태에서는 회원을 수정할 수 없다.
- **정렬은 `DataTable`의 머리글 정렬을 쓴다.**
  - 페이지의 `sortBy`·`sortOrder` 상태와 `SortableTh`를 없앤다.
  - 기본 순서(거래일 내림차순)는 `applySort`로 넘기기 전에 정한다.
  - 휴대폰 리스트는 기본 순서로만 보인다.
- **일괄 선택은 `DataTable`의 `selection`을 쓴다.**
  - 상태 탭을 골랐을 때만 켠다. 전체 탭에는 체크박스가 없다.
  - 탭을 바꾸면 선택을 비운다(지금과 같다).
  - 매칭 회원이 없는 MATCHED 행도 체크는 된다. 서버가 실패 사유로 돌려준다.
  - `DataTable`의 체크박스는 PC 표에만 있어 일괄 동작은 PC 전용이다.
- **탭별 일괄 동작은 지금과 같다.**

  | 탭 | 동작 |
  | --- | --- |
  | PENDING, ERROR | 선택 항목 건너뛰기 |
  | MATCHED | 선택 항목 확정(연도·월 지정, `BulkConfirmSheet`), 선택 항목 건너뛰기 |
  | CONFIRMED | 선택 항목 확정 취소 |
  | SKIPPED | 선택 항목 건너뜀 해제 |

- **"매칭된 항목 일괄 확정 (N건)"은 `Toolbar`의 `actions`에 둔다.**
  - 대상은 지금처럼 필터가 적용된 목록 중 회원이 매칭된 MATCHED 건이다.
- **배치 삭제는 `useConfirm`(destructive)으로 묻는다.**
  - 확정된 납부가 있으면 지금의 경고 문구를 `message`에 그대로 쓴다.
- **회원 선택 드롭다운 2개는 구조를 유지한다.**
  - 445명에서 검색해 고르는 것이라 `Select`로는 부족하다.
  - 안의 원시 `<input>`만 `Input`·`Checkbox`로 바꾸고 토큰을 입힌다.
- **URL 동작은 그대로 둔다.**
  - `?status=`, `?batchId=` 쿼리와 탭을 누를 때의 `router.push`.

## 5. 나머지 화면

| 화면 | 바꾼 뒤 구성 |
| --- | --- |
| 대시보드 `index.tsx` | `PageHeader` + 최근 업로드 카드 + 바로가기 `ListGroup` + 요약 + 납부 현황 격자 |
| 리포트 `report.tsx` | `PageHeader` + 요약 숫자 4칸 + `DataTable` 2개 + 미납 회원 `ListGroup` |
| 업로드 이력 `batches.tsx` | `PageHeader` + `DataTable`. 행을 누르면 해당 배치의 처리 화면으로 간다 |
| 업로드 `upload.tsx` | `PageHeader` + 업로드 영역 + 결과 숫자 4칸 + `PaymentRecordsView` |
| 회비 유형 `fee-types.tsx` | `PageHeader`(추가) + `Toolbar`(연도) + `DataTable` + 폼 `Sheet` |
| 부부 `couples.tsx` | `PageHeader`(등록) + `DataTable` + 폼 `Sheet` |
| 면제 `exemptions.tsx` | `PageHeader`(면제 등록) + `Toolbar`(연도) + `DataTable` + 등록 `Sheet` |
| 회원 상세 `members/[userId].tsx` | `PageHeader` + `ListGroup` 3묶음(기본 정보, 회비 설정, 휴회·병가 기간) |

### 5.1 정한 것

- **대시보드의 회원 × 12개월 격자는 `DataTable`로 바꾸지 않는다.**
  - 열이 15개라 리스트 전환이 의미가 없고, 이름 열 고정이 필요하다.
  - `PaymentDashboardTable`을 유지하고 토큰만 입힌다. 휴대폰에서는 가로로 민다.
  - 칸의 `O`·`X`·`-` 글자는 lucide 아이콘(`Check`·`X`·`Minus`)으로 바꾼다. `title`의 "납부완료"·"미납"·"면제"는 유지한다.
- **대시보드의 "전체 · 미납 있음 · 납부 완료"는 `SegmentedControl`, "N월까지"는 `OptionPicker`.**
- **리포트의 미납 회원 월 선택은 `OptionPicker`.**
- **`YearSelector`는 부품을 유지하고 안쪽만 `IconButton`과 토큰으로 바꾼다.**
- **설정 3개 화면은 행의 수정·삭제 아이콘을 없애고 행을 눌러 Sheet에서 한다.**
  - 면제는 수정이 없어, 행을 누르면 내용과 삭제 버튼만 있는 Sheet가 열린다.
  - 삭제는 `useConfirm`(destructive)으로 묻는다.
- **모달 안의 `<select>`는 폼에 저장되는 값이라 `Select`로 바꾼다.**
- **회원 상세의 날짜 입력은 `FormField` + `Input`, 휴회 추가·수정은 `Sheet`.**
- **삭제하는 부품**
  - `RecordStatusBadge`, `PaymentRecordTable`, 옛 `BulkActionBar`, `CoupleHistoryManageList`, `ExemptionManageList`.
  - `CoupleManageList`, `CoupleRegisterModal`은 쓰는 곳이 없는지 확인한 뒤 삭제한다.

## 6. 그리는 부분 분리와 미리보기

- **세 화면만 `…View`로 뗀다.**
  - `PaymentRecordsView`, `FeeDashboardView`, `MemberFeeDetailView`.
  - 나머지는 작아서 페이지에 둔다.
- **세 View를 `/dev/admin-preview`에 가짜 데이터로 올린다.**
  - `.env`의 DB가 프로덕션이라, 화면 확인은 가짜 데이터로만 한다.

## 7. 테스트

| 대상 | 처리 |
| --- | --- |
| 지킴이 테스트 3개 | 예외 목록에 넣지 않고 전부 통과시킨다 |
| `bulkPaymentActions.dom.test.tsx` | `window.alert`·`window.confirm` 스파이를 `useConfirm`·`toast` 모의로 바꾼다. 검증 내용은 유지한다 |
| `processView.dom.test.tsx`, `transactionDateRange.dom.test.tsx` | 로직 검증은 유지하고, 바뀐 마크업에 맞춰 찾는 방식만 고친다 |
| 새 View 3개 | `src/__tests__/components/membership-fee/`에 추가한다 |
| `lib/membership-fee/*.test.ts` | 손대지 않는다 |

- **`useBulkPaymentActions`는 테스트부터 고친다.**
  - 확인 없이 일괄 확정이 실행될 수 있는 유일한 지점이다.
  - 테스트가 훅 로직을 복사해 두고 있으면 실제 훅을 불러 검증하도록 바꾼다.
- **새 View 테스트는 흐름이 바뀐 곳을 본다.**
  - 행을 누르면 상세 Sheet가 열린다.
  - Sheet에서 확정하면 `onConfirm`이 고른 연도·월로 불린다.
  - 전체 탭에서는 체크박스가 없다.

## 8. 작업 순서

| 순서 | 내용 | 끝나면 |
| --- | --- | --- |
| 0 | 기능 목록 작성 (9.1) | 전환 전 기준선 |
| 1 | 공통 부품: `Notice` 추가, `YearSelector`·`MonthSelector`·회원 선택 드롭다운 2개·`FileUploadZone`·카드 2개 토큰화, `StatusChip` 적용 | 부품 단위 지킴이 통과 |
| 2 | `useBulkPaymentActions`의 알림 전환 (테스트 먼저) | 훅 테스트 통과 |
| 3 | 입금 내역 처리: `PaymentRecordsView`, Sheet 2개, `process.tsx`, `upload.tsx` | 미리보기에 올림 |
| 4 | 대시보드, 리포트, 업로드 이력 | `FeeDashboardView` 미리보기 |
| 5 | 설정 3개 | 직접 만든 모달 0개 |
| 6 | 회원 상세 | 지킴이 테스트 전부 통과 |
| 7 | 안 쓰는 부품 삭제, 문서 갱신, 전체 확인 | 빌드 통과 |
| 8 | 기능 보존 확인 (9.2–9.5) | 완료 |

커밋은 순서 하나마다 나눈다.

## 9. 기능 보존 확인

화면 구조가 바뀌므로, 전환 뒤에도 기존 기능이 모두 남아 있고 같은 요청을 보내는지 따로 확인한다.

### 9.1 기능 목록 (전환 전에 만든다)

- **전환 전 코드에서 화면별 기능을 표로 뽑는다.**
  - 한 줄이 한 기능이다: 화면, 사용자 동작, 불리는 훅·핸들러, 넘기는 값, 조건(어느 상태에서 보이는가).
  - 예: 처리 화면 / 확정 / `confirmMutation` / 선택 1개면 `{year, months}`, 여러 개면 `{selections}` / CONFIRMED·SKIPPED가 아니고 매칭 회원이 있을 때.
  - 링크와 이동 경로, 빈 상태 문구, 비활성 조건도 넣는다.
- **이 표가 전환 뒤 확인의 기준이다.** 구현 계획에 포함한다.

### 9.2 손대지 않기로 한 곳이 그대로인지

```bash
git diff --stat 7c9ab20 -- src/pages/api src/lib/membership-fee prisma
git diff --stat 7c9ab20 -- src/hooks/membership-fee
```

- 첫 줄은 출력이 없어야 한다.
- 둘째 줄은 `useBulkPaymentActions.ts`만 나와야 한다.

### 9.3 자동 검사

- `npx tsc --noEmit`, `npm run lint`, `npx jest`, `npm run build`.
- 전환 전에 통과하던 테스트가 전환 뒤에도 모두 통과하는지 수를 맞춰 본다.

### 9.4 전환 전후 대조 (독립 검토)

- **기능 목록의 각 줄을 전환 뒤 코드에서 찾아 대조한다.**
  - 같은 훅이 같은 값으로 불리는가, 같은 조건에서 쓸 수 있는가, 사라진 기능이 없는가.
- **구현한 쪽의 판단에 기대지 않도록 별도 검토로 돌린다.**
  - 전환 전 코드(`7c9ab20`)와 전환 뒤 코드를 화면 단위로 주고, 빠지거나 달라진 동작을 찾게 한다.
- **결과는 "같음 / 의도한 변경 / 문제"로 나눈다.**
  - 의도한 변경은 이 문서에 적힌 것만 해당한다(행 동작의 Sheet 이동, 일괄 동작 PC 전용, 정렬 방식, 알림 그릇, 색).
  - 문제는 고친 뒤 다시 대조한다.

### 9.5 화면에서 직접 확인

- **미리보기(가짜 데이터)에서 기능 목록을 따라 눌러 본다.**
  - 휴대폰(390)·PC(1280) × 라이트·다크.
  - 처리 화면은 다섯 상태의 행을 모두 열어 Sheet의 버튼 구성이 맞는지 본다.
- **실제 화면은 읽기만 한다.**
  - 로그인해 여는 화면은 프로덕션 DB를 읽는다. 목록과 숫자가 전환 전과 같은지만 본다.
  - 확정·건너뛰기·삭제·업로드처럼 DB를 바꾸는 동작은 실제 화면에서 누르지 않는다. 필요하면 사용자에게 먼저 묻는다.

## 10. 문서

- **화면 컨텍스트 3개 갱신**: `입금내역-처리-컨텍스트.md`, `부부회원관리-컨텍스트.md`, `회원별-납부현황-컨텍스트.md`.
- **기능 문서 1개 추가**: `docs/회비 정산/입금 내역 처리/기능/디자인-시스템-전환.md`. 행 동작을 Sheet로 옮긴 이유와 일괄 동작이 PC 전용인 이유를 남긴다.
- **`.claude/rules/bulk-action-pattern.md` 8절**의 `alert` 예시를 새 방식으로 고친다.
- 기존 기능 문서는 시점 기록이라 고치지 않는다.
