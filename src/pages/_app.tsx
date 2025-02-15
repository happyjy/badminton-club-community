import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import Layout from '@/components/Layout';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const isLoginPage = router.pathname === '/';

  return (
    <>
      <Head>
        <meta charSet="utf-8" />
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
      </Head>

      {isLoginPage ? (
        <Component {...pageProps} />
      ) : (
        <Layout>
          <Component {...pageProps} />
        </Layout>
      )}
    </>
  );
}
