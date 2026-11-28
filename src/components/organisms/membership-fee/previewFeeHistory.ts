import type {
  FeeHistoryMonth,
  MemberFeeHistory,
} from '@/types/membership-fee.types';

/**
 * 개발용 미리보기(/dev/admin-preview, /dev/screen-preview)의 가짜 납부 이력.
 * 이름은 지어낸 것이다. 부부 전환·휴회 칸의 납부·직접 추가·확인 중 입금이 모두 보이게 했다.
 */

const paid = (
  month: number,
  transactionDate: string | null,
  over: Partial<FeeHistoryMonth> = {},
  payment: Partial<FeeHistoryMonth['payments'][number]> = {}
): FeeHistoryMonth => ({
  month,
  status: 'PAID',
  leaveReason: null,
  isCouple: false,
  payments: [
    {
      amount: 25000,
      transactionDate,
      depositorName: null,
      manualReason: null,
      ...payment,
    },
  ],
  ...over,
});

const couple = { isCouple: true };
const coupleAmount = { amount: 22500 };

export const PREVIEW_FEE_HISTORY: MemberFeeHistory = {
  member: { name: '김가온', feeExcluded: false },
  year: 2026,
  years: [2026, 2025],
  asOf: '2026-11-20T05:30:00.000Z',
  summary: {
    unpaidCount: 1,
    unpaidAmount: 22500,
    monthlyFee: [
      { fromMonth: 1, toMonth: 4, amount: 25000, isCouple: false },
      { fromMonth: 5, toMonth: 12, amount: 22500, isCouple: true },
    ],
  },
  months: [
    paid(1, '2026-01-03T01:00:00.000Z'),
    paid(2, '2026-02-02T01:00:00.000Z'),
    {
      month: 3,
      status: 'LEAVE',
      leaveReason: '병가',
      isCouple: false,
      payments: [],
    },
    paid(4, '2026-04-01T01:00:00.000Z', {
      status: 'LEAVE',
      leaveReason: '병가',
    }),
    paid(5, '2026-04-30T15:30:00.000Z', couple, {
      ...coupleAmount,
      depositorName: '이하늘',
    }),
    paid(6, '2026-04-30T15:30:00.000Z', couple, {
      ...coupleAmount,
      depositorName: '이하늘',
    }),
    paid(7, '2026-07-01T01:00:00.000Z', couple, coupleAmount),
    paid(8, null, couple, {
      ...coupleAmount,
      manualReason: '현금으로 받음',
    }),
    paid(9, '2026-09-01T01:00:00.000Z', couple, coupleAmount),
    paid(10, '2026-10-02T01:00:00.000Z', couple, coupleAmount),
    {
      month: 11,
      status: 'UNPAID',
      leaveReason: null,
      isCouple: true,
      payments: [],
    },
    {
      month: 12,
      status: 'FUTURE',
      leaveReason: null,
      isCouple: true,
      payments: [],
    },
  ],
  pendingDeposits: [
    { transactionDate: '2026-11-18T01:00:00.000Z', amount: 22500 },
  ],
  leaves: [
    {
      startYear: 2026,
      startMonth: 3,
      endYear: 2026,
      endMonth: 4,
      reason: '병가',
    },
  ],
};
