import { useQuery } from '@tanstack/react-query';
import { User } from '@/types';
import axios from 'axios';
import { ApiResponse } from '@/types/common.types';

interface AuthResponse {
  isAuthenticated: boolean;
  user: User | null;
}

export function useAuth() {
  return useQuery<AuthResponse>({
    queryKey: ['auth'],
    queryFn: async () => {
      const response =
        await axios.get<ApiResponse<'auth', AuthResponse>>('/api/auth/check');
      if ('error' in response.data) {
        throw new Error(response.data.error);
      }
      return response.data.data.auth;
    },
    // 새 api 호출이 진행되는 동안에도 캐시에 있는 데이터를 보여주며 새로운 데이터가 도착하면(staleTime 이후) 업데이트 된다.
    staleTime: 1000 * 60 * 5, // 5분: 데이터가 새로운 데이터를 받기 위해서 api를 호출
    cacheTime: 1000 * 60 * 30, // 30분: 캐시 보관 기간
    retry: 1,
  });
}
