import { NextConfig } from 'next';
import withPWA from 'next-pwa';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Vercel에서 자동으로 이미지 최적화를 지원합니다
  images: {
    domains: ['k.kakaocdn.net', 'img1.kakaocdn.net', 't1.kakaocdn.net'],
  },
  webpack: (config, { dev, isServer }) => {
    // 개발 환경에서만 적용
    if (dev && !isServer) {
      // Locator 설정은 이미 babel.config.js에서 처리되므로 여기서는 추가하지 않음
    }
    return config;
  },
};

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})(nextConfig);
