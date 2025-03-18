import { LayoutProps } from '@/types/components.types';
import MainNavigation from '../organisms/navigation/mainNavigation/MainNavigation';
import { ClubNavigation } from '../organisms/navigation/clubNavigation/ClubNavigation';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setClubData } from '@/store/features/clubSlice';
import { setUser, setMembershipStatus } from '@/store/features/authSlice';
import { RootState } from '@/store';
import axios from 'axios';
import { ClubMember } from '@/types';

export default function Layout({ children }: LayoutProps) {
  const dispatch = useDispatch();
  const router = useRouter();
  const { id: clubId } = router.query;
  const [isLoading, setIsLoading] = useState(false);
  const currentUser = useSelector((state: RootState) => state.auth.user);

  // /clubs/[id] 형식의 경로인지 확인
  const isClubRoute = router.pathname.startsWith('/clubs/[id]');

  // 사용자 인증 상태 확인
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const { data } = await axios.get('/api/auth/check');
        if (data.data.auth.isAuthenticated) {
          dispatch(setUser(data.data.auth.user));
        }
      } catch (error) {
        console.error('인증 상태 확인 실패:', error);
      }
    };

    checkAuthStatus();
  }, [dispatch]);

  // 클럽 데이터 및 멤버십 상태 가져오기
  useEffect(() => {
    const fetchClubData = async () => {
      if (!clubId || !isClubRoute) return;

      setIsLoading(true);
      try {
        const { data } = await axios.get(`/api/clubs/${clubId}`);

        // 클럽 데이터를 Redux 스토어에 저장
        dispatch(setClubData(data.data.club));

        // 현재 사용자의 멤버십 상태 확인
        if (currentUser && data.data.club.members) {
          const memberStatus = data.data.club.members.find(
            (member: ClubMember) => member.userId === currentUser.id
          );

          dispatch(
            setMembershipStatus({
              isPending: memberStatus?.status === 'PENDING',
              isMember: memberStatus?.status === 'APPROVED',
            })
          );
        }
      } catch (error) {
        console.error('클럽 데이터 조회 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClubData();
  }, [clubId, isClubRoute, dispatch, currentUser]);

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
