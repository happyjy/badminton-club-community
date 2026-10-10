import { describe, expect, it } from '@jest/globals';

import {
  buildDeps,
  EXEMPT_MEMBER_ID,
  EXEMPT_STATEMENT,
  STATEMENT,
  type StatementRow,
} from './__fixtures__/bankStatement';
import { judgeUploadRows, type RecordDraft } from './uploadPipeline';

/**
 * 가짜 통장 한 벌을 업로드와 같은 함수(`judgeUploadRows`)에 통째로 넣고,
 * 행마다 분류·매칭·납부월·검토 여부가 기대와 같은지 본다.
 */

const FIXTURE_YEAR = 2026;

const toRow = (row: StatementRow) => ({
  // 통장의 거래일시는 한국 시각이다
  transactionDate: new Date(`${row.date}T10:00:00+09:00`),
  depositorName: row.name,
  amount: row.amount,
  memo: row.memo ?? null,
  transactionType: row.type ?? '일반입금',
});

/** 기대와 견줄 수 있게, 판정 결과에서 기대에 적힌 항목만 뽑는다 */
function observed(draft: RecordDraft, expected: StatementRow['expect']) {
  return {
    kind: draft.kind,
    status: draft.status,
    ...(expected.memberIds && { memberIds: draft.memberIds }),
    ...(expected.months && {
      months: draft.plan?.selections.map((s) =>
        s.year === FIXTURE_YEAR ? s.month : s.year * 100 + s.month
      ),
    }),
    ...(expected.needsReview != null && {
      needsReview: draft.needsReview || (draft.plan?.needsReview ?? false),
    }),
    ...(expected.nonFeeAmount != null && { nonFeeAmount: draft.nonFeeAmount }),
    ...(expected.suggestedStartMonth && {
      suggestedStartMonth: draft.plan?.suggestedStartMonth,
    }),
  };
}

function judge(rows: StatementRow[], deps = buildDeps()) {
  const drafts = judgeUploadRows(rows.map(toRow), deps);
  return rows.map((row, index) => ({ row, draft: drafts[index] }));
}

describe('입금 파이프라인 회귀 — 가짜 통장', () => {
  const judged = judge(STATEMENT);

  it.each(judged)(
    '$row.pattern ($row.date $row.name $row.amount)',
    ({ row, draft }) => {
      expect(observed(draft, row.expect)).toEqual(row.expect);
    }
  );

  it('몰려 들어온 행사 입금에는 몇 건이 몰렸는지 근거를 남긴다', () => {
    const clustered = judged.filter(({ row }) =>
      row.pattern.startsWith('행사 — 표시 없이')
    );

    expect(clustered).toHaveLength(5);
    for (const { draft } of clustered) {
      expect(draft.kindReason).toBe('같은 금액 15,000원 5건이 몰려 들어옴');
    }
  });
});

describe('입금 파이프라인 회귀 — 면제 회원이 있는 클럽', () => {
  const judged = judge(
    EXEMPT_STATEMENT,
    buildDeps({ exemptByYear: new Map([[2026, new Set([EXEMPT_MEMBER_ID])]]) })
  );

  it.each(judged)(
    '$row.pattern ($row.date $row.name $row.amount)',
    ({ row, draft }) => {
      expect(observed(draft, row.expect)).toEqual(row.expect);
    }
  );
});
