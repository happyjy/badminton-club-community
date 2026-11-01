import { kstYearMonth } from './kst';
import { parseMonthHints } from './monthHintParser';

import type { NonFeeKind, PaymentRecordKind } from '@prisma/client';

/**
 * 통장 입금 한 건이 회비인지, 회비가 아니면 무엇인지 가른다.
 *
 * 회비 통장에는 가입비·행사비(뒷풀이, 단체티)·콕 값·찬조·이자가 함께 들어온다.
 * 이것들을 회비 흐름에서 빼 두지 않으면 재무가 한 건씩 건너뛰어야 하고,
 * 실수로 확정하면 행사비가 그 달 회비로 잡힌다.
 */

/** 한 해의 회비 단가 */
export interface FeeRateSettings {
  regularMonthly: number;
  coupleMonthly: number;
  regularAnnual: number | null;
  coupleAnnual: number | null;
  joiningFeeAmounts: number[];
}

export interface Classification {
  kind: PaymentRecordKind;
  /** 분류한 근거. 화면에 그대로 보인다 */
  kindReason: string;
  /** 회비가 아닌 금액 (가입비+회비를 한 번에 낸 경우의 가입비) */
  nonFeeAmount: number;
  nonFeeKind: NonFeeKind | null;
  needsReview: boolean;
  /**
   * 가입비 판정을 금액만 보고 추정했는지.
   * 추정이면 기존 회원의 입금일 때 회비로 되돌린다 (`refineForEstablishedMember`).
   */
  joiningGuessed: boolean;
}

interface ClassifiableRow {
  depositorName: string;
  memo: string | null;
  amount: number;
  transactionType: string;
  transactionDate: Date;
}

// 2026년 통장에서 뽑은 초기값. 운영하며 늘린다.
export const EVENT_KEYWORDS = [
  '뒷풀이',
  '뒤풀이',
  '뒷풀',
  '회식',
  '월례회',
  '단체티',
  '단체복',
  '대회',
  '참가비',
];
export const OTHER_KEYWORDS = ['콕', '찬조'];

/**
 * 회비에 얹어 보내곤 하는 것.
 * 이름만 적어 보낸 한 달 회비 이상의 돈에 재무가 메모로 달아 둔 경우("콕1")는
 * 회비에 그 값이 섞인 것으로 본다. 건너뛰면 그 달 회비가 조용히 사라진다.
 */
const BUNDLED_WITH_FEE_KEYWORDS = ['콕'];
/** "가나다티"처럼 이름 뒤에 '티'만 붙인 단체티 입금 */
const NAME_WITH_TEE = /[가-힣]{2,4}티$/;

const INTEREST_TRANSACTION_TYPE = '예금이자';
/** 가입비와 함께 냈다고 추정할 회비의 최대 개월 수. 신규 회원은 보통 첫 달만 함께 낸다. */
const MAX_MONTHS_GUESSED_WITH_JOINING = 2;
/** 연납을 몇 명분까지 한 번에 낸 것으로 볼지 */
const MAX_ANNUAL_PAYERS = 3;

const won = (amount: number) => `${amount.toLocaleString('ko-KR')}원`;
const compact = (text: string) => text.normalize('NFC').replace(/\s+/g, '');

export function feeAmountOf(row: {
  amount: number;
  nonFeeAmount: number;
}): number {
  return row.amount - row.nonFeeAmount;
}

function isAnnualAmount(amount: number, rates: FeeRateSettings): boolean {
  return [rates.regularAnnual, rates.coupleAnnual].some((annual) => {
    if (!annual || annual <= 0) return false;
    const payers = amount / annual;
    return (
      Number.isInteger(payers) && payers >= 1 && payers <= MAX_ANNUAL_PAYERS
    );
  });
}

/** 어떤 회비 단가(월납·부부·연납)로든 나누어떨어지는 금액인지 */
export function isMultipleOfAnyRate(
  amount: number,
  rates: FeeRateSettings
): boolean {
  if (amount <= 0) return false;
  const monthly = [rates.regularMonthly, rates.coupleMonthly].filter(
    (unit) => unit > 0
  );
  return (
    monthly.some((unit) => amount % unit === 0) || isAnnualAmount(amount, rates)
  );
}

/** 입금자가 회비라고 밝혔는지: '회비'·'월비' 글자나 월 표기 */
function hasFeeSignal(row: ClassifiableRow): boolean {
  const text = compact(`${row.depositorName} ${row.memo ?? ''}`);
  if (text.includes('회비') || text.includes('월비')) return true;
  return (
    parseMonthHints(row.depositorName, row.transactionDate).length > 0 ||
    parseMonthHints(row.memo ?? '', row.transactionDate).length > 0
  );
}

function findNonFeeKeyword(
  row: ClassifiableRow
): { kind: 'EVENT' | 'OTHER'; word: string; memoOnly: boolean } | null {
  const name = compact(row.depositorName);
  const text = compact(`${row.depositorName} ${row.memo ?? ''}`);
  const eventWord = EVENT_KEYWORDS.find((word) => text.includes(word));
  if (eventWord) return { kind: 'EVENT', word: eventWord, memoOnly: false };
  if (NAME_WITH_TEE.test(name)) {
    return { kind: 'EVENT', word: '티', memoOnly: false };
  }
  const otherWord = OTHER_KEYWORDS.find((word) => text.includes(word));
  if (otherWord) {
    return {
      kind: 'OTHER',
      word: otherWord,
      memoOnly: !name.includes(otherWord),
    };
  }
  return null;
}

/** 가입비를 뺀 나머지가 "가입하며 함께 낸 회비"로 볼 만한 금액인지 */
function isFeeAlongsideJoining(
  rest: number,
  rates: FeeRateSettings,
  stated: boolean
): boolean {
  if (rest <= 0) return false;
  // 가입비라고 적혀 있으면 나머지가 단가 배수이기만 하면 된다.
  if (stated) return isMultipleOfAnyRate(rest, rates);
  const months = rest / rates.regularMonthly;
  const isFewRegularMonths =
    rates.regularMonthly > 0 &&
    Number.isInteger(months) &&
    months <= MAX_MONTHS_GUESSED_WITH_JOINING;
  return isFewRegularMonths || rest === rates.coupleMonthly;
}

export function classifyTransaction(
  row: ClassifiableRow,
  rates: FeeRateSettings
): Classification {
  const base = {
    nonFeeAmount: 0,
    nonFeeKind: null as NonFeeKind | null,
    needsReview: false,
    joiningGuessed: false,
  };

  if (row.transactionType === INTEREST_TRANSACTION_TYPE) {
    return { ...base, kind: 'INTEREST', kindReason: "거래구분 '예금이자'" };
  }

  const feeSignal = hasFeeSignal(row);
  const keyword = findNonFeeKeyword(row);
  if (keyword) {
    // "월비,콕1"처럼 회비와 함께 낸 건은 건너뛰지 않고 재무가 금액을 나누게 한다.
    if (feeSignal && row.amount >= rates.regularMonthly) {
      return {
        ...base,
        kind: 'FEE',
        kindReason: `회비와 '${keyword.word}'이(가) 함께 적혀 있음 — 회비가 아닌 금액을 나눠주세요`,
        needsReview: true,
      };
    }
    if (
      keyword.memoOnly &&
      BUNDLED_WITH_FEE_KEYWORDS.includes(keyword.word) &&
      row.amount >= rates.regularMonthly
    ) {
      return {
        ...base,
        kind: 'FEE',
        kindReason: `메모에 '${keyword.word}' — 회비에 얹어 낸 돈이면 회비가 아닌 금액을 나눠주세요`,
        needsReview: true,
      };
    }
    return {
      ...base,
      kind: keyword.kind,
      kindReason: `'${keyword.word}' 표기`,
    };
  }

  const joiningStated = compact(
    `${row.depositorName} ${row.memo ?? ''}`
  ).includes('가입');
  const isJoiningAmount = rates.joiningFeeAmounts.includes(row.amount);
  if (isJoiningAmount && (joiningStated || !feeSignal)) {
    return {
      ...base,
      kind: 'JOINING_FEE',
      kindReason: joiningStated
        ? "'가입' 표기"
        : `금액 ${won(row.amount)} = 가입비`,
      joiningGuessed: !joiningStated,
    };
  }

  // 연납 금액은 "가입비 + 몇 달"로 쪼개질 수 있어 먼저 확인한다.
  if (!joiningStated && isAnnualAmount(row.amount, rates)) {
    return { ...base, kind: 'FEE', kindReason: '연납 금액' };
  }

  if (!isJoiningAmount) {
    const joining = rates.joiningFeeAmounts.find((amount) =>
      isFeeAlongsideJoining(row.amount - amount, rates, joiningStated)
    );
    if (joining !== undefined) {
      return {
        ...base,
        kind: 'FEE',
        kindReason: `가입비 ${won(joining)} + 회비 ${won(row.amount - joining)}`,
        nonFeeAmount: joining,
        nonFeeKind: 'JOINING_FEE',
        joiningGuessed: !joiningStated,
      };
    }
  }

  if (isMultipleOfAnyRate(row.amount, rates)) {
    return { ...base, kind: 'FEE', kindReason: '회비 단가의 배수' };
  }
  if (row.amount < rates.regularMonthly) {
    return {
      ...base,
      kind: 'FEE',
      kindReason: '한 달 단가보다 적은 금액',
      needsReview: true,
    };
  }
  return {
    ...base,
    kind: 'FEE',
    kindReason: '단가의 배수가 아닌 금액',
    needsReview: true,
  };
}

/**
 * 금액만 보고 추정한 가입비 판정을, 기존 회원의 입금이면 회비로 되돌린다.
 *
 * 100,000원은 신규 회원에게는 가입비지만 기존 회원에게는 넉 달 치 회비이고,
 * 125,000원은 "가입비 + 한 달"일 수도 "다섯 달 치"일 수도 있다.
 * 되돌리지 않으면 기존 회원이 몰아 낸 회비에서 가입비만큼이 조용히 빠진다.
 */
export function refineForEstablishedMember(
  classification: Classification,
  amount: number,
  rates: FeeRateSettings
): Classification {
  if (!classification.joiningGuessed) return classification;
  if (!isMultipleOfAnyRate(amount, rates)) return classification;
  return {
    kind: 'FEE',
    kindReason: '기존 회원의 입금 — 가입비가 아니라 회비로 판정',
    nonFeeAmount: 0,
    nonFeeKind: null,
    needsReview: false,
    joiningGuessed: false,
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 키워드 없이 들어온 행사 입금을 찾는다. 돌려주는 값은 행 → 근거.
 *
 * 뒷풀이·단체티는 "이름 + 15,000원"처럼 아무 표시 없이 수십 건이 며칠 사이에 들어온다.
 * 회비 단가의 배수가 아닌 같은 금액이 `windowDays`일 안에 `minCount`건 이상이면 행사로 본다.
 * 그 기간에 들어온 그 금액의 2~4배(여러 명 몫을 한 사람이 낸 것)도 함께 묶는다.
 * 월이나 '회비'가 적힌 입금은 건드리지 않는다.
 *
 * - `events`: 행사로 보는 행
 * - `suspects`: 그 배수가 회비 단가의 배수이기도 한 행 (15,000원 × 3 = 부부 단가 45,000원).
 *   행사비일 수도 회비일 수도 있으므로 어느 쪽으로도 단정하지 않고 사람이 보게 한다.
 */
export function findEventClusters<T extends ClassifiableRow>(
  rows: T[],
  ratesFor: (year: number) => FeeRateSettings,
  minCount = 5,
  windowDays = 7
): { events: Map<T, string>; suspects: Map<T, string> } {
  const result = new Map<T, string>();
  const suspects = new Map<T, string>();
  const candidates = rows.filter(
    (row) =>
      row.transactionType !== INTEREST_TRANSACTION_TYPE && !hasFeeSignal(row)
  );

  const byAmount = new Map<number, T[]>();
  for (const row of candidates) {
    // 거래 연도는 한국 시각으로 읽는다 (서버는 UTC라 새해 첫날 새벽이 전년으로 읽힌다)
    const rates = ratesFor(kstYearMonth(row.transactionDate).year);
    if (
      isMultipleOfAnyRate(row.amount, rates) ||
      rates.joiningFeeAmounts.includes(row.amount)
    ) {
      continue;
    }
    byAmount.set(row.amount, [...(byAmount.get(row.amount) ?? []), row]);
  }

  const clusters: { amount: number; from: number; to: number }[] = [];
  const windowMs = windowDays * DAY_MS;
  for (const [amount, group] of byAmount) {
    const sorted = [...group].sort(
      (a, b) => a.transactionDate.getTime() - b.transactionDate.getTime()
    );
    const time = (index: number) => sorted[index].transactionDate.getTime();
    const inCluster = new Set<number>();
    for (let start = 0; start < sorted.length; start++) {
      let end = start;
      while (
        end + 1 < sorted.length &&
        time(end + 1) - time(start) <= windowMs
      ) {
        end++;
      }
      if (end - start + 1 >= minCount) {
        for (let i = start; i <= end; i++) inCluster.add(i);
      }
    }
    if (inCluster.size === 0) continue;

    // 이어진 묶음마다 기간을 잡는다 (6월 뒷풀이와 9월 뒷풀이는 다른 묶음).
    const indexes = [...inCluster].sort((a, b) => a - b);
    let first = indexes[0];
    let last = indexes[0];
    const close = () => {
      const count = last - first + 1;
      for (let i = first; i <= last; i++) {
        result.set(
          sorted[i],
          `같은 금액 ${won(amount)} ${count}건이 몰려 들어옴`
        );
      }
      clusters.push({ amount, from: time(first), to: time(last) });
    };
    for (const index of indexes.slice(1)) {
      if (index === last + 1 && time(index) - time(last) <= windowMs) {
        last = index;
      } else {
        close();
        first = index;
        last = index;
      }
    }
    close();
  }

  for (const row of candidates) {
    if (result.has(row)) continue;
    const at = row.transactionDate.getTime();
    for (const cluster of clusters) {
      const people = row.amount / cluster.amount;
      const within = at >= cluster.from - DAY_MS && at <= cluster.to + DAY_MS;
      if (within && Number.isInteger(people) && people >= 2 && people <= 4) {
        const rates = ratesFor(kstYearMonth(row.transactionDate).year);
        if (isMultipleOfAnyRate(row.amount, rates)) {
          suspects.set(
            row,
            `몰려 들어온 ${won(cluster.amount)}의 ${people}명 몫일 수 있습니다 — 행사비면 분류를 바꾸고, 회비면 개별 확정하세요`
          );
        } else {
          result.set(
            row,
            `몰려 들어온 ${won(cluster.amount)}의 ${people}명 몫으로 보임`
          );
        }
        break;
      }
    }
  }

  return { events: result, suspects };
}

/** 행사로 단정할 수 있는 행만 (`findEventClusters`의 `events`) */
export function findClusteredEventRows<T extends ClassifiableRow>(
  rows: T[],
  ratesFor: (year: number) => FeeRateSettings,
  minCount = 5,
  windowDays = 7
): Map<T, string> {
  return findEventClusters(rows, ratesFor, minCount, windowDays).events;
}
