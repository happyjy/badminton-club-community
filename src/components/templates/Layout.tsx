import { useEffect } from 'react';

import { useRouter } from 'next/router';

import { useDispatch, useSelector } from 'react-redux';

import { useAuth } from '@/hooks/useAuth';
import { useClub } from '@/hooks/useClub';
import { RootState } from '@/store';
import { setUser, setMembershipStatus } from '@/store/features/authSlice';
import { setClubData } from '@/store/features/clubSlice';
import { ClubMember, User, ClubWithDetails } from '@/types';
import { LayoutProps } from '@/types/components.types';

import { ClubNavigation } from '../organisms/navigation/clubNavigation/ClubNavigation';
import MainNavigation from '../organisms/navigation/mainNavigation/MainNavigation';

// useAuth 훅이 반환하는 데이터 타입 정의
interface AuthData {
  isAuthenticated: boolean;
  user: User | null;
}

export function Layout({ children }: LayoutProps) {
  const dispatch = useDispatch();
  const router = useRouter();
  const { id: clubId } = router.query;
  const currentUser = useSelector((state: RootState) => state.auth.user);

  // /clubs/[id] 형식의 경로인지 확인
  const isClubRoute = router.pathname.startsWith('/clubs/[id]');

  // 사용자 인증 정보 가져오기
  const { data: authData } = useAuth();

  // 클럽 데이터 가져오기 (clubId가 있고 클럽 경로일 때만)
  const { data: clubData, isLoading: isClubLoading } = useClub(
    isClubRoute ? clubId : undefined
  );

  // 인증 상태 업데이트
  useEffect(() => {
    if (!authData) return;

    // 사용자 정보가 있으면 상태 업데이트
    const auth = authData as unknown as AuthData;
    if (auth.user) {
      dispatch(setUser(auth.user));
    }
  }, [authData, dispatch]);

  // 클럽 데이터 및 멤버십 상태 업데이트
  useEffect(() => {
    if (!clubData) return;

    // 클럽 데이터를 Redux 스토어에 저장
    const club = clubData as unknown as ClubWithDetails;
    dispatch(setClubData(club));

    // 현재 사용자의 멤버십 상태 확인
    if (currentUser && club.members) {
      const memberStatus = club.members.find(
        (member: ClubMember) => member.userId === currentUser.id
      );

      dispatch(
        setMembershipStatus({
          isPending: memberStatus?.status === 'PENDING',
          isMember: memberStatus?.status === 'APPROVED',
        })
      );
    }
  }, [clubData, currentUser, dispatch]);

  // 클럽 페이지에서 로딩 상태 확인
  const isLoading = isClubRoute ? isClubLoading : false;

  return (
    <>
      <MainNavigation />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {isClubRoute && clubId && (
          <div className="py-1 sm:py-3">
            <ClubNavigation clubId={clubId as string} />
            <div className="mt-3 sm:mt-6">
              {isLoading ? (
                <div className="flex justify-center items-center py-8 sm:py-10">
                  <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-t-2 border-b-2 border-gray-900" />
                </div>
              ) : (
                children
              )}
            </div>
          </div>
        )}
        {!isClubRoute && children}
      </main>
    </>
  );
}

export default Layout;
