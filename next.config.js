// 이 파일을 next.config.ts로 두지 않는다. Next 15.5는 TS 설정을 읽은 뒤 Node의 .mjs
// 로더를 지워서, ESM 의존성을 쓰는 Sentry 빌드 플러그인이 ERR_REQUIRE_ESM으로 죽는다.
const { withSentryConfig } = require('@sentry/nextjs/config');
const withPWA = require('next-pwa');

/** @type {import('next').NextConfig} */
const nextConfig = {
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

const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  // Pretendard는 글자 묶음별로 92개 파일로 나뉘어 있다. 설치 시 전부 미리
  // 받게 하지 않고, 화면에 실제로 쓰인 묶음만 그때그때 받아 캐시한다.
  buildExcludes: [/static\/media\/.*\.woff2$/],
  disable: process.env.NODE_ENV === 'development',
})(nextConfig);

// 서버 에러 모니터링. API 핸들러를 감싸, 서버리스 함수가 멈추기 전에 에러가 전송되게 한다.
// 실제 전송 여부는 src/sentry.server.config.ts가 DSN 유무로 정한다.
module.exports = withSentryConfig(pwaConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  // 토큰이 없으면 소스맵을 만들지도 올리지도 않는다. 토큰을 넣으면 스택이 원본 코드 줄로 보인다.
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  // 성능 추적을 쓰지 않으므로 의존 패키지를 빌드 때 고쳐 쓰는 계측은 끈다.
  buildTimeInstrumentation: false,
});
