import Link from 'next/link';

import { MoreHorizontal } from 'lucide-react';

import { NavItem } from '@/constants/navItems';
import { cn } from '@/lib/utils';

interface BottomTabBarProps {
  items: NavItem[];
  /** router.asPath */
  currentPath: string;
  onOpenMore: () => void;
}

const tabClass = (active: boolean) =>
  cn(
    'flex h-[var(--tabbar-h)] flex-1 flex-col items-center justify-center gap-0.5 text-caption',
    'transition-opacity duration-150 active:opacity-60',
    // 꺼진 탭도 글자는 읽혀야 한다. tertiary는 12px 글자에 대비가 모자란다.
    active ? 'font-semibold text-primary' : 'text-secondary'
  );

/**
 * 휴대폰 하단 탭바. lg(1024px) 이상에서는 숨고 Sidebar가 대신한다.
 * tab이 true인 항목을 탭으로, 나머지는 '더보기' 뒤에 둔다.
 */
export function BottomTabBar({
  items,
  currentPath,
  onOpenMore,
}: BottomTabBarProps) {
  const tabs = items.filter((item) => item.tab);
  // 탭에 없는 화면(대회, 관리)에 있으면 더보기가 그 자리를 대신 표시한다.
  const isMoreActive = items.some(
    (item) => !item.tab && item.isActive(currentPath)
  );

  return (
    <nav
      aria-label="주 메뉴"
      className="fixed inset-x-0 bottom-0 z-tabbar flex border-t-[0.5px] border-separator bg-tabbar pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      {tabs.map((item) => {
        const active = item.isActive(currentPath);
        const Icon = item.icon;

        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={tabClass(active)}
          >
            <Icon
              aria-hidden
              className="h-[22px] w-[22px]"
              strokeWidth={active ? 2.4 : 2}
            />
            {item.tabLabel ?? item.label}
          </Link>
        );
      })}

      <button
        type="button"
        onClick={onOpenMore}
        aria-current={isMoreActive ? 'page' : undefined}
        className={tabClass(isMoreActive)}
      >
        <MoreHorizontal
          aria-hidden
          className="h-[22px] w-[22px]"
          strokeWidth={isMoreActive ? 2.4 : 2}
        />
        더보기
      </button>
    </nav>
  );
}

export default BottomTabBar;
