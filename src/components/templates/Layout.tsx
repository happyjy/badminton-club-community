import { useEffect } from 'react';

import { useRouter } from 'next/router';

import { useDispatch, useSelector } from 'react-redux';

import { Spinner } from '@/components/atoms/Spinner';
import { AppShell } from '@/components/templates/AppShell';

import { useAuth } from '@/hooks/useAuth';
import { useAuthActions } from '@/hooks/useAuthActions';
import { useClub } from '@/hooks/useClub';
import { useMenuSettings } from '@/hooks/useCustomSettings';
import { useSyncClubMember } from '@/hooks/useSyncClubMember';

import { getLayoutVariant } from '@/constants/layoutVariant';
import { getNavItems } from '@/constants/navItems';
import { RootState } from '@/store';
import { setUser, setMembershipStatus } from '@/store/features/authSlice';
import { setClubData } from '@/store/features/clubSlice';
import { ClubMember, User, ClubWithDetails } from '@/types';
import { LayoutProps } from '@/types/components.types';

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
          // todo[refactoring]: jyoon - hard code 된 부분 수정하기
          isPending: memberStatus?.status === 'PENDING',
          isMember: memberStatus?.status === 'APPROVED',
        })
      );
    }
  }, [clubData, currentUser, dispatch]);

  // 클럽 페이지에서 로딩 상태 확인
  const isLoading = isClubRoute ? isClubLoading : false;

  // 클럽 화면에서만 클럽 id가 뜻이 있다.
  const activeClubId =
    isClubRoute && typeof clubId === 'string' ? clubId : undefined;

  // 현재 클럽에서의 내 회원 정보를 스토어에 넣는다 (옛 ClubNavigation이 하던 일).
  useSyncClubMember(activeClubId);
  const clubMember = useSelector((state: RootState) => state.auth.clubMember);

  // 커스텀 설정에서 끈 메뉴는 숨긴다. 설정을 불러오기 전에는 켜진 것으로 본다.
  const { data: menuSettings } = useMenuSettings(activeClubId ?? '');
  const { login, logout } = useAuthActions();

  const navItems = activeClubId
    ? getNavItems({
        clubId: activeClubId,
        isMember: !!clubMember,
        isAdmin: clubMember?.role === 'ADMIN',
        tournamentMenuEnabled: menuSettings?.tournamentMenuEnabled ?? true,
      })
    : [];

  const currentClub = useSelector((state: RootState) => state.club.currentClub);

  // 클럽 화면인데 주소의 클럽 id를 아직 못 읽었으면(라우터 준비 전) 본문을 그리지 않는다.
  const isWaitingForClubId = isClubRoute && !clubId;

  return (
    <AppShell
      variant={getLayoutVariant(router.pathname)}
      clubId={activeClubId}
      // 클럽 밖에서는 이전 클럽의 이름이 남아 있어도 보여 주지 않는다.
      clubName={activeClubId ? currentClub?.name : undefined}
      items={navItems}
      currentPath={router.asPath}
      isAuthenticated={!!currentUser}
      onLogin={login}
      onLogout={logout}
    >
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner size="lg" />
        </div>
      ) : isWaitingForClubId ? null : (
        children
      )}
    </AppShell>
  );
}

export default Layout;
