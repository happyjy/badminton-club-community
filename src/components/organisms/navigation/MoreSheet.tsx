import { ArrowLeftRight, LogIn, LogOut, User } from 'lucide-react';

import { ListGroup } from '@/components/molecules/list/ListGroup';
import { ListRow } from '@/components/molecules/list/ListRow';
import { Sheet } from '@/components/organisms/sheet/Sheet';

import { NavItem } from '@/constants/navItems';

interface MoreSheetProps {
  open: boolean;
  onClose: () => void;
  items: NavItem[];
  /** router.asPath */
  currentPath: string;
  isAuthenticated: boolean;
  onLogin: () => void;
  onLogout: () => void;
}

const iconClass = 'h-5 w-5 text-secondary';

/**
 * 휴대폰의 '더보기'. 하단 탭에 올리지 않은 메뉴(대회, 관리)와 계정 메뉴를 담는다.
 * 클럽 밖의 화면에서는 계정 메뉴만 보인다.
 */
export function MoreSheet({
  open,
  onClose,
  items,
  currentPath,
  isAuthenticated,
  onLogin,
  onLogout,
}: MoreSheetProps) {
  const rest = items.filter((item) => !item.tab && item.section === 'main');
  const admin = items.filter((item) => item.section === 'admin');

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    return (
      <ListRow
        key={item.key}
        href={item.href}
        onClick={onClose}
        aria-current={item.isActive(currentPath) ? 'page' : undefined}
        leading={<Icon aria-hidden className={iconClass} />}
        title={item.label}
      />
    );
  };

  return (
    <Sheet open={open} onClose={onClose} title="더보기">
      <div className="space-y-6">
        {rest.length > 0 && (
          <ListGroup tone="inset">{rest.map(renderItem)}</ListGroup>
        )}

        {admin.length > 0 && (
          <ListGroup label="관리" tone="inset">
            {admin.map(renderItem)}
          </ListGroup>
        )}

        <ListGroup label="계정" tone="inset">
          {isAuthenticated && (
            <ListRow
              href="/profile"
              onClick={onClose}
              leading={<User aria-hidden className={iconClass} />}
              title="내 정보"
            />
          )}
          <ListRow
            href="/clubs"
            onClick={onClose}
            leading={<ArrowLeftRight aria-hidden className={iconClass} />}
            title="클럽 목록"
          />
          {isAuthenticated ? (
            <ListRow
              onClick={() => {
                onLogout();
                onClose();
              }}
              leading={<LogOut aria-hidden className={iconClass} />}
              title="로그아웃"
            />
          ) : (
            <ListRow
              onClick={() => {
                onLogin();
                onClose();
              }}
              leading={<LogIn aria-hidden className={iconClass} />}
              title="로그인"
            />
          )}
        </ListGroup>
      </div>
    </Sheet>
  );
}

export default MoreSheet;
