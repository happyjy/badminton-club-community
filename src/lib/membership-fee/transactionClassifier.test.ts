import { describe, expect, it } from '@jest/globals';

import {
  classifyTransaction,
  feeAmountOf,
  findClusteredEventRows,
  findEventClusters,
  refineForEstablishedMember,
} from './transactionClassifier';

const rates = {
  regularMonthly: 25000,
  coupleMonthly: 45000,
  regularAnnual: 275000,
  coupleAnnual: 495000,
  joiningFeeAmounts: [100000],
};

type Row = Parameters<typeof classifyTransaction>[0];

const row = (over: Partial<Row> = {}): Row => ({
  depositorName: '가나다',
  memo: null,
  amount: 25000,
  transactionType: '일반입금',
  transactionDate: new Date(2026, 5, 10),
  ...over,
});

describe('classifyTransaction', () => {
  it('거래구분이 예금이자면 이자다', () => {
    expect(
      classifyTransaction(
        row({
          transactionType: '예금이자',
          amount: 377,
          depositorName: '입출금통장 이자',
        }),
        rates
      )
    ).toMatchObject({ kind: 'INTEREST', needsReview: false });
  });

  it.each([
    '가나다 뒷풀이',
    '뒤풀이 가나다',
    '가나다 회식비',
    '가나다월례회',
    '가나다단체티',
    '단체복가나다',
    '가나다티',
    '가나다 대회저녁',
    '가나다(대회참가비지원)',
  ])('입금자명에 행사 글자가 있으면 행사다: %s', (depositorName) => {
    expect(
      classifyTransaction(row({ depositorName, amount: 15000 }), rates)
    ).toMatchObject({ kind: 'EVENT', needsReview: false });
  });

  it.each(['가나다 콕1', '가나다(찬조금)'])(
    '입금자명에 콕·찬조가 있으면 기타다: %s',
    (depositorName) => {
      expect(
        classifyTransaction(row({ depositorName, amount: 26000 }), rates).kind
      ).toBe('OTHER');
    }
  );

  it('메모에 적힌 행사·기타 글자도 본다', () => {
    expect(
      classifyTransaction(row({ memo: '단체티6', amount: 20000 }), rates).kind
    ).toBe('EVENT');
    expect(
      classifyTransaction(row({ memo: '콕1', amount: 12000 }), rates).kind
    ).toBe('OTHER');
  });

  it('이름만 적어 보낸 한 달 회비 이상의 돈에 메모로 콕이 달려 있으면 회비로 두고 검토하게 한다', () => {
    // 회비에 콕 값을 얹어 보낸 돈이다. 건너뛰면 그 달 회비가 조용히 사라진다.
    expect(
      classifyTransaction(row({ memo: '콕1', amount: 26000 }), rates)
    ).toMatchObject({
      kind: 'FEE',
      needsReview: true,
      nonFeeAmount: 0,
      kindReason:
        "메모에 '콕' — 회비에 얹어 낸 돈이면 회비가 아닌 금액을 나눠주세요",
    });
  });

  it('메모의 찬조는 금액이 커도 기타다', () => {
    expect(
      classifyTransaction(row({ memo: '찬조', amount: 100000 }), rates).kind
    ).toBe('OTHER');
  });

  it('행사 금액이 회비 단가와 같아도 행사 글자가 있으면 행사다', () => {
    expect(
      classifyTransaction(
        row({ depositorName: '가나다_단체티', amount: 25000 }),
        rates
      ).kind
    ).toBe('EVENT');
  });

  it('회비와 콕이 함께 적힌 입금은 회비로 두고 검토하게 한다', () => {
    expect(
      classifyTransaction(
        row({
          depositorName: '가나다(월비,콕1',
          memo: '8월,콕1',
          amount: 49500,
        }),
        rates
      )
    ).toMatchObject({ kind: 'FEE', needsReview: true, nonFeeAmount: 0 });
  });

  describe('가입비', () => {
    it('가입비 금액이고 회비라는 표시가 없으면 가입비로 추정한다', () => {
      expect(classifyTransaction(row({ amount: 100000 }), rates)).toMatchObject(
        { kind: 'JOINING_FEE', nonFeeAmount: 0, joiningGuessed: true }
      );
    });

    it('가입이라고 적혀 있으면 추정이 아니다', () => {
      expect(
        classifyTransaction(
          row({ depositorName: '가나다가입비', amount: 100000 }),
          rates
        )
      ).toMatchObject({ kind: 'JOINING_FEE', joiningGuessed: false });
    });

    it.each(['가나다 6~9월', '가나다 회비', '가나다월회비'])(
      '가입비 금액이라도 월이나 회비가 적혀 있으면 회비다: %s',
      (depositorName) => {
        expect(
          classifyTransaction(row({ depositorName, amount: 100000 }), rates)
        ).toMatchObject({ kind: 'FEE', nonFeeAmount: 0, needsReview: false });
      }
    );

    it('가입비에 한두 달 회비를 더한 금액은 가입비를 떼어 낸다', () => {
      expect(classifyTransaction(row({ amount: 125000 }), rates)).toMatchObject(
        {
          kind: 'FEE',
          nonFeeAmount: 100000,
          nonFeeKind: 'JOINING_FEE',
          needsReview: false,
          joiningGuessed: true,
        }
      );
      expect(classifyTransaction(row({ amount: 145000 }), rates)).toMatchObject(
        { kind: 'FEE', nonFeeAmount: 100000 }
      );
    });

    it('가입비와 회비를 함께 냈다고 적혀 있으면 추정이 아니다', () => {
      expect(
        classifyTransaction(
          row({ memo: '가입비+1월회비', amount: 125000 }),
          rates
        )
      ).toMatchObject({
        kind: 'FEE',
        nonFeeAmount: 100000,
        joiningGuessed: false,
      });
    });

    it('회비 부분이 석 달 이상이면 가입비를 떼지 않는다', () => {
      expect(classifyTransaction(row({ amount: 175000 }), rates)).toMatchObject(
        { kind: 'FEE', nonFeeAmount: 0 }
      );
    });

    it('연납 금액은 가입비+회비로 쪼개지 않는다', () => {
      expect(classifyTransaction(row({ amount: 275000 }), rates)).toMatchObject(
        { kind: 'FEE', nonFeeAmount: 0, needsReview: false }
      );
    });
  });

  it.each([25000, 50000, 45000, 275000, 495000, 825000, 540000])(
    '단가의 배수(월납·연납·부부)는 회비다: %d',
    (amount) => {
      expect(classifyTransaction(row({ amount }), rates)).toMatchObject({
        kind: 'FEE',
        needsReview: false,
        nonFeeAmount: 0,
      });
    }
  );

  it('한 달 단가보다 적으면 회비로 두고 검토하게 한다', () => {
    expect(classifyTransaction(row({ amount: 10000 }), rates)).toMatchObject({
      kind: 'FEE',
      needsReview: true,
    });
  });

  it('단가 배수가 아니면 회비로 두고 검토하게 한다', () => {
    expect(classifyTransaction(row({ amount: 52000 }), rates)).toMatchObject({
      kind: 'FEE',
      needsReview: true,
    });
  });

  it('입금자명이 비어 있어도 회비로 분류한다', () => {
    expect(
      classifyTransaction(row({ depositorName: '(이름 없음)' }), rates).kind
    ).toBe('FEE');
  });
});

describe('refineForEstablishedMember', () => {
  it('금액만으로 추정한 가입비는 기존 회원이면 회비로 되돌린다', () => {
    const guessed = classifyTransaction(row({ amount: 100000 }), rates);

    expect(refineForEstablishedMember(guessed, 100000, rates)).toMatchObject({
      kind: 'FEE',
      nonFeeAmount: 0,
      nonFeeKind: null,
      needsReview: false,
    });
  });

  it('금액만으로 떼어 낸 가입비도 기존 회원이면 되돌린다', () => {
    const guessed = classifyTransaction(row({ amount: 125000 }), rates);

    expect(refineForEstablishedMember(guessed, 125000, rates)).toMatchObject({
      kind: 'FEE',
      nonFeeAmount: 0,
      nonFeeKind: null,
    });
  });

  it('가입이라고 적힌 건은 기존 회원이어도 그대로 둔다', () => {
    const stated = classifyTransaction(
      row({ depositorName: '가나다가입비', amount: 100000 }),
      rates
    );

    expect(refineForEstablishedMember(stated, 100000, rates)).toEqual(stated);
  });

  it('가입비와 무관한 분류는 그대로 둔다', () => {
    const fee = classifyTransaction(row({ amount: 25000 }), rates);

    expect(refineForEstablishedMember(fee, 25000, rates)).toEqual(fee);
  });
});

describe('findClusteredEventRows', () => {
  const on = (day: number, over: Partial<Row> = {}) =>
    row({ amount: 15000, transactionDate: new Date(2026, 5, day), ...over });
  const ratesFor = () => rates;

  it('단가 배수가 아닌 같은 금액이 한 주에 5건 이상 몰리면 행사로 본다', () => {
    const rows = [on(4), on(4), on(5), on(6), on(7)];

    const clustered = findClusteredEventRows(rows, ratesFor);

    expect(clustered.size).toBe(5);
    expect(clustered.get(rows[0])).toContain('15,000원');
  });

  it('4건이면 몰린 것으로 보지 않는다', () => {
    const rows = [on(4), on(4), on(5), on(6)];

    expect(findClusteredEventRows(rows, ratesFor).size).toBe(0);
  });

  it('한 주 넘게 흩어져 있으면 몰린 것으로 보지 않는다', () => {
    const rows = [on(1), on(9), on(17), on(25), on(30)];

    expect(findClusteredEventRows(rows, ratesFor).size).toBe(0);
  });

  it('회비 단가의 배수는 몇 건이 몰려도 행사로 보지 않는다', () => {
    const rows = Array.from({ length: 10 }, () => on(4, { amount: 25000 }));

    expect(findClusteredEventRows(rows, ratesFor).size).toBe(0);
  });

  it('월이나 회비가 적힌 입금은 같은 금액이어도 뺀다', () => {
    const feeLike = on(5, { depositorName: '가나다 5월회비' });
    const rows = [on(4), on(4), on(5), on(6), on(7), feeLike];

    const clustered = findClusteredEventRows(rows, ratesFor);

    expect(clustered.has(feeLike)).toBe(false);
    expect(clustered.size).toBe(5);
  });

  it('몰린 금액의 배수가 그 기간에 들어오면 여러 명 몫으로 보고 함께 묶는다', () => {
    const two = on(6, { amount: 30000, depositorName: '가나다마바사' });
    const rows = [on(4), on(4), on(5), on(6), on(7), two];

    expect(findClusteredEventRows(rows, ratesFor).get(two)).toContain('2명');
  });

  it('그 배수가 회비 단가의 배수이기도 하면 행사로 단정하지 않고 의심만 남긴다', () => {
    // 15,000원 × 3 = 45,000원은 부부 한 달 단가와 같다
    const three = on(6, { amount: 45000, depositorName: '가나다' });
    const rows = [on(4), on(4), on(5), on(6), on(7), three];

    const { events, suspects } = findEventClusters(rows, ratesFor);

    expect(events.has(three)).toBe(false);
    expect(suspects.get(three)).toBe(
      '몰려 들어온 15,000원의 3명 몫일 수 있습니다 — 행사비면 분류를 바꾸고, 회비면 개별 확정하세요'
    );
    expect(findClusteredEventRows(rows, ratesFor).has(three)).toBe(false);
  });

  it('몰린 금액의 배수라도 월이 적혀 있거나 기간 밖이면 묶지 않는다', () => {
    const hinted = on(6, { amount: 45000, depositorName: '가나다마바사6월' });
    const later = on(20, { amount: 45000 });
    const rows = [on(4), on(4), on(5), on(6), on(7), hinted, later];

    const clustered = findClusteredEventRows(rows, ratesFor);

    expect(clustered.has(hinted)).toBe(false);
    expect(clustered.has(later)).toBe(false);
  });
});

describe('feeAmountOf', () => {
  it('입금액에서 회비가 아닌 금액을 뺀다', () => {
    expect(feeAmountOf({ amount: 125000, nonFeeAmount: 100000 })).toBe(25000);
  });
});
