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
    {
      name: '홈',
      href: `/clubs/${clubId}`,
      // 나중에 icon 사용 대비를 위한 코드
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
    {
      name: '출석체크',
      href: `/clubs/${clubId}/attendance`,
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
      ),
    },
    { name: '게시판', href: `/clubs/${clubId}/board` },
    { name: '게스트', href: `/clubs/${clubId}/guest` },
    { name: '사진첩', href: `/clubs/${clubId}/photos` },
  ];

  return (
    <nav className="border-b border-gray-200">
      <div className="overflow-x-auto">
        <div className="flex justify-between whitespace-nowrap px-4 min-w-full">
          {navigationItems.map((item) => {
            const isActive = currentPath === item.href;
            return (
              <button
                key={item.name}
                onClick={() => handleNavigation(item.href)}
                className={cn(
                  'inline-flex flex-col md:flex-row items-center border-b-2 px-3 pt-1 text-sm font-medium',
                  'md:space-x-2',
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                )}
              >
                {/* {item.icon} */}
                <span className="mt-1 md:mt-0">{item.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
