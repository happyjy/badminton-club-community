import { useRouter } from 'next/router';
import { ComponentType } from 'react';
import { User } from '@/types';
import { redirectToLogin } from '@/utils/auth';
import { useAuth } from '@/hooks/useAuth';

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
    const { data, isLoading, error } = useAuth();

    if (isLoading) {
      return (
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900" />
        </div>
      );
    }

    if (error || (!data?.isAuthenticated && options.requireAuth)) {
      redirectToLogin(router);
      return null;
    }

    const componentProps = {
      ...props,
      user: data?.user ?? null,
      isLoggedIn: !!data?.isAuthenticated,
    } as P;

    return <WrappedComponent {...componentProps} />;
  };
}
