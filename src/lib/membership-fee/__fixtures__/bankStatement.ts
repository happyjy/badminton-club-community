import type { PlannerContext } from '../confirmPlanner';
import type { UploadDeps } from '../uploadPipeline';
import type { PaymentRecordKind } from '@prisma/client';

/**
 * 회귀 테스트용 가짜 통장.
 *
 * 실제 통장에서 본 **패턴**만 가짜 이름으로 옮겼다. 실제 회원 이름·거래는 넣지 않는다.
 * 각 행에 기대 결과를 함께 적어, 판정 규칙이 바뀌면 어느 패턴이 깨졌는지 바로 드러나게 한다.
 */

export const RATES = {
  regularMonthly: 25000,
  coupleMonthly: 45000,
  regularAnnual: 275000,
  coupleAnnual: 495000,
  joiningFeeAmounts: [100000],
};

const ESTABLISHED = new Date(2025, 0, 1);

/**
 * 1 가나다·2 마바사: 기존 회원 (2026년 1~4월 납부)
 * 3 아자차 + 4 카타파: 부부 (1~4월 납부)
 * 5 하거너: 3월 말 탈퇴
 * 6 더러머: 6월부터 의무인 신규 회원
 * 7 버서어: 1~2월만 낸 회원 (3·4월이 밀림)
 * 8 저처커: 6~7월 병가 (1~4월 납부)
 * 9 터퍼허: 올해 아직 아무것도 내지 않은 회원 (연납)
 */
export const MEMBERS = [
  { id: 1, name: '가나다', status: 'APPROVED', leftAt: null },
  { id: 2, name: '마바사', status: 'APPROVED', leftAt: null },
  { id: 3, name: '아자차', status: 'APPROVED', leftAt: null },
  { id: 4, name: '카타파', status: 'APPROVED', leftAt: null },
  { id: 5, name: '하거너', status: 'LEFT', leftAt: new Date(2026, 2, 31) },
  { id: 6, name: '더러머', status: 'APPROVED', leftAt: null },
  { id: 7, name: '버서어', status: 'APPROVED', leftAt: null },
  { id: 8, name: '저처커', status: 'APPROVED', leftAt: null },
  { id: 9, name: '터퍼허', status: 'APPROVED', leftAt: null },
].map((member) => ({
  ...member,
  feeObligationStartAt: member.id === 6 ? new Date(2026, 5, 1) : ESTABLISHED,
}));

const COUPLE = [3, 4];

const paid = (months: number[]) =>
  months.map((month) => ({ year: 2026, month, amount: 25000 }));

export function buildDeps(
  over: Partial<Pick<PlannerContext, 'exemptByYear'>> = {}
): UploadDeps {
  return {
    members: MEMBERS,
    coupleGroups: [
      {
        id: 1,
        members: COUPLE.map((id) => ({
          clubMemberId: id,
          clubMember: { ...MEMBERS[id - 1], leavePeriods: [] },
        })),
      },
    ],
    ctx: {
      ratesByYear: new Map([
        [2026, RATES],
        [2027, RATES],
      ]),
      coupleHistories: COUPLE.map((id) => ({
        clubMemberId: id,
        partnerClubMemberId: COUPLE.find((other) => other !== id)!,
        startedAt: ESTABLISHED,
        endedAt: null,
      })),
      coupleGroups: [{ members: COUPLE.map((id) => ({ clubMemberId: id })) }],
      memberStartAtMap: new Map(
        MEMBERS.map((m) => [m.id, m.feeObligationStartAt])
      ),
      memberLeftAtMap: new Map(MEMBERS.map((m) => [m.id, m.leftAt])),
      leaveMap: new Map([
        [8, [{ startYear: 2026, startMonth: 6, endYear: 2026, endMonth: 7 }]],
      ]),
      paidByMember: new Map([
        ...[1, 2, 3, 4, 8].map(
          (id) => [id, paid([1, 2, 3, 4])] as [number, ReturnType<typeof paid>]
        ),
        [7, paid([1, 2])],
      ]),
      exemptByYear: new Map(),
      ...over,
    },
  };
}

export interface Expected {
  kind: PaymentRecordKind;
  status: 'SKIPPED' | 'PENDING' | 'MATCHED' | 'ERROR';
  memberIds?: number[];
  /** 배정할 달. 2026년이면 월만, 다른 해면 `연도 * 100 + 월` (예: 202701) */
  months?: number[];
  /** 일괄 확정에서 빠지는지 (회원 확인 또는 금액·월 검토) */
  needsReview?: boolean;
  nonFeeAmount?: number;
  /** 월 힌트가 의무 시작 전이라, 앞당기면 되는 시작월 */
  suggestedStartMonth?: { year: number; month: number };
}

export interface StatementRow {
  /** 무엇을 지키려는 행인지 */
  pattern: string;
  /** 거래일 (한국 시각) */
  date: string;
  name: string;
  amount: number;
  memo?: string;
  type?: string;
  expect: Expected;
}

export const STATEMENT: StatementRow[] = [
  // ── 한 달 ──
  {
    pattern: '이름+월',
    date: '2026-05-03',
    name: '가나다5월',
    amount: 25000,
    expect: {
      kind: 'FEE',
      status: 'MATCHED',
      memberIds: [1],
      months: [5],
      needsReview: false,
    },
  },
  {
    pattern: '이름만 — 다음 안 낸 달',
    date: '2026-05-03',
    name: '가나다',
    amount: 25000,
    expect: {
      kind: 'FEE',
      status: 'MATCHED',
      memberIds: [1],
      months: [5],
      needsReview: false,
    },
  },
  // ── 몰아 내기·미리 내기·밀려 내기 ──
  {
    pattern: '몰아 내기 — 달을 나열',
    date: '2026-05-04',
    name: '마바사 5,6월',
    amount: 50000,
    expect: {
      kind: 'FEE',
      status: 'MATCHED',
      memberIds: [2],
      months: [5, 6],
      needsReview: false,
    },
  },
  {
    pattern: '미리 내기 — 달의 범위',
    date: '2026-05-04',
    name: '마바사6~9월',
    amount: 100000,
    expect: {
      kind: 'FEE',
      status: 'MATCHED',
      memberIds: [2],
      months: [6, 7, 8, 9],
      needsReview: false,
    },
  },
  {
    pattern: '밀려 내기 — 표시 없이 두 달 치, 밀린 달부터',
    date: '2026-05-11',
    name: '버서어',
    amount: 50000,
    expect: {
      kind: 'FEE',
      status: 'MATCHED',
      memberIds: [7],
      months: [3, 4],
      needsReview: false,
    },
  },
  {
    pattern: '밀려 내기 — 지난 달을 적음',
    date: '2026-05-11',
    name: '버서어3월',
    amount: 25000,
    expect: {
      kind: 'FEE',
      status: 'MATCHED',
      memberIds: [7],
      months: [3],
      needsReview: false,
    },
  },
  // ── 병가 ──
  {
    pattern: '병가 — 쉬는 달(6·7월)을 건너뛰고 배정',
    date: '2026-05-12',
    name: '저처커',
    amount: 50000,
    expect: {
      kind: 'FEE',
      status: 'MATCHED',
      memberIds: [8],
      months: [5, 8],
      needsReview: false,
    },
  },
  // ── 부부 ──
  {
    pattern: '부부 — 두 이름을 붙여 씀',
    date: '2026-05-05',
    name: '아자차카타파5월',
    amount: 45000,
    expect: {
      kind: 'FEE',
      status: 'MATCHED',
      memberIds: [3, 4],
      months: [5],
      needsReview: false,
    },
  },
  {
    pattern: '부부 — 한 사람 이름으로 부부 단가',
    date: '2026-05-05',
    name: '아자차',
    amount: 45000,
    expect: {
      kind: 'FEE',
      status: 'MATCHED',
      memberIds: [3, 4],
      months: [5],
      needsReview: false,
    },
  },
  {
    pattern: '부부 — 한 사람이 자기 몫(개인 단가)만 냄',
    date: '2026-05-05',
    name: '아자차',
    amount: 25000,
    expect: {
      kind: 'FEE',
      status: 'MATCHED',
      memberIds: [3],
      months: [5],
      needsReview: false,
    },
  },
  // ── 가입비·연납 ──
  {
    pattern: '기존 회원의 125,000원 — 가입비가 아니라 다섯 달 치',
    date: '2026-05-06',
    name: '가나다',
    amount: 125000,
    expect: {
      kind: 'FEE',
      status: 'MATCHED',
      memberIds: [1],
      months: [5, 6, 7, 8, 9],
      nonFeeAmount: 0,
    },
  },
  {
    pattern: '신규 회원의 125,000원 — 가입비 + 첫 달',
    date: '2026-06-02',
    name: '더러머',
    amount: 125000,
    expect: {
      kind: 'FEE',
      status: 'MATCHED',
      memberIds: [6],
      months: [6],
      nonFeeAmount: 100000,
      needsReview: false,
    },
  },
  {
    pattern: '가입비라고 적음',
    date: '2026-06-02',
    name: '더러머가입비',
    amount: 100000,
    expect: { kind: 'JOINING_FEE', status: 'SKIPPED' },
  },
  {
    pattern: '연납 — 연초에 한 해 치',
    date: '2026-01-05',
    name: '터퍼허연회비',
    amount: 275000,
    expect: {
      kind: 'FEE',
      status: 'MATCHED',
      memberIds: [9],
      months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      needsReview: false,
    },
  },
  // ── 회비가 아닌 입금 ──
  {
    pattern: '행사 — 뒷풀이',
    date: '2026-07-04',
    name: '가나다 뒷풀이',
    amount: 15000,
    memo: '1',
    expect: { kind: 'EVENT', status: 'SKIPPED' },
  },
  {
    pattern: '행사 — 단체티',
    date: '2026-08-12',
    name: '마바사단체티',
    amount: 20000,
    expect: { kind: 'EVENT', status: 'SKIPPED' },
  },
  {
    pattern: '이자',
    date: '2026-05-22',
    name: '입출금통장 이자',
    amount: 377,
    type: '예금이자',
    expect: { kind: 'INTEREST', status: 'SKIPPED' },
  },
  // ── 표시 없이 몰려 들어온 행사 입금 (6월 4~6일, 이름 + 15,000원) ──
  ...['가나다', '마바사', '아자차', '카타파', '더러머'].map(
    (name, index): StatementRow => ({
      pattern: '행사 — 표시 없이 같은 금액이 며칠 사이 5건',
      date: `2026-06-0${4 + (index % 3)}`,
      name,
      amount: 15000,
      expect: { kind: 'EVENT', status: 'SKIPPED' },
    })
  ),
  {
    pattern: '행사 — 그 기간에 두 명 몫을 한 사람이 냄',
    date: '2026-06-05',
    name: '버서어',
    amount: 30000,
    expect: { kind: 'EVENT', status: 'SKIPPED' },
  },
  {
    // 행사 세 명 몫일 수도, 부부 한 달 회비일 수도 있다. 어느 쪽으로도 조용히 넘기지 않는다.
    pattern:
      '행사가 몰린 기간의 45,000원 — 부부 단가와 같아 회비로 두되 확인받음',
    date: '2026-06-05',
    name: '아자차',
    amount: 45000,
    expect: {
      kind: 'FEE',
      status: 'MATCHED',
      memberIds: [3, 4],
      needsReview: true,
    },
  },
  // ── 사람이 봐야 하는 건 ──
  {
    pattern: '회비에 다른 돈이 섞임 (콕 값)',
    date: '2026-08-06',
    name: '가나다',
    amount: 26000,
    memo: '콕1',
    expect: {
      kind: 'FEE',
      status: 'MATCHED',
      memberIds: [1],
      needsReview: true,
    },
  },
  {
    pattern: '이름 오타 — 비슷한 회원에 붙이되 확인받음',
    date: '2026-05-08',
    name: '가나라3월회비',
    amount: 25000,
    expect: {
      kind: 'FEE',
      status: 'MATCHED',
      memberIds: [1],
      needsReview: true,
    },
  },
  {
    pattern: '탈퇴한 회원 — 후보에서 빠짐',
    date: '2026-05-09',
    name: '하거너5월',
    amount: 25000,
    expect: { kind: 'FEE', status: 'PENDING' },
  },
  {
    pattern: '모르는 이름',
    date: '2026-05-09',
    name: '모르는이',
    amount: 25000,
    expect: { kind: 'FEE', status: 'PENDING' },
  },
  {
    pattern: '한 달 단가보다 적게 냄',
    date: '2026-05-10',
    name: '가나다',
    amount: 20000,
    expect: {
      kind: 'FEE',
      status: 'MATCHED',
      memberIds: [1],
      needsReview: true,
    },
  },
  {
    pattern: '더 냄',
    date: '2026-05-10',
    name: '마바사8월',
    amount: 30000,
    memo: '5천원초과입금',
    expect: {
      kind: 'FEE',
      status: 'MATCHED',
      memberIds: [2],
      needsReview: true,
    },
  },
  {
    pattern: '의무 시작(6월) 전의 달을 적음 — 시작월을 앞당기라고 제안',
    date: '2026-06-02',
    name: '더러머5월',
    amount: 25000,
    expect: {
      kind: 'FEE',
      status: 'MATCHED',
      memberIds: [6],
      needsReview: true,
      suggestedStartMonth: { year: 2026, month: 5 },
    },
  },
  {
    pattern: '이미 낸 달을 적음',
    date: '2026-05-13',
    name: '가나다4월',
    amount: 25000,
    expect: {
      kind: 'FEE',
      status: 'MATCHED',
      memberIds: [1],
      needsReview: true,
    },
  },
];

/** 가나다(1번)를 2026년 면제로 둔 클럽에 넣는 통장 */
export const EXEMPT_MEMBER_ID = 1;
export const EXEMPT_STATEMENT: StatementRow[] = [
  {
    pattern: '면제 회원에 매칭 — 대납인지 본인 납부인지 확인받음',
    date: '2026-07-01',
    name: '가나다7월',
    amount: 25000,
    expect: {
      kind: 'FEE',
      status: 'MATCHED',
      memberIds: [1],
      needsReview: true,
    },
  },
  {
    pattern: '면제가 아닌 회원은 그대로 확정 대상',
    date: '2026-07-01',
    name: '마바사7월',
    amount: 25000,
    expect: {
      kind: 'FEE',
      status: 'MATCHED',
      memberIds: [2],
      months: [7],
      needsReview: false,
    },
  },
];
