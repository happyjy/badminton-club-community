import { NextRouter } from 'next/router';

import { getKakaoCallbackUrl } from '@/constants/urls';
import '@/types/kakao.types';

// 클라이언트 사이드에서만 실행되는지 확인하는 함수
const isClient = () => typeof window !== 'undefined';

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

    try {
      window.Kakao.Auth.authorize({
        redirectUri,
        state: encodeURIComponent(state),
      });
    } catch (error) {
      console.error('카카오 로그인 실패:', error);
    }
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
