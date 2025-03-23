import { NextRouter } from 'next/router';

import { getKakaoCallbackUrl } from '@/constants/urls';

// 클라이언트 사이드에서만 실행되는지 확인하는 함수
const isClient = () => typeof window !== 'undefined';

export const redirectToLogin = (router: NextRouter) => {
  // 서버 사이드에서 실행되는 경우 일찍 리턴
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
};
