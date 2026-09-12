import { ComponentType, useEffect } from 'react';

import { useRouter } from 'next/router';

import { useSelector } from 'react-redux';

import { RootState } from '@/store';
import { ClubMember, User } from '@/types';
import { KakaoAuth } from '@/utils/auth';

interface WithAuthOptions {
  requireAuth?: boolean;
  // todo: jyoon - permission 함수가 다양해지는 경우 수정 필요
  checkPermission?: (clubMember: ClubMember) => boolean;
}

export type withAuthUser = User | null;
export interface AuthProps {
  user: withAuthUser;
  isLoggedIn: boolean;
}

export function withAuth<P extends AuthProps>(
  WrappedComponent: ComponentType<P>,
  options: WithAuthOptions = { requireAuth: true }
) {
  return function WithAuthComponent(props: Omit<P, keyof AuthProps>) {
    const router = useRouter();
    const { user, clubMember } = useSelector((state: RootState) => state.auth);
    const isAuthenticated = !!user;

    const needsLogin = !isAuthenticated && !!options.requireAuth;
    const isForbidden =
      !!options.checkPermission &&
      !!clubMember &&
      !options.checkPermission(clubMember);

    // 로그인·이동은 렌더링이 끝난 뒤에 시작한다. 렌더 도중에 부수효과를 내면
    // React가 화면을 그리는 중에 상태가 바뀌어 경고나 중복 호출로 이어진다.
    useEffect(() => {
      if (needsLogin) {
        KakaoAuth.login(router);
        return;
      }

      if (isForbidden) {
        router.push('/');
      }
    }, [needsLogin, isForbidden, router]);

    if (needsLogin || isForbidden) return null;

    const componentProps = {
      ...props,
      user: user ?? null,
      isLoggedIn: isAuthenticated,
    } as P;

    return <WrappedComponent {...componentProps} />;
  };
}
