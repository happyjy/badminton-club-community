import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import type { NextPage } from 'next';

export function withAuth<P extends object>(WrappedComponent: NextPage<P>) {
  return function WithAuthComponent(props: P) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      async function checkAuth() {
        try {
          const response = await fetch('/api/auth/check');
          const data = await response.json();

          if (!data.isAuthenticated) {
            router.replace('/');
          }
        } catch (error) {
          console.error('인증 확인 중 오류 발생:', error);
          router.replace('/');
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

    return <WrappedComponent {...props} />;
  };
}
