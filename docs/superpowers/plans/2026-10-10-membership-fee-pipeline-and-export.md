# 회비 자동 판정 파이프라인 정리와 납부현황 내보내기 — 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 통장 엑셀을 올리면 회비가 아닌 건은 자동으로 빠지고 회비는 회원·개월 수·월이 정해져, 재무가 "검토 필요" 건만 본 뒤 일괄 확정 한 번으로 끝내고, 대시보드에서 연간 납부현황 엑셀을 내려받는다.

**Architecture:** `PaymentRecord`에 분류·분할·힌트·메모 컬럼을, `ClubMember`에 직책 컬럼을 더한다(컬럼 추가만). 업로드 시 "분류 → 시점 기준 매칭 → 단가·개월 수 → 월 배정"을 `src/lib/membership-fee/` 순수 함수로 돌리고, 단건·일괄 확정이 같은 함수로 재검증한다. 대시보드의 회원별 상태 계산을 함수로 빼서 내보내기 API가 같이 쓴다.

**Tech Stack:** Next.js Pages Router API, Prisma(PostgreSQL/Supabase 프로덕션), zod, React Query, Jest(node·jsdom 프로젝트), `xlsx`(읽기), `exceljs`(쓰기, 신규).

**Spec:** `docs/superpowers/specs/2026-10-10-membership-fee-pipeline-and-export-design.md`

## Global Constraints

- `.env`의 `DATABASE_URL`은 프로덕션이다. DB 상태를 바꾸는 명령은 실행 전에 사용자 확인을 받는다. `prisma migrate dev`는 쓰지 않는다.
- 스키마는 `prisma/schema/*.prisma`만 고치고 `npm run build:schema`로 통합한다. `schema.prisma`는 직접 고치지 않는다.
- API 핸들러는 `.claude/rules/api-handler-conventions.md`를 따른다: `import { prisma } from '@/lib/prisma'`, `withAuth`, 메소드 가드 → path param → `Role.ADMIN` 권한 → `try`, 응답은 `{ data, status: 200, message }` / `{ error, status }`.
- 일괄 API는 `.claude/rules/bulk-action-pattern.md`의 `results: { success, failed }` 형식과 3중 안전망을 따른다.
- 화면은 토큰만 쓴다(`bg-surface`, `text-secondary` 등). 상태 색은 `src/constants/statusTone.ts`에만 둔다. 원시 `<input>`·`<select>`·`confirm()`·`alert()`를 쓰지 않는다. 아이콘은 `lucide-react`.
- 사용자 문구는 새로 생기는 것만 쓰고 기존 문구는 바꾸지 않는다. 바꿨으면 보고한다.
- 테스트 파일은 `src/pages/` 아래에 두지 않는다. 페이지 테스트는 `src/__tests__/pages/...`, lib 테스트는 모듈 옆 `*.test.ts`. 컴포넌트 렌더 테스트만 `*.dom.test.tsx`.
- 커밋 메시지에 `Co-Authored-By` 트레일러를 넣지 않는다.
- 회비 금액 계산은 항상 `amount - nonFeeAmount`를 쓴다.
- 실제 회원 이름·통장 데이터를 테스트 fixture에 넣지 않는다. fixture는 가짜 이름으로 만든다.

## Review Focus

1. 입금자명이 비어 있거나 "(이름 없음)"인 행 → 분류 `FEE`·매칭 실패 `PENDING`으로 남고 예외가 나지 않아야 한다. (Task 8 테스트)
2. 회비 금액이 `nonFeeAmount`를 뺀 뒤 0 이하가 되는 입력(사용자가 비회비 금액을 금액보다 크게 입력) → PUT이 400으로 거부해야 한다. (Task 15 테스트)
3. 월 힌트가 "12월1월"처럼 연도 경계를 넘는 경우 → 거래월이 1월이면 전년 12월 + 당해 1월로 배정해야 한다. (Task 5 테스트)
4. 같은 레코드를 두 요청이 동시에 일괄 확정 → 두 번째는 `updateMany` 0건으로 실패 목록에 들어가고 `MembershipPayment`가 중복 생성되지 않아야 한다. (Task 13·14 테스트)
5. 내보내기에서 올해 가입해 의무가 1월이 아닌 회원 → 의무 시작 전 달은 "해당없음", 미래 달은 흰색이어야 한다. (Task 16·17 테스트)

## 파일 구조

| 구분 | 파일 | 책임 |
| --- | --- | --- |
| 스키마 | `prisma/schema/membershipFee.prisma`, `prisma/schema/club.prisma` | 컬럼·enum 추가 |
| 신규 lib | `src/lib/membership-fee/nameNormalizer.ts` | 입금자명 → 이름 토큰 |
| | `src/lib/membership-fee/monthHintParser.ts` | 입금자명·메모 → `{year, month}[]` |
| | `src/lib/membership-fee/matchableMembers.ts` | 거래일 시점 매칭 후보 조건 |
| | `src/lib/membership-fee/transactionClassifier.ts` | 분류·분할 |
| | `src/lib/membership-fee/feeAmountResolver.ts` | 단가·개월 수·연납·부족·초과 (`coupleRateResolver` 흡수) |
| | `src/lib/membership-fee/monthAssigner.ts` | 힌트·제안으로 월 배정 |
| | `src/lib/membership-fee/duplicateDetector.ts` | 같은 거래 중복 판정 |
| | `src/lib/membership-fee/confirmPlanner.ts` | 레코드 한 건의 확정 가능 여부·대상 월 (일괄·단건 공용) |
| | `src/lib/membership-fee/memberYearStatus.ts` | 회원×월 5가지 상태 (대시보드·내보내기 공용) |
| | `src/lib/membership-fee/exportWorkbook.ts` | `exceljs` 워크북 생성 |
| 수정 lib | `excelParser.ts`, `memberMatcher.ts`, `attachLastPaidYearMonth.ts` | 거래구분 보존, 토큰 매칭, 배정 결과 첨부 |
| API | `upload.ts`, `records/bulk-confirm.ts`, `records/[recordId]/confirm.ts`, `records/[recordId]/index.ts`, `matchable-members.ts`, `dashboard.ts`, `export.ts`(신규), `members/[userId]/fee-obligation.ts`, `members/[userId]/index.ts` | |
| 화면 | `PaymentRecordsView.tsx`, `PaymentRecordSheet.tsx`, `paymentRecordDisplay.ts`, `PaymentRecordFilters.tsx`, `processView.ts`, `process.tsx`, `upload.tsx`, `FeeDashboardView.tsx`, `MemberFeeDetailView.tsx`, `members/[userId].tsx`, `statusTone.ts` | |
| 훅·타입·스키마 | `usePaymentRecords.ts`, `usePaymentDashboard.ts`, `membership-fee.types.ts`, `membership-fee.schema.ts` | |

---

### Task 1: origin/main 합치기와 기준선 확인

**Files:**
- Modify: (머지 결과)

- [ ] **Step 1: 원격을 받아 현재 브랜치에 합친다**

```bash
git fetch origin
git merge origin/main --no-edit
```

충돌이 나면 회비 도메인 파일은 현재 브랜치(HEAD) 쪽을, 그 외는 양쪽을 읽고 합친다. 충돌 파일 목록을 커밋 메시지 본문에 적는다.

- [ ] **Step 2: 전체 테스트와 지킴이 테스트를 돌려 기준선을 기록한다**

Run: `npx jest 2>&1 | tail -5`
Expected: `Test Suites: 127 passed` 이상, 실패 0.

Run: `npx jest src/__tests__/guards src/__tests__/styles 2>&1 | tail -3`
Expected: 실패 0.

- [ ] **Step 3: 머지 커밋이 남았으면 그대로 두고, 없으면(이미 최신) 넘어간다**

---

### Task 2: 스키마 — 분류·분할·메모 컬럼과 직책 컬럼

**Files:**
- Modify: `prisma/schema/membershipFee.prisma` (`PaymentRecord` 모델, enum 2개 추가)
- Modify: `prisma/schema/club.prisma` (`ClubMember`에 2컬럼)
- Create: `prisma/migrations/20261010120000_payment_record_kind_and_member_position/migration.sql`
- Modify: `src/types/membership-fee.types.ts`

**Interfaces:**
- Produces: Prisma enum `PaymentRecordKind = FEE | JOINING_FEE | EVENT | OTHER | INTEREST`, `NonFeeKind = JOINING_FEE | EVENT | OTHER | OVERPAY`; `PaymentRecord.kind/kindReason/nonFeeAmount/nonFeeKind/monthHints/needsReview/note`; `ClubMember.position/positionOrder`.
- Produces(TS): `PaymentRecordKind`, `NonFeeKind` 타입, `MonthHint`, `PaymentRecord` 필드 확장.

- [ ] **Step 1: `membershipFee.prisma`에 enum과 컬럼을 더한다**

파일 맨 위 `enum FeePeriod` 아래에 추가:

```prisma
// 거래 분류. FEE만 회비 흐름(매칭·확정·납부 현황)에 들어간다.
enum PaymentRecordKind {
  FEE         // 회비
  JOINING_FEE // 가입비
  EVENT       // 행사 (뒷풀이·단체티 등)
  OTHER       // 기타 (콕·찬조 등)
  INTEREST    // 통장 이자
}

// 한 입금에서 회비가 아닌 부분(nonFeeAmount)의 성격
enum NonFeeKind {
  JOINING_FEE
  EVENT
  OTHER
  OVERPAY // 초과 입금분
}
```

`model PaymentRecord`의 `errorReason String?` 아래에 추가:

```prisma
  kind            PaymentRecordKind   @default(FEE)
  kindReason      String?             // 자동 분류 근거 또는 수동 변경 사유
  nonFeeAmount    Int                 @default(0) // 회비가 아닌 금액. 회비 = amount - nonFeeAmount
  nonFeeKind      NonFeeKind?
  monthHints      Json?               // { source: 'depositorName'|'memo', months: {year,month}[] }
  needsReview     Boolean             @default(false) // 자동 판정이 확신하지 못한 건. 일괄 확정 제외
  note            String?             // 재무의 처리 메모 (카카오뱅크 메모 대체)
```

`@@index([status])` 아래에 `@@index([clubId, kind])` 추가.

- [ ] **Step 2: `club.prisma`의 `ClubMember`에 직책 컬럼을 더한다**

`leftAt DateTime?` 아래에:

```prisma
  /// 직책 (회장·부회장·총무·재무·감사·이사 등 자유 입력). 납부현황 내보내기의 비고.
  position                 String?
  /// 직책 있는 회원끼리의 정렬 순서. 작을수록 위.
  positionOrder            Int?
```

- [ ] **Step 3: 통합 스키마를 만들고 차이를 본다 (읽기 전용)**

Run: `npm run build:schema && npx prisma validate`
Expected: 오류 없음.

Run: `npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script`
Expected: 출력에 `CREATE TYPE "PaymentRecordKind"`, `CREATE TYPE "NonFeeKind"`, `ALTER TABLE "PaymentRecord" ADD COLUMN "kind"…`, `ALTER TABLE "ClubMember" ADD COLUMN "position"…`가 있고, 그 외 기존 드리프트(`PostCategory`·`PostComment` 인덱스·FK 등)도 섞여 나온다. **드리프트는 쓰지 않는다.**

- [ ] **Step 4: 필요한 SQL만 마이그레이션 파일로 쓴다**

```sql
-- PaymentRecord: 거래 분류·분할·힌트·검토·메모 / ClubMember: 직책
CREATE TYPE "PaymentRecordKind" AS ENUM ('FEE', 'JOINING_FEE', 'EVENT', 'OTHER', 'INTEREST');
CREATE TYPE "NonFeeKind" AS ENUM ('JOINING_FEE', 'EVENT', 'OTHER', 'OVERPAY');

ALTER TABLE "PaymentRecord"
  ADD COLUMN "kind" "PaymentRecordKind" NOT NULL DEFAULT 'FEE',
  ADD COLUMN "kindReason" TEXT,
  ADD COLUMN "nonFeeAmount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "nonFeeKind" "NonFeeKind",
  ADD COLUMN "monthHints" JSONB,
  ADD COLUMN "needsReview" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "note" TEXT;

CREATE INDEX "PaymentRecord_clubId_kind_idx" ON "PaymentRecord"("clubId", "kind");

ALTER TABLE "ClubMember"
  ADD COLUMN "position" TEXT,
  ADD COLUMN "positionOrder" INTEGER;

-- 같은 달 두 번째 납부(부족분 충당)를 허용. 중복 확정 방지는 PaymentRecord.status 가드가 맡는다.
DROP INDEX IF EXISTS "MembershipPayment_clubMemberId_year_month_key";
CREATE INDEX "MembershipPayment_clubMemberId_year_month_idx" ON "MembershipPayment"("clubMemberId", "year", "month");
```

`membershipFee.prisma`의 `model MembershipPayment`에서 `@@unique([clubMemberId, year, month])`를 `@@index([clubMemberId, year, month])`로 바꾼다. Step 3의 `migrate diff` 출력에서 실제 unique 인덱스 이름을 확인해 위 `DROP INDEX`의 이름을 맞춘다.

- [ ] **Step 5: 여기서 멈추고 사용자에게 확인받는다**

사용자에게 보여줄 것: 위 SQL 전문, "컬럼 추가와 인덱스 교체뿐이라 기존 275건·납부 431건·회원 155명 데이터는 바뀌지 않는다", "Supabase → Database → Backups에서 백업 상태를 확인해 달라". 승인 전에는 Step 6으로 가지 않는다.

- [ ] **Step 6: 승인 뒤 적용한다**

```bash
npx prisma db execute --file prisma/migrations/20261010120000_payment_record_kind_and_member_position/migration.sql --schema prisma/schema.prisma
npx prisma migrate resolve --applied 20261010120000_payment_record_kind_and_member_position
npx prisma generate
```

Run: `npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script | grep -E 'PaymentRecordKind|positionOrder'`
Expected: 출력 없음 (새 컬럼은 더 이상 차이가 아님).

- [ ] **Step 7: TS 타입을 넓힌다**

`src/types/membership-fee.types.ts`의 `import` 줄을 바꾸고 타입을 더한다:

```ts
import {
  FeePeriod,
  NonFeeKind,
  PaymentRecordKind,
  PaymentRecordStatus,
} from '@prisma/client';

export type { NonFeeKind, PaymentRecordKind };

/** 입금자명·메모에서 읽은 월 힌트 */
export interface MonthHints {
  source: 'depositorName' | 'memo';
  months: { year: number; month: number }[];
}
```

`export interface PaymentRecord` 안 `errorReason: string | null;` 아래에:

```ts
  kind: PaymentRecordKind;
  kindReason: string | null;
  nonFeeAmount: number;
  nonFeeKind: NonFeeKind | null;
  monthHints: MonthHints | null;
  needsReview: boolean;
  note: string | null;
  /** 업로드·조회 시 백엔드가 붙이는 배정 결과. 상세 시트의 기본 선택 */
  suggestedSelections?: { year: number; month: number }[];
```

`PaymentRecordUpdateInput`에:

```ts
  kind?: PaymentRecordKind;
  nonFeeAmount?: number;
  nonFeeKind?: NonFeeKind | null;
  note?: string | null;
```

- [ ] **Step 8: 타입 검사와 커밋**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: 오류 없음. (fixture·테스트에서 `PaymentRecord` 객체를 직접 만드는 곳이 있으면 새 필드 기본값을 넣는다: `kind: 'FEE', kindReason: null, nonFeeAmount: 0, nonFeeKind: null, monthHints: null, needsReview: false, note: null`.)

```bash
git add prisma/schema prisma/schema.prisma prisma/migrations/20261010120000_payment_record_kind_and_member_position src/types/membership-fee.types.ts
git commit -m "feat(membership-fee): 입금 분류·분할·메모 컬럼과 회원 직책 컬럼 추가"
```

---

### Task 3: 파서 — 거래구분 보존

**Files:**
- Modify: `src/lib/membership-fee/excelParser.ts`
- Modify: `src/types/membership-fee.types.ts` (`ParsedPaymentRow`)
- Test: `src/lib/membership-fee/excelParser.test.ts`

**Interfaces:**
- Produces: `ParsedPaymentRow.transactionType: string` (카카오뱅크 '거래구분' 원문: `일반입금` | `예금이자` | `오픈뱅킹` …)

- [ ] **Step 1: 실패하는 테스트를 쓴다**

```ts
import { describe, expect, it } from '@jest/globals';
import * as XLSX from 'xlsx';

import { parseKakaoBankExcel } from './excelParser';

function buildWorkbook(rows: unknown[][]): Buffer {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, '카카오뱅크 거래내역');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

const HEADER = ['거래일시', '구분', '거래금액', '거래 후 잔액', '거래구분', '내용', '메모'];

describe('parseKakaoBankExcel', () => {
  it('거래구분을 보존하고 출금은 뺀다', () => {
    const buf = buildWorkbook([
      ['카카오뱅크 거래내역'],
      ['성명', '홍길동'],
      HEADER,
      ['2026.05.03 10:00:00', '입금', '25,000', '1,000,000', '일반입금', '가나다5월', ''],
      ['2026.05.22 09:00:00', '입금', '377', '1,000,377', '예금이자', '입출금통장 이자', ''],
      ['2026.05.25 09:00:00', '출금', '-25,000', '975,377', '일반이체', '가나다', '환불'],
    ]);
    const rows = parseKakaoBankExcel(buf);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ depositorName: '가나다5월', amount: 25000, transactionType: '일반입금', memo: null });
    expect(rows[1]).toMatchObject({ amount: 377, transactionType: '예금이자' });
    expect(rows[0].transactionDate.getFullYear()).toBe(2026);
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx jest src/lib/membership-fee/excelParser.test.ts`
Expected: FAIL — `transactionType`이 `undefined`.

- [ ] **Step 3: 구현한다**

`ParsedPaymentRow`(types)에 `transactionType: string;` 추가. `excelParser.ts`의 `.map` 반환에:

```ts
      const transactionType = String(obj.거래구분 ?? '').trim();
      return {
        transactionDate: parseKakaoBankDate(dateStr),
        depositorName: depositorName || '(이름 없음)',
        amount,
        memo: memo || null,
        transactionType,
      };
```

- [ ] **Step 4: 통과를 확인하고 커밋**

Run: `npx jest src/lib/membership-fee/excelParser.test.ts`
Expected: PASS.

```bash
git add src/lib/membership-fee/excelParser.ts src/lib/membership-fee/excelParser.test.ts src/types/membership-fee.types.ts
git commit -m "feat(membership-fee): 엑셀 파서가 거래구분을 보존"
```

---

### Task 4: 이름 토큰 정규화

**Files:**
- Create: `src/lib/membership-fee/nameNormalizer.ts`
- Test: `src/lib/membership-fee/nameNormalizer.test.ts`

**Interfaces:**
- Produces: `extractNameToken(depositorName: string): string` — 숫자·월·회비·가입비·연회비·구두점·공백을 뗀 한글만. `isNameLikeToken(token: string): boolean` — 2~4자 한글.

- [ ] **Step 1: 실패하는 테스트**

```ts
import { describe, expect, it } from '@jest/globals';

import { extractNameToken, isNameLikeToken } from './nameNormalizer';

describe('extractNameToken', () => {
  it.each([
    ['가나다3월회비', '가나다'],
    ['26.3월가나다', '가나다'],
    ['가나다-1월', '가나다'],
    ['12월가나다', '가나다'],
    ['가나다(2월회비)', '가나다'],
    ['가나다_회비', '가나다'],
    ['가나다 연회비', '가나다'],
    ['가나다가입비', '가나다'],
    ['가나다마바사5월', '가나다마바사'],
    ['가나다 월회비', '가나다'],
    ['가나다45월회비', '가나다'],
    ['입출금통장 이자', '입출금통장이자'],
    ['', ''],
  ])('%s → %s', (input, expected) => {
    expect(extractNameToken(input)).toBe(expected);
  });
});

describe('isNameLikeToken', () => {
  it('2~4자 한글만 이름으로 본다', () => {
    expect(isNameLikeToken('가나다')).toBe(true);
    expect(isNameLikeToken('가')).toBe(false);
    expect(isNameLikeToken('가나다마바사')).toBe(false);
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `npx jest src/lib/membership-fee/nameNormalizer.test.ts` → FAIL (모듈 없음).

- [ ] **Step 3: 구현**

```ts
/**
 * 입금자명에서 이름만 남긴다.
 * 입금자가 "가나다3월회비", "26.3월가나다"처럼 월·회비를 붙여 쓰는 일이 많아,
 * 이름 비교는 이 토큰으로 한다. 원문은 부분 일치용으로 따로 쓴다.
 */
const NOISE_WORDS = ['월회비', '연회비', '가입비', '등록비', '회비', '월'];

export function extractNameToken(depositorName: string): string {
  let s = depositorName.normalize('NFC');
  // 숫자·구두점·공백·영문 제거 (월 표기 "3월"의 숫자도 같이 사라진다)
  s = s.replace(/[0-9A-Za-z\s.\-_/,()[\]~+·:]/g, '');
  for (const w of NOISE_WORDS) s = s.split(w).join('');
  return s;
}

export function isNameLikeToken(token: string): boolean {
  return /^[가-힣]{2,4}$/.test(token);
}
```

- [ ] **Step 4: 통과 확인, 커밋**

```bash
git add src/lib/membership-fee/nameNormalizer.ts src/lib/membership-fee/nameNormalizer.test.ts
git commit -m "feat(membership-fee): 입금자명에서 이름 토큰을 뽑는 정규화 추가"
```

---

### Task 5: 월 힌트 파서

**Files:**
- Create: `src/lib/membership-fee/monthHintParser.ts`
- Test: `src/lib/membership-fee/monthHintParser.test.ts`

**Interfaces:**
- Produces: `parseMonthHints(text: string, transactionDate: Date): { year: number; month: number }[]` (중복 제거, 시간순). `pickMonthHints(depositorName: string, memo: string | null, transactionDate: Date): MonthHints | null` — 메모 우선, 없으면 입금자명, 둘 다 없으면 null.

- [ ] **Step 1: 실패하는 테스트**

```ts
import { describe, expect, it } from '@jest/globals';

import { parseMonthHints, pickMonthHints } from './monthHintParser';

const tx = (m: number, d = 10) => new Date(2026, m - 1, d);

describe('parseMonthHints', () => {
  it.each<[string, Date, { year: number; month: number }[]]>([
    ['가나다3월', tx(3), [{ year: 2026, month: 3 }]],
    ['가나다 1,2월', tx(2), [{ year: 2026, month: 1 }, { year: 2026, month: 2 }]],
    ['가나다1/2월', tx(2), [{ year: 2026, month: 1 }, { year: 2026, month: 2 }]],
    ['가나다1월2월', tx(2), [{ year: 2026, month: 1 }, { year: 2026, month: 2 }]],
    ['6~9월', tx(6), [6, 7, 8, 9].map((month) => ({ year: 2026, month }))],
    ['6-9월', tx(6), [6, 7, 8, 9].map((month) => ({ year: 2026, month }))],
    ['3,4,5월회비', tx(5), [3, 4, 5].map((month) => ({ year: 2026, month }))],
    ['가나다45월회비', tx(4), [{ year: 2026, month: 4 }, { year: 2026, month: 5 }]],
    ['26.3월가나다', tx(2, 27), [{ year: 2026, month: 3 }]],
    // 연도 경계: 1월 거래에 "12월1월"은 전년 12월 + 당해 1월
    ['가나다 12월1월', tx(1, 14), [{ year: 2025, month: 12 }, { year: 2026, month: 1 }]],
    // 거래월보다 3개월 이상 뒤의 달은 전년으로 본다 (2월 거래의 "12월회비")
    ['12월회비', tx(2), [{ year: 2025, month: 12 }]],
    // 선납: 거래월 이후 2개월까지는 당해
    ['가나다 5월', tx(4, 29), [{ year: 2026, month: 5 }]],
    ['가나다', tx(3), []],
    ['가나다03', tx(4), []],
  ])('%s', (text, date, expected) => {
    expect(parseMonthHints(text, date)).toEqual(expected);
  });

  it('0월·13월은 버린다', () => {
    expect(parseMonthHints('13월', tx(1))).toEqual([]);
  });
});

describe('pickMonthHints', () => {
  it('메모가 있으면 메모를 우선한다', () => {
    expect(pickMonthHints('12월가나다', '1월', tx(1))).toEqual({
      source: 'memo',
      months: [{ year: 2026, month: 1 }],
    });
  });
  it('메모에 월이 없으면 입금자명에서 읽는다', () => {
    expect(pickMonthHints('가나다3월', '최종', tx(3))).toEqual({
      source: 'depositorName',
      months: [{ year: 2026, month: 3 }],
    });
  });
  it('둘 다 없으면 null', () => {
    expect(pickMonthHints('가나다', null, tx(3))).toBeNull();
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `npx jest src/lib/membership-fee/monthHintParser.test.ts` → FAIL.

- [ ] **Step 3: 구현**

```ts
import type { MonthHints } from '@/types/membership-fee.types';

type YM = { year: number; month: number };

/**
 * "3월", "1,2월", "1/2월", "1월2월", "6~9월", "6-9월", "45월"(4·5월), "26.3월" 같은
 * 월 표기를 읽는다. 연도는 거래일 기준: 거래월보다 3개월 이상 뒤면 전년,
 * 그 외는 당해. 12월→1월처럼 이어지는 표기는 연속으로 본다.
 */
export function parseMonthHints(text: string, transactionDate: Date): YM[] {
  const s = text.normalize('NFC').replace(/\s+/g, '');
  // "26.3월"의 "26." 연도 접두는 뗀다
  const body = s.replace(/(^|[^0-9])\d{2}\.(?=\d{1,2}월)/g, '$1');
  const months: number[] = [];

  // 범위 "6~9월", "6-9월"
  const range = /(\d{1,2})[~\-](\d{1,2})월/g;
  let m: RegExpExecArray | null;
  const consumed: string[] = [];
  while ((m = range.exec(body)) !== null) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a >= 1 && b <= 12 && a <= b) for (let i = a; i <= b; i++) months.push(i);
    consumed.push(m[0]);
  }
  let rest = body;
  for (const c of consumed) rest = rest.replace(c, '');

  // "1,2월", "1/2월", "3,4,5월", "1월2월", "3월", "45월"
  const seq = /((?:\d{1,2}[,/]?)+)월/g;
  while ((m = seq.exec(rest)) !== null) {
    const digits = m[1];
    const parts = digits.includes(',') || digits.includes('/')
      ? digits.split(/[,/]/)
      : digits.length === 2 && Number(digits) > 12
        ? digits.split('') // "45월" → 4, 5
        : [digits];
    for (const p of parts) {
      const n = Number(p);
      if (n >= 1 && n <= 12) months.push(n);
    }
  }

  const txYear = transactionDate.getFullYear();
  const txMonth = transactionDate.getMonth() + 1;
  const result: YM[] = [];
  for (const month of months) {
    const year = month - txMonth >= 3 ? txYear - 1 : txYear;
    if (!result.some((r) => r.year === year && r.month === month)) {
      result.push({ year, month });
    }
  }
  return result.sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month));
}

export function pickMonthHints(
  depositorName: string,
  memo: string | null,
  transactionDate: Date
): MonthHints | null {
  if (memo) {
    const fromMemo = parseMonthHints(memo, transactionDate);
    if (fromMemo.length > 0) return { source: 'memo', months: fromMemo };
  }
  const fromName = parseMonthHints(depositorName, transactionDate);
  if (fromName.length > 0) return { source: 'depositorName', months: fromName };
  return null;
}
```

- [ ] **Step 4: 통과 확인** — 케이스가 하나라도 실패하면 정규식을 고친다. 모두 PASS일 때 커밋.

```bash
git add src/lib/membership-fee/monthHintParser.ts src/lib/membership-fee/monthHintParser.test.ts
git commit -m "feat(membership-fee): 입금자명·메모의 월 힌트 파서 추가"
```

---

### Task 6: 거래일 시점 매칭 후보 조건을 lib로

**Files:**
- Create: `src/lib/membership-fee/matchableMembers.ts`
- Test: `src/lib/membership-fee/matchableMembers.test.ts`
- Modify: `src/pages/api/clubs/[id]/membership-fee/matchable-members.ts:83-100`

**Interfaces:**
- Produces: `isMatchableAt(member: { status: string; leftAt: Date | null; feeObligationStartAt: Date | null }, at: Date): boolean`; `matchableMembersWhere(clubId: number, from: Date, to: Date): Prisma.ClubMemberWhereInput`.

- [ ] **Step 1: 실패하는 테스트**

```ts
import { describe, expect, it } from '@jest/globals';

import { isMatchableAt, matchableMembersWhere } from './matchableMembers';

const d = (s: string) => new Date(s);

describe('isMatchableAt', () => {
  it('활동 중이고 의무 시작 이후면 후보', () => {
    expect(isMatchableAt({ status: 'APPROVED', leftAt: null, feeObligationStartAt: d('2026-03-01') }, d('2026-03-15'))).toBe(true);
  });
  it('의무 시작 전이면 후보 아님', () => {
    expect(isMatchableAt({ status: 'APPROVED', leftAt: null, feeObligationStartAt: d('2026-05-01') }, d('2026-03-15'))).toBe(false);
  });
  it('탈퇴 회원은 탈퇴일까지만 후보', () => {
    const m = { status: 'LEFT', leftAt: d('2026-04-30'), feeObligationStartAt: null };
    expect(isMatchableAt(m, d('2026-04-10'))).toBe(true);
    expect(isMatchableAt(m, d('2026-05-10'))).toBe(false);
  });
  it('거절·가입대기는 후보 아님', () => {
    expect(isMatchableAt({ status: 'REJECTED', leftAt: null, feeObligationStartAt: null }, d('2026-03-15'))).toBe(false);
    expect(isMatchableAt({ status: 'PENDING', leftAt: null, feeObligationStartAt: null }, d('2026-03-15'))).toBe(false);
  });
});

describe('matchableMembersWhere', () => {
  it('API가 쓰던 조건과 같다', () => {
    expect(matchableMembersWhere(1, d('2026-01-01'), d('2026-01-31'))).toEqual({
      clubId: 1,
      status: { in: ['APPROVED', 'LEFT'] },
      OR: [{ leftAt: null }, { leftAt: { gte: d('2026-01-01') } }],
      AND: [{ OR: [{ feeObligationStartAt: null }, { feeObligationStartAt: { lte: d('2026-01-31') } }] }],
    });
  });
});
```

- [ ] **Step 2: 실패 확인** → FAIL (모듈 없음).

- [ ] **Step 3: 구현**

```ts
import type { Prisma } from '@prisma/client';

/** 거래일에 매칭 후보가 되는 회원인지. 업로드 매칭과 회원 드롭다운이 같은 규칙을 쓴다. */
export function isMatchableAt(
  member: { status: string; leftAt: Date | null; feeObligationStartAt: Date | null },
  at: Date
): boolean {
  if (member.status !== 'APPROVED' && member.status !== 'LEFT') return false;
  if (member.leftAt && member.leftAt.getTime() < at.getTime()) return false;
  if (member.feeObligationStartAt && member.feeObligationStartAt.getTime() > at.getTime()) return false;
  return true;
}

/** 거래일 범위 [from, to]에 한 번이라도 후보였던 회원의 Prisma 조건 */
export function matchableMembersWhere(
  clubId: number,
  from: Date,
  to: Date
): Prisma.ClubMemberWhereInput {
  return {
    clubId,
    status: { in: ['APPROVED', 'LEFT'] },
    OR: [{ leftAt: null }, { leftAt: { gte: from } }],
    AND: [{ OR: [{ feeObligationStartAt: null }, { feeObligationStartAt: { lte: to } }] }],
  };
}
```

- [ ] **Step 4: API가 이 함수를 쓰게 바꾼다**

`matchable-members.ts`의 `where` 구성(83~100행)을:

```ts
    const where: Prisma.ClubMemberWhereInput = hasValidRange
      ? matchableMembersWhere(clubId, fromDate!, toDate!)
      : { clubId, status: { in: ['APPROVED', 'LEFT'] } };
```

import 추가: `import { matchableMembersWhere } from '@/lib/membership-fee/matchableMembers';`

- [ ] **Step 5: 테스트·타입 검사·커밋**

Run: `npx jest src/lib/membership-fee/matchableMembers.test.ts && npx tsc --noEmit`
Expected: PASS, 타입 오류 없음.

```bash
git add src/lib/membership-fee/matchableMembers.ts src/lib/membership-fee/matchableMembers.test.ts "src/pages/api/clubs/[id]/membership-fee/matchable-members.ts"
git commit -m "refactor(membership-fee): 거래일 시점 매칭 후보 조건을 lib로 분리"
```

---

### Task 7: 매칭 — 토큰 기반, 후보 제한, 유사도 가드

**Files:**
- Modify: `src/lib/membership-fee/memberMatcher.ts`
- Test: `src/lib/membership-fee/memberMatcher.test.ts` (기존 유지 + 추가)

**Interfaces:**
- Consumes: `extractNameToken`, `isNameLikeToken` (Task 4).
- Produces: `matchDepositor(depositorName, members, coupleGroups?, transactionDate?)` 시그니처는 그대로. 동작 변경: (1) 원문과 토큰 둘로 7단계를 돌려 confidence 높은 쪽 채택, (2) 7단계 유사도는 토큰이 2~3자일 때만, (3) `members`는 호출자가 이미 거래일 후보로 걸러 준다(upload.ts, Task 12).

- [ ] **Step 1: 실패하는 테스트를 기존 파일 끝에 추가**

```ts
describe('matchDepositor — 토큰 매칭', () => {
  const members = [
    { id: 1, name: '가나다' },
    { id: 2, name: '마바사' },
    { id: 3, name: '아자차' },
  ];

  it('월·회비가 붙은 이름을 토큰으로 정확 매칭한다', () => {
    expect(matchDepositor('가나다3월회비', members).memberId).toBe(1);
    expect(matchDepositor('26.3월가나다', members).matchType).toBe('exact');
  });

  it('오타 1자는 토큰 기준 유사도로 매칭한다 (원문 전체로는 거리 1이 아님)', () => {
    const r = matchDepositor('가나라3월회비', members);
    expect(r.memberId).toBe(1);
    expect(r.matchType).toBe('similar');
  });

  it('토큰이 5자 이상이면 유사도 매칭을 하지 않는다', () => {
    expect(matchDepositor('입출금통장 이자', members).matchType).toBe('none');
  });

  it('토큰이 비어 있으면 매칭하지 않는다', () => {
    expect(matchDepositor('12345', members).matchType).toBe('none');
    expect(matchDepositor('', members).matchType).toBe('none');
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `npx jest src/lib/membership-fee/memberMatcher.test.ts` → 새 케이스 FAIL.

- [ ] **Step 3: 구현**

`memberMatcher.ts`에 import 추가: `import { extractNameToken, isNameLikeToken } from './nameNormalizer';`

기존 `matchDepositor` 본문을 `matchOnce(normalizedDepositor, members, coupleGroups, transactionDate, allowSimilar)`로 이름을 바꾸고(내용은 그대로, 7단계 블록만 `if (allowSimilar)`로 감싼다), 새 `matchDepositor`를 둔다:

```ts
export function matchDepositor(
  depositorName: string,
  members: Member[],
  coupleGroups: CoupleGroup[] = [],
  transactionDate: Date | null = null
): MatchResult {
  const NONE: MatchResult = { memberId: null, memberName: null, matchType: 'none', confidence: 0 };
  const raw = depositorName.trim();
  if (!raw) return NONE;

  const token = extractNameToken(raw);
  // 원문 매칭: 유사도는 끈다 (원문엔 월·회비가 붙어 거리 1이 거의 안 나오고, 나오면 오매칭)
  const byRaw = matchOnce(raw, members, coupleGroups, transactionDate, false);
  // 토큰 매칭: 2~3자 토큰에만 유사도를 켠다
  const byToken =
    token && token !== raw
      ? matchOnce(token, members, coupleGroups, transactionDate, token.length <= 3)
      : token === raw
        ? matchOnce(raw, members, coupleGroups, transactionDate, raw.length <= 3 && isNameLikeToken(raw))
        : NONE;

  return byToken.confidence > byRaw.confidence ? byToken : byRaw;
}
```

`matchOnce`의 7단계(유사도) 앞에 `if (allowSimilar) { … }`를 두고, 그 안의 거리 비교 대상을 `normalizedDepositor`로 유지한다.

- [ ] **Step 4: 기존 테스트와 새 테스트가 모두 통과하는지 확인**

Run: `npx jest src/lib/membership-fee/memberMatcher.test.ts`
Expected: PASS. 기존 케이스가 깨지면 원문 매칭 경로(`byRaw`)가 그대로인지 확인한다.

- [ ] **Step 5: 커밋**

```bash
git add src/lib/membership-fee/memberMatcher.ts src/lib/membership-fee/memberMatcher.test.ts
git commit -m "feat(membership-fee): 입금자명 토큰으로 매칭하고 유사도는 짧은 토큰에만 허용"
```

---

### Task 8: 거래 분류기

**Files:**
- Create: `src/lib/membership-fee/transactionClassifier.ts`
- Test: `src/lib/membership-fee/transactionClassifier.test.ts`

**Interfaces:**
- Consumes: `pickMonthHints` (Task 5).
- Produces:

```ts
export interface FeeRateSettings {
  regularMonthly: number;
  coupleMonthly: number;
  regularAnnual: number | null;
  coupleAnnual: number | null;
  joiningFeeAmounts: number[];
}
export interface Classification {
  kind: PaymentRecordKind;
  kindReason: string;
  nonFeeAmount: number;
  nonFeeKind: NonFeeKind | null;
  needsReview: boolean;
}
export function classifyTransaction(
  row: { depositorName: string; memo: string | null; amount: number; transactionType: string; transactionDate: Date },
  rates: FeeRateSettings
): Classification;
export function feeAmountOf(row: { amount: number; nonFeeAmount: number }): number; // amount - nonFeeAmount
```

- [ ] **Step 1: 실패하는 테스트**

```ts
import { describe, expect, it } from '@jest/globals';

import { classifyTransaction, feeAmountOf } from './transactionClassifier';

const rates = {
  regularMonthly: 25000,
  coupleMonthly: 45000,
  regularAnnual: 275000,
  coupleAnnual: 495000,
  joiningFeeAmounts: [100000],
};
const row = (over: Partial<Parameters<typeof classifyTransaction>[0]>) => ({
  depositorName: '가나다',
  memo: null,
  amount: 25000,
  transactionType: '일반입금',
  transactionDate: new Date(2026, 5, 10),
  ...over,
});

describe('classifyTransaction', () => {
  it('예금이자 → INTEREST', () => {
    expect(classifyTransaction(row({ transactionType: '예금이자', amount: 377, depositorName: '입출금통장 이자' }), rates)).toMatchObject({ kind: 'INTEREST', needsReview: false });
  });
  it.each(['가나다 뒷풀이', '뒤풀이 가나다', '가나다 회식비', '가나다월례회', '가나다단체티', '단체복가나다', '임차오티', '가나다 대회저녁'])('행사 키워드 %s → EVENT', (name) => {
    expect(classifyTransaction(row({ depositorName: name, amount: 15000 }), rates).kind).toBe('EVENT');
  });
  it.each(['가나다 콕1', '가나다(찬조금)', '가나다등록비'])('기타 키워드 %s → OTHER', (name) => {
    expect(classifyTransaction(row({ depositorName: name, amount: 26000 }), rates).kind).toBe('OTHER');
  });
  it('가입비 금액이고 월 힌트가 없으면 JOINING_FEE', () => {
    expect(classifyTransaction(row({ amount: 100000 }), rates)).toMatchObject({ kind: 'JOINING_FEE', nonFeeAmount: 0 });
  });
  it('가입비 금액이라도 월 힌트가 있으면 FEE (4개월)', () => {
    expect(classifyTransaction(row({ amount: 100000, depositorName: '가나다 6~9월' }), rates)).toMatchObject({ kind: 'FEE', nonFeeAmount: 0, needsReview: false });
  });
  it('가입비+회비 합산은 FEE에 nonFeeAmount로 가입비를 뗀다', () => {
    expect(classifyTransaction(row({ amount: 125000 }), rates)).toMatchObject({ kind: 'FEE', nonFeeAmount: 100000, nonFeeKind: 'JOINING_FEE', needsReview: false });
  });
  it('단가 배수(월·연납·부부) → FEE', () => {
    for (const amount of [25000, 50000, 45000, 275000, 495000, 825000]) {
      expect(classifyTransaction(row({ amount }), rates)).toMatchObject({ kind: 'FEE', needsReview: false });
    }
  });
  it('1개월 단가 미만 → FEE + 검토 필요', () => {
    expect(classifyTransaction(row({ amount: 10000 }), rates)).toMatchObject({ kind: 'FEE', needsReview: true });
  });
  it('배수가 아닌 금액 → FEE + 검토 필요', () => {
    expect(classifyTransaction(row({ amount: 49500 }), rates)).toMatchObject({ kind: 'FEE', needsReview: true });
  });
  it('입금자명이 비어도 예외 없이 FEE', () => {
    expect(classifyTransaction(row({ depositorName: '(이름 없음)' }), rates).kind).toBe('FEE');
  });
});

describe('feeAmountOf', () => {
  it('amount - nonFeeAmount', () => {
    expect(feeAmountOf({ amount: 125000, nonFeeAmount: 100000 })).toBe(25000);
  });
});
```

- [ ] **Step 2: 실패 확인** → FAIL (모듈 없음).

- [ ] **Step 3: 구현**

```ts
import type { NonFeeKind, PaymentRecordKind } from '@prisma/client';

import { pickMonthHints } from './monthHintParser';

export interface FeeRateSettings {
  regularMonthly: number;
  coupleMonthly: number;
  regularAnnual: number | null;
  coupleAnnual: number | null;
  joiningFeeAmounts: number[];
}

export interface Classification {
  kind: PaymentRecordKind;
  kindReason: string;
  nonFeeAmount: number;
  nonFeeKind: NonFeeKind | null;
  needsReview: boolean;
}

interface Row {
  depositorName: string;
  memo: string | null;
  amount: number;
  transactionType: string;
  transactionDate: Date;
}

// 2026년 통장 파일에서 뽑은 초기값. 운영하며 늘린다.
export const EVENT_KEYWORDS = ['뒷풀이', '뒤풀이', '뒷풀', '회식', '월례회', '단체티', '단체복', '대회', '참가비'];
export const OTHER_KEYWORDS = ['콕', '찬조', '등록비'];
// "임차오티"처럼 이름 뒤에 '티'만 붙은 경우
const TRAILING_TEE = /[가-힣]{2,4}티$/;

export function feeAmountOf(row: { amount: number; nonFeeAmount: number }): number {
  return row.amount - row.nonFeeAmount;
}

function isMultipleOfAnyRate(amount: number, rates: FeeRateSettings): boolean {
  const units = [rates.regularMonthly, rates.coupleMonthly].filter((u) => u > 0);
  if (units.some((u) => amount % u === 0)) return true;
  // 연납: 1~3인분
  for (const annual of [rates.regularAnnual, rates.coupleAnnual]) {
    if (annual && annual > 0) for (let n = 1; n <= 3; n++) if (amount === annual * n) return true;
  }
  return false;
}

export function classifyTransaction(row: Row, rates: FeeRateSettings): Classification {
  const name = row.depositorName.normalize('NFC').replace(/\s+/g, '');
  const base = { nonFeeAmount: 0, nonFeeKind: null as NonFeeKind | null, needsReview: false };

  if (row.transactionType === '예금이자') {
    return { ...base, kind: 'INTEREST', kindReason: "거래구분 '예금이자'" };
  }
  const eventWord = EVENT_KEYWORDS.find((w) => name.includes(w));
  if (eventWord || TRAILING_TEE.test(name)) {
    return { ...base, kind: 'EVENT', kindReason: `입금자명 '${eventWord ?? '티'}'` };
  }
  const otherWord = OTHER_KEYWORDS.find((w) => name.includes(w));
  if (otherWord) {
    return { ...base, kind: 'OTHER', kindReason: `입금자명 '${otherWord}'` };
  }

  const hints = pickMonthHints(row.depositorName, row.memo, row.transactionDate);
  if (rates.joiningFeeAmounts.includes(row.amount) && !hints) {
    return { ...base, kind: 'JOINING_FEE', kindReason: `금액 ${row.amount.toLocaleString()}원 = 가입비` };
  }
  for (const joining of rates.joiningFeeAmounts) {
    const rest = row.amount - joining;
    if (rest > 0 && isMultipleOfAnyRate(rest, rates)) {
      return {
        kind: 'FEE',
        kindReason: `가입비 ${joining.toLocaleString()}원 + 회비 ${rest.toLocaleString()}원`,
        nonFeeAmount: joining,
        nonFeeKind: 'JOINING_FEE',
        needsReview: false,
      };
    }
  }
  if (isMultipleOfAnyRate(row.amount, rates)) {
    return { ...base, kind: 'FEE', kindReason: '회비 단가 배수' };
  }
  if (row.amount < rates.regularMonthly) {
    return { ...base, kind: 'FEE', kindReason: '1개월 단가 미만', needsReview: true };
  }
  return { ...base, kind: 'FEE', kindReason: '금액이 단가 배수가 아님', needsReview: true };
}
```

- [ ] **Step 4: 통과 확인, 커밋**

```bash
git add src/lib/membership-fee/transactionClassifier.ts src/lib/membership-fee/transactionClassifier.test.ts
git commit -m "feat(membership-fee): 입금을 회비·가입비·행사·기타·이자로 분류하는 분류기 추가"
```

---

### Task 9: 단가·개월 수 한 모듈 (`feeAmountResolver`)

**Files:**
- Create: `src/lib/membership-fee/feeAmountResolver.ts`
- Test: `src/lib/membership-fee/feeAmountResolver.test.ts`
- (삭제는 Task 14에서) `src/lib/membership-fee/coupleRateResolver.ts`, `coupleRateResolver.test.ts`

**Interfaces:**
- Consumes: `wasCoupleAt` (`coupleHistory.ts`), `isMonthObligated` (`feeObligation.ts`), `FeeRateSettings` (Task 8).
- Produces:

```ts
export interface ResolveInput {
  memberIds: number[];
  txDate: Date;
  feeAmount: number; // amount - nonFeeAmount
  coupleHistories: CoupleHistoryRow[];
  coupleGroups: { members: { clubMemberId: number }[] }[];
  memberStartAtMap: Map<number, Date | null>;
  memberLeftAtMap: Map<number, Date | null>;
  leaveMap: Map<number, LeavePeriod[]>;
  rates: FeeRateSettings;
}
export interface ResolveResult {
  perMemberPerMonth: number[];      // memberIds와 같은 길이
  firstMonthExtraPerMember: number[]; // 연납 나머지. 첫 달에 더한다
  totalPerMonth: number;
  monthCount: number;               // 부족이면 1, 초과면 floor
  period: 'MONTHLY' | 'ANNUAL';
  isCoupleRate: boolean;
  shortfall: boolean;
  overpay: number;                  // 배수가 아닐 때 남는 금액
}
export function resolveFeeAmount(input: ResolveInput): ResolveResult;
```

- [ ] **Step 1: 실패하는 테스트**

```ts
import { describe, expect, it } from '@jest/globals';

import { resolveFeeAmount } from './feeAmountResolver';

const rates = { regularMonthly: 25000, coupleMonthly: 45000, regularAnnual: 275000, coupleAnnual: 495000, joiningFeeAmounts: [100000] };
const tx = new Date(2026, 4, 15);
const start = new Date(2025, 0, 1);
const base = (memberIds: number[], feeAmount: number) => ({
  memberIds,
  txDate: tx,
  feeAmount,
  coupleHistories: [{ clubMemberId: 1, partnerClubMemberId: 2, startedAt: start, endedAt: null }, { clubMemberId: 2, partnerClubMemberId: 1, startedAt: start, endedAt: null }],
  coupleGroups: [{ members: [{ clubMemberId: 1 }, { clubMemberId: 2 }] }],
  memberStartAtMap: new Map([[1, start], [2, start], [3, start]]),
  memberLeftAtMap: new Map<number, Date | null>([[1, null], [2, null], [3, null]]),
  leaveMap: new Map(),
  rates,
});

describe('resolveFeeAmount', () => {
  it('일반 1명 25,000 → 1개월', () => {
    expect(resolveFeeAmount(base([3], 25000))).toMatchObject({ perMemberPerMonth: [25000], totalPerMonth: 25000, monthCount: 1, period: 'MONTHLY', shortfall: false, overpay: 0 });
  });
  it('일반 1명 75,000 → 3개월', () => {
    expect(resolveFeeAmount(base([3], 75000)).monthCount).toBe(3);
  });
  it('부부 2명 모두 매칭 45,000 → 세대 단가, 1인당 22,500', () => {
    expect(resolveFeeAmount(base([1, 2], 45000))).toMatchObject({ perMemberPerMonth: [22500, 22500], totalPerMonth: 45000, monthCount: 1, isCoupleRate: true });
  });
  it('부부 중 한 명 단독 25,000 → 개인 단가 (부족 아님)', () => {
    expect(resolveFeeAmount(base([1], 25000))).toMatchObject({ perMemberPerMonth: [25000], monthCount: 1, isCoupleRate: false, shortfall: false });
  });
  it('배우자가 거래일에 휴회면 두 명 매칭이라도 운영자 명시 매칭(D안)으로 세대 단가', () => {
    const input = base([1, 2], 45000);
    input.leaveMap = new Map([[2, [{ startYear: 2026, startMonth: 4, endYear: 2026, endMonth: 5 }]]]);
    expect(resolveFeeAmount(input).isCoupleRate).toBe(true);
  });
  it('연납 275,000 → 12개월 ANNUAL, 월 22,916 + 첫 달 8', () => {
    expect(resolveFeeAmount(base([3], 275000))).toMatchObject({ monthCount: 12, period: 'ANNUAL', perMemberPerMonth: [22916], firstMonthExtraPerMember: [8] });
  });
  it('부부 연납 495,000 → 12개월, 1인당 20,625', () => {
    expect(resolveFeeAmount(base([1, 2], 495000))).toMatchObject({ monthCount: 12, period: 'ANNUAL', perMemberPerMonth: [20625, 20625], firstMonthExtraPerMember: [0, 0] });
  });
  it('부족 20,000 → shortfall, 1개월', () => {
    expect(resolveFeeAmount(base([3], 20000))).toMatchObject({ shortfall: true, monthCount: 1, overpay: 0 });
  });
  it('초과 30,000 → 1개월 + overpay 5,000', () => {
    expect(resolveFeeAmount(base([3], 30000))).toMatchObject({ shortfall: false, monthCount: 1, overpay: 5000 });
  });
  it('일반 3명 825,000 → 각 연납 12개월', () => {
    const input = base([3, 4, 5], 825000);
    input.memberStartAtMap.set(4, start).set(5, start);
    input.memberLeftAtMap.set(4, null).set(5, null);
    expect(resolveFeeAmount(input)).toMatchObject({ monthCount: 12, period: 'ANNUAL', perMemberPerMonth: [22916, 22916, 22916] });
  });
});
```

- [ ] **Step 2: 실패 확인** → FAIL.

- [ ] **Step 3: 구현**

```ts
import { type CoupleHistoryRow, wasCoupleAt } from './coupleHistory';
import { isMonthObligated, type LeavePeriod } from './feeObligation';
import type { FeeRateSettings } from './transactionClassifier';

/**
 * 단가·개월 수 판정. 업로드·단건 확정·일괄 확정이 이 함수만 쓴다.
 *
 * 세대(부부) 단가는 두 경우에만:
 *  1) 거래일에 부부(이력 → 그룹)이고 두 사람이 모두 매칭됐고 모두 거래일 의무
 *  2) 운영자가 정확히 두 명을 매칭했고 그 둘이 부부 이력·그룹에 한 쌍으로 등록됨 (D안)
 * 그 외(부부 중 한 명 단독 등)는 모두 개인 단가. 부부 그룹 소속만으로 세대 단가를 주던
 * 폴백은 "부부 한 명 단독 25,000원이 매달 부족으로 잡히는" 문제라 없앴다.
 */
export interface ResolveInput {
  memberIds: number[];
  txDate: Date;
  feeAmount: number;
  coupleHistories: CoupleHistoryRow[];
  coupleGroups: { members: { clubMemberId: number }[] }[];
  memberStartAtMap: Map<number, Date | null>;
  memberLeftAtMap: Map<number, Date | null>;
  leaveMap: Map<number, LeavePeriod[]>;
  rates: FeeRateSettings;
}

export interface ResolveResult {
  perMemberPerMonth: number[];
  firstMonthExtraPerMember: number[];
  totalPerMonth: number;
  monthCount: number;
  period: 'MONTHLY' | 'ANNUAL';
  isCoupleRate: boolean;
  shortfall: boolean;
  overpay: number;
}

function isKnownCouplePair(a: number, b: number, input: ResolveInput): boolean {
  if (input.coupleHistories.some((h) => (h.clubMemberId === a && h.partnerClubMemberId === b) || (h.clubMemberId === b && h.partnerClubMemberId === a))) return true;
  return input.coupleGroups.some((g) => g.members.length === 2 && g.members.every((m) => m.clubMemberId === a || m.clubMemberId === b));
}

function splitEvenly(total: number, n: number): number[] {
  const base = Math.floor(total / n);
  const remainder = total - base * n;
  return Array.from({ length: n }, (_, i) => (i < remainder ? base + 1 : base));
}

export function resolveFeeAmount(input: ResolveInput): ResolveResult {
  const { memberIds, txDate, feeAmount, rates } = input;
  const year = txDate.getFullYear();
  const month = txDate.getMonth() + 1;
  const obligated = (id: number) =>
    isMonthObligated(year, month, input.memberStartAtMap.get(id) ?? null, input.leaveMap.get(id) ?? [], input.memberLeftAtMap.get(id) ?? null);

  let isCoupleRate = false;
  if (memberIds.length === 2) {
    const [a, b] = memberIds;
    const at = wasCoupleAt(a, txDate, input.coupleHistories);
    const coupleByHistory = at.isCouple && at.partnerId === b;
    const coupleByGroup = input.coupleGroups.some((g) => g.members.length === 2 && g.members.every((m) => m.clubMemberId === a || m.clubMemberId === b));
    const fullMatch = (coupleByHistory || coupleByGroup) && obligated(a) && obligated(b);
    const operatorAsserted = isKnownCouplePair(a, b, input);
    isCoupleRate = fullMatch || operatorAsserted;
  }

  const n = memberIds.length;
  const monthly = isCoupleRate ? rates.coupleMonthly : rates.regularMonthly * n;
  const annual = isCoupleRate ? rates.coupleAnnual : rates.regularAnnual == null ? null : rates.regularAnnual * n;

  if (annual != null && annual > 0 && feeAmount === annual) {
    const perMemberAnnual = splitEvenly(annual, n);
    return {
      perMemberPerMonth: perMemberAnnual.map((a) => Math.floor(a / 12)),
      firstMonthExtraPerMember: perMemberAnnual.map((a) => a - Math.floor(a / 12) * 12),
      totalPerMonth: Math.floor(annual / 12),
      monthCount: 12,
      period: 'ANNUAL',
      isCoupleRate,
      shortfall: false,
      overpay: 0,
    };
  }

  const perMemberPerMonth = isCoupleRate ? splitEvenly(rates.coupleMonthly, n) : memberIds.map(() => rates.regularMonthly);
  const shortfall = feeAmount > 0 && feeAmount < monthly;
  const monthCount = shortfall ? 1 : Math.floor(feeAmount / monthly);
  const overpay = shortfall ? 0 : feeAmount - monthCount * monthly;
  return {
    perMemberPerMonth,
    firstMonthExtraPerMember: memberIds.map(() => 0),
    totalPerMonth: monthly,
    monthCount,
    period: 'MONTHLY',
    isCoupleRate,
    shortfall,
    overpay,
  };
}
```

- [ ] **Step 4: 통과 확인, 커밋**

```bash
git add src/lib/membership-fee/feeAmountResolver.ts src/lib/membership-fee/feeAmountResolver.test.ts
git commit -m "feat(membership-fee): 단가·개월 수 판정을 한 모듈로 (연납·부부 단독·초과 포함)"
```

---

### Task 10: 월 배정기

**Files:**
- Create: `src/lib/membership-fee/monthAssigner.ts`
- Test: `src/lib/membership-fee/monthAssigner.test.ts`

**Interfaces:**
- Produces:

```ts
export interface AssignInput {
  monthCount: number;
  hints: MonthHints | null;
  txDate: Date;
  /** 거래 연도와 다음 연도의 의무 월 (휴회·탈퇴 제외, 매칭 인원 모두 의무인 달만) */
  obligationMonthsByYear: Map<number, number[]>;
  /** 이미 납부된 연·월 (매칭 인원 중 한 명이라도) */
  paid: { year: number; month: number }[];
}
export interface AssignResult {
  selections: { year: number; month: number }[];
  usedHints: boolean;
  needsReview: boolean;
  reason: string | null;
}
export function assignMonths(input: AssignInput): AssignResult;
```

- [ ] **Step 1: 실패하는 테스트**

```ts
import { describe, expect, it } from '@jest/globals';

import { assignMonths } from './monthAssigner';

const all = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const base = (over: Partial<Parameters<typeof assignMonths>[0]>) => ({
  monthCount: 1,
  hints: null,
  txDate: new Date(2026, 4, 10), // 5월
  obligationMonthsByYear: new Map([[2026, all], [2027, all]]),
  paid: [],
  ...over,
});

describe('assignMonths', () => {
  it('힌트가 개월 수와 맞고 의무·미납이면 힌트를 쓴다', () => {
    const r = assignMonths(base({ monthCount: 2, hints: { source: 'depositorName', months: [{ year: 2026, month: 6 }, { year: 2026, month: 7 }] } }));
    expect(r).toMatchObject({ selections: [{ year: 2026, month: 6 }, { year: 2026, month: 7 }], usedHints: true, needsReview: false });
  });
  it('힌트 개수가 다르면 제안을 쓰고 검토 필요', () => {
    const r = assignMonths(base({ monthCount: 1, hints: { source: 'depositorName', months: [{ year: 2026, month: 6 }, { year: 2026, month: 7 }] }, paid: [{ year: 2026, month: 1 }, { year: 2026, month: 2 }, { year: 2026, month: 3 }, { year: 2026, month: 4 }] }));
    expect(r).toMatchObject({ selections: [{ year: 2026, month: 5 }], usedHints: false, needsReview: true });
    expect(r.reason).toContain('힌트');
  });
  it('힌트 월이 이미 납부된 달이면 검토 필요', () => {
    const r = assignMonths(base({ hints: { source: 'memo', months: [{ year: 2026, month: 4 }] }, paid: [{ year: 2026, month: 4 }] }));
    expect(r.needsReview).toBe(true);
  });
  it('힌트 월이 의무 월이 아니면 검토 필요', () => {
    const r = assignMonths(base({ hints: { source: 'memo', months: [{ year: 2026, month: 3 }] }, obligationMonthsByYear: new Map([[2026, [4, 5, 6]]]) }));
    expect(r.needsReview).toBe(true);
  });
  it('힌트 없음: 거래월까지의 밀린 달부터, 모자라면 다음 달·다음 해로', () => {
    const r = assignMonths(base({ monthCount: 3, paid: [{ year: 2026, month: 1 }, { year: 2026, month: 2 }, { year: 2026, month: 3 }] }));
    expect(r.selections).toEqual([{ year: 2026, month: 4 }, { year: 2026, month: 5 }, { year: 2026, month: 6 }]);
    const r2 = assignMonths(base({ monthCount: 2, txDate: new Date(2026, 11, 20), paid: all.slice(0, 11).map((month) => ({ year: 2026, month })) }));
    expect(r2.selections).toEqual([{ year: 2026, month: 12 }, { year: 2027, month: 1 }]);
  });
  it('배정할 달이 모자라면 검토 필요', () => {
    const r = assignMonths(base({ monthCount: 3, obligationMonthsByYear: new Map([[2026, [5]]]) }));
    expect(r).toMatchObject({ selections: [{ year: 2026, month: 5 }], needsReview: true });
  });
});
```

- [ ] **Step 2: 실패 확인** → FAIL.

- [ ] **Step 3: 구현**

```ts
import type { MonthHints } from '@/types/membership-fee.types';

type YM = { year: number; month: number };

export interface AssignInput {
  monthCount: number;
  hints: MonthHints | null;
  txDate: Date;
  obligationMonthsByYear: Map<number, number[]>;
  paid: YM[];
}

export interface AssignResult {
  selections: YM[];
  usedHints: boolean;
  needsReview: boolean;
  reason: string | null;
}

const key = (ym: YM) => ym.year * 12 + ym.month;

/** 힌트가 개월 수·의무·미납 조건을 모두 만족하면 힌트, 아니면 밀린 달 우선 제안. */
export function assignMonths(input: AssignInput): AssignResult {
  const { monthCount, hints, txDate, obligationMonthsByYear, paid } = input;
  const paidSet = new Set(paid.map(key));
  const isObligated = (ym: YM) => (obligationMonthsByYear.get(ym.year) ?? []).includes(ym.month);

  let hintProblem: string | null = null;
  if (hints) {
    const months = hints.months;
    if (months.length !== monthCount) {
      hintProblem = `월 힌트 ${months.length}개가 입금 개월 수 ${monthCount}와 다름`;
    } else if (months.some((ym) => !isObligated(ym))) {
      hintProblem = '월 힌트에 의무 월이 아닌 달이 있음';
    } else if (months.some((ym) => paidSet.has(key(ym)))) {
      hintProblem = '월 힌트에 이미 납부된 달이 있음';
    } else {
      return { selections: [...months].sort((a, b) => key(a) - key(b)), usedHints: true, needsReview: false, reason: null };
    }
  }

  const txYear = txDate.getFullYear();
  const txMonth = txDate.getMonth() + 1;
  const candidates: YM[] = [];
  const push = (year: number, month: number) => {
    const ym = { year, month };
    if (isObligated(ym) && !paidSet.has(key(ym))) candidates.push(ym);
  };
  for (let m = 1; m <= txMonth; m++) push(txYear, m);          // 밀린 달 우선
  for (let m = txMonth + 1; m <= 12; m++) push(txYear, m);     // 선납
  for (let m = 1; m <= 12; m++) push(txYear + 1, m);           // 다음 해
  const selections = candidates.slice(0, monthCount);

  const short = selections.length < monthCount;
  return {
    selections,
    usedHints: false,
    needsReview: hintProblem != null || short,
    reason: hintProblem ?? (short ? `배정할 의무 월이 ${monthCount - selections.length}개 모자람` : null),
  };
}
```

- [ ] **Step 4: 통과 확인, 커밋**

```bash
git add src/lib/membership-fee/monthAssigner.ts src/lib/membership-fee/monthAssigner.test.ts
git commit -m "feat(membership-fee): 월 힌트와 밀린 달 우선 제안으로 납부월을 배정하는 배정기 추가"
```

---

### Task 11: 중복 감지

**Files:**
- Create: `src/lib/membership-fee/duplicateDetector.ts`
- Test: `src/lib/membership-fee/duplicateDetector.test.ts`

**Interfaces:**
- Produces: `transactionKey(row: { transactionDate: Date; amount: number; depositorName: string }): string`; `splitDuplicates<T extends Row>(rows: T[], existingKeys: Set<string>): { fresh: T[]; duplicates: T[] }` — 파일 안의 같은 행도 두 번째부터는 중복.

- [ ] **Step 1: 실패하는 테스트**

```ts
import { describe, expect, it } from '@jest/globals';

import { splitDuplicates, transactionKey } from './duplicateDetector';

const row = (name: string, amount: number, iso = '2026-05-03T01:00:00.000Z') => ({ transactionDate: new Date(iso), amount, depositorName: name });

describe('splitDuplicates', () => {
  it('DB에 같은 거래일시·금액·입금자명이 있으면 중복', () => {
    const existing = new Set([transactionKey(row('가나다', 25000))]);
    const { fresh, duplicates } = splitDuplicates([row('가나다', 25000), row('마바사', 25000)], existing);
    expect(fresh.map((r) => r.depositorName)).toEqual(['마바사']);
    expect(duplicates).toHaveLength(1);
  });
  it('입금자명 앞뒤 공백은 무시한다', () => {
    const existing = new Set([transactionKey(row('가나다', 25000))]);
    expect(splitDuplicates([row(' 가나다 ', 25000)], existing).duplicates).toHaveLength(1);
  });
  it('같은 파일 안의 완전 중복 행도 두 번째부터 중복', () => {
    const { fresh, duplicates } = splitDuplicates([row('가나다', 25000), row('가나다', 25000)], new Set());
    expect(fresh).toHaveLength(1);
    expect(duplicates).toHaveLength(1);
  });
});
```

- [ ] **Step 2: 실패 확인** → FAIL.

- [ ] **Step 3: 구현**

```ts
interface Row {
  transactionDate: Date;
  amount: number;
  depositorName: string;
}

export function transactionKey(row: Row): string {
  return `${row.transactionDate.getTime()}|${row.amount}|${row.depositorName.trim()}`;
}

/** 이미 올라온 거래(같은 거래일시·금액·입금자명)를 새 배치에서 뺀다. */
export function splitDuplicates<T extends Row>(rows: T[], existingKeys: Set<string>): { fresh: T[]; duplicates: T[] } {
  const seen = new Set(existingKeys);
  const fresh: T[] = [];
  const duplicates: T[] = [];
  for (const r of rows) {
    const k = transactionKey(r);
    if (seen.has(k)) duplicates.push(r);
    else {
      seen.add(k);
      fresh.push(r);
    }
  }
  return { fresh, duplicates };
}
```

- [ ] **Step 4: 통과 확인, 커밋**

```bash
git add src/lib/membership-fee/duplicateDetector.ts src/lib/membership-fee/duplicateDetector.test.ts
git commit -m "feat(membership-fee): 같은 거래의 재업로드를 걸러내는 중복 감지 추가"
```

---

### Task 12: 확정 계획기 (`confirmPlanner`) — 업로드·조회·확정이 같은 판정을 쓴다

**Files:**
- Create: `src/lib/membership-fee/confirmPlanner.ts`
- Test: `src/lib/membership-fee/confirmPlanner.test.ts`

**Interfaces:**
- Consumes: `resolveFeeAmount` (Task 9), `assignMonths` (Task 10), `getObligationMonths` (`feeObligation.ts`), `FeeRateSettings` (Task 8), `feeAmountOf` (Task 8).
- Produces:

```ts
export interface PlannerContext {
  ratesByYear: Map<number, FeeRateSettings>;
  coupleHistories: CoupleHistoryRow[];
  coupleGroups: { members: { clubMemberId: number }[] }[];
  memberStartAtMap: Map<number, Date | null>;
  memberLeftAtMap: Map<number, Date | null>;
  leaveMap: Map<number, LeavePeriod[]>;
  /** 회원별 납부된 연·월 (전 연도) */
  paidByMember: Map<number, { year: number; month: number }[]>;
}
export interface PlanInput {
  memberIds: number[];
  transactionDate: Date;
  amount: number;
  nonFeeAmount: number;
  monthHints: MonthHints | null;
  matchConfidence: number | null; // 자동 매칭이면 confidence, 수동이면 null
}
export interface RecordPlan {
  resolve: ResolveResult;
  selections: { year: number; month: number }[];
  usedHints: boolean;
  needsReview: boolean;
  reviewReasons: string[];
  error: string | null; // 단가 설정 없음 등 처리 불가
  ratesFallbackYear: number | null;     // 단가를 직전 연도에서 빌려 썼으면 그 연도
  suggestedStartMonth: { year: number; month: number } | null; // 힌트 월이 의무 시작 전일 때 앞당길 시작월
}
export function planRecord(ctx: PlannerContext, input: PlanInput): RecordPlan;
export async function loadPlannerContext(prisma: PrismaClient, clubId: number, years: number[]): Promise<PlannerContext>;
export function feeRateSettingsFromTypes(feeTypes: { name: string; rates: { year: number; period: FeePeriod; amount: number }[] }[], year: number): FeeRateSettings | null;
```

- [ ] **Step 1: 실패하는 테스트 (순수 함수만)**

```ts
import { describe, expect, it } from '@jest/globals';

import { feeRateSettingsFromTypes, planRecord } from './confirmPlanner';

const rates = { regularMonthly: 25000, coupleMonthly: 45000, regularAnnual: 275000, coupleAnnual: 495000, joiningFeeAmounts: [100000] };
const start = new Date(2025, 0, 1);
const ctx = () => ({
  ratesByYear: new Map([[2026, rates], [2027, rates]]),
  coupleHistories: [],
  coupleGroups: [],
  memberStartAtMap: new Map([[1, start]]),
  memberLeftAtMap: new Map<number, Date | null>([[1, null]]),
  leaveMap: new Map(),
  paidByMember: new Map([[1, [1, 2, 3, 4].map((month) => ({ year: 2026, month }))]]),
});
const input = (over: Partial<Parameters<typeof planRecord>[1]>) => ({
  memberIds: [1],
  transactionDate: new Date(2026, 4, 10),
  amount: 25000,
  nonFeeAmount: 0,
  monthHints: null,
  matchConfidence: 1,
  ...over,
});

describe('planRecord', () => {
  it('25,000 힌트 없음 → 5월 1개월, 검토 불필요', () => {
    const p = planRecord(ctx(), input({}));
    expect(p).toMatchObject({ selections: [{ year: 2026, month: 5 }], needsReview: false, reviewReasons: [], error: null });
  });
  it('125,000에 가입비 100,000을 뗀 건 → 1개월', () => {
    const p = planRecord(ctx(), input({ amount: 125000, nonFeeAmount: 100000 }));
    expect(p.resolve.monthCount).toBe(1);
    expect(p.selections).toEqual([{ year: 2026, month: 5 }]);
  });
  it('힌트 "6~9월" 100,000 → 힌트 4개월', () => {
    const p = planRecord(ctx(), input({ amount: 100000, monthHints: { source: 'depositorName', months: [6, 7, 8, 9].map((month) => ({ year: 2026, month })) } }));
    expect(p.selections.map((s) => s.month)).toEqual([6, 7, 8, 9]);
    expect(p.usedHints).toBe(true);
  });
  it('부족·초과·낮은 신뢰도·면제는 검토 필요 사유에 쌓인다', () => {
    expect(planRecord(ctx(), input({ amount: 20000 })).reviewReasons).toContain('입금 부족 (20,000원 < 25,000원)');
    expect(planRecord(ctx(), input({ amount: 30000 })).reviewReasons).toContain('초과 입금 5,000원');
    expect(planRecord(ctx(), input({ matchConfidence: 0.7 })).reviewReasons).toContain('매칭 신뢰도 낮음 (70%)');
    expect(planRecord(ctx(), input({ matchConfidence: 0.85 })).needsReview).toBe(false); // 부분 일치는 통과
    const c = ctx();
    c.exemptByYear = new Map([[2026, new Set([1])]]);
    expect(planRecord(c, input({})).reviewReasons).toContain('면제 회원입니다 — 회원을 바꿔주세요');
  });
  it('거래 연도 단가가 없으면 직전 연도로 대체하고 알린다', () => {
    const c = ctx();
    c.ratesByYear = new Map([[2025, rates]]);
    const p = planRecord(c, input({}));
    expect(p.error).toBeNull();
    expect(p.ratesFallbackYear).toBe(2025);
  });
  it('의무 시작 전 달 힌트는 앞당길 시작월을 제안한다', () => {
    const c = ctx();
    c.memberStartAtMap.set(1, new Date(2026, 3, 1));
    const p = planRecord(c, input({ monthHints: { source: 'depositorName', months: [{ year: 2026, month: 3 }] } }));
    expect(p.needsReview).toBe(true);
    expect(p.suggestedStartMonth).toEqual({ year: 2026, month: 3 });
  });
  it('어느 연도 단가도 없으면 error', () => {
    const c = ctx();
    c.ratesByYear = new Map();
    expect(planRecord(c, input({})).error).toBe('2026년 회비 설정이 없습니다');
  });
  it('연납 275,000 → 12개월, 거래 연도의 미납 의무 월부터', () => {
    const p = planRecord(ctx(), input({ amount: 275000 }));
    expect(p.resolve.period).toBe('ANNUAL');
    expect(p.selections).toHaveLength(12);
    expect(p.selections[0]).toEqual({ year: 2026, month: 5 });
    expect(p.selections[11]).toEqual({ year: 2027, month: 4 });
  });
});

describe('feeRateSettingsFromTypes', () => {
  it("'일반'·'부부'·'가입비' 이름으로 연도 단가를 뽑는다", () => {
    const types = [
      { name: '일반', rates: [{ year: 2026, period: 'MONTHLY' as const, amount: 25000 }, { year: 2026, period: 'ANNUAL' as const, amount: 275000 }] },
      { name: '부부', rates: [{ year: 2026, period: 'MONTHLY' as const, amount: 45000 }] },
      { name: '가입비', rates: [{ year: 2026, period: 'MONTHLY' as const, amount: 100000 }] },
    ];
    expect(feeRateSettingsFromTypes(types, 2026)).toEqual({ regularMonthly: 25000, coupleMonthly: 45000, regularAnnual: 275000, coupleAnnual: null, joiningFeeAmounts: [100000] });
    expect(feeRateSettingsFromTypes(types, 2025)).toBeNull();
  });
});
```

- [ ] **Step 2: 실패 확인** → FAIL.

- [ ] **Step 3: 구현**

```ts
import type { FeePeriod, PrismaClient } from '@prisma/client';

import type { MonthHints } from '@/types/membership-fee.types';

import type { CoupleHistoryRow } from './coupleHistory';
import { resolveFeeAmount, type ResolveResult } from './feeAmountResolver';
import { getObligationMonths, type LeavePeriod } from './feeObligation';
import { assignMonths } from './monthAssigner';
import { feeAmountOf, type FeeRateSettings } from './transactionClassifier';

export interface PlannerContext {
  ratesByYear: Map<number, FeeRateSettings>;
  coupleHistories: CoupleHistoryRow[];
  coupleGroups: { members: { clubMemberId: number }[] }[];
  memberStartAtMap: Map<number, Date | null>;
  memberLeftAtMap: Map<number, Date | null>;
  leaveMap: Map<number, LeavePeriod[]>;
  paidByMember: Map<number, { year: number; month: number }[]>;
  /** 연도별 면제 회원 */
  exemptByYear: Map<number, Set<number>>;
}

export interface PlanInput {
  memberIds: number[];
  transactionDate: Date;
  amount: number;
  nonFeeAmount: number;
  monthHints: MonthHints | null;
  matchConfidence: number | null;
}

export interface RecordPlan {
  resolve: ResolveResult;
  selections: { year: number; month: number }[];
  usedHints: boolean;
  needsReview: boolean;
  reviewReasons: string[];
  error: string | null;
  /** 단가를 직전 연도에서 빌려 썼으면 그 연도 */
  ratesFallbackYear: number | null;
  /** 힌트 월이 의무 시작 전일 때, 앞당기면 되는 시작월 (회원 1명 매칭일 때만) */
  suggestedStartMonth: { year: number; month: number } | null;
}

// 정확 1.0·부부 0.95·부분 일치 0.85/0.8은 통과, 유사도 0.7만 검토. 0.9로 두면 부분 일치 38%가 검토 대상이 된다.
const REVIEW_CONFIDENCE = 0.8;

/** 거래 연도 단가가 없으면 가장 가까운 직전 연도를 쓴다. 1월 파일이 연도 설정 전이라 막히지 않게. */
function pickRates(ctx: PlannerContext, year: number): { rates: FeeRateSettings; fallbackYear: number | null } | null {
  const exact = ctx.ratesByYear.get(year);
  if (exact) return { rates: exact, fallbackYear: null };
  const prior = [...ctx.ratesByYear.keys()].filter((y) => y < year).sort((a, b) => b - a)[0];
  if (prior == null) return null;
  return { rates: ctx.ratesByYear.get(prior)!, fallbackYear: prior };
}

/** '일반'·'부부'·'가입비' 이름을 고정으로 읽는다. 새 코드는 이 함수 밖에서 FeeType 이름을 보지 않는다. */
export function feeRateSettingsFromTypes(
  feeTypes: { name: string; rates: { year: number; period: FeePeriod; amount: number }[] }[],
  year: number
): FeeRateSettings | null {
  const pick = (name: string, period: FeePeriod) =>
    feeTypes.find((t) => t.name === name)?.rates.find((r) => r.year === year && r.period === period)?.amount ?? null;
  const regularMonthly = pick('일반', 'MONTHLY');
  if (regularMonthly == null) return null;
  return {
    regularMonthly,
    coupleMonthly: pick('부부', 'MONTHLY') ?? regularMonthly,
    regularAnnual: pick('일반', 'ANNUAL'),
    coupleAnnual: pick('부부', 'ANNUAL'),
    joiningFeeAmounts: feeTypes.find((t) => t.name === '가입비')?.rates.filter((r) => r.year === year && r.amount > 0).map((r) => r.amount) ?? [],
  };
}

/** 매칭 인원 모두가 의무인 달만 후보로 (부부는 둘 다 의무인 달). */
function obligationMonthsForAll(ctx: PlannerContext, memberIds: number[], year: number): number[] {
  const lists = memberIds.map((id) =>
    getObligationMonths(year, ctx.memberStartAtMap.get(id) ?? null, ctx.leaveMap.get(id) ?? [], ctx.memberLeftAtMap.get(id) ?? null)
  );
  return lists.reduce((acc, list) => acc.filter((m) => list.includes(m)), lists[0] ?? []);
}

export function planRecord(ctx: PlannerContext, input: PlanInput): RecordPlan {
  const txYear = input.transactionDate.getFullYear();
  const picked = pickRates(ctx, txYear);
  const empty: ResolveResult = { perMemberPerMonth: [], firstMonthExtraPerMember: [], totalPerMonth: 0, monthCount: 0, period: 'MONTHLY', isCoupleRate: false, shortfall: false, overpay: 0 };
  if (!picked) return { resolve: empty, selections: [], usedHints: false, needsReview: true, reviewReasons: [], error: `${txYear}년 회비 설정이 없습니다`, ratesFallbackYear: null, suggestedStartMonth: null };
  const { rates, fallbackYear } = picked;

  const resolve = resolveFeeAmount({
    memberIds: input.memberIds,
    txDate: input.transactionDate,
    feeAmount: feeAmountOf(input),
    coupleHistories: ctx.coupleHistories,
    coupleGroups: ctx.coupleGroups,
    memberStartAtMap: ctx.memberStartAtMap,
    memberLeftAtMap: ctx.memberLeftAtMap,
    leaveMap: ctx.leaveMap,
    rates,
  });

  const obligationMonthsByYear = new Map<number, number[]>([
    [txYear, obligationMonthsForAll(ctx, input.memberIds, txYear)],
    [txYear + 1, obligationMonthsForAll(ctx, input.memberIds, txYear + 1)],
  ]);
  const paid = input.memberIds.flatMap((id) => ctx.paidByMember.get(id) ?? []);
  const assign = assignMonths({ monthCount: resolve.monthCount, hints: input.monthHints, txDate: input.transactionDate, obligationMonthsByYear, paid });

  const reviewReasons: string[] = [];
  if (resolve.shortfall) reviewReasons.push(`입금 부족 (${feeAmountOf(input).toLocaleString()}원 < ${resolve.totalPerMonth.toLocaleString()}원)`);
  if (resolve.overpay > 0) reviewReasons.push(`초과 입금 ${resolve.overpay.toLocaleString()}원`);
  if (input.matchConfidence != null && input.matchConfidence < REVIEW_CONFIDENCE) reviewReasons.push(`매칭 신뢰도 낮음 (${Math.round(input.matchConfidence * 100)}%)`);
  if (assign.reason) reviewReasons.push(assign.reason);
  const exemptIds = input.memberIds.filter((id) => ctx.exemptByYear.get(txYear)?.has(id));
  if (exemptIds.length > 0) reviewReasons.push('면제 회원입니다 — 회원을 바꿔주세요');

  // 힌트 월이 의무 시작 전이면 앞당길 시작월 제안 (회원 1명, 힌트 중 가장 이른 달)
  let suggestedStartMonth: { year: number; month: number } | null = null;
  if (input.monthHints && input.memberIds.length === 1) {
    const startAt = ctx.memberStartAtMap.get(input.memberIds[0]);
    const earliest = [...input.monthHints.months].sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month))[0];
    if (startAt && earliest && earliest.year * 12 + earliest.month < startAt.getFullYear() * 12 + startAt.getMonth() + 1) {
      suggestedStartMonth = earliest;
    }
  }

  return { resolve, selections: assign.selections, usedHints: assign.usedHints, needsReview: reviewReasons.length > 0, reviewReasons, error: null, ratesFallbackYear: fallbackYear, suggestedStartMonth };
}

/** 핸들러가 한 번 부르는 조회. 매칭·확정에 필요한 클럽 전체 맥락을 싣는다. */
export async function loadPlannerContext(prisma: PrismaClient, clubId: number, years: number[]): Promise<PlannerContext> {
  const allYears = [...new Set(years.flatMap((y) => [y, y + 1]))];
  const [feeTypes, histories, groups, members, leaves, payments, exemptions] = await Promise.all([
    // 단가는 전 연도를 싣는다 (직전 연도 대체용)
    prisma.feeType.findMany({ where: { clubId, isActive: true }, include: { rates: true } }),
    prisma.coupleHistory.findMany({ where: { clubId }, select: { clubMemberId: true, partnerClubMemberId: true, startedAt: true, endedAt: true } }),
    prisma.coupleGroup.findMany({ where: { clubId }, select: { members: { select: { clubMemberId: true } } } }),
    prisma.clubMember.findMany({ where: { clubId }, select: { id: true, feeObligationStartAt: true, leftAt: true } }),
    prisma.memberLeave.findMany({ where: { clubMember: { clubId } } }),
    prisma.membershipPayment.findMany({ where: { clubMember: { clubId } }, select: { clubMemberId: true, year: true, month: true } }),
    prisma.feeExemption.findMany({ where: { clubMember: { clubId } }, select: { clubMemberId: true, year: true } }),
  ]);
  const ratesByYear = new Map<number, FeeRateSettings>();
  const rateYears = [...new Set(feeTypes.flatMap((t) => t.rates.map((r) => r.year)))];
  for (const y of [...new Set([...allYears, ...rateYears])]) {
    const s = feeRateSettingsFromTypes(feeTypes, y);
    if (s) ratesByYear.set(y, s);
  }
  const exemptByYear = new Map<number, Set<number>>();
  for (const e of exemptions) exemptByYear.set(e.year, new Set([...(exemptByYear.get(e.year) ?? []), e.clubMemberId]));
  const leaveMap = new Map<number, LeavePeriod[]>();
  for (const l of leaves) leaveMap.set(l.clubMemberId, [...(leaveMap.get(l.clubMemberId) ?? []), { startYear: l.startYear, startMonth: l.startMonth, endYear: l.endYear, endMonth: l.endMonth }]);
  const paidByMember = new Map<number, { year: number; month: number }[]>();
  for (const p of payments) paidByMember.set(p.clubMemberId, [...(paidByMember.get(p.clubMemberId) ?? []), { year: p.year, month: p.month }]);
  return {
    ratesByYear,
    coupleHistories: histories,
    coupleGroups: groups,
    memberStartAtMap: new Map(members.map((m) => [m.id, m.feeObligationStartAt])),
    memberLeftAtMap: new Map(members.map((m) => [m.id, m.leftAt])),
    leaveMap,
    paidByMember,
    exemptByYear,
  };
}
```

테스트의 `ctx()`에도 `exemptByYear: new Map()`을 넣는다. Task 14·22의 ctx 리터럴도 같다.

- [ ] **Step 4: 통과 확인, 커밋**

Run: `npx jest src/lib/membership-fee/confirmPlanner.test.ts` → PASS.

```bash
git add src/lib/membership-fee/confirmPlanner.ts src/lib/membership-fee/confirmPlanner.test.ts
git commit -m "feat(membership-fee): 레코드 한 건의 단가·개월·월 배정을 한 번에 계획하는 confirmPlanner 추가"
```

---

### Task 13: 업로드 API — 분류·후보 제한·계획·중복 감지

**Files:**
- Modify: `src/pages/api/clubs/[id]/membership-fee/upload.ts:104-394` (try 블록 안을 교체)
- Modify: `src/hooks/membership-fee/usePaymentRecords.ts:25-38` (`UploadResponse.summary`)
- Test: `src/__tests__/api/clubs/membershipFeeUpload.test.ts`

**Interfaces:**
- Consumes: `parseKakaoBankExcel`, `classifyTransaction`, `loadPlannerContext`, `isMatchableAt`, `matchDepositor`, `pickMonthHints`, `planRecord`, `splitDuplicates`/`transactionKey`.
- Produces: 응답 `data.summary = { total, fee, joiningFee, event, other, interest, matched, pending, error, needsReview, duplicates }`, `data.duplicates: { transactionDate, amount, depositorName }[]`, `data.records`(각 record에 `suggestedSelections`).

- [ ] **Step 1: 핸들러 본문을 새 파이프라인으로 바꾼다**

`upload.ts`의 import를 바꾼다(`validateAmount`/`detectMemberType`/`findCoupleGroup`/`attachLastPaidYearMonth`를 지우고):

```ts
import { loadPlannerContext, planRecord } from '@/lib/membership-fee/confirmPlanner';
import { splitDuplicates, transactionKey } from '@/lib/membership-fee/duplicateDetector';
import { parseKakaoBankExcel, validateExcelFile } from '@/lib/membership-fee/excelParser';
import { isMatchableAt } from '@/lib/membership-fee/matchableMembers';
import { matchDepositor } from '@/lib/membership-fee/memberMatcher';
import { pickMonthHints } from '@/lib/membership-fee/monthHintParser';
import { annotateRecords } from '@/lib/membership-fee/recordAnnotator';
import { classifyTransaction } from '@/lib/membership-fee/transactionClassifier';
```

`parsedRows.length === 0` 검사 다음부터 응답까지를 다음으로 교체한다:

```ts
    // 1) 중복 제외 — 같은 거래일시·금액·입금자명이 이미 있으면 새 배치에 넣지 않는다
    const existing = await prisma.paymentRecord.findMany({
      where: { clubId: clubIdNumber },
      select: { transactionDate: true, amount: true, depositorName: true },
    });
    const { fresh, duplicates } = splitDuplicates(parsedRows, new Set(existing.map(transactionKey)));
    if (fresh.length === 0) {
      return res.status(400).json({ error: `입금 ${parsedRows.length}건이 모두 이미 올라와 있습니다`, status: 400 });
    }

    // 2) 맥락 한 번 조회 (단가·부부·의무·납부)
    const years = [...new Set(fresh.map((r) => r.transactionDate.getFullYear()))];
    const ctx = await loadPlannerContext(prisma, clubIdNumber, years);
    // 거래 연도 단가가 없으면 직전 연도로 대체 (planRecord의 pickRates와 같은 규칙). 어느 연도도 없을 때만 400.
    const ratesFor = (y: number) => ctx.ratesByYear.get(y) ?? ctx.ratesByYear.get([...ctx.ratesByYear.keys()].filter((k) => k < y).sort((a, b) => b - a)[0] ?? -1);
    const fallbackYears = years.filter((y) => !ctx.ratesByYear.get(y) && ratesFor(y));
    for (const y of years) {
      if (!ratesFor(y)) return res.status(400).json({ error: `${y}년 회비 설정이 필요합니다`, status: 400 });
    }
    const members = await prisma.clubMember.findMany({
      where: { clubId: clubIdNumber },
      select: { id: true, name: true, status: true, leftAt: true, feeObligationStartAt: true },
    });
    const coupleGroupsRaw = await prisma.coupleGroup.findMany({
      where: { clubId: clubIdNumber },
      include: { members: { include: { clubMember: { select: { id: true, name: true, feeObligationStartAt: true, leftAt: true } } } } },
    });
    const coupleGroups = coupleGroupsRaw.map((g) => ({
      ...g,
      members: g.members.map((m) => ({ ...m, clubMember: { ...m.clubMember, leavePeriods: ctx.leaveMap.get(m.clubMemberId) ?? [] } })),
    }));

    const batch = await prisma.paymentUploadBatch.create({
      data: { clubId: clubIdNumber, uploadedById: adminMember.id, fileName: file.originalFilename || 'unknown.xlsx', recordCount: fresh.length },
    });

    // 같은 금액 집중 규칙: 단가 배수가 아닌 같은 금액이 7일 안에 5건 이상이면 행사로 본다
    const clustered = findAmountClusters(fresh, (y) => ratesFor(y)!);

    const createdIds: string[] = [];
    for (const row of fresh) {
      const rates = ratesFor(row.transactionDate.getFullYear())!;
      const classified = classifyTransaction(row, rates);
      const cls = classified.kind === 'FEE' && clustered.has(row)
        ? { ...classified, kind: 'EVENT' as const, kindReason: `같은 금액 ${clustered.get(row)}건 집중`, needsReview: false }
        : classified;
      const monthHints = pickMonthHints(row.depositorName, row.memo, row.transactionDate);
      const common = {
        batchId: batch.id,
        clubId: clubIdNumber,
        transactionDate: row.transactionDate,
        depositorName: row.depositorName,
        amount: row.amount,
        memo: row.memo,
        kind: cls.kind,
        kindReason: cls.kindReason,
        nonFeeAmount: cls.nonFeeAmount,
        nonFeeKind: cls.nonFeeKind,
        monthHints: monthHints ?? undefined,
      };

      // 3) 회비가 아니면 건너뜀으로 저장
      if (cls.kind !== 'FEE') {
        const r = await prisma.paymentRecord.create({ data: { ...common, status: 'SKIPPED', needsReview: false } });
        createdIds.push(r.id);
        continue;
      }

      // 4) 거래일 시점 후보에서만 매칭
      const candidates = members.filter((m) => isMatchableAt(m, row.transactionDate)).map((m) => ({ id: m.id, name: m.name }));
      const match = matchDepositor(row.depositorName, candidates, coupleGroups, row.transactionDate);
      const memberIds = (match.memberIds?.length ?? 0) > 0 ? match.memberIds! : match.memberId ? [match.memberId] : [];

      if (memberIds.length === 0) {
        const r = await prisma.paymentRecord.create({ data: { ...common, status: 'PENDING', errorReason: '회원 매칭 실패', needsReview: cls.needsReview } });
        createdIds.push(r.id);
        continue;
      }

      // 5) 단가·개월·월 배정
      const plan = planRecord(ctx, { memberIds, transactionDate: row.transactionDate, amount: row.amount, nonFeeAmount: cls.nonFeeAmount, monthHints, matchConfidence: match.confidence });
      const needsReview = cls.needsReview || plan.needsReview;
      const reasons = [...(cls.needsReview ? [cls.kindReason] : []), ...plan.reviewReasons];
      const r = await prisma.paymentRecord.create({
        data: {
          ...common,
          matchedMemberId: memberIds[0],
          status: plan.error ? 'ERROR' : 'MATCHED',
          errorReason: plan.error ?? (reasons.length > 0 ? reasons.join(' · ') : null),
          needsReview,
          matchedMembers: { create: memberIds.map((clubMemberId) => ({ clubMemberId })) },
        },
      });
      createdIds.push(r.id);
    }

    fs.unlinkSync(file.filepath);

    const records = await annotateRecords(prisma, clubIdNumber, createdIds);
    const count = (pred: (r: (typeof records)[number]) => boolean) => records.filter(pred).length;
    return res.status(200).json({
      data: {
        batch,
        records,
        duplicates: duplicates.map((d) => ({ transactionDate: d.transactionDate, amount: d.amount, depositorName: d.depositorName })),
        summary: {
          total: records.length,
          fee: count((r) => r.kind === 'FEE'),
          joiningFee: count((r) => r.kind === 'JOINING_FEE'),
          event: count((r) => r.kind === 'EVENT'),
          other: count((r) => r.kind === 'OTHER'),
          interest: count((r) => r.kind === 'INTEREST'),
          matched: count((r) => r.status === 'MATCHED'),
          pending: count((r) => r.status === 'PENDING'),
          error: count((r) => r.status === 'ERROR'),
          needsReview: count((r) => r.needsReview),
          duplicates: duplicates.length,
          confirmable: count((r) => r.status === 'MATCHED' && r.kind === 'FEE' && !r.needsReview),
          ratesFallbackYears: fallbackYears,
        },
      },
      status: 200,
      message: duplicates.length > 0 ? `파일 분석 완료. 이미 올라온 ${duplicates.length}건은 제외했습니다` : '파일 업로드 및 분석이 완료되었습니다',
    });
```

`findAmountClusters`는 `transactionClassifier.ts`에 더한다(Task 8의 테스트 파일에 케이스 추가: 15,000원 5건이 3일 안에 → 모두 포함, 20,000원 4건 → 제외, 25,000원 10건 → 단가 배수라 제외):

```ts
/** 단가 배수·가입비가 아닌 같은 금액이 windowDays 안에 minCount건 이상이면 그 행들을 돌려준다 (값은 묶음 크기). */
export function findAmountClusters<T extends { amount: number; transactionDate: Date }>(
  rows: T[],
  ratesFor: (year: number) => FeeRateSettings,
  minCount = 5,
  windowDays = 7
): Map<T, number> {
  const result = new Map<T, number>();
  const byAmount = new Map<number, T[]>();
  for (const r of rows) {
    const rates = ratesFor(r.transactionDate.getFullYear());
    if (isMultipleOfAnyRate(r.amount, rates) || rates.joiningFeeAmounts.includes(r.amount)) continue;
    byAmount.set(r.amount, [...(byAmount.get(r.amount) ?? []), r]);
  }
  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  for (const group of byAmount.values()) {
    const sorted = [...group].sort((a, b) => a.transactionDate.getTime() - b.transactionDate.getTime());
    for (let i = 0; i < sorted.length; i++) {
      let j = i;
      while (j + 1 < sorted.length && sorted[j + 1].transactionDate.getTime() - sorted[i].transactionDate.getTime() <= windowMs) j++;
      const size = j - i + 1;
      if (size >= minCount) for (let k = i; k <= j; k++) result.set(sorted[k], Math.max(result.get(sorted[k]) ?? 0, size));
    }
  }
  return result;
}
```

`annotateRecords`는 Task 14에서 만든다. 이 Task에서는 임시로 `attachLastPaidYearMonth(prisma, await prisma.paymentRecord.findMany({ where: { id: { in: createdIds } }, include: {...기존 include} }))`를 쓰고, Task 14에서 바꾼다.

- [ ] **Step 2: 훅의 `UploadResponse.summary` 타입을 넓힌다**

```ts
    summary: {
      total: number;
      fee: number;
      joiningFee: number;
      event: number;
      other: number;
      interest: number;
      matched: number;
      pending: number;
      error: number;
      needsReview: number;
      duplicates: number;
    };
    duplicates: { transactionDate: string; amount: number; depositorName: string }[];
```

- [ ] **Step 3: 핸들러 테스트 (가짜 prisma)**

`src/__tests__/api/clubs/membershipFeeUpload.test.ts`. 기존 `src/__tests__/api/boardPostIntegrity.test.ts`처럼 `jest.mock('@/lib/prisma', …)`로 메모리 저장소를 만든다. formidable은 `jest.mock('formidable')`로 `parse`가 `[{}, { file: [{ filepath: '/tmp/x.xlsx', originalFilename: 'x.xlsx' }] }]`를 돌려주게 하고, `fs.readFileSync`는 `jest.spyOn(fs, 'readFileSync')`로 Task 3의 `buildWorkbook` 결과를 돌려준다(`unlinkSync`도 spy로 막는다).

검증할 것(각각 `it`):
1. 입금자명 "가나다단체티" 20,000 → 저장된 record가 `status: 'SKIPPED', kind: 'EVENT'`.
2. "가나다5월" 25,000, 회원 가나다(APPROVED, 의무 2025-01) → `status: 'MATCHED', needsReview: false`, 응답 `records[0].suggestedSelections`가 `[{ year: 2026, month: 5 }]`.
3. 같은 파일을 두 번 올리면 두 번째는 400 `모두 이미 올라와 있습니다`.
4. 탈퇴(leftAt 2026-03-31) 회원 이름으로 5월 입금 → `PENDING` (후보 제외).
5. `summary.needsReview`가 부족 건(20,000)을 센다.

가짜 prisma에 필요한 메소드: `clubMember.findFirst/findMany`, `paymentRecord.findMany/create`, `paymentUploadBatch.create`, `feeType.findMany`, `coupleHistory.findMany`, `coupleGroup.findMany`, `memberLeave.findMany`, `membershipPayment.findMany`. `create`는 받은 `data`에 `id`를 붙여 배열에 넣고, `findMany`는 `where.id.in`만 지원하면 된다.

- [ ] **Step 4: 테스트·타입 검사·커밋**

Run: `npx jest src/__tests__/api/clubs/membershipFeeUpload.test.ts && npx tsc --noEmit`

```bash
git add "src/pages/api/clubs/[id]/membership-fee/upload.ts" src/hooks/membership-fee/usePaymentRecords.ts src/__tests__/api/clubs/membershipFeeUpload.test.ts
git commit -m "feat(membership-fee): 업로드가 분류·시점 기준 매칭·월 배정·중복 제외를 한 번에 한다"
```

---

### Task 14: 레코드 조회에 배정 결과 첨부 (`recordAnnotator`)

**Files:**
- Create: `src/lib/membership-fee/recordAnnotator.ts`
- Modify: `src/pages/api/clubs/[id]/membership-fee/records/index.ts:74-95`
- Modify: `src/pages/api/clubs/[id]/membership-fee/upload.ts` (임시 `attachLastPaidYearMonth` → `annotateRecords`)
- Test: `src/lib/membership-fee/recordAnnotator.test.ts`

**Interfaces:**
- Produces: `annotateRecords(prisma, clubId, recordIds: string[])` → `include`(matchedMember·matchedMembers·batch·payments)한 레코드에 `lastPaidYearMonth`·`nextSuggestedYearMonth`·`nextSuggestedReasons`(기존 필드, `attachLastPaidYearMonth` 재사용)와 `suggestedSelections`(PENDING·MATCHED·ERROR에서만, `planRecord` 결과)를 붙여 반환.
- 순수 부분: `attachPlans(ctx: PlannerContext, records: RecordLike[])`.

- [ ] **Step 1: 실패하는 테스트 (`attachPlans`만)**

```ts
import { describe, expect, it } from '@jest/globals';

import { attachPlans } from './recordAnnotator';

const rates = { regularMonthly: 25000, coupleMonthly: 45000, regularAnnual: 275000, coupleAnnual: 495000, joiningFeeAmounts: [100000] };
const ctx = {
  ratesByYear: new Map([[2026, rates], [2027, rates]]),
  coupleHistories: [],
  coupleGroups: [],
  memberStartAtMap: new Map([[1, new Date(2025, 0, 1)]]),
  memberLeftAtMap: new Map<number, Date | null>([[1, null]]),
  leaveMap: new Map(),
  paidByMember: new Map(),
};
const rec = (over: Record<string, unknown>) => ({
  id: 'r1', status: 'MATCHED', transactionDate: new Date(2026, 4, 10), amount: 50000, nonFeeAmount: 0, monthHints: null,
  matchedMemberId: 1, matchedMembers: [{ clubMemberId: 1 }], ...over,
});

describe('attachPlans', () => {
  it('MATCHED 건에 suggestedSelections를 붙인다', () => {
    const [r] = attachPlans(ctx, [rec({})]);
    expect(r.suggestedSelections).toEqual([{ year: 2026, month: 1 }, { year: 2026, month: 2 }]);
  });
  it('CONFIRMED·SKIPPED 건은 빈 배열', () => {
    expect(attachPlans(ctx, [rec({ status: 'CONFIRMED' })])[0].suggestedSelections).toEqual([]);
  });
  it('검토 필요는 저장값이 아니라 지금 계산으로 정한다', () => {
    // 업로드 때는 20,000(부족)으로 검토였지만, 그 사이 비회비를 떼어 25,000이 된 건
    const [r] = attachPlans(ctx, [rec({ needsReview: true, errorReason: '입금 부족 (20,000원 < 25,000원)', amount: 25000 })]);
    expect(r.needsReview).toBe(false);
    expect(r.reviewReasons).toEqual([]);
  });
  it('매칭 회원이 없으면 빈 배열', () => {
    expect(attachPlans(ctx, [rec({ matchedMemberId: null, matchedMembers: [] })])[0].suggestedSelections).toEqual([]);
  });
});
```

- [ ] **Step 2: 실패 확인** → FAIL.

- [ ] **Step 3: 구현**

```ts
import type { PrismaClient } from '@prisma/client';

import type { MonthHints } from '@/types/membership-fee.types';

import { attachLastPaidYearMonth } from './attachLastPaidYearMonth';
import { loadPlannerContext, planRecord, type PlannerContext } from './confirmPlanner';

interface RecordLike {
  status: string;
  transactionDate: Date;
  amount: number;
  nonFeeAmount: number;
  monthHints: unknown;
  matchedMemberId: number | null;
  matchedMembers: { clubMemberId: number }[];
}

const PLANNABLE = new Set(['PENDING', 'MATCHED', 'ERROR']);

export interface PlanAnnotation {
  suggestedSelections: { year: number; month: number }[];
  needsReview: boolean;
  reviewReasons: string[];
  suggestedStartMonth: { year: number; month: number } | null;
  ratesFallbackYear: number | null;
}

export function attachPlans<T extends RecordLike>(ctx: PlannerContext, records: T[]): (T & PlanAnnotation)[] {
  return records.map((r) => {
    const ids = r.matchedMembers.length > 0 ? r.matchedMembers.map((m) => m.clubMemberId) : r.matchedMemberId ? [r.matchedMemberId] : [];
    const blank: PlanAnnotation = { suggestedSelections: [], needsReview: false, reviewReasons: [], suggestedStartMonth: null, ratesFallbackYear: null };
    if (!PLANNABLE.has(r.status) || ids.length === 0) return { ...r, ...blank, needsReview: (r as { needsReview?: boolean }).needsReview ?? false };
    const plan = planRecord(ctx, {
      memberIds: ids,
      transactionDate: new Date(r.transactionDate),
      amount: r.amount,
      nonFeeAmount: r.nonFeeAmount,
      monthHints: (r.monthHints as MonthHints | null) ?? null,
      matchConfidence: null,
    });
    // 검토 필요·사유는 조회 시점에 다시 계산한다. 재무가 휴회·시작월을 고치면 저절로 확정 대상이 된다.
    // 분류 단계의 검토(단가 배수 아님 등)는 저장된 kindReason에 남아 있으므로 errorReason으로 합친다.
    const stored = (r as { errorReason?: string | null; kindReason?: string | null }).errorReason ?? null;
    const classificationReview = stored != null && !PLAN_REASON.test(stored) ? [stored] : [];
    const reviewReasons = [...classificationReview, ...plan.reviewReasons];
    return {
      ...r,
      suggestedSelections: plan.selections,
      needsReview: reviewReasons.length > 0 || plan.error != null,
      reviewReasons,
      suggestedStartMonth: plan.suggestedStartMonth,
      ratesFallbackYear: plan.ratesFallbackYear,
    };
  });
}

/** planRecord가 만드는 사유인지 (저장된 errorReason 중 계획 사유는 버리고 다시 계산) */
const PLAN_REASON = /^(입금 부족|초과 입금|매칭 신뢰도|면제 회원|월 힌트|배정할 의무 월)/;

export const RECORD_INCLUDE = {
  matchedMember: { select: { id: true, name: true } },
  matchedMembers: { include: { clubMember: { select: { id: true, name: true } } } },
  batch: { select: { id: true, fileName: true, uploadedAt: true } },
  payments: { select: { id: true, month: true, year: true } },
} as const;

export async function annotateRecords(prisma: PrismaClient, clubId: number, recordIds: string[]) {
  const records = await prisma.paymentRecord.findMany({
    where: { id: { in: recordIds }, clubId },
    include: RECORD_INCLUDE,
    orderBy: { transactionDate: 'desc' },
  });
  const years = [...new Set(records.map((r) => r.transactionDate.getFullYear()))];
  const ctx = await loadPlannerContext(prisma, clubId, years.length > 0 ? years : [new Date().getFullYear()]);
  const withLast = await attachLastPaidYearMonth(prisma, records);
  return attachPlans(ctx, withLast);
}
```

- [ ] **Step 4: `records/index.ts`와 `upload.ts`가 쓰게 바꾼다**

`records/index.ts`: `findMany`는 `select: { id: true }`로 id만 받고 `annotateRecords(prisma, clubIdNumber, ids)`로 바꾼다. 정렬은 `annotateRecords`가 한다. `upload.ts`의 임시 코드를 `annotateRecords(prisma, clubIdNumber, createdIds)`로.

- [ ] **Step 5: 테스트·타입·커밋**

Run: `npx jest src/lib/membership-fee/recordAnnotator.test.ts src/__tests__/api/clubs/membershipFeeUpload.test.ts && npx tsc --noEmit`

```bash
git add src/lib/membership-fee/recordAnnotator.ts src/lib/membership-fee/recordAnnotator.test.ts "src/pages/api/clubs/[id]/membership-fee/records/index.ts" "src/pages/api/clubs/[id]/membership-fee/upload.ts"
git commit -m "feat(membership-fee): 레코드 조회·업로드 응답에 배정된 납부월을 첨부"
```

---

### Task 15: 일괄 확정·단건 확정이 `confirmPlanner`를 쓰고, 중복 생성을 막는다

**Files:**
- Modify: `src/pages/api/clubs/[id]/membership-fee/records/bulk-confirm.ts` (전면 교체)
- Modify: `src/pages/api/clubs/[id]/membership-fee/records/[recordId]/confirm.ts:143-343`
- Modify: `src/schemas/membership-fee.schema.ts` (`paymentConfirmSchema`에 `note`)
- Delete: `src/lib/membership-fee/coupleRateResolver.ts`, `src/lib/membership-fee/coupleRateResolver.test.ts`
- Modify: `src/lib/membership-fee/amountValidator.ts` (`validateAmount`·`detectMemberType` 삭제)
- Test: `src/__tests__/api/clubs/membershipFeeBulkConfirm.test.ts`

**Interfaces:**
- Consumes: `loadPlannerContext`, `planRecord`, `feeAmountOf`.
- Produces: bulk-confirm 응답 `data.results.failed[].reason`에 제외 사유. 생성되는 `MembershipPayment.period`가 연납이면 `'ANNUAL'`.

- [ ] **Step 1: 공용 쓰기 함수를 `confirmPlanner.ts`에 더한다**

```ts
/** 계획대로 MembershipPayment를 만들고 record를 CONFIRMED로 바꾼다. 트랜잭션 안에서 부른다.
 *  updateMany의 status 가드가 0건이면 다른 요청이 먼저 확정한 것이므로 던진다. */
export async function applyPlan(
  tx: Prisma.TransactionClient,
  params: {
    recordId: string;
    memberIds: number[];
    selections: { year: number; month: number }[];
    resolve: ResolveResult;
    confirmedById: number;
    /** 부족 확정: 회비 금액을 모든 칸에 균등 배분 */
    distributeAmount?: number;
  }
): Promise<void> {
  const { recordId, memberIds, selections, resolve, confirmedById, distributeAmount } = params;
  const guard = await tx.paymentRecord.updateMany({
    where: { id: recordId, status: 'MATCHED' },
    data: { status: 'CONFIRMED', errorReason: null, needsReview: false },
  });
  if (guard.count === 0) throw new Error('이미 처리된 입금 내역입니다');

  const slots = memberIds.length * selections.length;
  const even = distributeAmount != null ? splitEvenly(distributeAmount, slots) : null;
  let slot = 0;
  for (let i = 0; i < memberIds.length; i++) {
    for (let s = 0; s < selections.length; s++) {
      const amount = even ? even[slot] : resolve.perMemberPerMonth[i] + (s === 0 ? resolve.firstMonthExtraPerMember[i] : 0);
      await tx.membershipPayment.create({
        data: { clubMemberId: memberIds[i], paymentRecordId: recordId, year: selections[s].year, month: selections[s].month, amount, period: resolve.period, confirmedById },
      });
      slot += 1;
    }
  }
}
```

`splitEvenly`는 `feeAmountResolver.ts`에서 `export`로 바꾸고 import한다. `import type { Prisma } from '@prisma/client'` 추가.

- [ ] **Step 2: `bulk-confirm.ts`를 교체한다** — 권한 검증까지는 그대로 두고 `try` 안을:

```ts
    const parseResult = bulkConfirmSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0].message, status: 400 });
    }
    const { recordIds, selections } = parseResult.data;
    const userSelected = selections && selections.length > 0
      ? selections.flatMap((s) => s.months.map((m) => ({ year: s.year, month: m })))
      : null;

    const records = await prisma.paymentRecord.findMany({
      where: { id: { in: recordIds }, clubId: clubIdNumber },
      include: { matchedMembers: { select: { clubMemberId: true } } },
    });
    const years = [...new Set(records.map((r) => r.transactionDate.getFullYear()))];
    const ctx = await loadPlannerContext(prisma, clubIdNumber, years.length > 0 ? years : [new Date().getFullYear()]);

    const results = { success: [] as string[], failed: [] as { recordId: string; reason: string }[] };
    const fail = (recordId: string, reason: string) => results.failed.push({ recordId, reason });
    const byId = new Map(records.map((r) => [r.id, r]));

    for (const id of recordIds) {
      const record = byId.get(id);
      if (!record) { fail(id, '입금 내역을 찾을 수 없습니다'); continue; }
      if (record.status !== 'MATCHED') { fail(id, '매칭 상태가 아닙니다'); continue; }
      if (record.kind !== 'FEE') { fail(id, '회비가 아닌 입금입니다'); continue; }
      // 저장된 needsReview는 보지 않는다. 아래 planRecord가 지금 상태로 다시 판정한다 (Task 14와 같은 규칙).
      const storedClassificationReview = record.errorReason && !PLAN_REASON.test(record.errorReason) ? record.errorReason : null;
      if (storedClassificationReview && !userSelected) { fail(id, `검토 필요: ${storedClassificationReview}`); continue; }
      const memberIds = record.matchedMembers.length > 0 ? record.matchedMembers.map((m) => m.clubMemberId) : record.matchedMemberId ? [record.matchedMemberId] : [];
      if (memberIds.length === 0) { fail(id, '매칭된 회원이 없습니다'); continue; }

      const plan = planRecord(ctx, {
        memberIds, transactionDate: record.transactionDate, amount: record.amount, nonFeeAmount: record.nonFeeAmount,
        monthHints: (record.monthHints as MonthHints | null) ?? null, matchConfidence: null,
      });
      if (plan.error) { fail(id, plan.error); continue; }
      if (plan.resolve.shortfall) { fail(id, `입금 부족 (${feeAmountOf(record).toLocaleString()}원) - 개별 확정에서 월 선택 후 부족 확정해주세요`); continue; }
      if (plan.resolve.overpay > 0 && !userSelected) { fail(id, `초과 입금 ${plan.resolve.overpay.toLocaleString()}원 - 개별 확정에서 비회비 금액을 떼거나 월을 골라주세요`); continue; }

      let targets = plan.selections;
      if (userSelected) {
        if (userSelected.length !== plan.resolve.monthCount) { fail(id, `지정한 월 수(${userSelected.length})가 입금 금액 기준 월 수(${plan.resolve.monthCount})와 다릅니다`); continue; }
        const bad = userSelected.filter((ym) => !isObligatedForAll(ctx, memberIds, ym));
        if (bad.length > 0) { fail(id, `의무월이 아닌 월이 포함됨 (${bad.map((b) => `${b.year}년 ${b.month}월`).join(', ')})`); continue; }
        const paidKeys = new Set(memberIds.flatMap((m) => ctx.paidByMember.get(m) ?? []).map((p) => p.year * 12 + p.month));
        const dup = userSelected.filter((ym) => paidKeys.has(ym.year * 12 + ym.month));
        if (dup.length > 0) { fail(id, `이미 납부된 월이 포함됨 (${dup.map((d) => `${d.year}년 ${d.month}월`).join(', ')})`); continue; }
        targets = userSelected;
      } else if (plan.needsReview) { fail(id, `검토 필요: ${plan.reviewReasons.join(' · ')}`); continue; }
      if (targets.length < plan.resolve.monthCount) { fail(id, '납부 가능한 월이 부족합니다'); continue; }

      try {
        await prisma.$transaction((tx) => applyPlan(tx, { recordId: id, memberIds, selections: targets, resolve: plan.resolve, confirmedById: adminMember.id }));
        for (const m of memberIds) ctx.paidByMember.set(m, [...(ctx.paidByMember.get(m) ?? []), ...targets]);
        results.success.push(id);
      } catch (error: any) {
        fail(id, error.message || '처리 중 오류');
      }
    }

    return res.status(200).json({
      data: { results, summary: { total: recordIds.length, processed: records.length, success: results.success.length, failed: results.failed.length } },
      status: 200,
      message: `${results.success.length}건 확정, ${results.failed.length}건 실패`,
    });
```

`PLAN_REASON`은 `recordAnnotator.ts`에서 export해 가져온다. `isObligatedForAll(ctx, memberIds, ym)`은 `confirmPlanner.ts`에 export로 추가한다: `memberIds.every((id) => isMonthObligated(ym.year, ym.month, ctx.memberStartAtMap.get(id) ?? null, ctx.leaveMap.get(id) ?? [], ctx.memberLeftAtMap.get(id) ?? null))`. `bulkConfirmSchema`의 `year`는 받되 쓰지 않는다(호환). import 정리: `FeePeriod`, `resolveMonthlyAmount`, `getFirstObligationMonth`, `getObligationMonths`, `suggestMonths` 제거.

- [ ] **Step 3: `confirm.ts`를 교체한다** — `record` 조회·`memberIds`·`CONFIRMED` 검사(100~141행)까지는 그대로. 그 아래를:

```ts
    const requested = selections.flatMap((s) => s.months.map((m) => ({ year: s.year, month: m })));
    const ctx = await loadPlannerContext(prisma, clubIdNumber, [record.transactionDate.getFullYear(), ...requested.map((r) => r.year)]);
    const bad = requested.find((ym) => !isObligatedForAll(ctx, memberIds, ym));
    if (bad) {
      return res.status(400).json({ error: `${bad.year}년 ${bad.month}월은 해당 회원의 회비 의무 기간이 아닙니다 (가입 시기·휴회 확인)`, status: 400 });
    }
    const plan = planRecord(ctx, { memberIds, transactionDate: record.transactionDate, amount: record.amount, nonFeeAmount: record.nonFeeAmount, monthHints: null, matchConfidence: null });
    if (plan.error) return res.status(400).json({ error: plan.error, status: 400 });

    const feeAmount = feeAmountOf(record);
    // 이미 납부된 달: 부족분 충당(기존 합계 + 이번 금액 ≤ 단가)이면 허용, 아니면 거부
    const existing = await prisma.membershipPayment.findMany({
      where: { clubMemberId: { in: memberIds }, OR: requested.map((ym) => ({ year: ym.year, month: ym.month })) },
      select: { clubMemberId: true, year: true, month: true, amount: true },
    });
    if (existing.length > 0) {
      const isTopUp = requested.length === 1 && existing.every((p) => {
        const i = memberIds.indexOf(p.clubMemberId);
        return i >= 0 && p.amount + Math.floor(feeAmount / memberIds.length) <= plan.resolve.perMemberPerMonth[i];
      });
      if (!isTopUp) {
        const dup = [...new Set(existing.map((p) => `${p.year}년 ${p.month}월`))].join(', ');
        return res.status(400).json({ error: `이미 납부된 월이 있습니다: ${dup}`, status: 400 });
      }
    }
    const expected = plan.resolve.totalPerMonth * requested.length;
    // 부족이면 균등 배분, 그 외는 단가대로 (초과분은 미할당 → OVERPAY로 기록)
    const distributeAmount = feeAmount < expected ? feeAmount : undefined;
    const overpay = feeAmount > expected ? feeAmount - expected : 0;

    const result = await prisma.$transaction(async (tx) => {
      await tx.paymentRecord.updateMany({ where: { id: record.id, status: { not: 'CONFIRMED' } }, data: { status: 'MATCHED' } });
      await applyPlan(tx, { recordId: record.id, memberIds, selections: requested, resolve: plan.resolve, confirmedById: adminMember.id, distributeAmount });
      const updatedRecord = await tx.paymentRecord.update({
        where: { id: record.id },
        data: {
          note: 'note' in data && typeof data.note === 'string' ? data.note : undefined,
          ...(overpay > 0 && record.nonFeeAmount === 0 ? { nonFeeAmount: overpay, nonFeeKind: 'OVERPAY' } : {}),
        },
        include: { matchedMember: { select: { id: true, name: true } }, matchedMembers: { include: { clubMember: { select: { id: true, name: true } } } }, payments: true },
      });
      return { record: updatedRecord, payments: updatedRecord.payments };
    });
```

`paymentConfirmSchema`의 두 분기 객체에 `note: z.string().max(500).optional()`을 더한다(`.strict()` 유지). 첫 `updateMany`는 PENDING·ERROR 상태에서 단건 확정을 허용하던 기존 동작을 유지하기 위한 것이다(가드는 `applyPlan` 안의 `MATCHED` 조건).

- [ ] **Step 4: 쓰지 않게 된 코드를 지운다**

`coupleRateResolver.ts`·`coupleRateResolver.test.ts` 삭제. `amountValidator.ts`에서 `validateAmount`·`detectMemberType`·`SimpleFeeSettings` 삭제(`validateAmountWithRates`·`detectFeeType`는 다른 곳에서 쓰면 남긴다: `grep -rn "validateAmountWithRates\|detectFeeType" src`로 확인, 없으면 파일째 삭제).

Run: `grep -rn "coupleRateResolver\|validateAmount(\|detectMemberType" src` → 출력 없음.

- [ ] **Step 5: 일괄 확정 테스트 (가짜 prisma, 동시 요청 가드 포함)**

`src/__tests__/api/clubs/membershipFeeBulkConfirm.test.ts`. Task 13의 가짜 prisma를 모듈로 빼(`src/__tests__/api/clubs/fakeFeePrisma.ts`) 둘이 같이 쓴다. `$transaction(fn)`은 `fn(fake)`를 그대로 부른다. `paymentRecord.updateMany`는 `where.status`를 실제로 비교해 count를 돌려준다.

검증할 것:
1. MATCHED·needsReview=false·FEE 2건 → 둘 다 success, `membershipPayment` 2건 생성, `period: 'MONTHLY'`.
2. `kind: 'EVENT'` 건 → failed `회비가 아닌 입금입니다`.
3. `needsReview: true` 건(selections 없음) → failed `검토 필요: …`.
4. 같은 record로 핸들러를 두 번 연달아 호출 → 두 번째는 failed `이미 처리된 입금 내역입니다`, `membershipPayment`는 1건.
5. 275,000 연납 → 12건, `period: 'ANNUAL'`, 첫 달 22,924원·나머지 22,916원.
6. (단건 `confirm.ts`) 5월에 20,000 납부가 있는 회원에게 5,000 레코드를 5월로 확정 → 200, 5월 납부 2건(합 25,000). 10,000을 더 확정하면 400 `이미 납부된 월이 있습니다`.
7. (단건) 업로드 때 `needsReview: true`였던 건도 휴회를 지워 의무 월이 되면 일괄 확정에 성공한다 (저장된 플래그를 보지 않음).

- [ ] **Step 6: 전체 테스트·타입·커밋**

Run: `npx jest src/lib/membership-fee src/__tests__/api/clubs && npx tsc --noEmit`

```bash
git add -A src/lib/membership-fee src/schemas/membership-fee.schema.ts "src/pages/api/clubs/[id]/membership-fee/records" src/__tests__/api/clubs
git commit -m "refactor(membership-fee): 단건·일괄 확정이 confirmPlanner로 판정하고 중복 확정을 막는다"
```

---

### Task 16: 레코드 수정 API — 분류·비회비 금액·메모, 분류 변경 시 재매칭

**Files:**
- Modify: `src/pages/api/clubs/[id]/membership-fee/records/[recordId]/index.ts:92-194`
- Modify: `src/schemas/membership-fee.schema.ts` (`paymentRecordUpdateSchema`)
- Modify: `src/hooks/membership-fee/usePaymentRecords.ts:143-178` (`useUpdatePaymentRecord`의 `data` 타입)
- Test: `src/__tests__/api/clubs/membershipFeeRecordUpdate.test.ts`

**Interfaces:**
- Produces: PUT body에 `kind?`, `nonFeeAmount?`, `nonFeeKind?`, `note?` 허용. `kind`를 `FEE`가 아닌 값으로 바꾸면 `SKIPPED` + `kindReason: '수동 변경 (이전: …)'`. `FEE`로 바꾸면 매칭 회원 유무에 따라 `MATCHED`/`PENDING`, `needsReview`는 다시 계산.

- [ ] **Step 1: zod 스키마**

```ts
export const paymentRecordUpdateSchema = z
  .object({
    matchedMemberId: z.number().int().positive().nullable().optional(),
    matchedMemberIds: z.array(z.number().int().positive()).optional(),
    status: z.enum(['PENDING', 'MATCHED', 'ERROR', 'CONFIRMED', 'SKIPPED']).optional(),
    kind: z.enum(['FEE', 'JOINING_FEE', 'EVENT', 'OTHER', 'INTEREST']).optional(),
    nonFeeAmount: z.number().int().min(0, '비회비 금액은 0 이상이어야 합니다').optional(),
    nonFeeKind: z.enum(['JOINING_FEE', 'EVENT', 'OTHER', 'OVERPAY']).nullable().optional(),
    note: z.string().max(500, '메모는 500자 이하로 적어주세요').nullable().optional(),
  })
  .refine((d) => d.nonFeeAmount === undefined || d.nonFeeAmount === 0 || d.nonFeeKind != null, {
    message: '비회비 금액을 적으면 성격을 골라주세요',
    path: ['nonFeeKind'],
  });
```

- [ ] **Step 2: 실패하는 핸들러 테스트**

가짜 prisma(Task 15의 `fakeFeePrisma.ts`)로:
1. `nonFeeAmount: 100000, nonFeeKind: 'JOINING_FEE'` on 125,000 record → 200, 저장값 반영, `needsReview: false`.
2. `nonFeeAmount: 200000` on 125,000 record → 400 `비회비 금액이 입금액 이상입니다`.
3. `kind: 'EVENT'` → `status: 'SKIPPED'`, `kindReason`에 `수동 변경`.
4. SKIPPED·EVENT 건에 `kind: 'FEE'` (매칭 회원 있음) → `status: 'MATCHED'`.
5. CONFIRMED 건은 `note`만 바꿀 수 있고 다른 필드는 400.

- [ ] **Step 3: 구현** — PUT 분기를:

```ts
    if (req.method === 'PUT') {
      const parseResult = paymentRecordUpdateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors[0].message, status: 400 });
      }
      const { matchedMemberId, matchedMemberIds, status, kind, nonFeeAmount, nonFeeKind, note } = parseResult.data;
      const onlyNote = Object.keys(parseResult.data).every((k) => k === 'note');
      if (existingRecord.status === 'CONFIRMED' && !onlyNote) {
        return res.status(400).json({ error: '이미 확정된 입금 내역은 수정할 수 없습니다', status: 400 });
      }
      if (nonFeeAmount !== undefined && nonFeeAmount >= existingRecord.amount) {
        return res.status(400).json({ error: '비회비 금액이 입금액 이상입니다', status: 400 });
      }

      const updateData: Record<string, unknown> = {};
      if (note !== undefined) updateData.note = note;
      if (nonFeeAmount !== undefined) {
        updateData.nonFeeAmount = nonFeeAmount;
        updateData.nonFeeKind = nonFeeAmount === 0 ? null : nonFeeKind;
      }

      // 매칭 회원 변경 (기존 로직 그대로)
      let memberIdsAfter: number[] | null = null;
      if (matchedMemberIds !== undefined) {
        for (const mid of matchedMemberIds) {
          const member = await prisma.clubMember.findFirst({ where: { id: mid, clubId: clubIdNumber } });
          if (!member) return res.status(400).json({ error: `해당 클럽에 속하지 않은 회원입니다 (id: ${mid})`, status: 400 });
        }
        await prisma.paymentRecordMatchedMember.deleteMany({ where: { paymentRecordId: recordId } });
        if (matchedMemberIds.length > 0) {
          await prisma.paymentRecordMatchedMember.createMany({ data: matchedMemberIds.map((clubMemberId) => ({ paymentRecordId: recordId, clubMemberId })) });
        }
        updateData.matchedMemberId = matchedMemberIds[0] ?? null;
        memberIdsAfter = matchedMemberIds;
      } else if (matchedMemberId !== undefined) {
        if (matchedMemberId !== null) {
          const member = await prisma.clubMember.findFirst({ where: { id: matchedMemberId, clubId: clubIdNumber } });
          if (!member) return res.status(400).json({ error: '해당 클럽에 속하지 않은 회원입니다', status: 400 });
        }
        updateData.matchedMemberId = matchedMemberId;
        memberIdsAfter = matchedMemberId ? [matchedMemberId] : [];
      }

      const kindAfter = kind ?? existingRecord.kind;
      if (kind !== undefined && kind !== existingRecord.kind) {
        updateData.kind = kind;
        updateData.kindReason = `수동 변경 (이전: ${existingRecord.kind}, ${existingRecord.kindReason ?? '사유 없음'})`;
      }

      if (kindAfter !== 'FEE') {
        updateData.status = 'SKIPPED';
        updateData.errorReason = null;
        updateData.needsReview = false;
      } else if (status) {
        updateData.status = status;
      } else {
        const ids = memberIdsAfter ?? (await prisma.paymentRecordMatchedMember.findMany({ where: { paymentRecordId: recordId }, select: { clubMemberId: true } })).map((m) => m.clubMemberId);
        if (ids.length === 0) {
          updateData.status = existingRecord.status === 'SKIPPED' || kind !== undefined || memberIdsAfter !== null ? 'PENDING' : existingRecord.status;
          updateData.errorReason = ids.length === 0 ? '회원 매칭 실패' : null;
        } else {
          const ctx = await loadPlannerContext(prisma, clubIdNumber, [existingRecord.transactionDate.getFullYear()]);
          const plan = planRecord(ctx, {
            memberIds: ids, transactionDate: existingRecord.transactionDate, amount: existingRecord.amount,
            nonFeeAmount: nonFeeAmount ?? existingRecord.nonFeeAmount,
            monthHints: (existingRecord.monthHints as MonthHints | null) ?? null, matchConfidence: null,
          });
          updateData.status = plan.error ? 'ERROR' : 'MATCHED';
          updateData.needsReview = plan.needsReview;
          updateData.errorReason = plan.error ?? (plan.reviewReasons.length > 0 ? plan.reviewReasons.join(' · ') : null);
        }
      }

      await prisma.paymentRecord.update({ where: { id: recordId }, data: updateData });
      const [record] = await annotateRecords(prisma, clubIdNumber, [recordId]);
      return res.status(200).json({ data: { record }, status: 200, message: '입금 내역이 수정되었습니다' });
    }
```

핸들러 import에 `loadPlannerContext`·`planRecord`(`@/lib/membership-fee/confirmPlanner`), `annotateRecords`(`@/lib/membership-fee/recordAnnotator`), `type MonthHints`(`@/types/membership-fee.types`)를 더한다.

- [ ] **Step 3-1: 건너뜀 해제는 회비 분류에서만** — `records/[recordId]/unskip.ts`(71행 아래)와 `records/bulk-unskip.ts`(96행 분기)에 `kind !== 'FEE'`이면 거부를 더한다. 사유 문구: `'회비가 아닌 입금입니다. 분류를 회비로 바꿔주세요'`. 단건은 400, 일괄은 `results.failed`. 두 핸들러의 `select`/`findFirst`에 `kind: true`를 넣는다. Task 15의 가짜 prisma로 bulk-unskip 케이스 1개를 `membershipFeeRecordUpdate.test.ts`에 추가한다.

- [ ] **Step 4: 훅 타입**

`useUpdatePaymentRecord`의 `data` 타입을 `PaymentRecordUpdateInput`(types, Task 2에서 확장)으로 바꾼다.

- [ ] **Step 5: 테스트·타입·커밋**

```bash
git add "src/pages/api/clubs/[id]/membership-fee/records" src/schemas/membership-fee.schema.ts src/hooks/membership-fee/usePaymentRecords.ts src/__tests__/api/clubs/membershipFeeRecordUpdate.test.ts
git commit -m "feat(membership-fee): 레코드 수정에서 분류·비회비 금액·메모를 바꾸고 분류 변경 시 재판정"
```

---

### Task 17: 회원×월 상태 계산을 lib로 (`memberYearStatus`)

**Files:**
- Create: `src/lib/membership-fee/memberYearStatus.ts`
- Modify: `src/pages/api/clubs/[id]/membership-fee/dashboard.ts:211-319`
- Test: `src/lib/membership-fee/memberYearStatus.test.ts`

**Interfaces:**
- Produces:

```ts
export type CellStatus = 'PAID' | 'UNPAID' | 'FUTURE' | 'EXEMPT' | 'LEAVE' | 'NONE';
export interface MemberYearInput {
  id: number; userId: number; name: string | null; status: string;
  feeObligationStartAt: Date | null; leftAt: Date | null;
  position: string | null; positionOrder: number | null;
  isExempt: boolean; couplePartnerName: string | null;
  leavePeriods: (LeavePeriod & { reason?: string | null })[];
  paidMonths: Set<number>;
}
export interface MemberYearStatus extends MemberPaymentStatus {
  cells: Record<number, CellStatus>;          // 1~12
  leaveReasons: Record<number, string | null>; // 휴회 달의 사유
  position: string | null; positionOrder: number | null;
}
export function buildMemberYearStatus(year: number, m: MemberYearInput, today?: Date): MemberYearStatus;
export function sortForExport(rows: MemberYearStatus[]): MemberYearStatus[]; // 직책 → positionOrder → 가나다
```

`cells` 규칙: 면제 → 전부 `EXEMPT`; 휴회 달 → `LEAVE`; 의무 아님(시작 전·탈퇴 후) → `NONE`; 의무이고 납부 → `PAID`; 의무·미납이고 지난 달 또는 이번 달 → `UNPAID`; 의무·미납·미래 → `FUTURE`. 기존 `MemberPaymentStatus` 필드(`payments`, `paidCount`, `totalMonths`, `firstObligationMonth`, `obligationMonths`, `leaveMonths`, `feeObligationStartMonth`, `isLeft`, `leftMonth`, `leftAtFormatted`, `type`, `couplePartnerName`)는 `dashboard.ts` 212~318행의 계산을 옮겨 그대로 채운다.

- [ ] **Step 1: 실패하는 테스트**

```ts
import { describe, expect, it } from '@jest/globals';

import { buildMemberYearStatus, sortForExport } from './memberYearStatus';

const today = new Date(2026, 9, 10); // 10월
const base = (over: Partial<Parameters<typeof buildMemberYearStatus>[1]>) => ({
  id: 1, userId: 11, name: '가나다', status: 'APPROVED', feeObligationStartAt: new Date(2026, 2, 1), leftAt: null,
  position: null, positionOrder: null, isExempt: false, couplePartnerName: null, leavePeriods: [], paidMonths: new Set([3, 4, 5]),
  ...over,
});

describe('buildMemberYearStatus', () => {
  it('시작 전은 NONE, 납부는 PAID, 지난 미납은 UNPAID, 미래는 FUTURE', () => {
    const s = buildMemberYearStatus(2026, base({}), today);
    expect(s.cells[1]).toBe('NONE');
    expect(s.cells[3]).toBe('PAID');
    expect(s.cells[6]).toBe('UNPAID');
    expect(s.cells[10]).toBe('UNPAID');
    expect(s.cells[11]).toBe('FUTURE');
    expect(s.totalMonths).toBe(10);
    expect(s.paidCount).toBe(3);
  });
  it('휴회 달은 LEAVE이고 사유를 싣는다', () => {
    const s = buildMemberYearStatus(2026, base({ leavePeriods: [{ startYear: 2026, startMonth: 6, endYear: 2026, endMonth: 7, reason: '무릎 부상' }] }), today);
    expect(s.cells[6]).toBe('LEAVE');
    expect(s.leaveReasons[6]).toBe('무릎 부상');
    expect(s.cells[8]).toBe('UNPAID');
  });
  it('면제는 전부 EXEMPT', () => {
    const s = buildMemberYearStatus(2026, base({ isExempt: true }), today);
    expect(Object.values(s.cells).every((c) => c === 'EXEMPT')).toBe(true);
    expect(s.type).toBe('exempt');
  });
  it('탈퇴 다음 달부터 NONE', () => {
    const s = buildMemberYearStatus(2026, base({ status: 'LEFT', leftAt: new Date(2026, 7, 20) }), today);
    expect(s.cells[8]).toBe('UNPAID');
    expect(s.cells[9]).toBe('NONE');
    expect(s.leftMonth).toBe(8);
  });
});

describe('sortForExport', () => {
  it('직책 있는 회원을 순서대로 먼저, 나머지는 가나다', () => {
    const rows = [
      buildMemberYearStatus(2026, base({ id: 3, name: '다라마' }), today),
      buildMemberYearStatus(2026, base({ id: 2, name: '나다라', position: '총무', positionOrder: 2 }), today),
      buildMemberYearStatus(2026, base({ id: 1, name: '마바사', position: '회장', positionOrder: 1 }), today),
      buildMemberYearStatus(2026, base({ id: 4, name: '가나다' }), today),
    ];
    expect(sortForExport(rows).map((r) => r.name)).toEqual(['마바사', '나다라', '가나다', '다라마']);
  });
});
```

- [ ] **Step 2: 실패 확인** → FAIL.

- [ ] **Step 3: 구현** — `dashboard.ts` 212~318행의 회원 한 명 계산을 그대로 옮기고 `cells`·`leaveReasons`·`position`을 더한다.

```ts
import { isPastOrCurrentMonth } from '@/components/organisms/membership-fee/PaymentDashboardTable';
```

위 import는 컴포넌트 의존이라 쓰지 않는다. 대신 lib 안에 `function isPastOrCurrent(year, month, today)`를 둔다. 핵심 부분:

```ts
  const cells: Record<number, CellStatus> = {};
  const leaveReasons: Record<number, string | null> = {};
  for (let month = 1; month <= 12; month++) {
    const obligated = isMonthObligated(year, month, m.feeObligationStartAt, m.leavePeriods, memberLeftAt);
    const leave = m.leavePeriods.find((p) => isMonthInLeave(year, month, p));
    const inRange = rawFirst != null && month >= rawFirst && month <= lastMonth;
    if (m.isExempt) cells[month] = 'EXEMPT';
    else if (inRange && leave) { cells[month] = 'LEAVE'; leaveReasons[month] = leave.reason ?? null; }
    else if (!obligated) cells[month] = 'NONE';
    else if (m.paidMonths.has(month)) cells[month] = 'PAID';
    else cells[month] = isPastOrCurrent(year, month, today) ? 'UNPAID' : 'FUTURE';
  }
```

`sortForExport`:

```ts
export function sortForExport(rows: MemberYearStatus[]): MemberYearStatus[] {
  const officers = rows.filter((r) => r.position).sort((a, b) => (a.positionOrder ?? 999) - (b.positionOrder ?? 999) || (a.name ?? '').localeCompare(b.name ?? '', 'ko-KR'));
  const others = rows.filter((r) => !r.position).sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', 'ko-KR'));
  return [...officers, ...others];
}
```

- [ ] **Step 4: `dashboard.ts`가 쓰게 바꾼다** — 회원 `select`에 `position: true, positionOrder: true`를 더하고, `leavesRaw`에 `reason`을 포함해 `leaveMap`에 넣고, 212~318행을 `buildMemberYearStatus(year, {...}, new Date())`로 바꾼다. 응답 형태는 그대로(새 필드 `cells`·`leaveReasons`·`position`이 더해질 뿐).

- [ ] **Step 5: 테스트·타입·커밋**

Run: `npx jest src/lib/membership-fee/memberYearStatus.test.ts src/__tests__/pages && npx tsc --noEmit`

```bash
git add src/lib/membership-fee/memberYearStatus.ts src/lib/membership-fee/memberYearStatus.test.ts "src/pages/api/clubs/[id]/membership-fee/dashboard.ts"
git commit -m "refactor(membership-fee): 회원별 월 상태 계산을 lib로 분리해 대시보드와 내보내기가 공유"
```

---

### Task 18: 납부현황 엑셀 내보내기 API

**Files:**
- Create: `src/lib/membership-fee/exportWorkbook.ts`
- Create: `src/pages/api/clubs/[id]/membership-fee/export.ts`
- Test: `src/lib/membership-fee/exportWorkbook.test.ts`
- Modify: `package.json` (`exceljs` 추가)

**Interfaces:**
- Consumes: `MemberYearStatus`, `sortForExport` (Task 17).
- Produces: `buildFeeStatusWorkbook(params: { year: number; asOf: Date; rows: MemberYearStatus[] }): Promise<Buffer>`; `GET /api/clubs/[id]/membership-fee/export?year=` → `.xlsx` 다운로드.

- [ ] **Step 1: 의존성**

Run: `npm install exceljs@4.4.0`

- [ ] **Step 2: 실패하는 테스트**

```ts
import { describe, expect, it } from '@jest/globals';
import ExcelJS from 'exceljs';

import { buildMemberYearStatus } from './memberYearStatus';
import { buildFeeStatusWorkbook, CELL_FILL } from './exportWorkbook';

const today = new Date(2026, 3, 20);
const row = (over: Partial<Parameters<typeof buildMemberYearStatus>[1]>) =>
  buildMemberYearStatus(2026, { id: 1, userId: 1, name: '가나다', status: 'APPROVED', feeObligationStartAt: new Date(2025, 0, 1), leftAt: null, position: null, positionOrder: null, isExempt: false, couplePartnerName: null, leavePeriods: [], paidMonths: new Set([1, 2, 3]), ...over }, today);

describe('buildFeeStatusWorkbook', () => {
  it('제목·반영일·범례·머리글·행을 만든다', async () => {
    const buf = await buildFeeStatusWorkbook({ year: 2026, asOf: today, rows: [row({ position: '회장', positionOrder: 1 }), row({ id: 2, name: '나다라', leavePeriods: [{ startYear: 2026, startMonth: 1, endYear: 2026, endMonth: 4, reason: '무릎 부상' }] })] });
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    const ws = wb.getWorksheet(1)!;
    expect(ws.getCell('A1').value).toBe('2026년 월회비 납부현황');
    expect(String(ws.getCell('P2').value)).toContain('반영일 : 2026.4.20');
    const header = ws.getRow(4).values as unknown[];
    expect(header.slice(1, 4)).toEqual(['NO', '성명', '1월']);
    expect(header[15]).toBe('비고');
    const first = ws.getRow(5);
    expect(first.getCell(2).value).toBe('가나다');
    expect(first.getCell(15).value).toBe('회장');
    expect((first.getCell(3).fill as ExcelJS.FillPattern).fgColor?.argb).toBe(CELL_FILL.PAID);
    expect((first.getCell(6).fill as ExcelJS.FillPattern).fgColor?.argb).toBe(CELL_FILL.UNPAID); // 4월 미납
    expect((first.getCell(7).fill as ExcelJS.FillPattern).fgColor?.argb).toBe(CELL_FILL.FUTURE); // 5월
    const second = ws.getRow(6);
    expect(second.getCell(3).value).toBe('무릎 부상');
    expect((second.getCell(3).fill as ExcelJS.FillPattern).fgColor?.argb).toBe(CELL_FILL.LEAVE);
  });
});
```

- [ ] **Step 3: 실패 확인** → FAIL.

- [ ] **Step 4: 구현**

```ts
import ExcelJS from 'exceljs';

import { type CellStatus, type MemberYearStatus, sortForExport } from './memberYearStatus';

/** 재무의 기존 엑셀 범례 색 (ARGB) */
export const CELL_FILL: Record<CellStatus, string> = {
  PAID: 'FFFFF2CC',   // 완납 베이지
  UNPAID: 'FFC00000', // 미납 빨강
  EXEMPT: 'FF2F75B5', // 면제 파랑
  LEAVE: 'FF548235',  // 병가 초록
  NONE: 'FFBFBFBF',   // 해당없음 회색
  FUTURE: 'FFFFFFFF', // 아직 안 온 달 흰색
};
const LEGEND: { label: string; status: CellStatus }[] = [
  { label: '완납', status: 'PAID' }, { label: '미납', status: 'UNPAID' }, { label: '면제', status: 'EXEMPT' }, { label: '병가', status: 'LEAVE' }, { label: '해당없음', status: 'NONE' },
];
const HEADER_FILL = 'FF305496';
const fill = (argb: string): ExcelJS.FillPattern => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const thin: Partial<ExcelJS.Borders> = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

export async function buildFeeStatusWorkbook(params: { year: number; asOf: Date; rows: MemberYearStatus[] }): Promise<Buffer> {
  const { year, asOf, rows } = params;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(`${year}년 납부현황`, { pageSetup: { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  ws.columns = [{ width: 5 }, { width: 9 }, ...Array.from({ length: 12 }, () => ({ width: 6 })), { width: 10 }];

  ws.mergeCells('A1:O1');
  ws.getCell('A1').value = `${year}년 월회비 납부현황`;
  ws.getCell('A1').font = { size: 18, bold: true };
  ws.getCell('A1').alignment = { horizontal: 'center' };
  ws.getCell('P2').value = `반영일 : ${asOf.getFullYear()}.${asOf.getMonth() + 1}.${asOf.getDate()}`;
  ws.getCell('P2').font = { bold: true };

  // 범례: 3행 오른쪽에 라벨·색칸을 번갈아
  LEGEND.forEach((l, i) => {
    const labelCell = ws.getRow(3).getCell(5 + i * 2);
    const colorCell = ws.getRow(3).getCell(6 + i * 2);
    labelCell.value = l.label;
    labelCell.alignment = { horizontal: 'right' };
    colorCell.fill = fill(CELL_FILL[l.status]);
    colorCell.border = thin;
  });

  const header = ws.getRow(4);
  header.values = ['NO', '성명', ...Array.from({ length: 12 }, (_, i) => `${i + 1}월`), '비고'];
  header.eachCell((c) => { c.fill = fill(HEADER_FILL); c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.alignment = { horizontal: 'center' }; c.border = thin; });

  const sorted = sortForExport(rows);
  const officerCount = sorted.filter((r) => r.position).length;
  sorted.forEach((m, idx) => {
    const r = ws.getRow(5 + idx);
    r.getCell(1).value = idx + 1;
    r.getCell(2).value = m.name;
    for (let month = 1; month <= 12; month++) {
      const c = r.getCell(2 + month);
      const status = m.cells[month];
      c.fill = fill(CELL_FILL[status]);
      c.border = thin;
      if (status === 'LEAVE' && m.leaveReasons[month]) {
        c.value = m.leaveReasons[month];
        c.font = { size: 8 };
      }
    }
    r.getCell(15).value = m.position ?? '';
    [1, 2, 15].forEach((i) => { r.getCell(i).border = thin; r.getCell(i).alignment = { horizontal: 'center' }; });
    if (officerCount > 0 && idx === officerCount - 1) {
      for (let i = 1; i <= 15; i++) r.getCell(i).border = { ...thin, bottom: { style: 'medium' } };
    }
  });

  return Buffer.from(await wb.xlsx.writeBuffer());
}
```

- [ ] **Step 5: API 핸들러**

`src/pages/api/clubs/[id]/membership-fee/export.ts` — `dashboard.ts`와 같은 조회(회원·휴회·면제·부부·납부)를 해서 `buildMemberYearStatus`로 rows를 만든다. 조회 부분은 `dashboard.ts`에서 함수 `loadMemberYearInputs(prisma, clubId, year)`로 빼 `src/lib/membership-fee/memberYearStatus.ts` 옆 `memberYearStatusLoader.ts`에 두고 둘이 같이 쓴다. 핸들러 본문:

```ts
  try {
    const inputs = await loadMemberYearInputs(prisma, clubIdNumber, year);
    const rows = inputs
      .map((m) => buildMemberYearStatus(year, m, new Date()))
      .filter((m) => m.totalMonths > 0 || m.type === 'exempt');
    const buf = await buildFeeStatusWorkbook({ year, asOf: new Date(), rows });
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(`회비납부현황_${year}_${stamp}.xlsx`)}`);
    return res.status(200).send(buf);
  } catch (error) {
    console.error('Error exporting fee status:', error);
    return res.status(500).json({ error: '내보내기 중 오류가 발생했습니다', status: 500 });
  }
```

메소드 가드(GET)·clubId·`Role.ADMIN` 검증은 규칙대로. 파일 응답이라 성공 시 JSON 포맷 예외임을 주석으로 적는다.

- [ ] **Step 6: 테스트·타입·커밋**

Run: `npx jest src/lib/membership-fee/exportWorkbook.test.ts && npx tsc --noEmit`

```bash
git add package.json package-lock.json src/lib/membership-fee/exportWorkbook.ts src/lib/membership-fee/exportWorkbook.test.ts src/lib/membership-fee/memberYearStatusLoader.ts "src/pages/api/clubs/[id]/membership-fee/export.ts" "src/pages/api/clubs/[id]/membership-fee/dashboard.ts"
git commit -m "feat(membership-fee): 연간 납부현황을 엑셀로 내보내는 API 추가"
```

---

### Task 19: 회원 직책 — API와 회원 상세 화면

**Files:**
- Modify: `src/pages/api/clubs/[id]/members/[userId]/fee-obligation.ts:58-83`
- Modify: `src/pages/api/clubs/[id]/members/[userId]/index.ts` (GET select에 `position`, `positionOrder`)
- Modify: `src/components/organisms/membership-fee/MemberFeeDetailView.tsx`
- Modify: `src/pages/clubs/[id]/members/[userId].tsx`
- Test: `src/__tests__/components/membership-fee/MemberFeeDetailView.position.dom.test.tsx`

- [ ] **Step 1: API** — `fee-obligation.ts`의 `data`에:

```ts
  if ('position' in req.body) {
    const p = req.body.position;
    data.position = typeof p === 'string' && p.trim() ? p.trim().slice(0, 20) : null;
  }
  if ('positionOrder' in req.body) {
    const o = req.body.positionOrder;
    data.positionOrder = o === null || o === '' || o === undefined ? null : Number(o);
    if (data.positionOrder != null && !Number.isInteger(data.positionOrder)) {
      return res.status(400).json({ error: '정렬 순서는 정수여야 합니다', status: 400 });
    }
  }
```

`data` 타입에 `position?: string | null; positionOrder?: number | null` 추가. GET(`index.ts`)의 `findUnique` select(또는 반환 객체)에 두 필드를 넣는다.

- [ ] **Step 2: 실패하는 dom 테스트**

```tsx
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';

import { MemberFeeDetailView } from '@/components/organisms/membership-fee/MemberFeeDetailView';

const member = { id: 1, name: '가나다', status: 'APPROVED', createdAt: '2026-01-01', feeObligationStartAt: null, leftAt: null, position: '총무', positionOrder: 2 };

describe('MemberFeeDetailView 직책', () => {
  it('직책과 정렬 순서를 보여 주고 바꿀 수 있다', () => {
    const onChangePosition = jest.fn();
    render(<MemberFeeDetailView member={member} leaves={[]} saving={false} feeStartInput="" onChangeFeeStart={() => {}} onSaveFeeStart={() => {}} leftAtInput="" onChangeLeftAt={() => {}} feeEndInput="" onChangeFeeEnd={() => {}} onSaveLeftInfo={() => {}} onSubmitLeave={async () => true} onDeleteLeave={() => {}} positionInput="총무" positionOrderInput="2" onChangePosition={onChangePosition} onChangePositionOrder={() => {}} onSavePosition={() => {}} />);
    expect(screen.getByLabelText('직책')).toHaveValue('총무');
    fireEvent.change(screen.getByLabelText('직책'), { target: { value: '재무' } });
    expect(onChangePosition).toHaveBeenCalledWith('재무');
  });
});
```

- [ ] **Step 3: 화면** — `ClubMemberDetail`에 `position: string | null; positionOrder: number | null`. props에 `positionInput: string; positionOrderInput: string; onChangePosition; onChangePositionOrder; onSavePosition`. "회비 설정" `ListGroup` 아래에 새 `ListGroup label="직책"`:

```tsx
      <ListGroup label="직책" footer="납부현황 내보내기의 비고에 적히고, 직책이 있는 회원이 먼저 나옵니다.">
        <div className="grid grid-cols-1 gap-4 px-4 py-3 sm:grid-cols-2">
          <FormField label="직책">
            <Input type="text" value={positionInput} onChange={(e) => onChangePosition(e.target.value)} placeholder="회장, 총무, 재무, 감사, 이사 등" maxLength={20} />
          </FormField>
          <FormField label="정렬 순서">
            <Input type="number" min={1} value={positionOrderInput} onChange={(e) => onChangePositionOrder(e.target.value)} placeholder="작을수록 위" />
          </FormField>
        </div>
        <div className="px-4 py-3">
          <Button type="button" size="sm" onClick={onSavePosition} pending={saving} pendingText="저장 중…" pendingPosition="left">저장</Button>
        </div>
      </ListGroup>
```

`FormField`가 `label`을 `<label htmlFor>`로 연결하는지 확인하고(`src/components/molecules/form/FormField.tsx`), 아니면 `Input`에 `aria-label="직책"`을 준다.

- [ ] **Step 4: 페이지** — `[userId].tsx`에 `positionInput`·`positionOrderInput` state(fetch 시 `data.position ?? ''`, `data.positionOrder ?? ''`), `onSavePosition`이 `axios.patch(…/fee-obligation, { feeObligationStartAt: …(기존 값 유지), position, positionOrder })` 후 `toast.success('직책이 저장되었습니다.')`.

- [ ] **Step 5: 테스트·커밋**

Run: `npx jest src/__tests__/components/membership-fee/MemberFeeDetailView.position.dom.test.tsx && npx tsc --noEmit`

```bash
git add "src/pages/api/clubs/[id]/members/[userId]" src/components/organisms/membership-fee/MemberFeeDetailView.tsx "src/pages/clubs/[id]/members/[userId].tsx" src/__tests__/components/membership-fee/MemberFeeDetailView.position.dom.test.tsx
git commit -m "feat(members): 회원 직책과 정렬 순서를 회원 상세에서 편집"
```

---

### Task 20: 처리 화면 — 분류 칩·검토 필요·분할·메모, 업로드 요약

**Files:**
- Modify: `src/constants/statusTone.ts` (domain `paymentKind`)
- Modify: `src/components/organisms/membership-fee/paymentRecordDisplay.ts` (라벨)
- Modify: `src/components/organisms/membership-fee/PaymentRecordsView.tsx` (열·리스트 둘째 줄)
- Modify: `src/components/organisms/membership-fee/PaymentRecordSheet.tsx` (분류·분할·메모 섹션, 기본 월)
- Modify: `src/components/molecules/membership-fee/PaymentRecordFilters.tsx`, `src/lib/membership-fee/processView.ts` (분류·검토 필요 필터)
- Modify: `src/pages/clubs/[id]/membership-fee/process.tsx` (일괄 확정 대상·제외 사유)
- Modify: `src/pages/clubs/[id]/membership-fee/upload.tsx` (요약)
- Test: `src/lib/membership-fee/processView.test.ts`(있으면 추가, 없으면 생성), `src/__tests__/components/membership-fee/PaymentRecordSheet.kind.dom.test.tsx`

**Interfaces:**
- Consumes: `PaymentRecord.kind/needsReview/nonFeeAmount/nonFeeKind/note/suggestedSelections/errorReason`, `PaymentRecordUpdateInput`.
- Produces: `PaymentRecordActions.onUpdateRecord(recordId, data: PaymentRecordUpdateInput)` (기존 `onUpdateMember`는 유지), 필터 값 `kinds: PaymentRecordKind[]`, `needsReviewOnly: boolean`.

- [ ] **Step 1: 상태색·라벨**

`statusTone.ts`의 `StatusDomain`에 `'paymentKind'`, `TONES`에:

```ts
  paymentKind: {
    FEE: 'positive',
    JOINING_FEE: 'warning',
    EVENT: 'neutral',
    OTHER: 'neutral',
    INTEREST: 'neutral',
  },
```

`paymentRecordDisplay.ts`에:

```ts
export const PAYMENT_KIND_LABEL: Record<PaymentRecordKind, string> = {
  FEE: '회비', JOINING_FEE: '가입비', EVENT: '행사', OTHER: '기타', INTEREST: '이자',
};
export const NON_FEE_KIND_LABEL: Record<NonFeeKind, string> = {
  JOINING_FEE: '가입비', EVENT: '행사', OTHER: '기타', OVERPAY: '초과 입금',
};
/** "회비 25,000원 (가입비 100,000원 제외)" */
export function formatFeeAmount(record: PaymentRecord): string {
  if (record.nonFeeAmount <= 0) return `${record.amount.toLocaleString()}원`;
  const kind = record.nonFeeKind ? NON_FEE_KIND_LABEL[record.nonFeeKind] : '비회비';
  return `회비 ${(record.amount - record.nonFeeAmount).toLocaleString()}원 (${kind} ${record.nonFeeAmount.toLocaleString()}원 제외)`;
}
```

- [ ] **Step 2: 표·리스트** — `PaymentRecordsView.tsx`의 `amount` 열 cell을 `formatFeeAmount(record)`로, `status` 열 cell에 분류 칩과 검토 필요 칩을 더한다:

```tsx
      <div className="flex flex-col items-start gap-1">
        <div className="flex flex-wrap gap-1">
          {statusChip(record)}
          {record.kind !== 'FEE' && (
            <StatusChip domain="paymentKind" status={record.kind}>{PAYMENT_KIND_LABEL[record.kind]}</StatusChip>
          )}
          {record.needsReview && <StatusChip tone="warning">검토 필요</StatusChip>}
        </div>
        {record.errorReason && <span className="text-caption text-negative">{record.errorReason}</span>}
      </div>
```

`listSubtitle`에 `record.kind !== 'FEE' ? PAYMENT_KIND_LABEL[record.kind] : null`, `record.needsReview ? '검토 필요' : null`을 넣는다.

- [ ] **Step 3: 시트** — `PaymentRecordActions`에 `onUpdateRecord: (recordId: string, data: PaymentRecordUpdateInput) => void` 추가. `initialSelections`를 `record.suggestedSelections`가 있으면 그것을 연도별로 묶어 쓰도록 바꾼다(없으면 기존 순서). 매칭 회원 섹션 위에 "분류" 섹션:

```tsx
        <section aria-label="분류" className="space-y-2">
          <h3 className="text-footnote font-medium text-secondary">분류</h3>
          <div className="flex items-center gap-2">
            <Select aria-label="분류" placeholder={null} fullWidth={false} value={record.kind} disabled={!canChange || isUpdating}
              onChange={(e) => onUpdateRecord(record.id, { kind: e.target.value as PaymentRecordKind })}
              options={(Object.keys(PAYMENT_KIND_LABEL) as PaymentRecordKind[]).map((k) => ({ value: k, label: PAYMENT_KIND_LABEL[k] }))} />
            {record.kindReason && <span className="text-caption text-secondary">{record.kindReason}</span>}
          </div>
          {record.kind === 'FEE' && canChange && (
            <div className="flex flex-wrap items-end gap-2">
              <FormField label="비회비 금액">
                <Input type="number" min={0} max={record.amount - 1} value={nonFeeAmountInput} onChange={(e) => setNonFeeAmountInput(e.target.value)} className="w-32" />
              </FormField>
              <FormField label="성격">
                <Select aria-label="비회비 성격" placeholder="선택" fullWidth={false} value={nonFeeKindInput} onChange={(e) => setNonFeeKindInput(e.target.value as NonFeeKind | '')}
                  options={(Object.keys(NON_FEE_KIND_LABEL) as NonFeeKind[]).map((k) => ({ value: k, label: NON_FEE_KIND_LABEL[k] }))} />
              </FormField>
              <Button type="button" size="sm" variant="secondary" disabled={isUpdating || (Number(nonFeeAmountInput) > 0 && !nonFeeKindInput)}
                onClick={() => onUpdateRecord(record.id, { nonFeeAmount: Number(nonFeeAmountInput) || 0, nonFeeKind: nonFeeKindInput || null })}>
                적용
              </Button>
            </div>
          )}
          <p className="text-caption text-secondary">{formatFeeAmount(record)}</p>
        </section>
```

메모는 맨 아래 섹션으로, 확정·건너뜀 상태에서도 쓸 수 있다:

```tsx
        <section aria-label="메모" className="space-y-1">
          <h3 className="text-footnote font-medium text-secondary">메모</h3>
          <Input type="text" value={noteInput} onChange={(e) => setNoteInput(e.target.value)} onBlur={() => noteInput !== (record.note ?? '') && onUpdateRecord(record.id, { note: noteInput || null })} placeholder="처리 메모 (예: 4월병가, 5월로 이월)" maxLength={500} />
        </section>
```

state: `nonFeeAmountInput`(초기 `String(record.nonFeeAmount || '')`), `nonFeeKindInput`(초기 `record.nonFeeKind ?? ''`), `noteInput`(초기 `record.note ?? ''`).

납부월 섹션에는 **탭 한 번에 고르는 칩**을 둔다. `record.reviewReasons`(Task 14)가 있으면 warning 톤 글자로 보여 주고(빨강은 `status === 'ERROR'`일 때만), 그 아래에:

```tsx
            <div className="flex flex-wrap gap-1" aria-label="빠른 선택">
              {record.monthHints && (
                <Chip onClick={() => setSelections(groupByYear(record.monthHints!.months))}>
                  {`힌트(${record.monthHints.source === 'memo' ? '메모' : '입금자명'}): ${formatYms(record.monthHints.months)}`}
                </Chip>
              )}
              {record.suggestedSelections && record.suggestedSelections.length > 0 && (
                <Chip onClick={() => setSelections(groupByYear(record.suggestedSelections!))}>
                  {`제안: ${formatYms(record.suggestedSelections)}`}
                </Chip>
              )}
              {record.suggestedStartMonth && (
                <Chip tone="warning" onClick={() => onAdvanceStartMonth(record.id, memberIds[0], record.suggestedStartMonth!)}>
                  {`의무 시작월을 ${record.suggestedStartMonth.year}년 ${record.suggestedStartMonth.month}월로 앞당기기`}
                </Chip>
              )}
              {topUpTarget && (
                <Chip onClick={() => setSelections([{ year: topUpTarget.year, months: [topUpTarget.month] }])}>
                  {`${topUpTarget.month}월 부족분 충당`}
                </Chip>
              )}
            </div>
```

- `Chip`은 `src/components/atoms/Chip.tsx`가 있으면 쓰고, 없으면 `StatusChip`과 같은 토큰으로 버튼형 칩 atom을 만든다(`tone` 기본 `neutral`).
- `groupByYear(yms)`·`formatYms(yms)`는 `paymentRecordDisplay.ts`에 더한다 (`[{year, month}]` → `YearMonthSelection[]`, "2026년 6, 7월").
- `onAdvanceStartMonth(recordId, memberId, ym)`는 `PaymentRecordActions`에 추가. 페이지는 `axios.patch(/api/clubs/{id}/members/{userId}/fee-obligation, { feeObligationStartAt })` 후 `paymentRecords`·`paymentDashboard`를 무효화한다. `userId`가 필요하므로 `matchable-members` 응답에 `userId`를 더한다(Task 6의 API select에 `userId: true`).
- `topUpTarget`: `record.reviewReasons`에 `입금 부족`이 있고 `record.suggestedSelections[0]`의 달에 매칭 회원의 부족 납부가 있을 때. 부족 납부 정보는 Task 14의 `attachPlans`가 `partialPaidMonth: { year, month } | null`로 붙인다(`ctx.paidByMember`에 금액을 함께 싣고, 단가 미만인 달을 찾는다).

- [ ] **Step 4: 페이지 핸들러** — `process.tsx`·`upload.tsx`에 `handleUpdateRecord`:

```ts
  const handleUpdateRecord = async (recordId: string, data: PaymentRecordUpdateInput) => {
    try {
      await updateMutation.mutateAsync({ recordId, data });
    } catch (error: any) {
      toast.error(error.message || '수정에 실패했습니다.');
    }
  };
```

`upload.tsx`는 응답 record로 `uploadedRecords`를 교체한다(기존 `handleUpdateMember`와 같은 방식). 두 페이지에서 `PaymentRecordsView`에 `onUpdateRecord={handleUpdateRecord}`를 넘긴다.

- [ ] **Step 5: 필터와 딥링크** — `PaymentRecordFilterValues`에 `kinds: PaymentRecordKind[]; needsReviewOnly: boolean` (초기 `[]`, `false`). 필터 영역에 분류 체크박스 5개(`Checkbox` atom)와 "검토 필요만" 체크박스. `process.tsx`는 URL의 `review=1`·`kind=EVENT,OTHER`를 읽어 초기 필터로 쓰고, 그때 필터 영역을 펼친 채로 연다(`isOpen`). `applyFilters`에:

```ts
    if (filters.kinds.length > 0 && !filters.kinds.includes(record.kind)) return false;
    if (filters.needsReviewOnly && !record.needsReview) return false;
```

`hasActiveFilters`(필터 컴포넌트와 `process.tsx` 둘 다)에 두 조건을 더한다. `processView.test.ts`에 두 케이스를 추가한다.

- [ ] **Step 6: 일괄 확정 대상과 제외 사유** — `process.tsx`의 `handleBulkConfirm`에서 대상을 `status === 'MATCHED' && kind === 'FEE' && !needsReview && hasMatchedMembers(r)`로 좁히고, 제외된 MATCHED 건 수를 센다. Toolbar `actions`:

```tsx
            <div className="flex items-center gap-2">
              {excludedMatched > 0 && (
                <Button type="button" size="sm" variant="plain" onClick={showExcludedReasons}>
                  제외 {excludedMatched}건 (사유 보기)
                </Button>
              )}
              <Button type="button" size="sm" onClick={handleBulkConfirm} disabled={bulk.isBulkConfirmPending || confirmableMatched.length === 0}>
                <CheckCircle aria-hidden className="mr-1 h-4 w-4" />
                매칭된 항목 일괄 확정 ({confirmableMatched.length}건)
              </Button>
            </div>
```

`showExcludedReasons`는 `useConfirm({ title: `일괄 확정에서 제외된 ${n}건`, message: lines.join('\n'), hideCancel: true })`로, 각 줄은 `• ${depositorName}: ${record.kind !== 'FEE' ? PAYMENT_KIND_LABEL[kind] : record.errorReason ?? '검토 필요'}`.

- [ ] **Step 7: 업로드 요약과 다음 할 일 버튼** — `upload.tsx`의 요약 카드를 두 줄로: 첫 줄 전체·회비·가입비·행사·기타·이자, 둘째 줄 매칭됨·대기·에러·검토 필요·중복 제외. `uploadSummary` state 타입을 훅의 새 `summary`로 바꾼다. 중복이 있으면 `Notice`로 "이미 올라온 N건은 제외했습니다", `ratesFallbackYears`가 있으면 `Notice tone="warning"`으로 "YYYY년 단가가 없어 YYYY년 단가로 판정했습니다. 회비 유형 관리에서 등록해주세요". 요약 카드 아래에 버튼 둘:

```tsx
          <div className="mt-3 flex flex-wrap gap-2">
            {uploadSummary.needsReview > 0 && (
              <Button type="button" size="sm" variant="secondary" onClick={() => router.push(`/clubs/${clubId}/membership-fee/process?batchId=${batchId}&review=1`)}>
                검토 필요 {uploadSummary.needsReview}건 처리
              </Button>
            )}
            {uploadSummary.confirmable > 0 && (
              <Button type="button" size="sm" onClick={handleBulkConfirmUploaded} disabled={bulkConfirmMutation.isPending}>
                <CheckCircle aria-hidden className="mr-1 h-4 w-4" />
                {uploadSummary.confirmable}건 일괄 확정
              </Button>
            )}
          </div>
```

`handleBulkConfirmUploaded`는 `useBulkConfirmPayments`로 `uploadedRecords` 중 `status === 'MATCHED' && kind === 'FEE' && !needsReview`인 id를 보내고, 결과는 `useBulkPaymentActions`의 `reportResultAndPrune`과 같은 형식(실패 사유에 입금자명 prefix, `useConfirm`·`toast`)으로 알린 뒤 응답 id로 `uploadedRecords`의 status를 `CONFIRMED`로 바꾼다. `batchId`는 업로드 응답 `batch.id`를 state에 둔다.

- [ ] **Step 8: dom 테스트** — `PaymentRecordSheet.kind.dom.test.tsx`: 분류 `Select`를 `EVENT`로 바꾸면 `onUpdateRecord(id, { kind: 'EVENT' })`가 불리고, 비회비 금액 `100000` + 성격 `JOINING_FEE` + 적용 → `onUpdateRecord(id, { nonFeeAmount: 100000, nonFeeKind: 'JOINING_FEE' })`, 메모 blur → `{ note: '…' }`.

- [ ] **Step 9: 지킴이·전체 테스트·미리보기 확인·커밋**

Run: `npx jest src/__tests__/guards src/__tests__/styles src/__tests__/components src/lib/membership-fee && npx tsc --noEmit`

`/dev/admin-preview`에 가짜 레코드(분류 EVENT·검토 필요·분할 건)를 넣어 휴대폰(390)·PC(1280) × 라이트·다크 네 가지를 본다. 지킴이 테스트가 원시 `<input>`이나 색 클래스를 잡으면 고친다.

```bash
git add src/constants/statusTone.ts src/components src/lib/membership-fee/processView.ts src/lib/membership-fee/processView.test.ts "src/pages/clubs/[id]/membership-fee/process.tsx" "src/pages/clubs/[id]/membership-fee/upload.tsx" src/__tests__/components
git commit -m "feat(membership-fee): 처리 화면에 분류·검토 필요·비회비 금액·메모를 두고 일괄 확정 제외 사유를 보여준다"
```

---

### Task 21: 대시보드 — 납부현황 내보내기 버튼

**Files:**
- Modify: `src/hooks/membership-fee/usePaymentDashboard.ts` (`useExportFeeStatus`)
- Modify: `src/components/organisms/membership-fee/FeeDashboardView.tsx:144-152`
- Test: `src/__tests__/components/membership-fee/FeeDashboardView.export.dom.test.tsx`

- [ ] **Step 1: 훅**

```ts
export function useExportFeeStatus(clubId: string | undefined) {
  return useMutation({
    mutationFn: async (year: number) => {
      if (!clubId) throw new Error('클럽 ID가 필요합니다');
      const response = await axios.get(`/api/clubs/${clubId}/membership-fee/export?year=${year}`, { responseType: 'blob' });
      const disposition = String(response.headers['content-disposition'] ?? '');
      const m = /filename\*=UTF-8''([^;]+)/.exec(disposition);
      const fileName = m ? decodeURIComponent(m[1]) : `회비납부현황_${year}.xlsx`;
      const url = URL.createObjectURL(response.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      return fileName;
    },
  });
}
```

- [ ] **Step 2: 버튼** — `FeeDashboardViewProps`에 `onExport: () => void; isExporting: boolean`. `Toolbar`에 `actions`:

```tsx
            actions={
              <Button type="button" size="sm" variant="secondary" onClick={onExport} pending={isExporting} pendingText="내보내는 중…" pendingPosition="left">
                <Download aria-hidden className="mr-1 h-4 w-4" />
                납부현황 내보내기
              </Button>
            }
```

`index.tsx`에서 `const exportMutation = useExportFeeStatus(clubIdStr)`; `onExport={() => exportMutation.mutateAsync(year).then((f) => toast.success(`${f} 저장`)).catch((e) => toast.error(e.message || '내보내기에 실패했습니다.'))}`.

- [ ] **Step 3: dom 테스트** — 버튼을 누르면 `onExport`가 불리고, `isExporting`이면 "내보내는 중…"이 보인다.

- [ ] **Step 4: 커밋**

```bash
git add src/hooks/membership-fee/usePaymentDashboard.ts src/components/organisms/membership-fee/FeeDashboardView.tsx "src/pages/clubs/[id]/membership-fee/index.tsx" src/__tests__/components/membership-fee/FeeDashboardView.export.dom.test.tsx
git commit -m "feat(membership-fee): 대시보드에서 납부현황 엑셀을 내려받는 버튼 추가"
```

---

### Task 22: 파이프라인 회귀 테스트 (합성 통장 fixture)

**Files:**
- Create: `src/lib/membership-fee/__fixtures__/bankStatement.ts`
- Test: `src/lib/membership-fee/pipeline.regression.test.ts`

실제 통장·회원 이름은 넣지 않는다. 2026년 파일에서 본 **패턴**만 가짜 이름으로 옮긴다. 각 행에 기대 결과를 같이 적어, 파이프라인(분류 → 매칭 → 계획)이 바뀌면 어느 패턴이 깨졌는지 바로 드러나게 한다.

- [ ] **Step 1: fixture**

```ts
export const MEMBERS = [
  { id: 1, name: '가나다', status: 'APPROVED', feeObligationStartAt: new Date(2025, 0, 1), leftAt: null },
  { id: 2, name: '마바사', status: 'APPROVED', feeObligationStartAt: new Date(2025, 0, 1), leftAt: null },
  { id: 3, name: '아자차', status: 'APPROVED', feeObligationStartAt: new Date(2025, 0, 1), leftAt: null }, // 부부 A
  { id: 4, name: '카타파', status: 'APPROVED', feeObligationStartAt: new Date(2025, 0, 1), leftAt: null }, // 부부 B
  { id: 5, name: '하거너', status: 'LEFT', feeObligationStartAt: new Date(2025, 0, 1), leftAt: new Date(2026, 2, 31) },
  { id: 6, name: '더러머', status: 'APPROVED', feeObligationStartAt: new Date(2026, 5, 1), leftAt: null }, // 6월 가입
];
export const COUPLE_GROUPS = [{ id: 1, members: [3, 4].map((id) => ({ clubMemberId: id, clubMember: { ...MEMBERS[id - 1], leavePeriods: [] } })) }];
export const COUPLE_HISTORIES = [
  { clubMemberId: 3, partnerClubMemberId: 4, startedAt: new Date(2025, 0, 1), endedAt: null },
  { clubMemberId: 4, partnerClubMemberId: 3, startedAt: new Date(2025, 0, 1), endedAt: null },
];
export const RATES = { regularMonthly: 25000, coupleMonthly: 45000, regularAnnual: 275000, coupleAnnual: 495000, joiningFeeAmounts: [100000] };

type Expect = { kind: string; status: 'SKIPPED' | 'PENDING' | 'MATCHED'; memberIds?: number[]; months?: number[]; needsReview?: boolean; nonFeeAmount?: number };
export const ROWS: { date: string; name: string; amount: number; memo?: string; type?: string; expect: Expect }[] = [
  { date: '2026-05-03', name: '가나다5월', amount: 25000, expect: { kind: 'FEE', status: 'MATCHED', memberIds: [1], months: [5], needsReview: false } },
  { date: '2026-05-03', name: '가나다', amount: 25000, expect: { kind: 'FEE', status: 'MATCHED', memberIds: [1], months: [5], needsReview: false } },
  { date: '2026-05-04', name: '마바사 5,6월', amount: 50000, expect: { kind: 'FEE', status: 'MATCHED', memberIds: [2], months: [5, 6], needsReview: false } },
  { date: '2026-05-04', name: '마바사6~9월', amount: 100000, expect: { kind: 'FEE', status: 'MATCHED', memberIds: [2], months: [6, 7, 8, 9], needsReview: false } },
  { date: '2026-05-05', name: '아자차카타파5월', amount: 45000, expect: { kind: 'FEE', status: 'MATCHED', memberIds: [3, 4], months: [5], needsReview: false } },
  { date: '2026-05-05', name: '아자차', amount: 25000, expect: { kind: 'FEE', status: 'MATCHED', memberIds: [3], months: [5], needsReview: false } },
  { date: '2026-05-06', name: '가나다', amount: 125000, expect: { kind: 'FEE', status: 'MATCHED', memberIds: [1], months: [6], nonFeeAmount: 100000, needsReview: false } },
  { date: '2026-05-06', name: '더러머가입비', amount: 100000, expect: { kind: 'JOINING_FEE', status: 'SKIPPED' } },
  { date: '2026-05-07', name: '마바사연회비', amount: 275000, expect: { kind: 'FEE', status: 'MATCHED', memberIds: [2], needsReview: false } },
  { date: '2026-06-04', name: '가나다 뒷풀이', amount: 15000, memo: '1', expect: { kind: 'EVENT', status: 'SKIPPED' } },
  { date: '2026-08-12', name: '마바사단체티', amount: 20000, expect: { kind: 'EVENT', status: 'SKIPPED' } },
  { date: '2026-08-06', name: '가나다', amount: 26000, memo: '콕1', expect: { kind: 'FEE', status: 'MATCHED', memberIds: [1], needsReview: true } },
  { date: '2026-05-22', name: '입출금통장 이자', amount: 377, type: '예금이자', expect: { kind: 'INTEREST', status: 'SKIPPED' } },
  { date: '2026-05-08', name: '가나라3월회비', amount: 25000, expect: { kind: 'FEE', status: 'MATCHED', memberIds: [1], needsReview: true } }, // 오타 → similar 0.7 → 검토
  { date: '2026-05-09', name: '하거너5월', amount: 25000, expect: { kind: 'FEE', status: 'PENDING' } }, // 3월 탈퇴자
  { date: '2026-05-10', name: '가나다', amount: 20000, expect: { kind: 'FEE', status: 'MATCHED', memberIds: [1], needsReview: true } }, // 부족
  { date: '2026-05-10', name: '마바사8월', amount: 30000, memo: '5천원초과입금', expect: { kind: 'FEE', status: 'MATCHED', memberIds: [2], needsReview: true } },
];
```

- [ ] **Step 2: 테스트** — `upload.ts`가 하는 것과 같은 순서를 순수 함수로 돌린다(DB 없음).

```ts
import { describe, expect, it } from '@jest/globals';

import { COUPLE_GROUPS, COUPLE_HISTORIES, MEMBERS, RATES, ROWS } from './__fixtures__/bankStatement';
import { planRecord } from './confirmPlanner';
import { isMatchableAt } from './matchableMembers';
import { matchDepositor } from './memberMatcher';
import { pickMonthHints } from './monthHintParser';
import { classifyTransaction } from './transactionClassifier';

const ctx = {
  ratesByYear: new Map([[2026, RATES], [2027, RATES]]),
  coupleHistories: COUPLE_HISTORIES,
  coupleGroups: COUPLE_GROUPS.map((g) => ({ members: g.members.map((m) => ({ clubMemberId: m.clubMemberId })) })),
  memberStartAtMap: new Map(MEMBERS.map((m) => [m.id, m.feeObligationStartAt])),
  memberLeftAtMap: new Map(MEMBERS.map((m) => [m.id, m.leftAt])),
  leaveMap: new Map(),
  paidByMember: new Map(MEMBERS.map((m) => [m.id, [1, 2, 3, 4].map((month) => ({ year: 2026, month }))])),
};

describe('입금 파이프라인 회귀', () => {
  it.each(ROWS)('$date $name $amount', (row) => {
    const transactionDate = new Date(`${row.date}T01:00:00`);
    const parsed = { depositorName: row.name, memo: row.memo ?? null, amount: row.amount, transactionType: row.type ?? '일반입금', transactionDate };
    const cls = classifyTransaction(parsed, RATES);
    expect(cls.kind).toBe(row.expect.kind);
    if (cls.kind !== 'FEE') { expect(row.expect.status).toBe('SKIPPED'); return; }
    const candidates = MEMBERS.filter((m) => isMatchableAt(m, transactionDate)).map((m) => ({ id: m.id, name: m.name }));
    const match = matchDepositor(row.name, candidates, COUPLE_GROUPS, transactionDate);
    const ids = (match.memberIds?.length ?? 0) > 0 ? match.memberIds! : match.memberId ? [match.memberId] : [];
    if (ids.length === 0) { expect(row.expect.status).toBe('PENDING'); return; }
    expect(row.expect.status).toBe('MATCHED');
    if (row.expect.memberIds) expect(ids).toEqual(row.expect.memberIds);
    const plan = planRecord(ctx, { memberIds: ids, transactionDate, amount: row.amount, nonFeeAmount: cls.nonFeeAmount, monthHints: pickMonthHints(row.name, row.memo ?? null, transactionDate), matchConfidence: match.confidence });
    if (row.expect.nonFeeAmount != null) expect(cls.nonFeeAmount).toBe(row.expect.nonFeeAmount);
    if (row.expect.months) expect(plan.selections.map((s) => s.month)).toEqual(row.expect.months);
    if (row.expect.needsReview != null) expect(cls.needsReview || plan.needsReview).toBe(row.expect.needsReview);
  });
});
```

- [ ] **Step 3: 통과시킨다** — 실패하는 행이 있으면 fixture의 기대가 틀렸는지, 규칙이 틀렸는지 판단해 고친다. 기대를 바꿀 때는 그 줄에 이유를 주석으로 남긴다.

- [ ] **Step 4: 커밋**

```bash
git add src/lib/membership-fee/__fixtures__/bankStatement.ts src/lib/membership-fee/pipeline.regression.test.ts
git commit -m "test(membership-fee): 통장 패턴별 파이프라인 회귀 테스트 추가"
```

---

### Task 23: 기존 건너뜀 21건의 분류 보정 스크립트

**Files:**
- Create: `src/scripts/backfillPaymentRecordKind.ts`

- [ ] **Step 1: 스크립트** — 기본은 미리보기(쓰기 없음). `--apply`일 때만 `update`.

```ts
/* eslint-disable no-console */
/**
 * kind가 기본값(FEE)인 SKIPPED 레코드에 분류 규칙을 돌려 kind·kindReason을 채운다.
 * 실행: npx ts-node src/scripts/backfillPaymentRecordKind.ts            (미리보기)
 *       npx ts-node src/scripts/backfillPaymentRecordKind.ts --apply    (적용, 사용자 승인 후)
 */
import { PrismaClient } from '@prisma/client';

import { feeRateSettingsFromTypes } from '../lib/membership-fee/confirmPlanner';
import { classifyTransaction } from '../lib/membership-fee/transactionClassifier';

const prisma = new PrismaClient();
const CLUB_ID = 1;
const apply = process.argv.includes('--apply');

async function main() {
  const records = await prisma.paymentRecord.findMany({ where: { clubId: CLUB_ID, status: 'SKIPPED', kind: 'FEE' } });
  const feeTypes = await prisma.feeType.findMany({ where: { clubId: CLUB_ID }, include: { rates: true } });
  let changed = 0;
  for (const r of records) {
    const rates = feeRateSettingsFromTypes(feeTypes, r.transactionDate.getFullYear());
    if (!rates) continue;
    const cls = classifyTransaction({ depositorName: r.depositorName, memo: r.memo, amount: r.amount, transactionType: r.depositorName.includes('이자') ? '예금이자' : '일반입금', transactionDate: r.transactionDate }, rates);
    if (cls.kind === 'FEE') continue;
    console.log(`${r.transactionDate.toISOString().slice(0, 10)} ${r.amount} ${r.depositorName} → ${cls.kind} (${cls.kindReason})`);
    changed += 1;
    if (apply) await prisma.paymentRecord.update({ where: { id: r.id }, data: { kind: cls.kind, kindReason: cls.kindReason } });
  }
  console.log(`${apply ? '적용' : '미리보기'}: ${changed}/${records.length}건`);
}

main().finally(() => prisma.$disconnect());
```

- [ ] **Step 2: 미리보기를 돌려 사용자에게 보여주고, 승인 뒤 `--apply`로 돌린다**

Run: `TS_NODE_COMPILER_OPTIONS='{"module":"commonjs"}' npx ts-node src/scripts/backfillPaymentRecordKind.ts`

- [ ] **Step 3: 커밋**

```bash
git add src/scripts/backfillPaymentRecordKind.ts
git commit -m "chore(membership-fee): 기존 건너뜀 레코드의 분류를 채우는 보정 스크립트"
```

---

### Task 24: 문서

**Files:**
- Create: `docs/회비 정산/입금 내역 처리/기능/자동-분류-월힌트-단가통일.md`
- Create: `docs/회비 정산/회원별 납부 현황/기능/납부현황-내보내기.md`
- Modify: `docs/회비 정산/입금 내역 처리/입금내역-처리-컨텍스트.md` (§1 아키텍처 표에 새 lib·API, §2 기능, §3 플로우, §5 참고에 "단가 판정은 `feeAmountResolver`만")
- Modify: `docs/회비 정산/회원별 납부 현황/회원별-납부현황-컨텍스트.md` (§3 데이터 산출을 `memberYearStatus`로, 내보내기 절 추가, 직책)
- Modify: `docs/회비 정산/입금 내역 처리/README.md`, `docs/회비 정산/회원별 납부 현황/README.md` (새 기능 문서 링크)
- Modify: `.claude/rules/bulk-action-pattern.md` §10 참고 구현에 `bulk-confirm.ts`가 `confirmPlanner`를 쓴다는 한 줄

- [ ] **Step 1: 기능 문서 두 개를 CLAUDE.md의 순서(배경 → 도입한 개선 → 설계 의사결정 → 백엔드/프런트 처리 → UX 디테일 → 검증 → 변경 이력)로 쓴다.** 배경은 spec §1의 숫자를, 의사결정은 spec §3을 옮기되 상대 경로 링크로 spec을 가리킨다. 사용자 문서 형식 규칙(결론 bullet·2축 표·한 문장 한 줄)을 따른다.

- [ ] **Step 2: 컨텍스트 두 문서를 갱신하고 README에 링크를 더한다.**

- [ ] **Step 3: 커밋**

```bash
git add docs .claude/rules/bulk-action-pattern.md
git commit -m "docs(membership-fee): 자동 분류·월 힌트·단가 통일과 납부현황 내보내기 기능 문서, 화면 컨텍스트 갱신"
```

---

### Task 25: 검증과 운영 데이터 보정 안내

**Files:** 없음 (확인 작업)

- [ ] **Step 1: 자동 검사**

Run: `npx jest 2>&1 | tail -5` → 실패 0.
Run: `npx jest src/__tests__/guards src/__tests__/styles 2>&1 | tail -3` → 실패 0.
Run: `npx tsc --noEmit && npm run lint` → 오류 0.
Run: `npm run build 2>&1 | tail -5` → 빌드 성공 (테스트 파일이 `src/pages/` 아래 없는지 함께 확인된다).

- [ ] **Step 2: 미리보기 4가지** — `/dev/admin-preview`에서 처리 화면·상세 시트(분류·분할·메모)·대시보드(내보내기 버튼)·회원 상세(직책)를 휴대폰(390)·PC(1280) × 라이트·다크로 본다. 어긋난 곳은 고치고 Task 20·21의 커밋에 `fixup`하지 말고 새 커밋으로 남긴다.

- [ ] **Step 3: 내보내기 셀 대조** — 2026년을 내보내 재무의 표를 옮긴 이미지 데이터(로컬 `docs/회비 정산/data/`, 실명이 들어 있어 저장소에는 두지 않는다)의 1~4월과 비교한다. `src/scripts/compareImageWithDb.ts`를 참고해 `src/scripts/compareExportWithImage.ts`(읽기 전용)를 만들고 일치율을 로컬 비교 문서 끝에 "2026-10 재대조" 절로 기록한다.

- [ ] **Step 4: 운영 데이터 보정 목록을 사용자에게 보고한다** (spec §7.2). 실행은 사용자가 화면에서 하거나, 승인한 뒤 스크립트로 한다. 이 계획에서 자동으로 바꾸지 않는다.

- [ ] **Step 5: 5~10월 파일 업로드는 재무와 함께** — 프로덕션 쓰기이므로 사용자 지시가 있을 때만 한다. 업로드 결과 요약(분류별·검토 필요·중복 제외)을 보고한다.

- [ ] **Step 6: `superpowers:finishing-a-development-branch`로 마무리 방법을 정한다.**

---

### Task 26: 납부월 이월 (휴회·탈퇴로 의무가 없어진 달의 납부)

**Files:**
- Create: `src/pages/api/clubs/[id]/membership-fee/payments/shift.ts`
- Modify: `src/pages/api/clubs/[id]/members/[userId]/leaves/index.ts`(POST)·`[leaveId].ts`(PATCH) — 응답에 `paymentsInRange`
- Modify: `src/components/organisms/membership-fee/MemberFeeDetailView.tsx`, `src/pages/clubs/[id]/members/[userId].tsx`
- Modify: `src/lib/membership-fee/memberYearStatus.ts` (`cells`가 LEAVE인데 납부가 있으면 `orphanPaidMonths`에 기록), `PaymentDashboardTable.tsx` (휴회 칸 `title`에 "납부 있음 — 이월 필요")
- Modify: `src/schemas/membership-fee.schema.ts` (`paymentShiftSchema`)
- Test: `src/lib/membership-fee/paymentShift.test.ts`, `src/__tests__/api/clubs/membershipFeePaymentShift.test.ts`

**Interfaces:**
- Produces: `POST payments/shift { paymentIds: string[] }` → 일괄 패턴 응답. 순수 함수 `nextShiftTarget(ctx: PlannerContext, memberId: number, from: { year, month }): { year, month } | null` — `from` 다음의 첫 미납 의무월(24개월 안).

- [ ] **Step 1: 순수 함수 테스트**

```ts
import { describe, expect, it } from '@jest/globals';

import { nextShiftTarget } from './paymentShift';

const ctx = {
  ratesByYear: new Map(), coupleHistories: [], coupleGroups: [], exemptByYear: new Map(),
  memberStartAtMap: new Map([[1, new Date(2025, 0, 1)]]), memberLeftAtMap: new Map<number, Date | null>([[1, null]]),
  leaveMap: new Map([[1, [{ startYear: 2026, startMonth: 4, endYear: 2026, endMonth: 4 }]]]),
  paidByMember: new Map([[1, [{ year: 2026, month: 4 }, { year: 2026, month: 5 }]]]),
};

describe('nextShiftTarget', () => {
  it('휴회·납부된 달을 건너뛴 다음 의무월', () => {
    expect(nextShiftTarget(ctx, 1, { year: 2026, month: 4 })).toEqual({ year: 2026, month: 6 });
  });
  it('탈퇴로 더 이상 의무가 없으면 null', () => {
    const c = { ...ctx, memberLeftAtMap: new Map([[1, new Date(2026, 4, 31)]]) };
    expect(nextShiftTarget(c, 1, { year: 2026, month: 4 })).toBeNull();
  });
});
```

- [ ] **Step 2: 구현** — `src/lib/membership-fee/paymentShift.ts`:

```ts
import type { PlannerContext } from './confirmPlanner';
import { isMonthObligated } from './feeObligation';

export function nextShiftTarget(ctx: PlannerContext, memberId: number, from: { year: number; month: number }): { year: number; month: number } | null {
  const paid = new Set((ctx.paidByMember.get(memberId) ?? []).map((p) => p.year * 12 + p.month));
  let { year, month } = from;
  for (let i = 0; i < 24; i++) {
    if (month === 12) { year += 1; month = 1; } else month += 1;
    const obligated = isMonthObligated(year, month, ctx.memberStartAtMap.get(memberId) ?? null, ctx.leaveMap.get(memberId) ?? [], ctx.memberLeftAtMap.get(memberId) ?? null);
    const left = ctx.memberLeftAtMap.get(memberId);
    if (left && year * 12 + month > left.getFullYear() * 12 + left.getMonth() + 1) return null;
    if (obligated && !paid.has(year * 12 + month)) return { year, month };
  }
  return null;
}
```

API `shift.ts`: ADMIN 검증 → `paymentShiftSchema`(`paymentIds: z.array(z.string()).min(1)`) → `membershipPayment.findMany({ where: { id: { in }, clubMember: { clubId } } })` → `loadPlannerContext` → 건마다 `nextShiftTarget`; 있으면 `update({ data: { year, month } })`(그 뒤 `ctx.paidByMember`에 추가), 없으면 failed `'옮길 의무월이 없습니다'`. 응답은 일괄 패턴, message `${n}건 이월, ${m}건 실패`.

- [ ] **Step 3: 휴회 저장 응답과 화면** — leaves POST/PATCH가 저장 뒤 `membershipPayment.findMany`로 그 범위(휴회 시작~종료, 종료 없으면 시작 이후)의 납부를 찾아 `data.paymentsInRange: { id, year, month, amount }[]`로 싣는다. `[userId].tsx`의 `onSubmitLeave`는 응답에 납부가 있으면 `confirm({ title: '휴회 기간에 납부 N건이 있습니다', message: '2026년 4월 25,000원 … 다음 의무월로 이월할까요?', confirmLabel: '이월' })` → 예면 `POST payments/shift`. `MemberFeeDetailView`의 휴회 행에 겹친 납부가 있으면 `StatusChip tone="warning">납부 N건</StatusChip>` 표시(회원 상세 GET에 `orphanPayments` 포함).

- [ ] **Step 4: 대시보드** — `buildMemberYearStatus`에 `orphanPaidMonths: number[]`(LEAVE·NONE 칸인데 `paidMonths`에 있는 달). `PaymentDashboardTable`의 휴회 칸 `title`을 `'휴회/병가 · 납부 있음 — 이월 필요'`로.

- [ ] **Step 5: 테스트·커밋**

```bash
git add src/lib/membership-fee/paymentShift.ts src/lib/membership-fee/paymentShift.test.ts "src/pages/api/clubs/[id]/membership-fee/payments" "src/pages/api/clubs/[id]/members/[userId]/leaves" src/schemas/membership-fee.schema.ts src/components/organisms/membership-fee src/lib/membership-fee/memberYearStatus.ts "src/pages/clubs/[id]/members/[userId].tsx" src/__tests__/api/clubs/membershipFeePaymentShift.test.ts
git commit -m "feat(membership-fee): 휴회·탈퇴로 의무가 없어진 달의 납부를 다음 의무월로 이월"
```

---

### Task 27: 선택 항목 분류 변경 (일괄)

**Files:**
- Create: `src/pages/api/clubs/[id]/membership-fee/records/bulk-set-kind.ts`
- Modify: `src/schemas/membership-fee.schema.ts` (`bulkSetKindSchema`), `src/types/membership-fee.types.ts` (`BulkSetKindInput`)
- Modify: `src/hooks/membership-fee/usePaymentRecords.ts` (`useBulkSetKind`), `src/hooks/membership-fee/useBulkPaymentActions.ts` (`handleBulkSetKindSelected`)
- Modify: `src/pages/clubs/[id]/membership-fee/process.tsx` (BulkActionBar에 분류 `OptionPicker` + 버튼)
- Test: `src/__tests__/api/clubs/membershipFeeBulkSetKind.test.ts`

- [ ] **Step 1: 스키마·타입**

```ts
export const bulkSetKindSchema = z.object({
  recordIds: z.array(z.string()).min(1, '최소 1개의 레코드를 선택해야 합니다'),
  kind: z.enum(['FEE', 'JOINING_FEE', 'EVENT', 'OTHER', 'INTEREST']),
});
```

- [ ] **Step 2: 핸들러** — `.claude/rules/bulk-action-pattern.md` 골격. `findMany({ where: { id: { in }, clubId } })` → `CONFIRMED`는 failed `'확정된 입금 내역은 분류를 바꿀 수 없습니다'`. `kind !== 'FEE'`면 `updateMany({ where: { id: { in: targetIds }, clubId, status: { not: 'CONFIRMED' } }, data: { kind, kindReason: '일괄 변경', status: 'SKIPPED', errorReason: null, needsReview: false } })`. `kind === 'FEE'`면 건마다 Task 16 Step 3의 재판정 분기(매칭 회원 유무 → PENDING/MATCHED + planRecord)를 돌린다 — 그 분기를 `src/lib/membership-fee/rejudgeRecord.ts`의 `rejudge(prisma, ctx, record)`로 빼 Task 16과 공유한다.

- [ ] **Step 3: 화면** — `BulkActionBar`에 PENDING·MATCHED·ERROR·SKIPPED 탭 모두에서 `OptionPicker`(분류 5개) + "선택 항목 분류 변경" 버튼. 확인창 `${n}건을 '행사'로 바꾸시겠습니까?`. 결과는 `reportResultAndPrune(result, '분류 변경')`.

- [ ] **Step 4: 테스트·커밋** — 핸들러 테스트 3건(EVENT로 → SKIPPED, FEE로 → MATCHED 재판정, CONFIRMED 거부).

```bash
git add "src/pages/api/clubs/[id]/membership-fee/records/bulk-set-kind.ts" src/lib/membership-fee/rejudgeRecord.ts src/schemas/membership-fee.schema.ts src/types/membership-fee.types.ts src/hooks/membership-fee "src/pages/clubs/[id]/membership-fee/process.tsx" src/__tests__/api/clubs/membershipFeeBulkSetKind.test.ts
git commit -m "feat(membership-fee): 선택한 입금 내역의 분류를 한 번에 바꾼다"
```

---

### Task 28: 대시보드 최근 업로드 카드에 남은 일 표시

**Files:**
- Modify: `src/pages/api/clubs/[id]/membership-fee/dashboard.ts` (`latestUpload`에 `pendingWork`)
- Modify: `src/types/membership-fee.types.ts` (`LatestUploadInfo.pendingWork`)
- Modify: `src/components/organisms/membership-fee/LatestUploadCard.tsx`
- Test: `src/__tests__/components/membership-fee/LatestUploadCard.pending.dom.test.tsx`

- [ ] **Step 1: API** — `latestUpload` 조회에 더한다:

```ts
      prisma.paymentRecord.count({ where: { clubId: clubIdNumber, status: 'MATCHED', kind: 'FEE' } }),
      prisma.paymentRecord.count({ where: { clubId: clubIdNumber, status: 'PENDING', kind: 'FEE' } }),
      prisma.paymentRecord.count({ where: { clubId: clubIdNumber, status: { in: ['MATCHED', 'PENDING', 'ERROR'] }, kind: 'FEE', needsReview: true } }),
```

→ `pendingWork: { unconfirmed: matched, unmatched: pending, needsReview }`. 저장된 `needsReview`는 스냅샷이라 "대략"이며, 카드 문구는 "검토 필요 약 N건"으로 쓴다.

- [ ] **Step 2: 카드** — 최신 거래일 아래 한 줄: `미확정 N건 · 미매칭 N건 · 검토 필요 약 N건`. 각 숫자는 `process?status=MATCHED`, `process?status=PENDING`, `process?review=1` 링크. 0이면 "남은 일이 없습니다".

- [ ] **Step 3: 테스트·커밋**

```bash
git add "src/pages/api/clubs/[id]/membership-fee/dashboard.ts" src/types/membership-fee.types.ts src/components/organisms/membership-fee/LatestUploadCard.tsx src/__tests__/components/membership-fee/LatestUploadCard.pending.dom.test.tsx
git commit -m "feat(membership-fee): 대시보드 최근 업로드 카드에 미확정·미매칭·검토 필요 건수 표시"
```

---

### Task 29: 회귀 fixture에 최종 검토 사례 추가

**Files:**
- Modify: `src/lib/membership-fee/__fixtures__/bankStatement.ts`, `src/lib/membership-fee/pipeline.regression.test.ts`

- [ ] **Step 1: 행 추가**

```ts
  // 같은 금액 집중: 키워드 없는 "이름 + 15,000" 5건 → EVENT
  ...['가나다', '마바사', '아자차', '카타파', '더러머'].map((name, i) => ({ date: `2026-06-0${4 + (i % 3)}`, name, amount: 15000, expect: { kind: 'EVENT' as const, status: 'SKIPPED' as const } })),
  // 면제 회원(가나다를 2026 면제로 둔 ctx)에 매칭 → 검토
  { date: '2026-07-01', name: '가나다7월', amount: 25000, expect: { kind: 'FEE', status: 'MATCHED', memberIds: [1], needsReview: true }, exempt: true },
  // 의무 시작(6월) 전 달 힌트 → 검토 + 앞당기기 제안
  { date: '2026-06-02', name: '더러머5월', amount: 25000, expect: { kind: 'FEE', status: 'MATCHED', memberIds: [6], needsReview: true, suggestedStartMonth: { year: 2026, month: 5 } } },
```

테스트는 `findAmountClusters(ROWS…)`를 먼저 돌려 `clustered`를 만들고, 행에 `exempt: true`면 ctx의 `exemptByYear`에 그 회원을 넣는다. `suggestedStartMonth` 기대가 있으면 `plan.suggestedStartMonth`를 비교한다.

- [ ] **Step 2: 통과·커밋**

```bash
git add src/lib/membership-fee/__fixtures__/bankStatement.ts src/lib/membership-fee/pipeline.regression.test.ts
git commit -m "test(membership-fee): 금액 집중·면제 매칭·시작월 앞당기기 회귀 케이스 추가"
```

Task 25(검증)는 Task 29 뒤에 한 번 더 돌린다.
