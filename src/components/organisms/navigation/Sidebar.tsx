import Link from 'next/link';

import {
  ArrowLeftRight,
  LogIn,
  LogOut,
  type LucideIcon,
  User,
} from 'lucide-react';

import { NavItem } from '@/constants/navItems';
import { cn } from '@/lib/utils';

interface SidebarProps {
  items: NavItem[];
  /** router.asPath */
  currentPath: string;
  clubId?: string;
  clubName?: string;
  isAuthenticated: boolean;
  onLogin: () => void;
  onLogout: () => void;
}

const rowClass = (active = false) =>
  cn(
    'flex h-9 w-full items-center gap-2 rounded-sm px-2 text-left text-callout text-primary',
    'transition-colors duration-150 hover:bg-fill',
    active ? 'bg-fill font-semibold' : 'font-medium'
  );

function Row({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={rowClass(active)}
    >
      <Icon aria-hidden className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

/**
 * PC 왼쪽 사이드바. lg(1024px) 이상에서만 보인다.
 * 휴대폰의 탭바 + 더보기에 있는 메뉴를 모두 펼쳐서 보여 준다.
 */
export function Sidebar({
  items,
  currentPath,
  clubId,
  clubName,
  isAuthenticated,
  onLogin,
  onLogout,
}: SidebarProps) {
  const main = items.filter((item) => item.section === 'main');
  const admin = items.filter((item) => item.section === 'admin');

  return (
    <nav
      aria-label="사이드 메뉴"
      className="fixed inset-y-0 left-0 z-tabbar hidden w-60 flex-col border-r border-border bg-surface-muted px-3 py-4 lg:flex"
    >
      <Link
        href={clubId ? `/clubs/${clubId}` : '/clubs'}
        className="mb-3 block truncate px-2 text-headline text-primary"
      >
        {clubName || '배드민턴 클럽'}
      </Link>

      <div className="space-y-0.5">
        {main.map((item) => (
          <Row
            key={item.key}
            href={item.href}
            icon={item.icon}
            label={item.label}
            active={item.isActive(currentPath)}
          />
        ))}
      </div>

      {admin.length > 0 && (
        <>
          <p className="mb-1 mt-5 px-2 text-caption text-secondary">관리</p>
          <div className="space-y-0.5">
            {admin.map((item) => (
              <Row
                key={item.key}
                href={item.href}
                icon={item.icon}
                label={item.label}
                active={item.isActive(currentPath)}
              />
            ))}
          </div>
        </>
      )}

      <div className="mt-auto space-y-0.5 border-t border-border pt-3">
        {isAuthenticated && <Row href="/profile" icon={User} label="내 정보" />}
        <Row href="/clubs" icon={ArrowLeftRight} label="클럽 목록" />
        {isAuthenticated ? (
          <button type="button" onClick={onLogout} className={rowClass()}>
            <LogOut aria-hidden className="h-4 w-4 shrink-0" />
            로그아웃
          </button>
        ) : (
          <button type="button" onClick={onLogin} className={rowClass()}>
            <LogIn aria-hidden className="h-4 w-4 shrink-0" />
            로그인
          </button>
        )}
      </div>
    </nav>
  );
}

export default Sidebar;
