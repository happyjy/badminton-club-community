import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // 페이지 포커스 시 자동 리패치 비활성화
      retry: 1, // 실패 시 1번 재시도
    },
  },
});
