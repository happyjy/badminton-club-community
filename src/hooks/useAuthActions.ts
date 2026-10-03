import { useRouter } from 'next/router';

import { useDispatch } from 'react-redux';

import { logout as logoutAction } from '@/store/features/authSlice';
import { KakaoAuth } from '@/utils/auth';

/** 로그인·로그아웃. 메뉴에서 쓴다. */
export function useAuthActions() {
  const router = useRouter();
  const dispatch = useDispatch();

  const login = () => {
    KakaoAuth.login(router);
  };

  const logout = async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });

      if (response.ok) {
        dispatch(logoutAction());
        router.push('/');
      }
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  return { login, logout };
}
