import { ComponentType } from 'react';

import { useRouter } from 'next/router';

import { useSelector } from 'react-redux';

import { RootState } from '@/store';
import { ClubMember, User } from '@/types';
import { redirectToLogin } from '@/utils/auth';

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

    if (!isAuthenticated && options.requireAuth) {
      redirectToLogin(router);
      return null;
    }

    if (
      options.checkPermission &&
      clubMember &&
      !options.checkPermission(clubMember)
    ) {
      router.push('/');
      return null;
    }

    const componentProps = {
      ...props,
      user: user ?? null,
      isLoggedIn: isAuthenticated,
    } as P;

    return <WrappedComponent {...componentProps} />;
  };
}
