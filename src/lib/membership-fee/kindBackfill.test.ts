import { describe, expect, it } from '@jest/globals';

import { planKindBackfill } from './kindBackfill';

const rates = {
  regularMonthly: 25000,
  coupleMonthly: 45000,
  regularAnnual: 275000,
  coupleAnnual: 495000,
  joiningFeeAmounts: [100000],
};
const ratesFor = (year: number) => (year === 2026 ? rates : null);

let nextId = 0;
const record = (
  depositorName: string,
  amount: number,
  over: { date?: string; memo?: string } = {}
) => ({
  id: `r${++nextId}`,
  depositorName,
  amount,
  memo: over.memo ?? null,
  transactionDate: new Date(`${over.date ?? '2026-03-10'}T10:00:00+09:00`),
});

const plan = (...records: ReturnType<typeof record>[]) =>
  planKindBackfill(records, ratesFor);

describe('planKindBackfill', () => {
  it('행사·기타 글자가 있는 건은 그 분류와 근거를 돌려준다', () => {
    const tee = record('가나다단체티', 20000);
    const shuttle = record('마바사 콕1', 12000);

    expect(plan(tee, shuttle).changes).toEqual([
      { record: tee, kind: 'EVENT', kindReason: "'단체티' 표기" },
      { record: shuttle, kind: 'OTHER', kindReason: "'콕' 표기" },
    ]);
  });

  it('통장 이자는 이자로 본다', () => {
    const interest = record('입출금통장 이자', 377);

    // 예전 레코드에는 거래구분이 없다. 근거를 거래구분이라고 적으면 거짓이다.
    expect(plan(interest).changes).toEqual([
      {
        record: interest,
        kind: 'INTEREST',
        kindReason: "내용이 '이자'로 끝남",
      },
    ]);
  });

  it("이름에 '이자'가 들어간 회원의 회비는 이자로 보지 않는다", () => {
    expect(plan(record('이자영', 25000)).changes).toEqual([]);
  });

  it('표시 없이 같은 금액이 몰려 들어온 건은 행사로 본다', () => {
    const afterParty = ['가나다', '마바사', '아자차', '카타파', '하거너'].map(
      (name, index) =>
        record(name, 15000, { date: `2026-06-0${4 + (index % 3)}` })
    );

    const { changes } = plan(...afterParty);

    expect(changes).toHaveLength(5);
    expect(changes[0]).toMatchObject({
      kind: 'EVENT',
      kindReason: '같은 금액 15,000원 5건이 몰려 들어옴',
    });
  });

  it('가입비 금액은 가입비로 본다', () => {
    expect(plan(record('더러머', 100000)).changes).toMatchObject([
      { kind: 'JOINING_FEE' },
    ]);
  });

  it('재무가 직접 건너뛴 회비는 그대로 둔다', () => {
    expect(plan(record('가나다3월', 25000), record('마바사', 20000))).toEqual({
      changes: [],
      withoutRates: [],
    });
  });

  it('단가 설정이 없는 해의 건은 판정하지 않고 따로 알린다', () => {
    const old = record('가나다단체티', 20000, { date: '2024-03-10' });

    expect(plan(old)).toEqual({ changes: [], withoutRates: [old] });
  });

  it('거래 연도는 한국 시각으로 읽는다', () => {
    // 서버(UTC)에서는 아직 2025년 12월 31일이다
    const newYear = {
      ...record('가나다단체티', 20000),
      transactionDate: new Date('2026-01-01T00:30:00+09:00'),
    };

    expect(plan(newYear).changes).toHaveLength(1);
  });
});
