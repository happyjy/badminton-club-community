import { NextConfig } from 'next';
import withPWA from 'next-pwa';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: process.cwd(),
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
  // Pretendard는 글자 묶음별로 92개 파일로 나뉘어 있다. 설치 시 전부 미리
  // 받게 하지 않고, 화면에 실제로 쓰인 묶음만 그때그때 받아 캐시한다.
  buildExcludes: [/static\/media\/.*\.woff2$/],
  disable: process.env.NODE_ENV === 'development',
})(nextConfig);
