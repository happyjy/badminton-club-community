import { ReactElement, ReactNode } from 'react';

import { describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen, within } from '@testing-library/react';

import { BottomTabBar } from '@/components/organisms/navigation/BottomTabBar';
import { MobileHeader } from '@/components/organisms/navigation/MobileHeader';
import { MoreSheet } from '@/components/organisms/navigation/MoreSheet';
import { Sidebar } from '@/components/organisms/navigation/Sidebar';
import { PageHeader } from '@/components/organisms/PageHeader';

import { getNavItems } from '@/constants/navItems';

// next/link는 라우터 없이 렌더링하면 환경에 따라 달라지므로 <a>로 바꿔 둔다.
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    href,
    children,
    onClick,
    ...rest
  }: {
    href: string;
    children: ReactNode;
    onClick?: () => void;
  }) => (
    <a
      href={href}
      onClick={(event) => {
        // jsdom은 실제 이동을 구현하지 않아 링크를 누르면 오류를 낸다.
        event.preventDefault();
        onClick?.();
      }}
      {...rest}
    >
      {children}
    </a>
  ),
}));

const adminItems = getNavItems({
  clubId: '1',
  isMember: true,
  isAdmin: true,
  tournamentMenuEnabled: true,
});
const guestItems = getNavItems({
  clubId: '1',
  isMember: false,
  isAdmin: false,
  tournamentMenuEnabled: true,
});

const hrefs = (root: HTMLElement) =>
  within(root)
    .getAllByRole('link')
    .map((link) => link.getAttribute('href'));

async function renderInAct(ui: ReactElement) {
  await act(async () => {
    render(ui);
  });
}

describe('BottomTabBar', () => {
  it('탭 네 개와 더보기를 그리고, 탭은 링크다', () => {
    render(
      <BottomTabBar
        items={adminItems}
        currentPath="/clubs/1"
        onOpenMore={() => {}}
      />
    );

    const nav = screen.getByRole('navigation', { name: '주 메뉴' });
    expect(hrefs(nav)).toEqual([
      '/clubs/1',
      '/clubs/1/attendance',
      '/clubs/1/guest',
      '/clubs/1/board',
    ]);
    expect(within(nav).getByText('출석')).toBeTruthy();
    expect(within(nav).getByRole('button', { name: '더보기' })).toBeTruthy();
  });

  it('지금 있는 탭만 현재 위치로 표시한다', () => {
    render(
      <BottomTabBar
        items={adminItems}
        currentPath="/clubs/1/workouts/3"
        onOpenMore={() => {}}
      />
    );

    const current = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page');
    expect(current).toHaveLength(1);
    expect(current[0].getAttribute('href')).toBe('/clubs/1/attendance');
  });

  it('탭에 없는 화면(대회·관리)에 있으면 더보기가 켜진다', () => {
    const { rerender } = render(
      <BottomTabBar
        items={adminItems}
        currentPath="/clubs/1/tournaments/abc"
        onOpenMore={() => {}}
      />
    );
    const more = () => screen.getByRole('button', { name: '더보기' });
    expect(more().getAttribute('aria-current')).toBe('page');

    rerender(
      <BottomTabBar
        items={adminItems}
        currentPath="/clubs/1/members"
        onOpenMore={() => {}}
      />
    );
    expect(more().getAttribute('aria-current')).toBe('page');

    rerender(
      <BottomTabBar
        items={adminItems}
        currentPath="/clubs/1/board"
        onOpenMore={() => {}}
      />
    );
    expect(more().hasAttribute('aria-current')).toBe(false);
  });

  it('더보기를 누르면 onOpenMore가 불린다', () => {
    const onOpenMore = jest.fn();
    render(
      <BottomTabBar
        items={adminItems}
        currentPath="/clubs/1"
        onOpenMore={onOpenMore}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '더보기' }));
    expect(onOpenMore).toHaveBeenCalledTimes(1);
  });

  it('꺼진 탭의 글자도 읽을 수 있는 색(secondary)이다', () => {
    render(
      <BottomTabBar
        items={adminItems}
        currentPath="/clubs/1"
        onOpenMore={() => {}}
      />
    );

    const inactive = screen
      .getAllByRole('link')
      .find((link) => !link.hasAttribute('aria-current')) as HTMLElement;
    const classes = inactive.className.split(' ');
    // tertiary(#8E8E93)는 대비 3.3:1이라 12px 글자에 쓸 수 없다 (설계 3-1).
    expect(classes).toContain('text-secondary');
    expect(classes).not.toContain('text-tertiary');
  });

  it('비회원은 홈·가입 문의·더보기 세 칸이다', () => {
    render(
      <BottomTabBar
        items={guestItems}
        currentPath="/clubs/1"
        onOpenMore={() => {}}
      />
    );

    expect(screen.getAllByRole('link')).toHaveLength(2);
    expect(screen.getByText('가입 문의')).toBeTruthy();
    expect(screen.getByRole('button', { name: '더보기' })).toBeTruthy();
  });

  it('탭의 터치 영역은 탭바 높이를 꽉 채운다', () => {
    render(
      <BottomTabBar
        items={adminItems}
        currentPath="/clubs/1"
        onOpenMore={() => {}}
      />
    );

    expect(screen.getAllByRole('link')[0].className).toContain(
      'h-[var(--tabbar-h)]'
    );
  });
});

describe('MoreSheet', () => {
  const base = {
    open: true,
    onClose: () => {},
    currentPath: '/clubs/1',
    isAuthenticated: true,
    onLogin: () => {},
    onLogout: () => {},
  };

  it('탭에 없는 메뉴, 관리 메뉴, 계정 메뉴를 보여 준다', async () => {
    await renderInAct(<MoreSheet {...base} items={adminItems} />);

    const dialog = screen.getByRole('dialog', { name: '더보기' });
    expect(hrefs(dialog)).toEqual([
      '/clubs/1/tournaments',
      '/clubs/1/members',
      '/clubs/1/guest/check',
      '/clubs/1/custom',
      '/profile',
      '/clubs',
    ]);
    expect(within(dialog).getByText('관리')).toBeTruthy();
    expect(
      within(dialog).getByRole('button', { name: /로그아웃/ })
    ).toBeTruthy();
  });

  it('탭에 있는 메뉴(홈·출석·게스트·게시판)는 되풀이하지 않는다', async () => {
    await renderInAct(<MoreSheet {...base} items={adminItems} />);

    expect(hrefs(screen.getByRole('dialog'))).not.toContain('/clubs/1/board');
  });

  it('운영진이 아니면 관리 구역이 없다', async () => {
    const memberItems = getNavItems({
      clubId: '1',
      isMember: true,
      isAdmin: false,
      tournamentMenuEnabled: true,
    });
    await renderInAct(<MoreSheet {...base} items={memberItems} />);

    expect(screen.queryByText('관리')).toBeNull();
    expect(hrefs(screen.getByRole('dialog'))).toEqual([
      '/clubs/1/tournaments',
      '/profile',
      '/clubs',
    ]);
  });

  it('로그인하지 않았으면 로그인만 보이고 프로필·로그아웃은 없다', async () => {
    const onLogin = jest.fn();
    await renderInAct(
      <MoreSheet
        {...base}
        items={guestItems}
        isAuthenticated={false}
        onLogin={onLogin}
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(hrefs(dialog)).toEqual(['/clubs']);
    expect(
      within(dialog).queryByRole('button', { name: /로그아웃/ })
    ).toBeNull();

    fireEvent.click(within(dialog).getByRole('button', { name: /로그인/ }));
    expect(onLogin).toHaveBeenCalledTimes(1);
  });

  it('클럽 밖(메뉴 항목 없음)에서도 계정 메뉴는 쓸 수 있다', async () => {
    await renderInAct(
      <MoreSheet {...base} items={[]} currentPath="/profile" />
    );

    expect(hrefs(screen.getByRole('dialog'))).toEqual(['/profile', '/clubs']);
  });

  it('메뉴를 누르면 시트를 닫는다', async () => {
    const onClose = jest.fn();
    await renderInAct(
      <MoreSheet {...base} items={adminItems} onClose={onClose} />
    );

    fireEvent.click(screen.getByText('대회'));
    expect(onClose).toHaveBeenCalled();
  });

  it('로그아웃을 누르면 onLogout을 부르고 시트를 닫는다', async () => {
    const onLogout = jest.fn();
    const onClose = jest.fn();
    await renderInAct(
      <MoreSheet
        {...base}
        items={adminItems}
        onLogout={onLogout}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /로그아웃/ }));
    expect(onLogout).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalled();
  });

  it('지금 있는 화면의 메뉴를 현재 위치로 표시한다', async () => {
    await renderInAct(
      <MoreSheet {...base} items={adminItems} currentPath="/clubs/1/members" />
    );

    const current = within(screen.getByRole('dialog'))
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page');
    expect(current.map((link) => link.getAttribute('href'))).toEqual([
      '/clubs/1/members',
    ]);
  });
});

describe('Sidebar', () => {
  const base = {
    currentPath: '/clubs/1/members',
    clubId: '1',
    clubName: '당산 배드민턴 클럽',
    isAuthenticated: true,
    onLogin: () => {},
    onLogout: () => {},
  };

  it('모든 메뉴를 펼쳐서 보여 주고 관리 구역을 나눈다', () => {
    render(<Sidebar {...base} items={adminItems} />);

    const nav = screen.getByRole('navigation', { name: '사이드 메뉴' });
    expect(hrefs(nav)).toEqual([
      '/clubs/1',
      '/clubs/1',
      '/clubs/1/attendance',
      '/clubs/1/guest',
      '/clubs/1/board',
      '/clubs/1/tournaments',
      '/clubs/1/members',
      '/clubs/1/guest/check',
      '/clubs/1/custom',
      '/profile',
      '/clubs',
    ]);
    expect(within(nav).getByText('관리')).toBeTruthy();
    expect(within(nav).getByText('출석체크')).toBeTruthy();
  });

  it('지금 있는 메뉴만 현재 위치로 표시한다', () => {
    render(<Sidebar {...base} items={adminItems} />);

    const current = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page');
    expect(current.map((link) => link.getAttribute('href'))).toEqual([
      '/clubs/1/members',
    ]);
  });

  it('클럽 이름을 보여 주고, 길면 한 줄로 자른다', () => {
    render(
      <Sidebar
        {...base}
        items={adminItems}
        clubName="아주아주 이름이 긴 배드민턴 동호회 연합 클럽"
      />
    );

    const name = screen.getByText(
      '아주아주 이름이 긴 배드민턴 동호회 연합 클럽'
    );
    expect(name.className).toContain('truncate');
  });

  it('클럽 밖에서는 앱 이름을 보여 주고 클럽 목록으로 잇는다', () => {
    render(
      <Sidebar
        {...base}
        items={[]}
        clubId={undefined}
        clubName={undefined}
        currentPath="/profile"
      />
    );

    const nav = screen.getByRole('navigation', { name: '사이드 메뉴' });
    expect(within(nav).getByText('배드민턴 클럽')).toBeTruthy();
    expect(hrefs(nav)).toEqual(['/clubs', '/profile', '/clubs']);
    expect(within(nav).queryByText('관리')).toBeNull();
  });

  it('로그인하지 않았으면 로그인 버튼만 있다', () => {
    const onLogin = jest.fn();
    render(
      <Sidebar
        {...base}
        items={guestItems}
        isAuthenticated={false}
        onLogin={onLogin}
      />
    );

    expect(screen.queryByRole('button', { name: /로그아웃/ })).toBeNull();
    expect(
      screen.getAllByRole('link').map((link) => link.getAttribute('href'))
    ).not.toContain('/profile');

    fireEvent.click(screen.getByRole('button', { name: /로그인/ }));
    expect(onLogin).toHaveBeenCalledTimes(1);
  });
});

describe('MobileHeader', () => {
  it('클럽 이름을 보여 주고 클럽 홈으로 잇는다', () => {
    render(
      <MobileHeader
        clubId="1"
        clubName="당산 배드민턴 클럽"
        showMenuButton={false}
        onOpenMore={() => {}}
      />
    );

    const link = screen.getByRole('link', { name: '당산 배드민턴 클럽' });
    expect(link.getAttribute('href')).toBe('/clubs/1');
    expect(screen.queryByRole('button', { name: '메뉴' })).toBeNull();
  });

  it('클럽 이름을 아직 못 받았으면 앱 이름을 보여 준다', () => {
    render(
      <MobileHeader
        clubId="1"
        clubName={undefined}
        showMenuButton={false}
        onOpenMore={() => {}}
      />
    );

    expect(screen.getByRole('link', { name: '배드민턴 클럽' })).toBeTruthy();
  });

  it('클럽 밖에서는 클럽 목록으로 잇고, 탭바가 없으니 메뉴 버튼을 둔다', () => {
    const onOpenMore = jest.fn();
    render(
      <MobileHeader
        clubId={undefined}
        clubName={undefined}
        showMenuButton
        onOpenMore={onOpenMore}
      />
    );

    expect(
      screen.getByRole('link', { name: '배드민턴 클럽' }).getAttribute('href')
    ).toBe('/clubs');

    fireEvent.click(screen.getByRole('button', { name: '메뉴' }));
    expect(onOpenMore).toHaveBeenCalledTimes(1);
  });

  it('긴 클럽 이름은 한 줄로 자른다', () => {
    render(
      <MobileHeader
        clubId="1"
        clubName="아주아주 이름이 긴 배드민턴 동호회 연합 클럽"
        showMenuButton={false}
        onOpenMore={() => {}}
      />
    );

    expect(screen.getByRole('link').className).toContain('truncate');
  });
});

describe('PageHeader', () => {
  it('제목을 화면 제목(h1)으로 그린다', () => {
    render(<PageHeader title="출석체크" />);

    const heading = screen.getByRole('heading', { level: 1, name: '출석체크' });
    expect(heading.className).toContain('text-large-title');
  });

  it('부제, 뒤로 가기, 오른쪽 동작을 그린다', () => {
    render(
      <PageHeader
        title="운동 상세"
        subtitle="10월 4일 토요일"
        backHref="/clubs/1/attendance"
        action={<button type="button">수정</button>}
      />
    );

    expect(screen.getByText('10월 4일 토요일')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: '뒤로' }).getAttribute('href')
    ).toBe('/clubs/1/attendance');
    expect(screen.getByRole('button', { name: '수정' })).toBeTruthy();
  });

  it('제목만 주면 뒤로 가기와 부제가 없다', () => {
    const { container } = render(<PageHeader title="게시판" />);

    expect(screen.queryByRole('link')).toBeNull();
    expect(container.querySelector('p')).toBeNull();
  });
});
