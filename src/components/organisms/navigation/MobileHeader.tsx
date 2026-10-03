import Link from 'next/link';

import { Menu } from 'lucide-react';

import { IconButton } from '@/components/atoms/buttons/IconButton';

interface MobileHeaderProps {
  clubId?: string;
  clubName?: string;
  /** 탭바가 없는 화면(클럽 밖)에서는 메뉴 버튼으로 더보기를 연다 */
  showMenuButton: boolean;
  onOpenMore: () => void;
}

/**
 * 휴대폰 상단 바. 지금 어느 클럽에 있는지 보여 준다.
 * lg(1024px) 이상에서는 숨고 Sidebar가 클럽 이름을 보여 준다.
 */
export function MobileHeader({
  clubId,
  clubName,
  showMenuButton,
  onOpenMore,
}: MobileHeaderProps) {
  return (
    <header className="sticky top-0 z-tabbar border-b-[0.5px] border-separator bg-tabbar pt-[env(safe-area-inset-top)] backdrop-blur-md lg:hidden">
      <div className="flex h-12 items-center justify-between gap-2 pl-4 pr-1">
        <Link
          href={clubId ? `/clubs/${clubId}` : '/clubs'}
          className="min-w-0 truncate text-headline text-primary"
        >
          {clubName || '배드민턴 클럽'}
        </Link>
        {showMenuButton && (
          <IconButton aria-label="메뉴" onClick={onOpenMore}>
            <Menu aria-hidden className="h-5 w-5" />
          </IconButton>
        )}
      </div>
    </header>
  );
}

export default MobileHeader;
