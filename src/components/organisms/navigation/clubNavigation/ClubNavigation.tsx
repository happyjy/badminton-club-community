import { useCallback, useEffect } from 'react';

import { useRouter } from 'next/router';

import { useDispatch, useSelector } from 'react-redux';

// import { setInitClubMember } from '@/store/features/authSlice';
import { useClubMember } from '@/hooks/useClubMember';
import { cn } from '@/lib/utils';
import { RootState } from '@/store';
import { setClubMember, setInitClubMember } from '@/store/features/authSlice';
import { getGuestPageStrategy } from '@/strategies/GuestPageStrategy';
import { ClubMember } from '@/types';

interface ClubNavigationProps {
  clubId: string;
}

export function ClubNavigation({ clubId }: ClubNavigationProps) {
  const router = useRouter();
  const dispatch = useDispatch();
  const currentPath = router.asPath;

  const currentUser = useSelector((state: RootState) => state.auth.user);
  const clubMember = useSelector((state: RootState) => state.auth.clubMember);
  console.log(`🚨 ~ ClubNavigation ~ clubMember:`, clubMember);

  // 사용자 유형에 따른 전략 가져오기
  const strategy = getGuestPageStrategy(!!clubMember);

  // 현재 경로에서 출석체크 탭이 활성화 되어야 하는지 확인하는 로직 추가
  const isAttendancePath =
    currentPath === `/clubs/${clubId}/attendance` ||
    currentPath.startsWith(`/clubs/${clubId}/workouts/`);

  const handleNavigation = useCallback(
    (href: string) => {
      router.push(href, undefined, {
        shallow: true,
        scroll: false,
      });
    },
    [router]
  );

  // 사용자가 ADMIN 역할을 가졌는지 확인
  const isAdmin = clubMember?.role === 'ADMIN';

  // 기본 네비게이션 아이템 (모든 사용자에게 보이는 항목)
  const baseNavigationItems = [
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
    {
      name: strategy.getNavMenuName(),
      href: `/clubs/${clubId}/guest`,
    },
    // { name: '게시판', href: `/clubs/${clubId}/board` },
    // { name: '사진첩', href: `/clubs/${clubId}/photos` },
  ];

  // ADMIN 전용 메뉴 추가
  const adminNavigationItems = [
    { name: '게스트 확인', href: `/clubs/${clubId}/guest/check` },
  ];

  // 최종 네비게이션 아이템 (ADMIN인 경우 추가 메뉴 포함)
  const navigationItems = isAdmin
    ? [...baseNavigationItems, ...adminNavigationItems]
    : baseNavigationItems;

  // 클럽 멤버 정보 가져오기 (clubId와 userId가 있을 때만)
  const { data: clubMemberData } = useClubMember(clubId, currentUser?.id);

  // 클럽 멤버 정보 초기화
  useEffect(() => {
    dispatch(setInitClubMember());
  }, [dispatch]);

  // 클럽 멤버 정보 업데이트
  useEffect(() => {
    if (!clubMemberData) return;

    // 클럽 멤버 정보를 Redux 스토어에 저장
    dispatch(setClubMember(clubMemberData as unknown as ClubMember));
  }, [clubMemberData, dispatch]);

  return (
    <nav className="border-b border-gray-200">
      <div className="overflow-x-auto">
        <div className="flex justify-between whitespace-nowrap px-4 min-w-full">
          {navigationItems.map((item) => {
            // 출석체크 탭일 경우 워크아웃 상세 페이지에서도 활성화되도록 수정
            const isActive =
              item.name === '출석체크'
                ? isAttendancePath
                : currentPath === item.href;

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
