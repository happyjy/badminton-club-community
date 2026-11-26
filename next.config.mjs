// 설정 파일을 .ts로 두지 않는다.
// Next.js가 next.config.ts를 읽은 뒤 Node의 .mjs 처리기(require.extensions['.mjs'])를 지워,
// dev 서버에서 엑셀 내보내기(exceljs)가 ERR_REQUIRE_ESM으로 실패한다 (Next 15.5.27 기준).
import withPWA from 'next-pwa';

// Vercel 빌드에서는 린트·타입 검사를 건너뛴다. GitHub CI(PR·main push)가 같은 검사를 하므로
// 배포마다 다시 할 필요가 없다. 로컬 `npm run build`는 그대로 검사한다.
const isVercelBuild = process.env.VERCEL === '1';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: process.cwd(),
  eslint: { ignoreDuringBuilds: isVercelBuild },
  typescript: { ignoreBuildErrors: isVercelBuild },
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
