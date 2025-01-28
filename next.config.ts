import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 카카오 이미지 도메인 설정(설정하지 않으면 카카오 이미지 도메인을 로드할 수 없음)
  images: {
    domains: ['k.kakaocdn.net'],
  },
};

export default nextConfig;
