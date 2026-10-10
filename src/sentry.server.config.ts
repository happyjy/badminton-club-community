import * as Sentry from '@sentry/nextjs';

import { IGNORED_ERRORS, scrubEvent } from '@/lib/monitoring/scrubEvent';

// Vercel의 Sentry 연동은 NEXT_PUBLIC_SENTRY_DSN으로 넣어 주므로 둘 다 읽는다.
const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

// DSN이 없으면 초기화하지 않는다. 로컬과 CI에서는 아무것도 보내지 않는다.
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    integrations: (defaults) => [
      // 세션 통계를 끈다. 켜 두면 에러가 없어도 요청마다 외부로 전송이 나간다.
      ...defaults.filter(
        (integration) =>
          integration.name !== 'Http' && integration.name !== 'ProcessSession'
      ),
      Sentry.httpIntegration({
        disableIncomingRequestSpans: true,
        sessions: false,
      }),
      // API 핸들러는 에러를 직접 잡아 console.error로 남기고 500을 돌려준다.
      // 핸들러를 하나씩 고치지 않고 그 로그를 그대로 에러로 보고한다.
      Sentry.captureConsoleIntegration({ levels: ['error'] }),
    ],
    // 에러 직전의 console.log가 함께 실려 간다. SMS 요청 헤더·본문을 찍는 곳이 있어 끈다.
    maxBreadcrumbs: 0,
    // 걸러낸 이벤트 수를 따로 보고하지 않는다. 에러가 없으면 전송도 없게 한다.
    sendClientReports: false,
    ignoreErrors: IGNORED_ERRORS,
    // 쿠키·요청 본문·IP·쿼리·지역 변수에는 회원 정보가 들어 있다. 수집하지 않는다.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: { request: false, response: false },
      httpBodies: [],
      urlQueryParams: false,
      databaseQueryData: false,
      stackFrameVariables: false,
    },
    beforeSend: scrubEvent,
  });
}
