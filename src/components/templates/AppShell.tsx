import { ReactNode, useState } from 'react';

import { BottomTabBar } from '@/components/organisms/navigation/BottomTabBar';
import { MobileHeader } from '@/components/organisms/navigation/MobileHeader';
import { MoreSheet } from '@/components/organisms/navigation/MoreSheet';
import { Sidebar } from '@/components/organisms/navigation/Sidebar';

import { LayoutVariant } from '@/constants/layoutVariant';
import { NavItem } from '@/constants/navItems';
import { cn } from '@/lib/utils';

interface AppShellProps {
  variant: LayoutVariant;
  clubId?: string;
  clubName?: string;
  /** 클럽 밖의 화면에서는 빈 배열 */
  items: NavItem[];
  /** router.asPath */
  currentPath: string;
  isAuthenticated: boolean;
  onLogin: () => void;
  onLogout: () => void;
  children: ReactNode;
}

/**
 * 앱의 뼈대. 휴대폰은 상단 바 + 하단 탭바, PC(lg 이상)는 왼쪽 사이드바.
 * 폭에 따른 전환은 각 부품의 CSS(lg:hidden / hidden lg:flex)가 한다.
 * 좌우 여백과 탭바에 가리지 않을 아래 여백은 여기서만 준다.
 */
export function AppShell({
  variant,
  clubId,
  clubName,
  items,
  currentPath,
  isAuthenticated,
  onLogin,
  onLogout,
  children,
}: AppShellProps) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  // 화면이 뼈대를 직접 그린다 (개발용 미리보기).
  if (variant === 'none') return <>{children}</>;

  // 로그인, 외부인용 화면: 메뉴 없이 본문만.
  if (variant === 'bare') {
    return <main className="mx-auto max-w-4xl px-4 py-4">{children}</main>;
  }

  // 클럽 밖에는 탭으로 갈 곳이 없다. 상단 바의 메뉴 버튼이 더보기를 연다.
  const hasTabBar = items.length > 0;

  return (
    <div className="lg:pl-60">
      <MobileHeader
        clubId={clubId}
        clubName={clubName}
        showMenuButton={!hasTabBar}
        onOpenMore={() => setIsMoreOpen(true)}
      />
      <Sidebar
        items={items}
        currentPath={currentPath}
        clubId={clubId}
        clubName={clubName}
        isAuthenticated={isAuthenticated}
        onLogin={onLogin}
        onLogout={onLogout}
      />

      <main
        data-density={variant === 'admin' ? 'compact' : undefined}
        className={cn(
          'mx-auto px-4 pt-3 lg:px-6 lg:pb-10 lg:pt-6',
          'pb-[calc(var(--tabbar-h)+env(safe-area-inset-bottom)+24px)]',
          // 회원용 화면은 PC에서도 휴대폰과 같은 좁은 본문, 관리 화면은 넓은 본문
          variant === 'admin' ? 'max-w-6xl' : 'max-w-2xl'
        )}
      >
        {children}
      </main>

      {hasTabBar && (
        <BottomTabBar
          items={items}
          currentPath={currentPath}
          onOpenMore={() => setIsMoreOpen(true)}
        />
      )}
      <MoreSheet
        open={isMoreOpen}
        onClose={() => setIsMoreOpen(false)}
        items={items}
        currentPath={currentPath}
        isAuthenticated={isAuthenticated}
        onLogin={onLogin}
        onLogout={onLogout}
      />
    </div>
  );
}

export default AppShell;
