import { ComponentProps } from 'react';

import { describe, expect, it, jest } from '@jest/globals';
import {
  act,
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from '@testing-library/react';

import { MembersView } from '@/components/organisms/club/MembersView';

import { pickOption } from '@/__tests__/helpers/optionPicker';
import type { ClubMemberWithUser } from '@/pages/clubs/[id]/members';
import { Status } from '@/types/enums';

const member = (
  id: number,
  name: string,
  status: Status,
  extra: Partial<ClubMemberWithUser['clubMember']> = {}
) =>
  ({
    id,
    nickname: `nick${id}`,
    email: `user${id}@example.com`,
    thumbnailImageUrl: null,
    clubMember: {
      id: id * 10,
      name,
      status,
      role: 'MEMBER',
      clubId: 1,
      birthDate: '1990-03-05',
      gender: '남성',
      localTournamentLevel: 'C',
      nationalTournamentLevel: 'D',
      playingPeriod: 3,
      lessonPeriod: 1,
      phoneNumber: '010-1111-2222',
      createdAt: '2025-01-02T00:00:00.000Z',
      helperStatuses: [],
      ...extra,
    },
  }) as unknown as ClubMemberWithUser;

const MEMBERS = [
  member(1, '가온', Status.APPROVED),
  member(2, '나래', Status.PENDING),
  member(3, '다람', Status.ON_LEAVE, { phoneNumber: undefined }),
];

/** 탈퇴 회원이 있는 목록 (다시 가입 처리 테스트) */
const WITH_LEFT = [...MEMBERS, member(4, '라온', Status.LEFT)];

const DEFAULTS = {
  lastPaidMonth: '2026-07',
  rejoinStartMonth: '2026-12',
  previousStartMonth: '2024-03',
};

type Props = ComponentProps<typeof MembersView>;

const base: Props = {
  members: MEMBERS,
  totalCount: 3,
  isFiltered: false,
  search: '',
  onChangeSearch: () => {},
  sortOption: 'name',
  onChangeSort: () => {},
  filter: <div>필터</div>,
  onApprove: () => {},
  onStatusChange: () => {},
  onLoadStatusDefaults: async () => DEFAULTS,
  approvingUserId: null,
};

async function renderView(props: Partial<Props> = {}) {
  await act(async () => {
    render(<MembersView {...base} {...props} />);
  });
}

const table = () => screen.getByRole('table', { name: '회원' });
const row = (name: string) =>
  within(table())
    .getAllByRole('row')
    .find((tr) => within(tr).queryByText(name)) as HTMLElement;
const openSheet = async (name: string) => {
  await act(async () => {
    fireEvent.click(row(name));
  });
  return screen.getByRole('dialog', { name });
};

describe('회원 관리 화면', () => {
  it('회원을 표로 보여 주고 상태를 우리말 칩으로 적는다', async () => {
    await renderView();

    expect(within(row('가온')).getByText('승인됨')).toBeTruthy();
    expect(within(row('나래')).getByText('대기중')).toBeTruthy();
    expect(within(row('다람')).getByText('휴가중')).toBeTruthy();
    expect(within(row('가온')).getByText('user1@example.com')).toBeTruthy();
    expect(within(row('가온')).getByText('010-1111-2222')).toBeTruthy();
    expect(within(row('다람')).getByText('미입력')).toBeTruthy();
  });

  it('이름이 없으면 "이름 없음"으로 적는다', async () => {
    await renderView({ members: [member(9, '', Status.APPROVED)] });
    expect(within(table()).getByText('이름 없음')).toBeTruthy();
  });

  it('필터가 없으면 총 회원 수를, 있으면 표시 중인 수를 적는다', async () => {
    await renderView();
    expect(screen.getByText('총 회원 수 3명')).toBeTruthy();
  });

  it('필터가 걸려 있으면 표시 중인 수를 적는다', async () => {
    await renderView({ isFiltered: true, members: MEMBERS.slice(0, 1) });
    expect(screen.getByText('표시 중 1명')).toBeTruthy();
  });

  it('대기 회원의 행에만 승인하기 버튼이 있고, 누르면 그 회원을 승인해 달라고 한다', async () => {
    const onApprove = jest.fn();
    await renderView({ onApprove });

    expect(
      within(row('가온')).queryByRole('button', { name: '승인하기' })
    ).toBeNull();

    fireEvent.click(
      within(row('나래')).getByRole('button', { name: '승인하기' })
    );
    expect(onApprove).toHaveBeenCalledWith(2, 1);
    // 버튼을 눌렀을 뿐 상세 시트는 열리지 않는다.
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('승인 중인 회원의 버튼은 잠긴다', async () => {
    await renderView({ approvingUserId: 2 });
    // 진행 중에는 글자 대신 스피너가 보이므로 행의 유일한 버튼으로 찾는다.
    expect(
      (within(row('나래')).getByRole('button') as HTMLButtonElement).disabled
    ).toBe(true);
  });

  it('행을 누르면 그 회원의 상세가 시트로 열린다', async () => {
    await renderView();
    const dialog = await openSheet('가온');

    expect(within(dialog).getByText('user1@example.com')).toBeTruthy();
    expect(within(dialog).getByText('010-1111-2222')).toBeTruthy();
    expect(within(dialog).getByText('구대회급수')).toBeTruthy();
    expect(within(dialog).getByText('가입일')).toBeTruthy();
  });

  it('승인된 회원의 시트에서는 상태를 바꿀 수 있고 승인 버튼은 없다', async () => {
    const onStatusChange = jest.fn();
    await renderView({ onStatusChange });
    const dialog = await openSheet('가온');

    const select = within(dialog).getByLabelText('상태') as HTMLSelectElement;
    expect(select.value).toBe(Status.APPROVED);
    expect(
      Array.from(select.options).map((option) => option.textContent)
    ).toEqual(['대기중', '승인됨', '휴가중', '거절됨', '탈퇴']);

    fireEvent.change(select, { target: { value: Status.ON_LEAVE } });
    expect(onStatusChange).toHaveBeenCalledWith(1, 1, Status.ON_LEAVE);
    expect(
      within(dialog).queryByRole('button', { name: '승인하기' })
    ).toBeNull();
  });

  it('같은 상태를 다시 골라도 요청하지 않는다', async () => {
    const onStatusChange = jest.fn();
    await renderView({ onStatusChange });
    const dialog = await openSheet('가온');

    fireEvent.change(within(dialog).getByLabelText('상태'), {
      target: { value: Status.APPROVED },
    });
    expect(onStatusChange).not.toHaveBeenCalled();
  });

  it('대기 회원의 시트에는 승인하기만 있고 상태 변경은 없다', async () => {
    const onApprove = jest.fn();
    await renderView({ onApprove });
    const dialog = await openSheet('나래');

    expect(within(dialog).queryByLabelText('상태')).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: '승인하기' }));
    expect(onApprove).toHaveBeenCalledWith(2, 1);
  });

  it('회원이 한 명도 없으면 등록된 멤버가 없다고 한다', async () => {
    await renderView({ members: [], totalCount: 0 });
    expect(screen.getByText('등록된 멤버가 없습니다.')).toBeTruthy();
  });

  it('필터에 걸려 아무도 없으면 필터 때문이라고 알린다', async () => {
    await renderView({ members: [], totalCount: 3, isFiltered: true });
    expect(
      screen.getByText('선택한 필터에 맞는 멤버가 없습니다.')
    ).toBeTruthy();
  });

  it('검색칸과 정렬은 바뀐 값을 알려 준다', async () => {
    const onChangeSearch = jest.fn();
    const onChangeSort = jest.fn();
    await renderView({ onChangeSearch, onChangeSort });

    fireEvent.change(screen.getByRole('searchbox', { name: '이름 검색' }), {
      target: { value: '가' },
    });
    expect(onChangeSearch).toHaveBeenCalledWith('가');

    await pickOption('정렬', '가입순서');
    expect(onChangeSort).toHaveBeenCalledWith('createdAt');
  });

  it('시트를 연 회원이 필터에 걸려 목록에서 빠져도 시트는 그 회원을 계속 보여 준다', async () => {
    let view: ReturnType<typeof render> | undefined;
    await act(async () => {
      view = render(<MembersView {...base} allMembers={MEMBERS} />);
    });
    await openSheet('나래');

    // 승인되어 "대기중만 보기" 필터에서 빠진 상황
    const approved = MEMBERS.map((user) =>
      user.id === 2
        ? {
            ...user,
            clubMember: { ...user.clubMember, status: Status.APPROVED },
          }
        : user
    );
    await act(async () => {
      view?.rerender(
        <MembersView {...base} members={[]} allMembers={approved} isFiltered />
      );
    });

    const dialog = screen.getByRole('dialog', { name: '나래' });
    expect(
      (within(dialog).getByLabelText('상태') as HTMLSelectElement).value
    ).toBe(Status.APPROVED);
  });

  it('시트를 닫은 뒤에는 목록이 바뀌어도 다시 열리지 않는다', async () => {
    let view: ReturnType<typeof render> | undefined;
    await act(async () => {
      view = render(<MembersView {...base} allMembers={MEMBERS} />);
    });
    const dialog = await openSheet('나래');
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: '닫기' }));
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    await act(async () => {
      view?.rerender(
        <MembersView
          {...base}
          members={MEMBERS.slice(0, 1)}
          allMembers={MEMBERS}
        />
      );
    });
    await act(async () => {
      view?.rerender(<MembersView {...base} allMembers={MEMBERS} />);
    });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('회원 관리 화면 — 탈퇴월·다시 시작하는 달', () => {
  const monthSheet = (title: string) =>
    screen.getByRole('dialog', { name: title });

  const pickStatus = async (dialog: HTMLElement, status: Status) => {
    await act(async () => {
      fireEvent.change(within(dialog).getByLabelText('상태'), {
        target: { value: status },
      });
    });
  };

  it('탈퇴를 고르면 바로 바꾸지 않고 마지막으로 낸 달로 탈퇴월을 묻는다', async () => {
    const onStatusChange = jest.fn();
    await renderView({ onStatusChange });
    const dialog = await openSheet('가온');

    await pickStatus(dialog, Status.LEFT);

    expect(onStatusChange).not.toHaveBeenCalled();
    const sheet = within(monthSheet('탈퇴 처리'));
    expect((sheet.getByLabelText('탈퇴월') as HTMLInputElement).value).toBe(
      '2026-07'
    );
    expect(sheet.getByText('마지막으로 회비를 낸 달입니다.')).toBeTruthy();
    expect(
      sheet.getByText('이 달까지 회비를 내야 하는 달로 봅니다.')
    ).toBeTruthy();

    await act(async () => {
      fireEvent.click(sheet.getByRole('button', { name: '탈퇴 처리' }));
    });

    expect(onStatusChange).toHaveBeenCalledWith(1, 1, Status.LEFT, {
      leftMonth: '2026-07',
    });
  });

  it('낸 회비가 없으면 칸을 비우고 달을 넣어야 탈퇴 처리할 수 있다', async () => {
    await renderView({
      onLoadStatusDefaults: async () => ({ ...DEFAULTS, lastPaidMonth: null }),
    });
    const dialog = await openSheet('가온');

    await pickStatus(dialog, Status.LEFT);

    const sheet = within(monthSheet('탈퇴 처리'));
    const input = sheet.getByLabelText('탈퇴월') as HTMLInputElement;
    expect(input.value).toBe('');
    expect(sheet.getByText('낸 회비가 없습니다.')).toBeTruthy();
    const button = sheet.getByRole('button', { name: '탈퇴 처리' });
    expect((button as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(input, { target: { value: '2026-05' } });
    expect((button as HTMLButtonElement).disabled).toBe(false);
  });

  it('탈퇴 회원을 승인됨으로 되돌리면 다시 시작하는 달을 묻고 예전 시작월을 알려 준다', async () => {
    const onStatusChange = jest.fn();
    await renderView({ onStatusChange, members: WITH_LEFT });
    const dialog = await openSheet('라온');

    await pickStatus(dialog, Status.APPROVED);

    expect(onStatusChange).not.toHaveBeenCalled();
    const sheet = within(monthSheet('다시 가입 처리'));
    expect(
      (sheet.getByLabelText('다시 시작하는 달') as HTMLInputElement).value
    ).toBe('2026-12');
    expect(sheet.getByText('이 달부터 회비를 냅니다.')).toBeTruthy();
    expect(
      sheet.getByText('실수로 탈퇴 처리했다면 예전 시작월(2024-03)을 고르세요.')
    ).toBeTruthy();

    await act(async () => {
      fireEvent.click(sheet.getByRole('button', { name: '다시 가입 처리' }));
    });

    expect(onStatusChange).toHaveBeenCalledWith(4, 1, Status.APPROVED, {
      feeStartMonth: '2026-12',
    });
  });

  it('취소하면 요청하지 않고 상태는 그대로다', async () => {
    const onStatusChange = jest.fn();
    await renderView({ onStatusChange });
    const dialog = await openSheet('가온');

    await pickStatus(dialog, Status.LEFT);
    await act(async () => {
      fireEvent.click(
        within(monthSheet('탈퇴 처리')).getByRole('button', { name: '취소' })
      );
    });

    expect(onStatusChange).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: '탈퇴 처리' })).toBeNull()
    );
    const select = within(
      screen.getByRole('dialog', { name: '가온' })
    ).getByLabelText('상태') as HTMLSelectElement;
    expect(select.value).toBe(Status.APPROVED);
  });

  it('기본값을 못 불러와도 시트는 열리고 칸이 비면 저장할 수 없다', async () => {
    await renderView({
      onLoadStatusDefaults: async () => null,
      members: WITH_LEFT,
    });
    const dialog = await openSheet('라온');

    await pickStatus(dialog, Status.APPROVED);

    const sheet = within(monthSheet('다시 가입 처리'));
    expect(
      (sheet.getByLabelText('다시 시작하는 달') as HTMLInputElement).value
    ).toBe('');
    expect(
      (
        sheet.getByRole('button', {
          name: '다시 가입 처리',
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true);
  });
});

describe('회원 관리 화면 — 기본값을 불러오는 중에 상세 시트를 닫으면', () => {
  it('늦게 온 기본값으로 달 시트를 열지 않고, 다른 회원 시트에도 붙지 않는다', async () => {
    let resolve: (value: typeof DEFAULTS) => void = () => {};
    const onStatusChange = jest.fn();
    await renderView({
      onStatusChange,
      onLoadStatusDefaults: () =>
        new Promise((done) => {
          resolve = done;
        }),
    });
    const dialog = await openSheet('가온');

    await act(async () => {
      fireEvent.change(within(dialog).getByLabelText('상태'), {
        target: { value: Status.LEFT },
      });
    });
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: '닫기' }));
    });
    await act(async () => {
      resolve(DEFAULTS);
    });
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: '가온' })).toBeNull()
    );

    await openSheet('다람');

    expect(
      screen.queryByRole('dialog', { name: '탈퇴 처리', hidden: true })
    ).toBeNull();
    expect(onStatusChange).not.toHaveBeenCalled();
  });
});
