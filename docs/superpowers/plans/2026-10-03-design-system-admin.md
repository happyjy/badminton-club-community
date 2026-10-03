# 디자인 시스템 5단계 — PC 관리 화면 구현 계획

**Goal:** 운영진용 화면(회원 관리, 게스트 확인, 클럽 설정, 게시판 카테고리 관리, 대회 운영)을 새 디자인으로 옮기고, 그에 필요한 표 부품을 만든다.

**Spec:** `docs/superpowers/specs/2026-10-03-design-system-design.md` 4-2, 5-2, 7장의 5단계.

**실행 방식:** 직접 실행(executing-plans). 새 부품은 테스트 먼저. 끝에 별도 검토자 1회.

## Global Constraints

- DB 상태를 바꾸는 명령을 실행하지 않는다. 화면이 부르는 API와 요청 본문은 바꾸지 않는다.
- 색·크기는 토큰만 쓴다. 옮긴 파일은 `migratedScreens.test.ts`에 등록한다.
- 원시 `<input>`·`<select>`·`<textarea>`, `confirm()`·`alert()`, 직접 만든 `fixed inset-0` 막을 쓰지 않는다.
- 문구는 바꾸지 않는다. 바꾸면 보고한다.
- 커밋에 AI 서명을 넣지 않는다.
- 회비 관리는 범위 밖(별도 설계).

## 부품 (Task 1–3)

| 부품 | 파일 | 인터페이스 |
| --- | --- | --- |
| `getPageNumbers` | `src/lib/pagination.ts` | `(current: number, total: number, max = 7) => Array<number \| '…'>`. 첫·끝 페이지는 늘 포함 |
| `Pagination` | `molecules/Pagination.tsx` | `page`, `totalPages`, `onChange(page)`. `nav[aria-label="페이지"]`, 현재 쪽에 `aria-current="page"`, 이전·다음 `IconButton`. `totalPages <= 1`이면 그리지 않는다 |
| `DataTable<T>` | `organisms/table/DataTable.tsx` | `rows`, `rowKey`, `columns: Column<T>[]`(`key`·`header`·`cell`·`sortValue?`·`align?`·`className?`), `list: { title, subtitle?, leading?, trailing? }`, `onRowClick?`, `selection?: { selected: Set<Key>; onChange }`, `empty`, `aria-label`, `pagination?`. `lg` 이상은 `<table>`, 미만은 `ListGroup`. 전환은 CSS(`hidden lg:block` / `lg:hidden`)만 |
| `Toolbar` | `organisms/table/Toolbar.tsx` | `search?: { value, onChange, placeholder }`, `children`(필터), `actions?`, `summary?` |
| `BulkActionBar` | `organisms/table/BulkActionBar.tsx` | `count`, `onClear`, `children`(동작 버튼). `count === 0`이면 그리지 않는다. "N명 선택됨"의 단위는 `unit` 속성(기본 `'명'`) |

- 정렬: `sortValue`가 있는 열의 머리글이 버튼이 된다. 누르면 오름차순 → 내림차순 → 해제. `aria-sort`를 단다. 비제어(부품 안 상태).
- 행 선택: 머리글 체크박스는 "보이는 행 전체". 일부만 고르면 `indeterminate`.
- 행을 누를 수 있으면 `<tr tabIndex=0>` + Enter. 행 안의 버튼·체크박스를 누를 때는 행 동작이 일어나지 않는다.
- PC 관리 둥글기: `rounded-md`를 CSS 변수(`--radius-md`)로 바꾸고 `[data-density='compact']`(lg 이상)에서 8px.

## 화면 (Task 4–8)

| Task | 화면 | 내용 |
| --- | --- | --- |
| 4 | 회원 관리 `members` | `PageHeader` + `Toolbar`(이름 검색, 정렬 `Select`, 인원 수) + 상태 필터 + `DataTable`. 행을 누르면 `MemberDetailSheet`(상세 + 상태 변경 + 승인). `ClubMemberCard`·`OptionBottomSheet`·`OptionDropdown`·`SelectableButton`·`SelectOption` 삭제. 승인·상태 변경 실패 시 토스트 |
| 5 | 게스트 확인 `guest/check` | `Toolbar`(종류·상태 `Select`) + `DataTable` + `Pagination`. 폭을 재서 쪽 번호 수를 정하던 코드 삭제 |
| 6 | 클럽 설정 `custom` + 폼 7개 | PC는 왼쪽 `ListGroup` 메뉴, 휴대폰은 `Select`. 폼은 `FormField`·`Button`·토큰 |
| 7 | 게시판 카테고리 관리 | 페이지 + `CategoryManageForm` |
| 8 | 대회 운영 마무리 | 직접 만든 제출 버튼 4곳을 `Button`으로(4단계 검토의 보류 항목), `EditPlayersDialog` 선수 칸 구분 |

## Rulings (미리 정한 것)

- **일괄 동작은 회원 관리에 붙이지 않는다.** 지금 일괄 API가 없고, 여러 명을 한 번에 승인하는 것은 새 기능이다. `BulkActionBar`와 행 선택은 부품과 `/dev/ui-kit`에만 둔다(회비 관리가 쓴다). — 틀리면: 회원 관리에 선택 열을 켜는 몇 줄.
- **회원 정렬은 기존 `Select`를 유지한다.** 급수 순서는 `useParticipantSort`가 알고 있다. 표 머리글 정렬은 회원 관리에서 켜지 않는다. — 틀리면: 열에 `sortValue` 추가.
- **상태 필터(포함/제외 다중 선택)는 기능을 유지하고 모양만 바꾼다.** `SegmentedControl`은 하나만 고를 수 있어 지금 기능을 잃는다.
- **"관리중인 클럽" 칩 줄은 없앤다.** 이 화면은 주소의 클럽 하나만 다룬다. — 틀리면: 되살리기 쉽다.
- **대회 `EntryTable`은 `DataTable`로 바꾸지 않는다.** 이미 휴대폰 카드/PC 표가 있고 인라인 편집이 많다. — 틀리면: 6단계에서 다시 본다.

## Review Focus

1. 회원 상태 변경이 실패하면 목록이 되돌아가고 안내가 뜨는가.
2. 대기 회원에게는 승인만, 나머지에게는 상태 변경만 보이는가(기존과 같다).
3. 게스트 확인의 필터·쪽 번호가 URL에 남아 뒤로 가기로 복원되는가(기존과 같다).
4. `DataTable`에서 행 안의 버튼을 누를 때 행 동작이 함께 일어나지 않는가.
5. 설정 폼 7개의 저장 요청 본문이 바뀌지 않았는가.
