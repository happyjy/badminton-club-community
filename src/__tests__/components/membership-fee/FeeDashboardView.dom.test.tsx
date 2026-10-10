import { ComponentProps } from 'react';

import { describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen, within } from '@testing-library/react';

import { FeeDashboardView } from '@/components/organisms/membership-fee/FeeDashboardView';

import { pickOption } from '@/__tests__/helpers/optionPicker';
import type { MemberPaymentStatus } from '@/types/membership-fee.types';

type Props = ComponentProps<typeof FeeDashboardView>;
type Dashboard = NonNullable<Props['dashboard']>;

/** 1월부터 paidThrough월까지 납부한 회원 */
const member = (
  id: number,
  name: string,
  paidThrough: number,
  extra: Partial<MemberPaymentStatus> = {}
) =>
  ({
    id,
    userId: id,
    name,
    type: 'regular',
    payments: Object.fromEntries(
      Array.from({ length: 12 }, (_, i) => [i + 1, i < paidThrough])
    ),
    paidCount: paidThrough,
    totalMonths: 12,
    ...extra,
  }) as unknown as MemberPaymentStatus;

const DASHBOARD = {
  year: 2020,
  latestUpload: { lastBatch: null, latestTransactionDate: null },
  feeSettings: { year: 2020, regularAmount: 30000, coupleAmount: 50000 },
  summary: {
    yearTotal: 360000,
    totalMembers: 2,
    exemptMembers: 0,
    coupleGroups: 0,
    monthlyStats: [],
  },
  members: [member(1, '가온', 12), member(2, '나래', 2)],
} as unknown as Dashboard;

const base: Props = {
  clubId: '1',
  // 지난 해로 둔다. 올해면 "아직 안 온 달"이 날짜에 따라 달라진다.
  year: 2020,
  onYearChange: () => {},
  dashboard: DASHBOARD,
  memberFilter: 'all',
  onMemberFilterChange: () => {},
  throughMonth: 6,
  onThroughMonthChange: () => {},
  onExport: () => {},
  isExporting: false,
};

const grid = () =>
  within(screen.getByRole('table', { name: '회원별 납부 현황' }));

describe('FeeDashboardView', () => {
  it('바로가기 6개가 각 화면을 가리킨다', () => {
    render(<FeeDashboardView {...base} />);
    const href = (name: string) =>
      screen.getByRole('link', { name }).getAttribute('href');
    expect(href('회비 유형 관리')).toBe(
      '/clubs/1/membership-fee/settings/fee-types'
    );
    expect(href('부부 관리')).toBe('/clubs/1/membership-fee/settings/couples');
    expect(href('면제 관리')).toBe(
      '/clubs/1/membership-fee/settings/exemptions'
    );
    expect(href('입금 내역 처리')).toBe('/clubs/1/membership-fee/process');
    expect(href('리포트')).toBe('/clubs/1/membership-fee/report');
    expect(href('업로드 이력')).toBe('/clubs/1/membership-fee/batches');
  });

  it('데이터가 아직 없어도 바로가기는 보인다', () => {
    render(<FeeDashboardView {...base} dashboard={undefined} />);
    expect(screen.getByRole('link', { name: '입금 내역 처리' })).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('데이터를 받지 못했을 때도 회비 설정 안내를 보인다', () => {
    render(<FeeDashboardView {...base} dashboard={undefined} />);
    expect(screen.getByRole('note').textContent).toContain(
      '2020년 회비 설정이 필요합니다.'
    );
  });

  it('휴회 칸은 시작월·탈퇴월과 겹쳐도 휴회라고 알린다', () => {
    render(
      <FeeDashboardView
        {...base}
        dashboard={{
          ...DASHBOARD,
          members: [
            member(1, '가온', 0, {
              isLeft: true,
              leftMonth: 4,
              leftAtFormatted: '2020.04',
              leaveMonths: [4],
            }),
          ],
        }}
      />
    );
    const icon = grid().getByLabelText('휴회/병가');
    expect(icon.closest('[title="휴회/병가"]')).toBeTruthy();
    expect(icon.closest('td')?.getAttribute('title')).toBe('탈퇴 (2020.04)');
  });

  it('휴회 칸에 납부가 걸려 있으면 이월이 필요하다고 알린다', () => {
    render(
      <FeeDashboardView
        {...base}
        dashboard={{
          ...DASHBOARD,
          members: [
            member(1, '가온', 4, {
              obligationMonths: [1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12],
              leaveMonths: [4],
              orphanPaidMonths: [4],
            }),
          ],
        }}
      />
    );

    const icon = grid().getByLabelText('휴회/병가 · 납부 있음 — 이월 필요');
    expect(icon.closest('td')?.getAttribute('title')).toBe(
      '휴회/병가 · 납부 있음 — 이월 필요'
    );
  });

  it('가입 전·탈퇴 후의 달에 납부가 걸려 있어도 이월이 필요하다고 알린다', () => {
    render(
      <FeeDashboardView
        {...base}
        dashboard={{
          ...DASHBOARD,
          members: [
            member(1, '가온', 4, {
              obligationMonths: [1, 2, 3],
              orphanPaidMonths: [4],
            }),
          ],
        }}
      />
    );

    const icon = grid().getByLabelText('의무 없음 · 납부 있음 — 이월 필요');
    expect(icon.closest('td')?.getAttribute('title')).toBe(
      '의무 없음 · 납부 있음 — 이월 필요'
    );
  });

  it('회비 설정이 없으면 유형 관리로 가는 안내를 보인다', () => {
    render(
      <FeeDashboardView
        {...base}
        dashboard={{ ...DASHBOARD, feeSettings: null }}
      />
    );
    const note = screen.getByRole('note');
    expect(note.textContent).toContain('2020년 회비 설정이 필요합니다.');
    expect(
      within(note)
        .getByRole('link', { name: '회비 유형 관리' })
        .getAttribute('href')
    ).toBe('/clubs/1/membership-fee/settings/fee-types');
  });

  it('회비 설정이 있으면 금액을 보인다', () => {
    render(<FeeDashboardView {...base} />);
    expect(screen.getByText('일반: 30,000원 / 부부: 50,000원')).toBeTruthy();
    expect(screen.queryByRole('note')).toBeNull();
  });

  it('보기 방식을 바꾸면 알린다', async () => {
    const onMemberFilterChange = jest.fn();
    render(
      <FeeDashboardView {...base} onMemberFilterChange={onMemberFilterChange} />
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: '미납 있음' }));
    });
    expect(onMemberFilterChange).toHaveBeenCalledWith('unpaid');
  });

  it('전체 보기에서는 모든 회원과 기준 설명을 보인다', () => {
    render(<FeeDashboardView {...base} />);
    expect(grid().getByText('가온')).toBeTruthy();
    expect(grid().getByText('나래')).toBeTruthy();
    expect(
      screen.getByText(
        '미납·납부 완료 탭에서는 1월부터 선택한 달까지를 기준으로 일반·부부 회원만 추립니다.'
      )
    ).toBeTruthy();
  });

  it('미납 보기에서는 기준 달까지 미납이 있는 회원만 보이고, 기준 달을 바꿀 수 있다', async () => {
    const onThroughMonthChange = jest.fn();
    render(
      <FeeDashboardView
        {...base}
        memberFilter="unpaid"
        onThroughMonthChange={onThroughMonthChange}
      />
    );
    expect(grid().queryByText('가온')).toBeNull();
    expect(grid().getByText('나래')).toBeTruthy();
    expect(
      screen.getByText('1월 ~ 선택한 달 사이 미납이 있는 회원만')
    ).toBeTruthy();
    await pickOption('미납 판정 기준 마지막 달', '3월까지');
    expect(onThroughMonthChange).toHaveBeenCalledWith(3);
  });

  it('납부 완료 보기에서는 기준 달까지 모두 낸 회원만 보인다', () => {
    render(<FeeDashboardView {...base} memberFilter="paid" throughMonth={2} />);
    expect(grid().getByText('가온')).toBeTruthy();
    expect(grid().getByText('나래')).toBeTruthy();
    expect(
      screen.getByText('1월 ~ 선택한 달까지 모두 납부한 회원만')
    ).toBeTruthy();
  });

  it('해당 회원이 없으면 빈 문구를 보인다', () => {
    const { rerender } = render(
      <FeeDashboardView {...base} memberFilter="unpaid" throughMonth={2} />
    );
    expect(
      screen.getByText(
        '2020년 1~2월 사이 미납이 있는 일반·부부 회원이 없습니다.'
      )
    ).toBeTruthy();

    rerender(
      <FeeDashboardView
        {...base}
        memberFilter="paid"
        throughMonth={6}
        dashboard={{ ...DASHBOARD, members: [member(2, '나래', 2)] }}
      />
    );
    expect(
      screen.getByText(
        '2020년 1~6월까지 모두 납부한 일반·부부 회원이 없습니다.'
      )
    ).toBeTruthy();
  });

  it('회원 이름은 돌아올 곳을 담아 회원 상세로 간다', () => {
    render(<FeeDashboardView {...base} />);
    expect(
      grid().getByRole('link', { name: '가온' }).getAttribute('href')
    ).toBe(
      '/clubs/1/members/1?from=/clubs/1/membership-fee&fromLabel=회비 정산'
    );
  });

  it('월 칸은 납부·미납·휴회·의무 없음·면제를 구분해 알린다', () => {
    render(
      <FeeDashboardView
        {...base}
        dashboard={{
          ...DASHBOARD,
          members: [
            member(1, '가온', 2, {
              obligationMonths: [1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12],
              leaveMonths: [4],
            }),
            member(3, '다람', 0, { type: 'exempt' }),
            member(4, '라온', 0, { firstObligationMonth: 3 }),
          ],
        }}
      />
    );
    const row = (name: string) =>
      within(grid().getByText(name).closest('tr') as HTMLElement);

    expect(row('가온').getAllByLabelText('납부완료')).toHaveLength(2);
    expect(row('가온').getAllByLabelText('미납')).toHaveLength(9);
    expect(row('가온').getAllByLabelText('휴회/병가')).toHaveLength(1);
    expect(row('다람').getAllByLabelText('면제')).toHaveLength(12);
    expect(row('라온').getAllByLabelText('의무 없음')).toHaveLength(2);
    expect(row('라온').getAllByLabelText('미납')).toHaveLength(10);
  });

  it('탈퇴 회원은 구분 줄 아래에 모은다', () => {
    render(
      <FeeDashboardView
        {...base}
        dashboard={{
          ...DASHBOARD,
          members: [
            member(5, '마루', 12, { isLeft: true }),
            member(1, '가온', 12),
          ],
        }}
      />
    );
    const rows = grid()
      .getAllByRole('row')
      .map((tr) => tr.textContent ?? '');
    const divider = rows.findIndex((text) => text === '탈퇴 회원');
    expect(divider).toBeGreaterThan(0);
    expect(rows.findIndex((text) => text.startsWith('가온'))).toBeLessThan(
      divider
    );
    expect(rows.findIndex((text) => text.startsWith('마루'))).toBeGreaterThan(
      divider
    );
  });
});
