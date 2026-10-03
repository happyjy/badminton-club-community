import { ReactNode } from 'react';

import { describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { AppShell } from '@/components/templates/AppShell';

import { getNavItems } from '@/constants/navItems';

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

const items = getNavItems({
  clubId: '1',
  isMember: true,
  isAdmin: true,
  tournamentMenuEnabled: true,
});

const base = {
  clubId: '1',
  clubName: '당산 배드민턴 클럽',
  items,
  currentPath: '/clubs/1',
  isAuthenticated: true,
  onLogin: () => {},
  onLogout: () => {},
};

describe('AppShell', () => {
  it('member: 탭바·사이드바·상단 바와 본문을 그린다', () => {
    render(
      <AppShell {...base} variant="member">
        <p>본문</p>
      </AppShell>
    );

    expect(screen.getByRole('navigation', { name: '주 메뉴' })).toBeTruthy();
    expect(
      screen.getByRole('navigation', { name: '사이드 메뉴' })
    ).toBeTruthy();
    expect(screen.getByRole('banner')).toBeTruthy();
    expect(screen.getByRole('main').textContent).toBe('본문');
    expect(screen.getByRole('main').hasAttribute('data-density')).toBe(false);
  });

  it('admin: 본문에 compact 밀도를 건다', () => {
    render(
      <AppShell {...base} variant="admin" currentPath="/clubs/1/members">
        <p>회원 관리</p>
      </AppShell>
    );

    expect(screen.getByRole('main').getAttribute('data-density')).toBe(
      'compact'
    );
  });

  it('bare: 메뉴 없이 본문만 그린다', () => {
    render(
      <AppShell {...base} variant="bare" currentPath="/auth/login">
        <p>로그인</p>
      </AppShell>
    );

    expect(screen.queryByRole('navigation')).toBeNull();
    expect(screen.queryByRole('banner')).toBeNull();
    expect(screen.getByRole('main').textContent).toBe('로그인');
  });

  it('none: 아무것도 감싸지 않고 자식만 그린다', () => {
    const { container } = render(
      <AppShell {...base} variant="none">
        <p>직접 그린 뼈대</p>
      </AppShell>
    );

    expect(container.innerHTML).toBe('<p>직접 그린 뼈대</p>');
  });

  it('본문 아래에 탭바에 가리지 않을 여백을 둔다', () => {
    render(
      <AppShell {...base} variant="member">
        <p>본문</p>
      </AppShell>
    );

    expect(screen.getByRole('main').className).toContain('var(--tabbar-h)');
  });

  it('더보기를 누르면 더보기 시트가 열리고, 메뉴를 누르면 닫힌다', async () => {
    render(
      <AppShell {...base} variant="member">
        <p>본문</p>
      </AppShell>
    );
    expect(screen.queryByRole('dialog')).toBeNull();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '더보기' }));
    });
    const dialog = screen.getByRole('dialog', { name: '더보기' });
    expect(dialog).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    });
  });

  it('클럽 밖(메뉴 항목 없음): 탭바 대신 상단 바의 메뉴 버튼으로 더보기를 연다', async () => {
    render(
      <AppShell
        {...base}
        variant="member"
        clubId={undefined}
        clubName={undefined}
        items={[]}
        currentPath="/profile"
      >
        <p>내 정보</p>
      </AppShell>
    );

    expect(screen.queryByRole('navigation', { name: '주 메뉴' })).toBeNull();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '메뉴' }));
    });
    expect(screen.getByRole('dialog', { name: '더보기' })).toBeTruthy();
  });

  it('회원 정보가 아직 없어 메뉴가 두 개뿐이어도 탭바를 그린다', () => {
    render(
      <AppShell
        {...base}
        variant="member"
        items={getNavItems({
          clubId: '1',
          isMember: false,
          isAdmin: false,
          tournamentMenuEnabled: true,
        })}
      >
        <p>본문</p>
      </AppShell>
    );

    expect(screen.getByRole('navigation', { name: '주 메뉴' })).toBeTruthy();
  });

  it('회원용 화면의 본문은 PC에서도 좁게(max-w-2xl), 관리 화면은 넓게 둔다', () => {
    const { rerender } = render(
      <AppShell {...base} variant="member">
        본문
      </AppShell>
    );
    expect(screen.getByRole('main').className).toContain('max-w-2xl');

    rerender(
      <AppShell {...base} variant="admin">
        본문
      </AppShell>
    );
    expect(screen.getByRole('main').className).toContain('max-w-6xl');
  });
});
