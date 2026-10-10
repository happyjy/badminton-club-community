import * as Sentry from '@sentry/nextjs';

// 서버가 뜰 때 한 번 실행된다. 에러 모니터링은 서버(API·페이지 렌더링)에만 붙인다.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
}

// getServerSideProps 등 페이지 렌더링에서 잡히지 않은 에러를 보고한다.
export const onRequestError = Sentry.captureRequestError;
