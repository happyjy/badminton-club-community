import { useRouter } from 'next/router';
import { ComponentType } from 'react';
import { User } from '@/types';
import { redirectToLogin } from '@/utils/auth';
import { useAuth } from '@/hooks/useAuth';
import { useSelector } from 'react-redux';

interface WithAuthOptions {
  requireAuth?: boolean;
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
    const user = useSelector((state: RootState) => state.auth.user);
    const isAuthenticated = !!user;

    if (!isAuthenticated && options.requireAuth) {
      redirectToLogin(router);
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
