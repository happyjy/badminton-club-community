import { MetadataRoute } from 'next';
/* 
 - TypeScript를 통한 타입 안정성
 - Next.js의 자동 최적화
 - host 필드를 통한 명시적인 도메인 설정
 - Next.js의 빌드 시스템과 더 나은 통합
 - 또한, 현재 설정된 메타데이터(layout.tsx)와 함께 사용하면 SEO 최적화가 더욱 효과적입니다. 
  기존 public/robots.txt는 제거하셔도 됩니다. 
  Next.js가 자동으로 robots.ts를 기반으로 적절한 robots.txt를 생성합니다.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
      },
    ],
    sitemap: 'https://badminton-club-community.vercel.app/sitemap.xml',
    host: 'https://badminton-club-community.vercel.app',
  };
}
