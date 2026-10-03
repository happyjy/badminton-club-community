import { ReactNode } from 'react';

import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';

import { ClubInfoSection } from '@/components/molecules/ClubInfoSection';
import RankingTable from '@/components/molecules/RankingTable';
import { ClubListItem } from '@/components/organisms/navigation/clubNavigation/ClubListItem';

import { Club } from '@/types';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const members = (count: number, prefix: string) =>
  Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    name: `${prefix}${index + 1}`,
    count: 20 - index,
  }));

describe('ClubListItem', () => {
  it('클럽 이름과 회원 수를 보여 주고 클럽 홈으로 가는 링크다', () => {
    render(
      <ClubListItem
        club={{ id: 3, name: '당산클럽', approvedMemberCount: 95 } as Club}
      />
    );

    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/clubs/3');
    expect(screen.getByText('당산클럽')).toBeTruthy();
    expect(screen.getByText('95명')).toBeTruthy();
  });

  it('회원 수가 없으면 0명으로 보여 준다', () => {
    render(<ClubListItem club={{ id: 3, name: '새 클럽' } as Club} />);

    expect(screen.getByText('0명')).toBeTruthy();
  });
});

describe('ClubInfoSection', () => {
  it('제목과 내용을 보여 주고 줄바꿈을 살린다', () => {
    render(<ClubInfoSection title="운영 시간" content={'화 20시\n토 19시'} />);

    expect(screen.getByRole('heading', { name: '운영 시간' })).toBeTruthy();
    expect(screen.getByText(/화 20시/).className).toContain(
      'whitespace-pre-wrap'
    );
  });

  it('내용이 없으면 아무것도 그리지 않는다', () => {
    const { container } = render(<ClubInfoSection title="장소" content="" />);

    expect(container.innerHTML).toBe('');
  });
});

describe('RankingTable', () => {
  it('출석·도우미 순위를 나란히 보여 준다', () => {
    render(
      <RankingTable
        attendanceRanking={members(2, '출석')}
        helperRanking={members(1, '도움')}
      />
    );

    expect(screen.getByText('출석1')).toBeTruthy();
    expect(
      screen.getByText('20회', { selector: 'td:nth-child(2) *' })
    ).toBeTruthy();
    expect(screen.getByText('도움1')).toBeTruthy();
    // 도우미가 1명뿐이면 2번째 줄의 도우미 칸은 '-'
    expect(screen.getAllByText('-')).toHaveLength(1);
  });

  it('처음에는 10명까지만 보여 주고, 더보기를 누르면 전부 보여 준다', () => {
    render(
      <RankingTable
        attendanceRanking={members(12, '출석')}
        helperRanking={[]}
      />
    );

    expect(screen.queryByText('출석11')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /더보기/ }));
    expect(screen.getByText('출석12')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /접기/ }));
    expect(screen.queryByText('출석11')).toBeNull();
  });

  it('10명 이하면 더보기 버튼이 없다', () => {
    render(
      <RankingTable
        attendanceRanking={members(10, '출석')}
        helperRanking={[]}
      />
    );

    expect(screen.queryByRole('button')).toBeNull();
  });
});
