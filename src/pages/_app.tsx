import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import Layout from '@/components/Layout';
import Head from 'next/head';
import { Provider } from 'react-redux';
import { store } from '@/store';

export default function App({ Component, pageProps }: AppProps) {
  return (
    // redux설정4: Provider 설정
    <Provider store={store}>
      <Head>
        <meta charSet="utf-8" />
        <meta
          name="google-site-verification"
          content="bTqFYbHTfK1wiMqYL3xztX9fmwDIPlxSNi5-VIzuiYs"
        />
        w
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
          href="/icon/badmintonShuttleCock.svg"
        />
        <link rel="alternate icon" href="/favicon.ico" />
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4694803443368514"
          crossOrigin="anonymous"
        />
        <title>배드민턴 클럽</title>
      </Head>

      {/* {isLoginPage ? (
        <Component {...pageProps} />
      ) : (
        <Layout>
          <Component {...pageProps} />
        </Layout>
        )} */}
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </Provider>
  );
}
