import { ComponentProps } from 'react';

import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';

import { FeeDashboardView } from '@/components/organisms/membership-fee/FeeDashboardView';

type Props = ComponentProps<typeof FeeDashboardView>;

const base: Props = {
  clubId: '1',
  year: 2020,
  onYearChange: () => {},
  dashboard: {
    year: 2020,
    latestUpload: { lastBatch: null, latestTransactionDate: null },
    feeSettings: { year: 2020, regularAmount: 30000, coupleAmount: 50000 },
    summary: {
      yearTotal: 0,
      totalMembers: 0,
      exemptMembers: 0,
      coupleGroups: 0,
      monthlyStats: [],
    },
    members: [],
  } as unknown as Props['dashboard'],
  memberFilter: 'all',
  onMemberFilterChange: () => {},
  throughMonth: 6,
  onThroughMonthChange: () => {},
  onExport: () => {},
  isExporting: false,
};

describe('FeeDashboardView — 납부현황 내보내기', () => {
  it('버튼을 누르면 내보내기를 부른다', () => {
    const onExport = jest.fn();
    render(<FeeDashboardView {...base} onExport={onExport} />);

    fireEvent.click(screen.getByRole('button', { name: '납부현황 내보내기' }));

    expect(onExport).toHaveBeenCalledTimes(1);
  });

  it('내보내는 중에는 그렇다고 알리고 다시 누를 수 없다', () => {
    const onExport = jest.fn();
    render(<FeeDashboardView {...base} onExport={onExport} isExporting />);

    const button = screen.getByRole('button', { name: /내보내는 중/ });
    fireEvent.click(button);

    expect(button).toHaveProperty('disabled', true);
    expect(onExport).not.toHaveBeenCalled();
  });

  it('데이터를 받지 못했으면 버튼을 보이지 않는다', () => {
    render(<FeeDashboardView {...base} dashboard={undefined} />);

    expect(
      screen.queryByRole('button', { name: '납부현황 내보내기' })
    ).toBeNull();
  });
});
