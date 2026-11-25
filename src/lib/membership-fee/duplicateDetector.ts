/**
 * 같은 통장 거래를 두 번 올렸는지 가린다.
 * 재무는 "어디까지 올렸는지" 기억하기 어려워 기간이 겹치는 파일을 다시 올리곤 한다.
 */

interface TransactionRow {
  transactionDate: Date;
  amount: number;
  depositorName: string;
}

/** 같은 거래면 같은 값이 나오는 키: 거래일시(초 단위) + 금액 + 입금자명 */
export function transactionKey(row: TransactionRow): string {
  return `${row.transactionDate.getTime()}|${row.amount}|${row.depositorName.trim()}`;
}

/**
 * 이미 올라온 거래를 새 행에서 가려낸다.
 * 한 파일 안에 같은 행이 두 번 있으면 둘째부터 중복으로 본다.
 */
export function splitDuplicates<T extends TransactionRow>(
  rows: T[],
  existingKeys: ReadonlySet<string>
): { fresh: T[]; duplicates: T[] } {
  const seen = new Set(existingKeys);
  const fresh: T[] = [];
  const duplicates: T[] = [];
  for (const row of rows) {
    const key = transactionKey(row);
    if (seen.has(key)) {
      duplicates.push(row);
    } else {
      seen.add(key);
      fresh.push(row);
    }
  }
  return { fresh, duplicates };
}
