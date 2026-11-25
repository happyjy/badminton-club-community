import { kstYearMonth } from './kst';
import {
  classifyTransaction,
  type FeeRateSettings,
  findClusteredEventRows,
} from './transactionClassifier';

import type { PaymentRecordKind } from '@prisma/client';

/**
 * 분류가 생기기 전에 재무가 건너뛴 입금은 전부 '회비'로 저장돼 있다.
 * 그 건들에 분류 규칙을 돌려 회비가 아니라고 판정되는 건만 고른다.
 *
 * DB를 읽거나 쓰지 않는다. `src/scripts/backfillPaymentRecordKind.ts`가 쓴다.
 */

export interface BackfillRecord {
  id: string;
  depositorName: string;
  memo: string | null;
  amount: number;
  transactionDate: Date;
}

export interface KindChange<T extends BackfillRecord> {
  record: T;
  kind: PaymentRecordKind;
  kindReason: string;
}

/**
 * 예전 레코드에는 거래구분이 남아 있지 않다. 통장 이자는 내용이 '…이자'로 끝난다.
 * '이자'가 들어가기만 하면 이자로 보면 이름이 '이자○'인 회원의 회비가 걸린다.
 */
const isInterest = (depositorName: string) =>
  depositorName.replace(/\s+/g, '').endsWith('이자');

export function planKindBackfill<T extends BackfillRecord>(
  records: T[],
  ratesFor: (year: number) => FeeRateSettings | null
): { changes: KindChange<T>[]; withoutRates: T[] } {
  const ratesOf = (record: T) =>
    ratesFor(kstYearMonth(record.transactionDate).year);

  const rows = records
    .filter((record) => ratesOf(record) != null)
    .map((record) => ({
      record,
      depositorName: record.depositorName,
      memo: record.memo,
      amount: record.amount,
      transactionDate: record.transactionDate,
      transactionType: isInterest(record.depositorName)
        ? '예금이자'
        : '일반입금',
    }));
  const clustered = findClusteredEventRows(rows, (year) => ratesFor(year)!);

  const changes: KindChange<T>[] = [];
  for (const row of rows) {
    const classification = classifyTransaction(row, ratesOf(row.record)!);
    if (classification.kind !== 'FEE') {
      changes.push({
        record: row.record,
        kind: classification.kind,
        kindReason:
          classification.kind === 'INTEREST'
            ? "내용이 '이자'로 끝남"
            : classification.kindReason,
      });
      continue;
    }
    const clusterReason = clustered.get(row);
    if (clusterReason) {
      changes.push({
        record: row.record,
        kind: 'EVENT',
        kindReason: clusterReason,
      });
    }
  }

  return {
    changes,
    withoutRates: records.filter((record) => ratesOf(record) == null),
  };
}
