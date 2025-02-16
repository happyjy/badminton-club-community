import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { ComponentType } from 'react';
import { User } from '@/types';
import { redirectToLogin } from '@/utils/auth';

interface WithAuthOptions {
  requireAuth?: boolean;
}

interface AuthProps {
  user: User | null;
  isLoggedIn: boolean;
}

export function withAuth<P extends AuthProps>(
  WrappedComponent: ComponentType<P>,
  options: WithAuthOptions = { requireAuth: true }
) {
  return function WithAuthComponent(props: Omit<P, keyof AuthProps>) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
      async function checkAuth() {
        try {
          const response = await fetch('/api/auth/check');
          const result = (await response.json()) as ApiResponse<
            'auth',
            { isAuthenticated: boolean; user: User | null }
          >;

          if ('error' in result) {
            throw new Error(result.error);
          }

          if (result.data.auth.isAuthenticated && result.data.auth.user) {
            setUser(result.data.auth.user);
          } else {
            if (options.requireAuth) {
              router.push('/');
            } else {
              setUser(null);
            }
          }
        } catch (error) {
          console.error('인증 확인 중 오류 발생:', error);
          router.push('/');
        } finally {
          setIsLoading(false);
        }
      }

      checkAuth();
    }, [router]);

    if (isLoading) {
      return (
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900" />
        </div>
      );
    }

    const isLoggedIn = !!user;

    // 로그인이 필요한 페이지인데 로그인이 안 되어 있는 경우
    if (options.requireAuth && !isLoggedIn) {
      redirectToLogin(router);
      return null;
    }

    return <WrappedComponent {...props} user={user} isLoggedIn={isLoggedIn} />;
  };
}
