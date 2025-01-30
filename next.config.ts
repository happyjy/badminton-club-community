import { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Vercel에서 자동으로 이미지 최적화를 지원합니다
  images: {
    domains: ['k.kakaocdn.net', 'img1.kakaocdn.net', 't1.kakaocdn.net'],
  },
};

export default config;
