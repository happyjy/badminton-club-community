import { describe, expect, it } from '@jest/globals';

import { splitDuplicates, transactionKey } from './duplicateDetector';

const row = (
  depositorName: string,
  amount: number,
  iso = '2026-05-03T01:00:00.000Z'
) => ({ transactionDate: new Date(iso), amount, depositorName });

describe('splitDuplicates', () => {
  it('이미 올라온 거래(같은 거래일시·금액·입금자명)는 중복으로 뺀다', () => {
    const existing = new Set([transactionKey(row('가나다', 25000))]);

    const { fresh, duplicates } = splitDuplicates(
      [row('가나다', 25000), row('마바사', 25000)],
      existing
    );

    expect(fresh.map((r) => r.depositorName)).toEqual(['마바사']);
    expect(duplicates.map((r) => r.depositorName)).toEqual(['가나다']);
  });

  it('거래일시·금액·입금자명 중 하나라도 다르면 새 거래다', () => {
    const existing = new Set([transactionKey(row('가나다', 25000))]);

    const { fresh } = splitDuplicates(
      [
        row('가나다', 25000, '2026-05-03T01:00:01.000Z'),
        row('가나다', 50000),
        row('가나다5월', 25000),
      ],
      existing
    );

    expect(fresh).toHaveLength(3);
  });

  it('입금자명 앞뒤 공백 차이는 같은 거래로 본다', () => {
    const existing = new Set([transactionKey(row('가나다', 25000))]);

    expect(
      splitDuplicates([row(' 가나다 ', 25000)], existing).duplicates
    ).toHaveLength(1);
  });

  it('한 파일 안에 같은 행이 두 번 있으면 둘째부터 중복이다', () => {
    const { fresh, duplicates } = splitDuplicates(
      [row('가나다', 25000), row('가나다', 25000)],
      new Set()
    );

    expect(fresh).toHaveLength(1);
    expect(duplicates).toHaveLength(1);
  });

  it('넘겨받은 기존 키 집합은 바꾸지 않는다', () => {
    const existing = new Set<string>();

    splitDuplicates([row('가나다', 25000)], existing);

    expect(existing.size).toBe(0);
  });
});
