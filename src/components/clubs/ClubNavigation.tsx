import { useRouter } from 'next/router';
import { cn } from '@/lib/utils';
import { useCallback } from 'react';

interface ClubNavigationProps {
  clubId: string;
}

export function ClubNavigation({ clubId }: ClubNavigationProps) {
  const router = useRouter();
  const currentPath = router.asPath;

  const handleNavigation = useCallback(
    (href: string) => {
      router.push(href, undefined, {
        shallow: true,
        scroll: false,
      });
    },
    [router]
  );

  const navigationItems = [
    { name: '홈', href: `/clubs/${clubId}` },
    { name: '출석체크', href: `/clubs/${clubId}/attendance` },
    { name: '게시판', href: `/clubs/${clubId}/board` },
    { name: '게스트 신청', href: `/clubs/${clubId}/guest` },
    { name: '사진첩', href: `/clubs/${clubId}/photos` },
  ];

  return (
    <nav className="border-b border-gray-200">
      <div className="flex space-x-8 px-4">
        {navigationItems.map((item) => {
          const isActive = currentPath === item.href;
          return (
            <button
              key={item.name}
              onClick={() => handleNavigation(item.href)}
              className={cn(
                'inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium',
                isActive
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              )}
            >
              {item.name}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
