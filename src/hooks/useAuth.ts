import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

import { User } from '@/types';
import { ApiResponse } from '@/types/common.types';

// 인증 응답 타입 정의
interface AuthResponse {
  isAuthenticated: boolean;
  user: User | null;
}

// API 응답 구조
interface ApiResponseData {
  auth: AuthResponse;
}

export function useAuth() {
  return useQuery<AuthResponse>({
    queryKey: ['auth'],
    queryFn: async (): Promise<AuthResponse> => {
      const response =
        await axios.get<ApiResponse<'auth', ApiResponseData>>(
          '/api/auth/check'
        );

      if ('error' in response.data) {
        throw new Error(response.data.error);
      }

      const auth = response.data.data.auth as unknown as AuthResponse;
      return auth;
    },
    // 새 api 호출이 진행되는 동안에도 캐시에 있는 데이터를 보여주며 새로운 데이터가 도착하면(staleTime 이후) 업데이트 된다.
    staleTime: 1000 * 60 * 5, // 5분: 데이터가 새로운 데이터를 받기 위해서 api를 호출
    gcTime: 1000 * 60 * 30, // 30분: 캐시 보관 기간
    retry: 1,
  });
}
