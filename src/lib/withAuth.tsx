import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import type { NextPage } from 'next';
import { User } from '@/types';
import { ApiResponse } from '@/types/common.types';

export function withAuth<P extends object>(WrappedComponent: NextPage<P>) {
  return function WithAuthComponent(props: P) {
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
            router.push('/');
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

    return <WrappedComponent {...props} user={user} />;
  };
}
