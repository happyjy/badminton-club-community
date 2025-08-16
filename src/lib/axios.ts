import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 인터셉터 설정
api.interceptors.request.use(
  (config) => {
    // 토큰 추가 등의 공통 로직
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 인증 실패 시 자동으로 로그인 페이지로 리다이렉트
    if (error.response?.status === 401) {
      // 클라이언트 사이드에서만 리다이렉트
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
    }
    
    // 에러 처리 공통 로직
    return Promise.reject(error);
  }
);

export default api;
