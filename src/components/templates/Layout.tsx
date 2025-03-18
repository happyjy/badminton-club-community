import { LayoutProps } from '@/types/components.types';
import MainNavigation from '../organisms/navigation/mainNavigation/MainNavigation';
import { ClubNavigation } from '../organisms/navigation/clubNavigation/ClubNavigation';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setClubData } from '@/store/features/clubSlice';
import { setUser, setMembershipStatus } from '@/store/features/authSlice';
import { RootState } from '@/store';
import { ClubMember } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useClub } from '@/hooks/useClub';

export default function Layout({ children }: LayoutProps) {
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

    dispatch(setUser(authData.user));
  }, [authData, dispatch]);

  // 클럽 데이터 및 멤버십 상태 업데이트
  useEffect(() => {
    if (!clubData) return;

    // 클럽 데이터를 Redux 스토어에 저장
    dispatch(setClubData(clubData));

    // 현재 사용자의 멤버십 상태 확인
    if (currentUser && clubData.members) {
      const memberStatus = clubData.members.find(
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
      <main className="max-w-4xl mx-auto px-4">
        {isClubRoute && clubId && (
          <div className="py-3">
            <ClubNavigation clubId={clubId as string} />
            <div className="mt-6">
              {isLoading ? (
                <div className="flex justify-center items-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900" />
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
