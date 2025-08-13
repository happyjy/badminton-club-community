import '@/styles/globals.css';
import { useEffect } from 'react';

import type { AppProps } from 'next/app';
import Head from 'next/head';

// import LocatorProvider from '@/components/LocatorProvider';
import { GoogleAnalytics } from '@next/third-parties/google';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { Provider } from 'react-redux';

import { Layout } from '@/components/templates/Layout';

import { queryClient } from '@/lib/react-query';
import { store } from '@/store';
import { KakaoAuth } from '@/utils/auth';
import '@/types/kakao.types';
// import setupLocatorUI from '@locator/runtime';

// if (process.env.NODE_ENV === 'development') {
//   setupLocatorUI();
// }

export default function App({ Component, pageProps }: AppProps) {
  // 카카오 SDK 초기화
  useEffect(() => {
    // 스크립트 로드 상태 확인
    if (typeof window !== 'undefined') {
      if (window.Kakao) {
        KakaoAuth.initialize();
      } else {
        // SDK가 아직 로드되지 않은 경우 이벤트 리스너 추가
        const script = document.querySelector('script[src*="kakao.min.js"]');
        if (script) {
          script.addEventListener('load', KakaoAuth.initialize);
        }
      }
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <Head>
          <meta charSet="utf-8" />
          <meta
            name="google-site-verification"
            content="bTqFYbHTfK1wiMqYL3xztX9fmwDIPlxSNi5-VIzuiYs"
          />
          <meta name="robots" content="index, follow" />
          {/* 
            * 기본 메타 태그:
              - charset: 문자 인코딩 설정
              - viewport: 모바일 반응형 설정
              - description: 사이트 설명
              - keywords: 검색 키워드
            * Open Graph 메타 태그:
              - og:type: 웹사이트 타입
              - og:title: 사이트 제목
              - og:description: 사이트 설명
              - og:site_name: 사이트 이름
            * 파비콘 링크
              - 참고: 페이지별로 다른 메타 태그가 필요한 경우에는 Next.js의 next/head 컴포넌트를 사용하여 각 페이지 컴포넌트에서 개별적으로 메타 태그를 설정할 수 있습니다. 
          */}
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1, viewport-fit=cover"
          />
          <meta
            name="naver-site-verification"
            content="29734e86be07123ad88ad167d74e1e97e519a3c0"
          />
          <meta
            name="description"
            content="배드민턴 동호회 관리 서비스입니다. 클럽을 만들고 운동 일정을 관리해보세요."
          />
          <meta
            name="keywords"
            content="당산클럽, 당산 클럽, 당산 배드민턴 클럽, 배드민턴, 동호회, 클럽, 운동, 일정관리"
          />
          <meta property="og:type" content="website" />
          <meta property="og:title" content="배드민턴 클럽" />
          <meta
            property="og:description"
            content="배드민턴 동호회 관리 서비스입니다. 클럽을 만들고 운동 일정을 관리해보세요."
          />
          <meta property="og:site_name" content="배드민턴 클럽" />
          <link
            rel="icon"
            type="image/svg+xml"
            href="/badmintonShuttleCock.svg"
          />
          <link rel="alternate icon" href="/favicon.ico" />
          <script
            async
            src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4694803443368514"
            crossOrigin="anonymous"
          />
          <script
            async
            src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js"
            crossOrigin="anonymous"
          />

          <title>배드민턴 클럽</title>
        </Head>

        {/* http://locatorjs.com/ - 웹 화면의 컴포넌트를 클릭하면 해당 컴포넌트의 소스 코드 파일을 바로 IDE에서 열어줌 */}
        {/* <LocatorProvider> */}
        <Layout>
          <Component {...pageProps} />
        </Layout>
        {/* </LocatorProvider> */}
        <Toaster
          position={
            // 640: tailwind의 sm 브레이크 포인트 기준
            typeof window !== 'undefined' && window.innerWidth < 640
              ? 'bottom-center' // 모바일에서는 하단 중앙
              : 'top-right' // 데스크탑에서는 우측 상단
          }
        />
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID || ''} />
      </Provider>
    </QueryClientProvider>
  );
}
