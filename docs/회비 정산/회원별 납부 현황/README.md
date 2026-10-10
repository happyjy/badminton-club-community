# 회원별 납부 현황

> 화면: `/clubs/[id]/membership-fee` (회비 관리 대시보드)
> 소스: `src/pages/clubs/[id]/membership-fee/index.tsx`, `src/components/organisms/membership-fee/PaymentDashboardTable.tsx`, `src/lib/membership-fee/memberYearStatus.ts`, `src/pages/api/clubs/[id]/membership-fee/dashboard.ts`, `src/pages/api/clubs/[id]/membership-fee/export.ts`, `src/pages/api/clubs/[id]/membership-fee/unpaid.ts`

이 폴더는 회비 관리 대시보드의 회원별 납부 현황 표 한 단위의 문서를 모은다.

## 어디부터 읽을까

- **이 화면이 처음**이라면 → [회원별-납부현황-컨텍스트.md](./회원별-납부현황-컨텍스트.md)
  표의 현재 모습(아키텍처·행 구성·셀 표시 규칙·요약 통계 단위)을 한 페이지로 요약한 화면 단위 문서. 항상 최신 상태로 유지된다.
- **특정 기능이 왜 이렇게 됐는지** 알고 싶다면 → [`기능/`](./기능/)
  개별 변경의 배경(Why), 설계 의사결정, 도입 이력을 남기는 기능 단위 문서들. 한 번 작성된 후엔 갱신하지 않거나, 후속 결정으로 덮어쓴다.

## 문서 구조 원칙

| 구분 | 역할 | 갱신 정책 |
| --- | --- | --- |
| 화면 컨텍스트 (`회원별-납부현황-컨텍스트.md`) | 지금의 모습 — 행 구성·셀 표시·요약 통계 | 변경마다 갱신 |
| 기능 단위 (`기능/*.md`) | 왜·어떻게 그 결정이 됐는지 — 배경·의사결정·이력 | 시점 기록, 후속 변경은 새 문서로 누적 |

## 기능 단위 문서 (`기능/`)

| 문서 | 다루는 변경 |
| --- | --- |
| [부부-개인-row-분리.md](./기능/부부-개인-row-분리.md) | 부부 통합 row → 본인 기준 개인 row 분리, 의무·휴회·탈퇴·통계 모두 개인 단위로 정합화 |
| [미납-탭-기준월-필터.md](./기능/미납-탭-기준월-필터.md) | 미납·납부 완료 탭이 같은 기준월 셀렉트(`throughMonth`)를 공유하도록 정합화, `memberHasAnyUnpaidMonthThroughMonth` 헬퍼 추가 |
| [납부현황-내보내기.md](./기능/납부현황-내보내기.md) | 연간 월회비 납부현황표를 엑셀로 내보내기, 회원 직책·정렬 순서, 대시보드와 내보내기가 같은 계산(`memberYearStatus`)을 쓰도록 분리 |
| [납부월-이월.md](./기능/납부월-이월.md) | 휴회·탈퇴로 의무가 없어진 달의 납부를 다음 미납 의무월로 옮기기, 격자의 "납부 있음 — 이월 필요" 표시 |
