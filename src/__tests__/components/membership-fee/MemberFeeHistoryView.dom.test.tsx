import { describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';

import { MemberFeeHistoryView } from '@/components/organisms/membership-fee/MemberFeeHistoryView';

import { pickOption } from '@/__tests__/helpers/optionPicker';
import type {
  FeeHistoryMonth,
  MemberFeeHistory,
} from '@/types/membership-fee.types';

const month = (
  m: number,
  status: FeeHistoryMonth['status'],
  over: Partial<FeeHistoryMonth> = {}
): FeeHistoryMonth => ({
  month: m,
  status,
  leaveReason: null,
  isCouple: false,
  payments: [],
  ...over,
});

const payment = (over: Partial<FeeHistoryMonth['payments'][number]> = {}) => ({
  amount: 25000,
  transactionDate: '2026-04-30T15:30:00Z', // 5월 1일 KST
  depositorName: null,
  manualReason: null,
  ...over,
});

const history = (over: Partial<MemberFeeHistory> = {}): MemberFeeHistory => ({
  member: { name: '가나다', feeExcluded: false },
  year: 2026,
  years: [2026, 2025],
  asOf: '2026-11-20T05:30:00Z',
  summary: {
    unpaidCount: 1,
    unpaidAmount: 22500,
    monthlyFee: [
      { fromMonth: 1, toMonth: 4, amount: 25000, isCouple: false },
      { fromMonth: 5, toMonth: 12, amount: 22500, isCouple: true },
    ],
  },
  months: [
    month(1, 'PAID', {
      payments: [payment({ depositorName: '라마바' })],
    }),
    month(2, 'NONE'),
    month(3, 'LEAVE', {
      leaveReason: '병가',
      payments: [payment()],
    }),
    month(5, 'PAID', {
      isCouple: true,
      payments: [payment({ amount: 22500 })],
    }),
    month(6, 'EXEMPT', { payments: [payment()] }),
    month(7, 'UNPAID'),
    month(8, 'PAID', {
      payments: [
        payment({
          transactionDate: null,
          manualReason: '현금으로 받음',
        }),
      ],
    }),
    month(12, 'FUTURE'),
  ],
  pendingDeposits: [{ transactionDate: '2026-11-18T01:00:00Z', amount: 25000 }],
  leaves: [
    {
      startYear: 2026,
      startMonth: 3,
      endYear: 2026,
      endMonth: 3,
      reason: '병가',
    },
  ],
  ...over,
});

const renderView = (
  over: Partial<MemberFeeHistory> = {},
  props: { showLeaves?: boolean; onChangeYear?: (year: number) => void } = {}
) =>
  render(
    <MemberFeeHistoryView
      history={history(over)}
      onChangeYear={props.onChangeYear ?? (() => {})}
      showLeaves={props.showLeaves ?? true}
    />
  );

describe('MemberFeeHistoryView', () => {
  it('반영 시각과 요약 두 줄을 보인다', () => {
    renderView();
    expect(
      screen.getByText('통장 거래 11월 20일 오후 2:30까지 반영')
    ).toBeTruthy();
    expect(screen.getByText('2026년 미납 1달 · 22,500원')).toBeTruthy();
    expect(
      screen.getByText('1~4월 25,000원 · 5월부터 22,500원 (부부)')
    ).toBeTruthy();
  });

  it('확인 중인 입금을 보인다', () => {
    renderView();
    expect(screen.getByText('확인 중인 입금')).toBeTruthy();
    expect(screen.getByText('11월 18일 입금 · 25,000원')).toBeTruthy();
    expect(screen.getByText('재무님 확인 중')).toBeTruthy();
  });

  it('확인 중인 입금이 없으면 그 묶음이 없다', () => {
    renderView({ pendingDeposits: [] });
    expect(screen.queryByText('확인 중인 입금')).toBeNull();
  });

  it('달마다 상태와 납부를 보인다', () => {
    renderView();
    expect(screen.getByText('2026년 납부 이력')).toBeTruthy();
    expect(
      screen.getByText('25,000원 · 5월 1일 입금 · 입금자 라마바')
    ).toBeTruthy();
    expect(screen.getByText('22,500원 · 5월 1일 입금 · 부부')).toBeTruthy();
    expect(
      screen.getByText('25,000원 · 직접 추가 · 현금으로 받음')
    ).toBeTruthy();
    expect(screen.getByText('7월')).toBeTruthy();
    expect(screen.getAllByText('미납').length).toBeGreaterThan(0);
  });

  it('해당 없음·아직 오지 않은 달 가운데 납부 없는 달은 숨긴다', () => {
    renderView();
    expect(screen.queryByText('2월')).toBeNull();
    expect(screen.queryByText('12월')).toBeNull();
  });

  it('휴회 칸의 사유와, 의무 없는 달·면제 달에 낸 회비를 알린다', () => {
    renderView();
    expect(screen.getByText('병가', { selector: 'p, span' })).toBeTruthy();
    expect(
      screen.getByText('25,000원 · 5월 1일 입금 · 의무 없는 달에 낸 회비')
    ).toBeTruthy();
    expect(
      screen.getByText('25,000원 · 5월 1일 입금 · 면제 달에 낸 회비')
    ).toBeTruthy();
  });

  it('showLeaves면 휴회 묶음을 보이고, 아니면 숨긴다', () => {
    const { unmount } = renderView();
    expect(screen.getByText('2026.03 ~ 2026.03 · 병가')).toBeTruthy();
    unmount();
    renderView({}, { showLeaves: false });
    expect(screen.queryByText('2026.03 ~ 2026.03 · 병가')).toBeNull();
  });

  it('끝이 없는 휴회는 미정으로 적는다', () => {
    renderView({
      leaves: [
        {
          startYear: 2026,
          startMonth: 12,
          endYear: null,
          endMonth: null,
          reason: null,
        },
      ],
    });
    expect(screen.getByText('2026.12 ~ 미정')).toBeTruthy();
  });

  it('연도를 고르면 onChangeYear가 불린다', async () => {
    const onChangeYear = jest.fn();
    renderView({}, { onChangeYear });
    await pickOption('연도', '2025년');
    expect(onChangeYear).toHaveBeenCalledWith(2025);
  });

  it('단가가 없으면 월 회비 줄을 숨긴다', () => {
    renderView({
      summary: { unpaidCount: 1, unpaidAmount: null, monthlyFee: [] },
    });
    expect(screen.getByText('2026년 미납 1달')).toBeTruthy();
    expect(screen.queryByText(/^월 /)).toBeNull();
  });

  it('회비 대상 아님이면 안내만 보인다', () => {
    renderView({
      member: { name: '가나다', feeExcluded: true },
      months: [],
      pendingDeposits: [],
    });
    expect(screen.getByText('회비 대상이 아니에요')).toBeTruthy();
    expect(screen.queryByText('2026년 납부 이력')).toBeNull();
    expect(screen.queryByText(/미납/)).toBeNull();
  });
});
