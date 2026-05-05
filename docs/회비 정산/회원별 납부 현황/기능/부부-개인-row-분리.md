# 부부 — 개인 row 분리

작성일: 2026-05-05
관련 화면: `/clubs/[id]/membership-fee`
관련 파일:

- `src/pages/api/clubs/[id]/membership-fee/dashboard.ts`
- `src/pages/api/clubs/[id]/membership-fee/unpaid.ts`
- `src/components/organisms/membership-fee/PaymentDashboardTable.tsx`

## 1. 배경 (Why)

회원별 납부 현황 표는 부부 회원을 **한 row로 통합** 표시하고 있었다. 이름은 `김동룡·이진희`처럼 합쳐 보이고, 의무 시작월·휴회·탈퇴는 두 사람의 정보를 통합한 하나의 값으로 산출됐다.

운영 상 다음 한계가 누적됐다.

- **의무 시작일이 다른 부부**: 한 명만 먼저 가입하고 파트너가 늦게 가입한 경우, 통합 룰은 "둘 중 늦은 시작월"을 둘 다에 적용했다. 먼저 가입한 사람의 의무가 사라져 보임.
- **병가·휴회 표시**: 둘 중 한 명만 병가여도 통합 row의 해당 월이 🏥로 표시되어, 다른 한 명이 의무를 지고 있다는 사실이 표에서 사라졌다.
- **탈퇴 처리**: "한 명만 탈퇴"는 부부 row의 의무를 종료하지 않지만, 탈퇴한 사람의 row는 별도로 보이지 않으니 운영자가 상태를 파악하기 어려웠다.
- **회계 단위 불일치**: `MembershipPayment`는 이미 `@@unique([clubMemberId, year, month])`로 **개인 단위**다. 입금 처리(`confirm.ts`)도 부부 1건 입금을 두 사람에게 두 row로 분배해 저장한다. 표시만 부부 통합이라 "DB·리포트는 2명, 대시보드는 1명"이라는 이중 회계가 됐다.

정책을 다음과 같이 정리했다.

> 부부도 두 row로 표시하고, 모든 의무·휴회·탈퇴·납부·통계는 본인 기준으로만 산출한다. 둘 다 병가일 때만 양쪽 row가 모두 🏥가 되어 "부부 회비 의무 면제"가 자연스럽게 성립한다.

## 2. 도입한 개선

### 2-1. 표 — 한 사람 한 row, 이름 셀에 파트너 부기

부부도 두 row로 분리했다. 이름 셀은 본인 이름(링크) 아래에 회색 작은 글씨로 `(파트너이름)`을 부기해 부부임을 식별할 수 있다. 유형 셀의 `부부` 배지는 그대로 유지된다.

```
김동룡        ← 회원 상세 링크
(이진희)       ← 회색 작은 글씨, 파트너 식별용
```

### 2-2. dashboard.ts — 부부 분기 제거, 모든 회원이 동일 경로

기존 `processedCoupleGroups` / `coupleMemberIds` 분기를 들어내고, 모든 회원을 일반 회원 경로 하나로 산출한다.

| 항목 | 변경 전 (부부 통합) | 변경 후 (개인) |
| --- | --- | --- |
| `firstObligationMonth` | `Math.max(firstA, firstB)` | 본인 `feeObligationStartAt` 그대로 |
| `obligationMonths` / `leaveMonths` | 두 사람 휴회 합집합으로 계산 | 본인 `leaveMap.get(member.id)`만 사용 |
| `isLeft` / `leftMonth` | 둘 다 탈퇴해야 종료, 늦은 탈퇴일 사용 | 본인 상태·탈퇴일만 반영 |
| `paidCount` | 부부 row 1건의 합 | 본인 `paymentsByMember.get(member.id)` 기준 |
| `name` | `${memberName}·${partnerName}` | 본인 이름 |
| `couplePartnerName` | 통합 row에 부기 | 부부면 파트너 이름, 아니면 `null` |
| `type` | `couple` 또는 `regular`/`exempt` | 면제 → `exempt`, 부부 그룹 소속 → `couple`, 그 외 → `regular` |

### 2-3. unpaid.ts — 같은 정책으로 정합화

리포트 페이지의 미납 회원 목록도 동일하게 부부 분기를 제거했다. 본인 의무·납부 여부만으로 판단하고, `partnerName`은 식별용 부기로만 응답에 포함한다.

부수 효과로 다음 버그가 해소됐다:

> 본인은 미납이지만 파트너가 해당 월 의무가 없으면(가입 전 등), 통합 분기에서 `if (!isMonthObligated(year, month, partnerStartAt, partnerLeave)) return`으로 본인까지 미납 목록에서 빠지던 문제.

### 2-4. 요약 통계도 개인 단위

`monthlyStats[m].totalCount` / `paidCount`는 dashboard가 만든 row 배열을 도는 구조라, row 분리만으로 자동으로 개인 단위가 됐다.

| 필드 | 변경 전 | 변경 후 |
| --- | --- | --- |
| `summary.totalMembers` | 사람 수 (이미 개인 기준) | 동일 |
| `summary.coupleGroups` | 부부 그룹 수 | 동일 (명칭상 그룹 단위 유지) |
| `monthlyStats[m].totalCount` | row 수 (부부=1) | 사람 수 (부부=2) |
| `monthlyStats[m].paidCount` | 통합 row의 납부 여부 | 본인·파트너 각각 카운트 |

비율(`paidCount / totalCount`)은 사실상 동일하지만 절대 숫자가 늘어 보인다. 운영자에게는 미리 안내가 필요한 변화다.

## 3. 설계 의사결정

### 3-1. 통합 row 룰을 보강하는 대신 row를 분리한 이유

통합 row를 유지하면서 "둘 중 한 명만 병가" 같은 케이스를 분기로 표현하는 길도 있었다. 거부한 이유는 다음과 같다.

- **단일 진실 원천(SSoT)이 개인 단위에 있다.** DB·입금 처리 모두 이미 개인 단위라, 표시만 통합이면 정합성을 별도 코드로 유지해야 한다.
- **분기가 무한히 늘어난다.** "한 명 면제·다른 한 명 의무", "한 명 휴회·다른 한 명 의무", "시작일 다름", "탈퇴 시점 다름" 같은 조합이 정책 변화마다 새 분기를 만든다. 개인 단위에서는 모두 자연스러운 한 가지 룰로 통일된다.
- **운영자 멘탈 모델.** 표는 "한 사람씩 보고 싶은 화면"인데, 통합 row는 두 사람 정보를 강제로 합쳐 보여줘 오히려 인지 부담이 컸다.

### 3-2. `summary.coupleGroups`만 그룹 단위로 남긴 이유

이 필드는 "부부 등록을 몇 팀이나 했는지"를 보여주는 운영 지표다. "사람 수"로 바꾸면 의미 자체가 달라진다. 명칭이 그대로 `coupleGroups`이므로 그룹 수 의미를 유지했다.

### 3-3. 이름 부기를 한 줄(`김동룡(이진희)`)이 아니라 두 줄로 둔 이유

표는 1~12월 + 유형 + 납부 컬럼이 빽빽하게 들어가 sticky 좌측 셀 너비가 좁다. 한 줄로 두면 긴 한글 이름 페어가 표 너비를 늘려 모바일에서 가로 스크롤이 길어진다. 두 줄(이름 + 회색 작은 부기)로 두면 셀 너비를 늘리지 않고 식별 정보를 함께 줄 수 있다.

### 3-4. "한 명만 병가"일 때 부부 회비 면제는 자동으로 풀린다

기존 통합 룰은 `effectiveFirst = Math.max(firstA, firstB)` + 두 휴회 합집합으로 인해 한 명만 병가여도 부부 row 전체가 의무에서 빠질 수 있었다. 개인 row 분리 후에는 본인 휴회만 의무에서 빠지므로, **둘 다 병가**일 때만 양쪽 row가 모두 🏥가 되어 자연스럽게 부부 면제가 성립한다. 별도 정책 코드가 필요하지 않다.

## 4. 백엔드 처리

### 4-1. dashboard.ts (`src/pages/api/clubs/[id]/membership-fee/dashboard.ts`)

- 215~349 부부 통합 분기 통째 삭제
- `coupleMemberIds` Set 제거 (`memberToCoupleGroup`만 식별용으로 유지)
- 모든 회원이 단일 경로:
  ```ts
  const coupleGroupId = memberToCoupleGroup.get(member.id);
  const coupleGroup = coupleGroupId
    ? coupleGroups.find((g) => g.id === coupleGroupId)
    : null;
  const partnerMember = coupleGroup?.members.find(
    (m) => m.clubMemberId !== member.id
  );
  const couplePartnerName = partnerMember?.clubMember.name ?? null;
  // ... 본인 leaveMap·feeObligationStartAt·leftAt만 사용해 의무·휴회 산출 ...
  return {
    name: member.name || '(이름 없음)',
    type: isExempt ? 'exempt' : coupleGroupId ? 'couple' : 'regular',
    couplePartnerName,
    /* ... */
  };
  ```
- `members.filter(Boolean)` 제거 (null이 더 이상 나오지 않음)
- `monthlyStats`의 `members.forEach((m) => { if (!m || ...) })`에서 `!m` 체크 제거

### 4-2. unpaid.ts (`src/pages/api/clubs/[id]/membership-fee/unpaid.ts`)

- `processedCoupleGroups` 분기 제거
- 본인 의무·납부 검사만 수행
- `partnerName`은 응답 부기용으로만 채움 (식별 목적)

## 5. 프런트 처리

### 5-1. PaymentDashboardTable.tsx

이름 셀에 파트너 부기 추가. 회원 링크 아래 한 줄을 더해 작게 표기한다.

```tsx
{member.couplePartnerName && (
  <div className="text-xs text-gray-500 font-normal">
    ({member.couplePartnerName})
  </div>
)}
```

### 5-2. report.tsx

별도 변경 없이 정합화됨. dashboard API를 그대로 사용하므로 회원별 12개월 표가 자동으로 개인 단위 row가 되고, `(부부)` 라벨도 그대로 동작한다.

## 6. UX 디테일

| 케이스 | 표시 |
| --- | --- |
| 부부 A(1월 가입)·B(4월 가입), 둘 다 의무 | A row: 1~12월 의무 12개 / B row: 4~12월 의무 9개 |
| A만 6월 병가 | A row: 6월 🏥 / B row: 6월 의무 (X 또는 ✅) |
| A·B 둘 다 6월 병가 | A row, B row 모두 6월 🏥 → 부부 회비 의무 면제가 자연 성립 |
| A만 탈퇴 | A row에 탈퇴 배지·탈퇴월 빨간 보더 / B row는 의무 계속 |
| 부부 1건 입금이 양쪽에 분배됨 | A row, B row의 `paidCount`가 각각 본인 기준으로 잡힘 |

## 7. 검증

- 회비 관련 단위 테스트 5 suites · 91건 모두 통과
- 변경 파일(dashboard.ts, unpaid.ts, PaymentDashboardTable.tsx) ESLint·TypeScript 깨끗
- `pnpm build` 실패는 사전 존재 이슈(`monthSuggester.test.ts:34` prettier)이며 이번 작업과 무관

## 8. 운영자 안내가 필요한 변화

- **월별 통계의 절대 숫자가 늘어 보인다.** 부부=2명으로 카운트되어 `totalCount`·`paidCount`가 함께 증가한다. 비율 의미는 동일.
- **미납 회원 목록도 사람 단위.** 부부 1팀이 아니라 각 사람으로 표시되어 N이 늘어 보일 수 있다.
- **본인 row의 🏥·시작월·탈퇴 표시는 모두 본인 데이터만 반영**한다. 파트너 표시와 다르더라도 의도된 동작.

## 9. 변경 이력

- 2026-05-05: 부부 통합 row 폐기, 모든 의무·휴회·탈퇴·통계를 개인 단위로 통일. dashboard.ts·unpaid.ts·PaymentDashboardTable.tsx 변경. unpaid.ts의 "본인 미납이 파트너 의무 없음으로 누락되던" 부수 버그 해소.
