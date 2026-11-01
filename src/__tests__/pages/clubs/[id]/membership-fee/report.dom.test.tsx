/**
 * 회비 리포트 화면의 회원별 연간 납부.
 */
import { describe, expect, it, jest } from '@jest/globals';
import { render, screen, within } from '@testing-library/react';

import ReportPage from '@/pages/clubs/[id]/membership-fee/report';

jest.mock('next/router', () => ({
  useRouter: () => ({ query: { id: '1' }, push: jest.fn() }),
}));
jest.mock('@/lib/withAuth', () => ({
  withAuth: (Component: unknown) => Component,
}));
jest.mock('@/utils/permissions', () => ({
  checkClubAdminPermission: jest.fn(),
}));

const member = (
  id: number,
  name: string,
  over: Record<string, unknown> = {}
) => ({
  id,
  name,
  type: 'regular',
  couplePartnerName: null,
  payments: {},
  paidCount: 12,
  totalMonths: 12,
  ...over,
});

jest.mock('@/hooks/membership-fee/usePaymentDashboard', () => ({
  usePaymentDashboard: () => ({
    isLoading: false,
    data: {
      year: 2026,
      members: [
        member(1, '가온'),
        // 4월부터 면제 (연중에 임원이 됨): 1~3월을 냈다
        member(2, '나래', {
          type: 'exempt',
          exemptMonths: [4, 5, 6, 7, 8, 9, 10, 11, 12],
          paidCount: 3,
          totalMonths: 3,
        }),
        // 1년 전체 면제
        member(3, '다람', {
          type: 'exempt',
          exemptMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
          paidCount: 0,
          totalMonths: 0,
        }),
      ],
      summary: {
        totalMembers: 3,
        exemptMembers: 2,
        coupleGroups: 0,
        monthlyStats: [],
        yearTotal: 0,
      },
    },
  }),
  useUnpaidMembers: () => ({
    isLoading: false,
    data: { unpaidMembers: [], totalUnpaid: 0 },
  }),
}));

describe('회비 리포트 — 회원별 연간 납부', () => {
  it('연중에 면제가 된 회원은 면제 앞의 달로 싣고, 1년 전체 면제는 뺀다', () => {
    render(<ReportPage />);
    const table = within(
      screen.getByRole('table', { name: '회원별 연간 납부' })
    );

    expect(table.getByText('가온')).toBeTruthy();
    expect(table.getByText('나래')).toBeTruthy();
    expect(table.getByText('3/3')).toBeTruthy();
    expect(table.queryByText('다람')).toBeNull();
  });
});
