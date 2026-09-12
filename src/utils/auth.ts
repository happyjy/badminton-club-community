import { NextRouter } from 'next/router';

import { getKakaoCallbackUrl } from '@/constants/urls';
import '@/types/kakao.types';

// 클라이언트 사이드에서만 실행되는지 확인하는 함수
const isClient = () => typeof window !== 'undefined';

// SDK 도착을 기다리는 중인지. withAuth가 리렌더링마다 login을 부르므로,
// 이 표시가 없으면 대기 리스너가 쌓여 로그인이 여러 번 시작된다.
let isWaitingForSdk = false;

/**
 * 카카오 인증 관련 기능을 제공하는 네임스페이스
 */
export const KakaoAuth = {
  /**
   * 카카오 SDK를 초기화하는 함수
   * 클라이언트 사이드에서만 실행됨
   */
  initialize(): boolean {
    // 클라이언트 사이드에서만 실행
    if (!isClient()) return false;

    const appKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
    if (!appKey) {
      console.error('카카오 자바스크립트 키가 제공되지 않았습니다.');
      return false;
    }

    if (window.Kakao && !window.Kakao.isInitialized()) {
      try {
        window.Kakao.init(appKey);
        console.log('카카오 SDK 초기화 성공');
        return true;
      } catch (error) {
        console.error('카카오 초기화 실패:', error);
        return false;
      }
    }

    return window.Kakao?.isInitialized() || false;
  },

  /**
   * 카카오 SDK를 사용하여 로그인을 시작하는 함수
   * @param router Next.js 라우터 객체
   */
  login(router: NextRouter): void {
    // 서버 사이드에서 실행되는 경우 리턴
    if (!isClient()) return;

    const currentHost = window.location.host;
    const redirectUri = getKakaoCallbackUrl(currentHost);
    const returnUrl = router.asPath;
    const state = returnUrl ? returnUrl.toString() : '/clubs';

    const authorize = () => {
      // 초기화 전에는 authorize가 동작하지 않으므로 먼저 초기화한다.
      KakaoAuth.initialize();

      // load 이벤트를 받고 들어와도 SDK가 없을 수 있다(스크립트 오류 등).
      if (!window.Kakao?.Auth) {
        console.error('카카오 SDK를 불러오지 못했습니다.');
        return;
      }

      try {
        window.Kakao.Auth.authorize({
          redirectUri,
          state: encodeURIComponent(state),
        });
      } catch (error) {
        console.error('카카오 로그인 실패:', error);
      }
    };

    // SDK는 async로 불러오므로 로그인을 시작할 때 아직 없을 수 있다.
    // 특히 로그인하지 않은 사용자가 첫 접속에서 곧바로 이 경로를 탄다.
    // 그대로 window.Kakao.Auth를 읽으면 화면 전체가 깨진다.
    if (window.Kakao?.Auth) {
      authorize();
      return;
    }

    // 이미 기다리는 중이면 리스너를 더 달지 않는다.
    if (isWaitingForSdk) return;

    const script = document.querySelector<HTMLScriptElement>(
      'script[src*="kakao.min.js"]'
    );

    if (!script) {
      console.error('카카오 SDK 스크립트를 찾을 수 없습니다.');
      return;
    }

    // 도착을 기다렸다가 이어서 로그인한다.
    isWaitingForSdk = true;
    script.addEventListener(
      'load',
      () => {
        isWaitingForSdk = false;
        authorize();
      },
      { once: true }
    );
  },

  /**
   * URL 리다이렉트 방식으로 카카오 로그인을 시작하는 함수
   * @param router Next.js 라우터 객체
   */
  redirectLogin(router: NextRouter): void {
    if (!isClient()) return;

    const currentHost = window.location.host;
    const redirectUri = getKakaoCallbackUrl(currentHost);
    const returnUrl = router.asPath;

    // replace를 사용하여 히스토리에 로그인 페이지가 남지 않도록 함
    window.location.replace(
      `https://kauth.kakao.com/oauth/authorize?client_id=${
        process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID
      }&redirect_uri=${redirectUri}&response_type=code&state=${encodeURIComponent(
        returnUrl
      )}`
    );
  },
};
