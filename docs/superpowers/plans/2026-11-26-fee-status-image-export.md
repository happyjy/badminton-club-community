# 납부현황 이미지 내보내기 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 회비 대시보드에서 버튼 하나로 엑셀과 같은 납부현황표를 40명씩 나눈 PNG로 만들어, 휴대폰은 공유 창으로 카톡에 보내고 PC는 내려받게 한다.

**Architecture:** 엑셀 코드 안의 줄 순서·비고·굵은 선 계산을 클라이언트에서도 쓸 수 있는 표 모델(`buildFeeStatusSheet`)로 떼고, 새 API(`export-sheet`)가 그 모델을 JSON으로 준다. 브라우저가 모델을 캔버스에 2배 해상도로 그려 PNG Blob을 만들고, `deliverFiles`가 공유·내려받기를 고른다.

**Tech Stack:** Next.js 15 Pages Router, TypeScript, React Query, Canvas 2D API, Web Share API, Jest(node·jsdom), Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-26-fee-status-image-export-design.md`

## Global Constraints

- 새 라이브러리를 더하지 않는다.
- 엑셀 결과는 바뀌지 않는다: 기존 `exportWorkbook.test.ts`, `export.test.ts`가 고치지 않은 채 통과한다.
- 이미지: PNG, 한 장 40명, 가로 800 기준 배치를 2배로(가로 1600).
- 새 문구(이 계획 밖의 문구는 만들지 않는다):
  - 버튼 `이미지로 내보내기`, 진행 중 `만드는 중…`
  - 내려받음 `이미지 ${n}장을 내려받았습니다.`
  - 실패 `이미지를 만들지 못했습니다.` (서버가 `error`를 주면 그 문구)
  - 공유 전 확인 창 제목 `이미지 ${n}장을 만들었습니다.`, 버튼 `공유하기` (닫기는 기본 `취소`)
- 기존 문구 `납부현황 내보내기`, `내보내는 중…`은 그대로 둔다.
- 파일 이름: `회비납부현황_${year}_${stamp}_${n}.png` (`stamp`는 엑셀과 같은 한국 날짜 `YYYYMMDD`).
- 그리는 코드와 색 값은 `src/lib/`에 둔다. `src/components`·`src/pages`에는 `#hex`를 쓰지 않는다(`noLegacyStyles` 지킴이).
- 그림 안 색은 라이트·다크와 상관없이 고정이다. 색은 `feeStatusSheet.ts`의 ARGB 상수에서만 가져온다.
- 테스트 파일은 `src/pages/` 밖에 둔다.
- API는 `.claude/rules/api-handler-conventions.md`를 따른다(메소드 → path param → `Role.ADMIN` + `APPROVED_STATUS` → try/catch).
- 운영 DB는 읽기만 한다. 커밋은 사용자가 요청할 때만 한다.

## Review Focus

1. 아이폰 사파리에서 데이터를 받고 그리는 사이 사용자 활성화가 끝나 `navigator.share`가 `NotAllowedError`를 낸다 → 확인 창의 [공유하기] 누름으로 공유하고, 그래도 막히면 내려받는다 (Task 4 테스트).
2. 5자를 넘는 이름, 긴 비고, 긴 병가 사유가 칸 밖으로 넘친다 → 이름은 글자 크기를 9px까지 줄이고, 비고·사유는 `…`로 자른다 (Task 3 테스트).
3. 글꼴 조각이 아직 안 와서 대체 글꼴로 그려진다 → 그리기 전에 표에 들어갈 모든 글자로 `document.fonts.load`를 부른다 (Task 3 테스트).
4. 40명·41명·0명 경계에서 장 수가 틀린다 → 40명은 1장, 41명은 2장(40·1), 0명은 머리글만 있는 1장 (Task 1 테스트).
5. 이미지와 엑셀의 줄 순서·비고가 어긋난다 → 엑셀도 같은 `buildFeeStatusSheet`를 쓰고, API 테스트가 엑셀 테스트와 같은 순서를 확인한다 (Task 1·2 테스트).

---

### Task 1: 표 모델을 엑셀에서 떼기

**Files:**
- Create: `src/lib/membership-fee/feeStatusSheet.ts`
- Modify: `src/lib/membership-fee/exportWorkbook.ts` (줄 순서·비고·선 계산과 `CELL_FILL`·범례·머리글 색을 새 파일에서 가져온다. `CELL_FILL`은 다시 내보내 기존 테스트 import를 살린다)
- Test: `src/lib/membership-fee/feeStatusSheet.test.ts`

**Interfaces:**
- Produces (모두 `feeStatusSheet.ts`, `exceljs`·`prisma`를 import하지 않는다):
  - `CELL_FILL: Record<Exclude<CellStatus,'FUTURE'>, string>` (ARGB, 값은 지금 그대로), `HEADER_FILL = 'FF305496'`, `INK = 'FF000000'`, `PAPER = 'FFFFFFFF'`
  - `FEE_STATUS_LEGEND: { label: string; status: Exclude<CellStatus,'FUTURE'> }[]` (완납·미납·면제·병가·해당없음)
  - `argbToCss(argb: string): string` → `'FFFFF2CC'` → `'#FFF2CC'`
  - `interface FeeStatusSheetRow { no: number | '탈퇴'; name: string; cells: CellStatus[] /* 길이 12, [0]=1월 */; leaveNotes: (string | null)[] /* 이어진 병가의 첫 달에만 */; remark: string; thickBottom: boolean }`
  - `buildFeeStatusSheet(rows: MemberYearStatus[]): FeeStatusSheetRow[]`
  - `FEE_STATUS_ROWS_PER_PAGE = 40`, `paginateFeeStatusSheet(rows: FeeStatusSheetRow[], perPage?: number): FeeStatusSheetRow[][]`
  - `interface FeeStatusSheetResponse { year: number; asOf: string /* 'YYYY-MM-DD' 한국 날짜 */; stamp: string /* 'YYYYMMDD' */; rows: FeeStatusSheetRow[] }`

- [ ] **Step 1: 실패하는 테스트를 쓴다** — 행 데이터는 `exportWorkbook.test.ts`의 `member()`처럼 `buildMemberYearStatus`로 만든다.

```ts
it('직책 회원을 정렬 순서대로 먼저, 나머지는 가나다순, 탈퇴 회원은 맨 아래에 "탈퇴"로', () => {
  const sheet = buildFeeStatusSheet([다마바, 가나다(총무, order 2), 나회장(회장, order 1), 라탈퇴(LEFT, 2026-02)]);
  expect(sheet.map((r) => [r.no, r.name])).toEqual([[1,'나회장'],[2,'가나다'],[3,'다마바'],['탈퇴','라탈퇴']]);
});
it('비고는 직책·부부를 잇고, 탈퇴 회원은 탈퇴만 적는다'); // '총무 · 부부', '부부', '', '2026.02 탈퇴'
it('직책 묶음 끝과 활동 회원 끝에 굵은 선'); // thickBottom: [false, true, true, false] (회장, 총무, 일반, 탈퇴)
it('병가 사유는 이어진 병가의 첫 달에만'); // 3~5월 병가 '허리' → leaveNotes[2]==='허리', [3]===null
it('40명은 1장, 41명은 2장(40·1), 0명은 빈 1장', () => {
  expect(paginateFeeStatusSheet(rows(40)).map((p) => p.length)).toEqual([40]);
  expect(paginateFeeStatusSheet(rows(41)).map((p) => p.length)).toEqual([40, 1]);
  expect(paginateFeeStatusSheet([])).toEqual([[]]);
});
```

- [ ] **Step 2: 실패를 본다** — Run: `npx jest src/lib/membership-fee/feeStatusSheet.test.ts` / Expected: FAIL (모듈 없음)
- [ ] **Step 3: `feeStatusSheet.ts`를 만들고 `exportWorkbook.ts`가 `buildFeeStatusSheet`의 줄로 쓰게 바꾼다** — `writeMemberRow`는 `FeeStatusSheetRow`를 받고, 굵은 선은 `thickBottom`으로 고른다.
- [ ] **Step 4: 통과를 본다** — Run: `npx jest src/lib/membership-fee/feeStatusSheet.test.ts src/lib/membership-fee/exportWorkbook.test.ts src/__tests__/api/clubs/membership-fee/export.test.ts` / Expected: PASS (엑셀 테스트는 고치지 않은 채)

### Task 2: 표 모델 API

**Files:**
- Create: `src/lib/membership-fee/feeStatusExport.ts` (서버 전용)
- Create: `src/pages/api/clubs/[id]/membership-fee/export-sheet.ts`
- Modify: `src/pages/api/clubs/[id]/membership-fee/export.ts` (행 계산·반영일을 새 함수로)
- Test: `src/__tests__/api/clubs/membership-fee/exportSheet.test.ts` (`export.test.ts`와 같은 `fakeFeeDb` 준비)

**Interfaces:**
- Consumes: Task 1의 `buildFeeStatusSheet`, `FeeStatusSheetResponse`
- Produces:
  - `loadFeeStatusExport(prisma: PrismaClient, clubId: number, year: number, now: Date): Promise<{ rows: MemberYearStatus[]; asOf: Date /* 엑셀용 로컬 자정 */; asOfIso: string; stamp: string }>` — 지금 `export.ts`의 조회·필터(의무월이나 휴회월이 있는 회원)·한국 날짜 계산을 옮긴다.
  - `GET /api/clubs/[id]/membership-fee/export-sheet?year=YYYY` → `{ data: FeeStatusSheetResponse, status: 200, message: '납부현황을 불러왔습니다' }`. 연도 없으면 올해(한국). 오류는 405 / 400 `'연도가 올바르지 않습니다'` / 403 `'권한이 없습니다'` / 500 `'납부현황을 불러오지 못했습니다'`.

- [ ] **Step 1: 실패하는 테스트**

```ts
it('엑셀과 같은 순서의 줄을 준다'); // names: ['나회장','가나다','라탈퇴'] (export.test.ts와 같은 준비)
it('회비 대상 아님 회원은 싣지 않는다');
it('반영일과 파일 날짜는 한국 날짜다', async () => {
  jest.useFakeTimers({ now: new Date('2026-11-25T16:30:00Z') }); // 한국 11/26 01:30
  expect(data).toMatchObject({ year: 2026, asOf: '2026-11-26', stamp: '20261126' });
});
it('관리자가 아니면 403'); it('연도가 이상하면 400'); it('GET이 아니면 405');
```

- [ ] **Step 2: 실패를 본다** — Run: `npx jest src/__tests__/api/clubs/membership-fee/exportSheet.test.ts` / Expected: FAIL (핸들러 없음)
- [ ] **Step 3: `feeStatusExport.ts`, `export-sheet.ts`를 만들고 `export.ts`를 새 함수로 바꾼다**
- [ ] **Step 4: 통과를 본다** — Run: `npx jest src/__tests__/api/clubs/membership-fee/exportSheet.test.ts src/__tests__/api/clubs/membership-fee/export.test.ts` / Expected: PASS

### Task 3: 캔버스에 그리기

**Files:**
- Create: `src/lib/membership-fee/feeStatusImage.ts`
- Test: `src/lib/membership-fee/feeStatusImage.test.ts` (node 환경, 기록용 가짜 캔버스)

**Interfaces:**
- Consumes: Task 1의 `FeeStatusSheetRow`, `FeeStatusSheetResponse`, `paginateFeeStatusSheet`, 색 상수, `argbToCss`
- Produces:
  - `IMAGE_SCALE = 2`, `IMAGE_WIDTH = 800`
  - `pageHeight(rowCount: number): number` (논리 px) = 제목 72 + 반영일 24 + 범례 28 + 머리글 28 + 줄 24×n + 쪽 번호 40 → 40명이면 1152
  - `type CanvasPainter = Pick<CanvasRenderingContext2D, 'fillStyle'|'strokeStyle'|'lineWidth'|'font'|'textAlign'|'textBaseline'|'fillRect'|'strokeRect'|'fillText'|'beginPath'|'moveTo'|'lineTo'|'stroke'|'measureText'|'scale'>`
  - `paintFeeStatusPage(ctx: CanvasPainter, page: { year: number; asOf: string; rows: FeeStatusSheetRow[]; pageNumber: number }): void`
  - `renderFeeStatusImages(sheet: FeeStatusSheetResponse, deps?: { createCanvas?: () => HTMLCanvasElement; fonts?: Pick<FontFaceSet, 'load'> }): Promise<Blob[]>` — 기본값은 `document.createElement('canvas')`, `document.fonts`. `getContext('2d')`가 null이거나 `toBlob`이 null을 주면 reject.
- 배치(논리 px): 좌우 여백 16, 열 너비 NO 40 · 성명 76 · 월 48×12 · 비고 76 (합 768). 선은 검정 1px, `thickBottom`은 2px. 글꼴 `"Pretendard Variable", Pretendard, sans-serif` — 제목 700 26px, 반영일·머리글 700 13px, 이름 400 13px(넘치면 9px까지 줄임), NO 400 12px, 비고 400 11px, 병가 사유 400 9px 흰 글자(이어진 병가 칸 너비 안에서 `…`로 자름), 범례·쪽 번호 400 12px.
- 글자: 제목 `${year}년 월회비 납부현황`, 반영일 `반영일 : ${y}.${m}.${d}`(엑셀처럼 0을 붙이지 않음), 머리글 `NO`·`성명`·`1월`~`12월`·`비고`, 쪽 번호 `- ${n} -`. `FUTURE` 칸은 칠하지 않는다.

- [ ] **Step 1: 실패하는 테스트** — 가짜 `measureText`는 `{ width: text.length * 현재 글자 크기 }`.

```ts
it('칸마다 상태 색으로 칠하고, 아직 오지 않은 달은 칠하지 않는다'); // 1월 칸 rect의 fillStyle '#FFF2CC', 12월(FUTURE)은 칠한 rect 없음
it('제목·반영일·머리글·쪽 번호를 적는다'); // fillText에 '2026년 월회비 납부현황', '반영일 : 2026.11.26', '12월', '- 2 -'
it('긴 이름은 글자 크기를 줄여 칸 안에 넣는다'); // '가나다라마바사'를 그릴 때 font가 13px보다 작고 폭 ≤ 76-8
it('긴 병가 사유는 칸 너비에서 자른다'); // 1칸 병가의 사유 끝이 '…'
it('81명이면 3장, 앞 두 장은 1600×2304, 마지막 장은 1명 높이', async () => {
  const blobs = await renderFeeStatusImages(sheet(81), { createCanvas: fakeCanvas, fonts });
  expect(blobs).toHaveLength(3);
  expect(canvases.map((c) => [c.width, c.height])).toEqual([[1600, 2304],[1600, 2304],[1600, pageHeight(1) * 2]]);
});
it('그리기 전에 표의 글자로 글꼴을 불러온다'); // fonts.load 호출의 text 인자에 '가나다'와 '납부현황'이 들어 있다
it('캔버스를 못 만들면 실패한다'); // getContext → null 이면 rejects
```

- [ ] **Step 2: 실패를 본다** — Run: `npx jest src/lib/membership-fee/feeStatusImage.test.ts` / Expected: FAIL (모듈 없음)
- [ ] **Step 3: `feeStatusImage.ts` 구현** — `renderFeeStatusImages`는 쓰는 글꼴마다 `fonts.load(font, 모든 글자)`를 기다린 뒤, 장마다 캔버스를 `IMAGE_WIDTH*2 × pageHeight(n)*2`로 잡고 `scale(2,2)` 후 흰 바탕을 칠하고 그린다.
- [ ] **Step 4: 통과를 본다** — Run: 같은 명령 / Expected: PASS

### Task 4: 공유·내려받기와 이미지 만드는 훅

**Files:**
- Create: `src/lib/deliverFiles.ts`
- Modify: `src/hooks/membership-fee/usePaymentDashboard.ts` (`useBuildFeeStatusImages` 추가)
- Test: `src/lib/deliverFiles.dom.test.ts`, `src/__tests__/hooks/useBuildFeeStatusImages.dom.test.tsx` (`useExportFeeStatus.dom.test.tsx`처럼 axios를 mock, `@/lib/membership-fee/feeStatusImage`도 mock)

**Interfaces:**
- Consumes: Task 2의 API, Task 3의 `renderFeeStatusImages`
- Produces:
  - `type DeliverResult = 'shared' | 'cancelled' | 'downloaded'`
  - `deliverFiles(files: File[], options: { title: string; confirmShare: () => Promise<boolean>; env?: { navigator?: Navigator; matchMedia?: (query: string) => MediaQueryList; download?: (file: File) => void } }): Promise<DeliverResult>` — `(pointer: coarse)`이고 `navigator.canShare?.({ files })`이면: `confirmShare()`가 false면 `'cancelled'`, true면 `navigator.share({ files, title })` → `'shared'`, `AbortError`면 `'cancelled'`, 그 밖의 오류면 모두 내려받고 `'downloaded'`. 아니면 모두 내려받고 `'downloaded'`. 기본 `download`는 `URL.createObjectURL` + `<a download>` 클릭.
  - `useBuildFeeStatusImages(clubId: string | undefined)` → `useMutation`, `mutationFn(year: number): Promise<File[]>` — `GET export-sheet` → `renderFeeStatusImages` → `new File([blob], \`회비납부현황_${year}_${stamp}_${i + 1}.png\`, { type: 'image/png' })`. 실패는 서버 `error` 문구, 없으면 `'이미지를 만들지 못했습니다.'`로 `Error`를 던진다.

- [ ] **Step 1: 실패하는 테스트**

```ts
// deliverFiles
it('터치 기기에서 공유할 수 있으면 확인 뒤 공유한다'); // share({ files, title }) → 'shared'
it('확인 창을 닫으면 공유하지 않는다'); // 'cancelled', share 안 부름, download 안 부름
it('공유 창을 닫으면(AbortError) 조용히 끝난다'); // 'cancelled'
it('공유가 막히면(NotAllowedError) 내려받는다'); // download 2번, 'downloaded'
it('PC(pointer: fine)는 확인 없이 내려받는다'); // confirmShare 안 부름
it('canShare가 없으면 내려받는다');
// useBuildFeeStatusImages
it('표를 받아 장마다 PNG 파일로 만든다'); // names ['회비납부현황_2026_20261126_1.png', '…_2.png'], type 'image/png'
it('서버가 사유를 주면 그 사유로 실패한다'); // '권한이 없습니다'
it('그리다 실패하면 기본 문구로 실패한다'); // '이미지를 만들지 못했습니다.'
```

- [ ] **Step 2: 실패를 본다** — Run: `npx jest src/lib/deliverFiles.dom.test.ts src/__tests__/hooks/useBuildFeeStatusImages.dom.test.tsx` / Expected: FAIL
- [ ] **Step 3: 구현**
- [ ] **Step 4: 통과를 본다** — Run: 같은 명령 / Expected: PASS

### Task 5: 화면

**Files:**
- Modify: `src/components/organisms/membership-fee/FeeDashboardView.tsx` (툴바 actions에 버튼 둘, `flex gap-2`)
- Modify: `src/pages/clubs/[id]/membership-fee/index.tsx` (`useConfirm` + `deliverFiles` + 토스트)
- Modify: `src/pages/dev/admin-preview.tsx` (대시보드 미리보기에 새 props, 새 화면 `fee-status-image` / `납부현황 이미지`)
- Test: `src/__tests__/components/membership-fee/FeeDashboardView.export.dom.test.tsx`

**Interfaces:**
- Consumes: Task 4의 `useBuildFeeStatusImages`, `deliverFiles`; Task 3의 `renderFeeStatusImages`
- Produces: `FeeDashboardView` 새 props `onExportImage: () => void`, `isExportingImage: boolean`.
- 페이지 처리: `files = await mutateAsync(year)` → `deliverFiles(files, { title: \`${year}년 월회비 납부현황\`, confirmShare: () => confirm({ title: \`이미지 ${files.length}장을 만들었습니다.\`, confirmLabel: '공유하기' }) })` → `'downloaded'`면 `toast.success(\`이미지 ${files.length}장을 내려받았습니다.\`)`, 나머지는 조용히. 실패는 `toast.error(error.message)`.
- 미리보기 `fee-status-image`: 가짜 회원 45명(직책 2, 탈퇴 1, 병가 사유 1, 긴 이름 1)을 `renderFeeStatusImages`로 그려 `<img>`로 늘어놓는다. 주소에 `clubId`·`year`가 있으면 `export-sheet`를 불러 실제 데이터로 그린다(로그인 쿠키 필요).

- [ ] **Step 1: 실패하는 테스트**

```ts
it('이미지로 내보내기를 누르면 알린다'); // getByRole('button', { name: '이미지로 내보내기' }) 클릭 → onExportImage 1번
it('만드는 중에는 만드는 중…을 보인다'); // isExportingImage → '만드는 중…'
it('엑셀 버튼 문구는 그대로다'); // '납부현황 내보내기'
```

- [ ] **Step 2: 실패를 본다** — Run: `npx jest src/__tests__/components/membership-fee/FeeDashboardView.export.dom.test.tsx` / Expected: FAIL
- [ ] **Step 3: 구현**
- [ ] **Step 4: 통과를 본다** — Run: 같은 명령과 `npx jest src/__tests__/guards src/__tests__/styles` / Expected: PASS
- [ ] **Step 5: 눈으로 본다** — dev 서버(3001)에서 `/dev/admin-preview?screen=fee-dashboard`(툴바 버튼 두 개가 390에서 넘치지 않는지)와 `?screen=fee-status-image`를 390·1280, 라이트·다크로 찍어 본다(`scratchpad/shot-cdp.mjs`).

### Task 6: 문서와 실제 데이터 확인

**Files:**
- Create: `docs/회비 정산/회원별 납부 현황/기능/납부현황-이미지-내보내기.md` (CLAUDE.md 문서화 정책의 순서)
- Modify: 같은 폴더 `README.md`(기능 표에 한 줄), `회원별-납부현황-컨텍스트.md`(관련 결정 링크), `기능/납부현황-내보내기.md`(변경 이력에 표 모델 분리 한 줄)

- [ ] **Step 1: 문서를 쓴다**
- [ ] **Step 2: 전체 확인** — Run: `npx jest > <workspace>/jest.log 2>&1; tail -5`, `npx tsc --noEmit`, 바꾼 파일에 `npx eslint` / Expected: 전부 통과, 타입 오류 0, 린트 오류 0
- [ ] **Step 3: 실제 데이터로 만든다** — 로그인 쿠키를 넣은 headless Chrome으로 `/dev/admin-preview?screen=fee-status-image&clubId=1&year=2026`을 열고, 그려진 PNG를 scratchpad에 저장해 사용자에게 보낸다(운영 DB는 읽기만). 사용자가 "나와의 채팅"에 일반 화질로 보내 이름이 읽히는지 본다.
