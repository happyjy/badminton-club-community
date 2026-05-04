# 일괄 처리 API 작성 규칙

여러 record를 한 번에 처리하는 일괄 API(예: `bulk-confirm`, `bulk-unconfirm`, `bulk-skip`, `bulk-unskip`)를 추가할 때 따르는 패턴이다.

## 1. 왜 이 패턴인가

단건 API는 한 record라도 검증에 실패하면 전체를 400으로 거부해도 된다. 일괄은 사용자가 한 번에 N건을 처리하는 운영 흐름이라, **부분 성공을 허용**하지 않으면 한 건의 실패로 N-1건의 작업이 같이 무산되어 UX가 크게 나빠진다.

따라서 일괄 API는:

- record별로 검증해 성공/실패를 누적
- 응답 형식을 통일해 프런트에서 동일 패턴으로 결과를 표시 (성공 N건 + 실패 사유 목록)

## 2. 위치·이름

- 파일: `src/pages/api/clubs/[id]/membership-fee/records/bulk-<action>.ts`
- 메소드: `POST` 만 허용 (다른 메소드는 405)

## 3. 요청 스키마

`src/schemas/membership-fee.schema.ts` 에 zod 스키마 추가:

```ts
export const bulk<Action>Schema = z.object({
  recordIds: z.array(z.string()).min(1, '최소 1개의 레코드를 선택해야 합니다'),
  // 액션별 추가 필드 (예: bulk-confirm의 year, selections)
});
export type Bulk<Action>Schema = z.infer<typeof bulk<Action>Schema>;
```

`src/types/membership-fee.types.ts` 에 입력 타입 추가:

```ts
export interface Bulk<Action>Input {
  recordIds: string[];
  // 액션별 추가 필드
}
```

## 4. 응답 형식 (반드시 통일)

성공·실패 모두 200 — 부분 성공이 표준 흐름이라 4xx로 떨어뜨리지 않는다.

```ts
{
  data: {
    results: {
      success: string[];                                    // 성공한 recordId 목록
      failed: { recordId: string; reason: string }[];       // 실패 recordId + 사유
    };
    summary: {
      total: number;     // 요청한 recordIds 갯수
      processed: number; // DB에서 조회된 갯수
      success: number;
      failed: number;
    };
  };
  status: 200;
  message: string;       // 예: '${success}건 처리, ${failed}건 실패'
}
```

진짜 5xx 오류(트랜잭션 자체 실패 등)에서만 500 응답.

## 5. 핸들러 골격

```ts
export default withAuth(async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: '...', status: 405 });

  // 1) clubId 검증
  // 2) ADMIN 권한 검증 (Role.ADMIN)
  // 3) bulk<Action>Schema.safeParse(req.body)
  // 4) prisma.paymentRecord.findMany — clubId 일치하는 record 조회
  // 5) record별 검증 → results.success / results.failed에 분류
  // 6) targetIds(처리 대상)가 있으면 트랜잭션 안에서 일괄 update
  //    - updateMany의 where에 status 조건을 다시 걸어 race condition 방지
  // 7) 응답
});
```

자세한 예시는 `src/pages/api/clubs/[id]/membership-fee/records/bulk-unconfirm.ts` 참고.

## 6. 다중 안전망 (반드시)

상태 기반 일괄 동작은 **3중**으로 막아야 한다 — 클라이언트가 우회해도 잘못된 record가 처리되지 않도록.

| 단계                | 보장                                                                              |
| ------------------- | --------------------------------------------------------------------------------- |
| 프런트 — 탭 분기    | 일괄 동작이 정의된 탭에서만 체크박스 prop을 내림 (없으면 컬럼 자체가 사라짐)      |
| 프런트 — row 렌더링 | row별 `isRecordSelectable`이 해당 상태만 통과시키고, 그 외는 빈 자리 표시         |
| 백엔드 — 검증       | record별 status 검증 + `updateMany`의 `where`에 status 조건을 다시 걸어 race 방지 |

## 7. 프런트 훅

`src/hooks/membership-fee/usePaymentRecords.ts` 에 `useBulk<Action>Payments` 추가:

- `useBulkUnconfirmPayments` 패턴 그대로 따름 (`BulkConfirmResponse` 타입 재사용)
- `onSuccess`에서 `paymentRecords`·`paymentDashboard` 캐시 invalidate
- axios 에러는 `err.response?.data?.error`를 throw로 다시 던져 호출부 catch에서 처리

## 8. 호출부 결과 표시

`process.tsx`의 기존 핸들러(`handleBulkUnconfirmSelected` 등)와 동일한 형식:

```ts
const recordById = new Map((records ?? []).map((r) => [r.id, r]));
const failedDetail = result.results.failed
  .map((f) => {
    const depositor =
      recordById.get(f.recordId)?.depositorName ?? '(알 수 없음)';
    return `• ${depositor}: ${f.reason}`;
  })
  .join('\n');
alert(
  `${result.summary.success}건 처리, ${result.summary.failed}건 실패` +
    (failedDetail ? `\n\n실패 사유:\n${failedDetail}` : '')
);
setSelectedRecordIds((prev) =>
  prev.filter((id) => !result.results.success.includes(id))
);
```

핵심 포인트:

- 실패 사유 앞에 입금자명(`depositorName`) prefix를 붙여, 사용자가 어느 건이 왜 실패했는지 즉시 식별
- 성공한 record만 `selectedRecordIds`에서 제거 → 실패한 건은 선택이 유지되어 재시도 가능

## 9. 실패 사유 메시지 컨벤션

- 한국어, 사용자가 바로 이해 가능한 짧은 문장
- record 단위 검증 실패는 "왜"만 — "누가"는 호출부에서 prefix로 붙임
- 예시:
  - `'입금 내역을 찾을 수 없습니다'`
  - `'확정 상태가 아닙니다'`
  - `'이미 확정된 입금 내역은 건너뛸 수 없습니다'`
  - `'이미 건너뛴 입금 내역입니다'`
  - `'건너뛰기된 내역만 해제할 수 있습니다'`

## 10. 참고 구현

- `src/pages/api/clubs/[id]/membership-fee/records/bulk-confirm.ts` — selections 분기, 가장 복잡한 케이스
- `src/pages/api/clubs/[id]/membership-fee/records/bulk-unconfirm.ts` — 가장 단순한 패턴 예시
- `src/pages/api/clubs/[id]/membership-fee/records/bulk-skip.ts` — status 거부 다중 케이스
- `src/pages/api/clubs/[id]/membership-fee/records/bulk-unskip.ts` — 트랜잭션 안에서 두 그룹 분기 update

관련 화면 단위 컨텍스트: `docs/회비 정산/입금 내역 처리/입금내역-처리-컨텍스트.md`
