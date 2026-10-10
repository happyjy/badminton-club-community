import type { ErrorEvent } from '@sentry/nextjs';

// 만료되거나 서명이 맞지 않는 로그인 토큰은 다시 로그인하면 풀리는 정상 흐름이다.
// 알림에서 뺀다. JWT_SECRET 설정 오류는 이름이 Error라 그대로 보고된다.
export const IGNORED_ERRORS = [
  'TokenExpiredError',
  'JsonWebTokenError',
  'NotBeforeError',
];

/**
 * 외부로 보내기 전에 회원 정보가 담길 수 있는 부분을 지운다.
 * SDK의 수집 옵션이 바뀌어도 여기서 한 번 더 막는다.
 */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  // console.error('라벨', { guestName, smsRecipients })처럼 객체를 함께 찍는 곳이 있다.
  // 어느 핸들러인지 알려 주는 라벨 문자열만 남긴다.
  const args = event.extra?.arguments;
  if (Array.isArray(args)) {
    event.extra = {
      ...event.extra,
      arguments: args.filter((arg) => typeof arg === 'string'),
    };
  }

  delete event.user;
  delete event.breadcrumbs;

  // 쿠키·헤더·본문·쿼리는 버리고 어느 주소에서 났는지만 남긴다.
  if (event.request) {
    event.request = {
      method: event.request.method,
      url: event.request.url?.split('?')[0],
    };
  }

  return event;
}
