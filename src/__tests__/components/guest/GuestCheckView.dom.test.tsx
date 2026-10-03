import { ComponentProps } from 'react';

import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, within } from '@testing-library/react';

import { GuestCheckView } from '@/components/organisms/guest/GuestCheckView';

import { GuestPostForList } from '@/types/guest.types';

const guest = (id: string, extra: Record<string, unknown> = {}) =>
  ({
    id,
    name: `게스트${id}`,
    postType: 'GUEST_REQUEST',
    status: 'PENDING',
    visitDate: '2026-10-05',
    birthDate: '1992-04-01',
    intendToJoin: false,
    nationalTournamentLevel: 'D',
    localTournamentLevel: 'C',
    clubMember: { name: '홍길동' },
    ...extra,
  }) as unknown as GuestPostForList;

type Props = ComponentProps<typeof GuestCheckView>;

const base: Props = {
  items: [
    guest('a'),
    guest('b', {
      postType: 'JOIN_INQUIRY_REQUEST',
      status: 'APPROVED',
      intendToJoin: true,
      clubMember: null,
      nationalTournamentLevel: null,
      visitDate: null,
    }),
    guest('c', { status: 'REJECTED' }),
  ],
  page: 1,
  totalPages: 1,
  typeFilter: 'ALL',
  statusFilter: 'ALL',
  onChangeType: () => {},
  onChangeStatus: () => {},
  onChangePage: () => {},
  onOpen: () => {},
};

const table = () => screen.getByRole('table', { name: '게스트 신청' });
const row = (name: string) =>
  within(table())
    .getAllByRole('row')
    .find((tr) => within(tr).queryByText(name)) as HTMLElement;

describe('게스트 확인 화면', () => {
  it('종류와 상태를 우리말로 적는다', () => {
    render(<GuestCheckView {...base} />);

    expect(within(row('게스트a')).getByText('게스트 신청')).toBeTruthy();
    expect(within(row('게스트a')).getByText('검토중')).toBeTruthy();
    expect(within(row('게스트b')).getByText('가입 문의')).toBeTruthy();
    expect(within(row('게스트b')).getByText('승인됨')).toBeTruthy();
    expect(within(row('게스트c')).getByText('거절됨')).toBeTruthy();
  });

  it('작성자·출생 연도·급수를 보여 주고, 없는 값은 -로 적는다', () => {
    render(<GuestCheckView {...base} />);

    expect(within(row('게스트a')).getByText('홍길동')).toBeTruthy();
    expect(within(row('게스트a')).getByText('1992')).toBeTruthy();
    expect(within(row('게스트a')).getByText('D / C')).toBeTruthy();
    expect(within(row('게스트b')).getByText('- / C')).toBeTruthy();
    // 작성자와 방문희망일이 없다.
    expect(within(row('게스트b')).getAllByText('-').length).toBe(2);
  });

  it('가입 의향이 있는 신청만 표시한다', () => {
    render(<GuestCheckView {...base} />);

    expect(within(row('게스트b')).getByText('가입 의향')).toBeTruthy();
    expect(within(row('게스트a')).queryByText('가입 의향')).toBeNull();
  });

  it('행을 누르면 그 신청을 열어 달라고 한다', () => {
    const onOpen = jest.fn();
    render(<GuestCheckView {...base} onOpen={onOpen} />);

    fireEvent.click(row('게스트c'));
    expect(onOpen).toHaveBeenCalledWith('c');
  });

  it('종류·상태 필터는 바뀐 값을 알려 준다', () => {
    const onChangeType = jest.fn();
    const onChangeStatus = jest.fn();
    render(
      <GuestCheckView
        {...base}
        onChangeType={onChangeType}
        onChangeStatus={onChangeStatus}
      />
    );

    fireEvent.change(screen.getByLabelText('신청 종류'), {
      target: { value: 'JOIN_INQUIRY_REQUEST' },
    });
    fireEvent.change(screen.getByLabelText('처리 상태'), {
      target: { value: 'APPROVED' },
    });
    expect(onChangeType).toHaveBeenCalledWith('JOIN_INQUIRY_REQUEST');
    expect(onChangeStatus).toHaveBeenCalledWith('APPROVED');
  });

  it('지금 걸린 필터가 선택돼 있다', () => {
    render(
      <GuestCheckView
        {...base}
        typeFilter="GUEST_REQUEST"
        statusFilter="REJECTED"
      />
    );
    expect(
      (screen.getByLabelText('신청 종류') as HTMLSelectElement).value
    ).toBe('GUEST_REQUEST');
    expect(
      (screen.getByLabelText('처리 상태') as HTMLSelectElement).value
    ).toBe('REJECTED');
  });

  it('쪽이 여러 개면 쪽 번호를 보여 주고, 누르면 알려 준다', () => {
    const onChangePage = jest.fn();
    render(
      <GuestCheckView
        {...base}
        page={2}
        totalPages={4}
        onChangePage={onChangePage}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '3쪽' }));
    expect(onChangePage).toHaveBeenCalledWith(3);
  });

  it('쪽이 하나면 쪽 번호가 없다', () => {
    render(<GuestCheckView {...base} />);
    expect(screen.queryByRole('navigation', { name: '페이지' })).toBeNull();
  });

  it('신청이 없으면 없다고 알린다', () => {
    render(<GuestCheckView {...base} items={[]} />);
    expect(screen.getByText('신청 내역이 없습니다.')).toBeTruthy();
  });

  it('휴대폰 리스트에서도 출생 연도와 급수를 볼 수 있다', () => {
    render(<GuestCheckView {...base} />);
    const list = screen.getByTestId('data-table-list');

    expect(within(list).getAllByText(/1992년생/).length).toBe(3);
    expect(within(list).getAllByText(/전국 D · 구 C/).length).toBe(2);
    expect(within(list).getByText(/전국 - · 구 C/)).toBeTruthy();
  });
});
