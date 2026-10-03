import { ReactNode } from 'react';

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, screen, within } from '@testing-library/react';

import { Layout } from '@/components/templates/Layout';

// 실제 데이터가 메뉴에 어떻게 전달되는지를 본다. AppShell과 메뉴 부품은 진짜를 쓴다.
let mockRouter = {
  pathname: '/clubs/[id]/attendance',
  asPath: '/clubs/1/attendance',
  query: { id: '1' } as Record<string, string | undefined>,
};
let mockState = {
  auth: {
    user: { id: 7 } as { id: number } | null,
    clubMember: null as { role: string; status?: string } | null,
  },
  club: { currentClub: { id: 1, name: '당산 배드민턴 클럽' } },
};
let mockMenuSettings: { tournamentMenuEnabled?: boolean } | undefined;
const syncedClubIds: Array<string | undefined> = [];

jest.mock('next/router', () => ({ useRouter: () => mockRouter }));
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
jest.mock('react-redux', () => ({
  useDispatch: () => jest.fn(),
  useSelector: (selector: (state: typeof mockState) => unknown) =>
    selector(mockState),
}));
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ data: undefined }) }));
jest.mock('@/hooks/useClub', () => ({
  useClub: () => ({ data: undefined, isLoading: false }),
}));
jest.mock('@/hooks/useSyncClubMember', () => ({
  useSyncClubMember: (clubId: string | undefined) => {
    syncedClubIds.push(clubId);
  },
}));
jest.mock('@/hooks/useCustomSettings', () => ({
  useMenuSettings: () => ({ data: mockMenuSettings }),
}));
jest.mock('@/hooks/useAuthActions', () => ({
  useAuthActions: () => ({ login: jest.fn(), logout: jest.fn() }),
}));

const sidebar = () => screen.getByRole('navigation', { name: '사이드 메뉴' });
const sidebarLabels = () =>
  within(sidebar())
    .getAllByRole('link')
    .map((link) => link.textContent);

function renderLayout() {
  return render(
    <Layout>
      <p>본문</p>
    </Layout>
  );
}

describe('Layout — 실제 데이터를 메뉴에 넘기기', () => {
  beforeEach(() => {
    mockRouter = {
      pathname: '/clubs/[id]/attendance',
      asPath: '/clubs/1/attendance',
      query: { id: '1' },
    };
    mockState = {
      auth: {
        user: { id: 7 },
        clubMember: { role: 'MEMBER', status: 'APPROVED' },
      },
      club: { currentClub: { id: 1, name: '당산 배드민턴 클럽' } },
    };
    mockMenuSettings = undefined;
    syncedClubIds.length = 0;
  });

  it('회원이면 회원 메뉴를, 지금 화면을 현재 위치로 보여 준다', () => {
    renderLayout();

    expect(sidebarLabels()).toEqual([
      '당산 배드민턴 클럽',
      '홈',
      '출석체크',
      '게스트',
      '게시판',
      '대회',
      '내 정보',
      '클럽 목록',
    ]);
    expect(
      within(sidebar())
        .getByText('출석체크')
        .closest('a')
        ?.getAttribute('aria-current')
    ).toBe('page');
    expect(screen.getByRole('main').textContent).toBe('본문');
  });

  it('메뉴 설정을 불러오기 전에는 대회 메뉴를 보여 준다', () => {
    mockMenuSettings = undefined;
    renderLayout();

    expect(sidebarLabels()).toContain('대회');
  });

  it('대회 메뉴를 꺼 두었으면 숨긴다', () => {
    mockMenuSettings = { tournamentMenuEnabled: false };
    renderLayout();

    expect(sidebarLabels()).not.toContain('대회');
    expect(sidebarLabels()).toContain('게시판');
  });

  it('회원 정보가 없으면 비회원 메뉴(홈·가입 문의)만 보여 준다', () => {
    mockState.auth.clubMember = null;
    renderLayout();

    expect(sidebarLabels()).toEqual([
      '당산 배드민턴 클럽',
      '홈',
      '가입 문의',
      '내 정보',
      '클럽 목록',
    ]);
  });

  it.each(['LEFT', 'REJECTED', 'PENDING'])(
    '회원 기록이 있어도 %s 상태면 비회원 메뉴(홈·가입 문의)만 보여 준다',
    (status) => {
      mockState.auth.clubMember = { role: 'MEMBER', status };
      renderLayout();

      expect(sidebarLabels()).toEqual([
        '당산 배드민턴 클럽',
        '홈',
        '가입 문의',
        '내 정보',
        '클럽 목록',
      ]);
    }
  );

  it('휴가 중(ON_LEAVE)인 회원은 회원 메뉴를 그대로 본다', () => {
    mockState.auth.clubMember = { role: 'MEMBER', status: 'ON_LEAVE' };
    renderLayout();

    expect(sidebarLabels()).toEqual(
      expect.arrayContaining(['출석체크', '게스트', '게시판', '대회'])
    );
  });

  it('탈퇴한 운영진에게는 관리 메뉴도 회원 메뉴도 없다', () => {
    mockState.auth.clubMember = { role: 'ADMIN', status: 'LEFT' };
    renderLayout();

    expect(within(sidebar()).queryByText('관리')).toBeNull();
    expect(sidebarLabels()).not.toContain('게시판');
    expect(sidebarLabels()).not.toContain('회원');
  });

  it('운영진이면 관리 메뉴가 더해진다', () => {
    mockState.auth.clubMember = { role: 'ADMIN', status: 'APPROVED' };
    renderLayout();

    expect(within(sidebar()).getByText('관리')).toBeTruthy();
    expect(sidebarLabels()).toEqual(
      expect.arrayContaining(['회원', '게스트 확인', '클럽 설정'])
    );
  });

  it('현재 클럽의 회원 정보를 맞춰 달라고 요청한다', () => {
    renderLayout();

    expect(syncedClubIds.at(-1)).toBe('1');
  });

  it('로그인하지 않았으면 내 정보 대신 로그인이 보인다', () => {
    mockState.auth.user = null;
    mockState.auth.clubMember = null;
    renderLayout();

    expect(sidebarLabels()).not.toContain('내 정보');
    expect(
      within(sidebar()).getByRole('button', { name: /로그인/ })
    ).toBeTruthy();
  });

  it('클럽 목록 화면에서는 클럽 메뉴도 클럽 이름도 보여 주지 않는다', () => {
    mockRouter = { pathname: '/clubs', asPath: '/clubs', query: {} };
    renderLayout();

    expect(sidebarLabels()).toEqual(['배드민턴 클럽', '내 정보', '클럽 목록']);
    expect(screen.queryByRole('navigation', { name: '주 메뉴' })).toBeNull();
    expect(syncedClubIds.at(-1)).toBeUndefined();
  });

  it('내 정보 화면에서는 직전에 보던 클럽의 메뉴를 그대로 둔다 (한 번에 돌아갈 수 있게)', () => {
    mockRouter = { pathname: '/profile', asPath: '/profile', query: {} };
    renderLayout();

    expect(screen.getByRole('navigation', { name: '주 메뉴' })).toBeTruthy();
    expect(sidebarLabels()).toEqual(
      expect.arrayContaining(['당산 배드민턴 클럽', '홈', '출석체크', '게시판'])
    );
    expect(syncedClubIds.at(-1)).toBe('1');
    // 어느 메뉴도 현재 위치가 아니다.
    expect(sidebar().querySelector('[aria-current]')).toBeNull();
  });

  it('내 정보 화면이라도 본 클럽이 없으면(처음 들어옴) 클럽 메뉴가 없다', () => {
    mockRouter = { pathname: '/profile', asPath: '/profile', query: {} };
    mockState.club.currentClub = { id: 0, name: '' };
    renderLayout();

    expect(sidebarLabels()).toEqual(['배드민턴 클럽', '내 정보', '클럽 목록']);
    expect(screen.queryByRole('navigation', { name: '주 메뉴' })).toBeNull();
  });

  it('다른 클럽으로 막 옮겨 와 이전 클럽 정보가 남아 있으면 그 이름을 보여 주지 않는다', () => {
    mockRouter = {
      pathname: '/clubs/[id]',
      asPath: '/clubs/2',
      query: { id: '2' },
    };
    renderLayout();

    expect(within(sidebar()).queryByText('당산 배드민턴 클럽')).toBeNull();
    expect(sidebarLabels()[0]).toBe('배드민턴 클럽');
    expect(within(sidebar()).getAllByRole('link')[0].getAttribute('href')).toBe(
      '/clubs/2'
    );
  });

  it('클럽 화면인데 주소의 클럽 id를 아직 못 읽었으면 본문을 그리지 않는다', () => {
    mockRouter = {
      pathname: '/clubs/[id]/attendance',
      asPath: '/clubs/[id]/attendance',
      query: {},
    };
    renderLayout();

    expect(screen.getByRole('main').textContent).toBe('');
  });

  it('로그인 화면은 메뉴 없이 본문만 그린다', () => {
    mockRouter = { pathname: '/auth/login', asPath: '/auth/login', query: {} };
    renderLayout();

    expect(screen.queryByRole('navigation')).toBeNull();
    expect(screen.getByRole('main').textContent).toBe('본문');
  });
});
