import Image from 'next/image';
import { useRouter } from 'next/router';

import { getKakaoCallbackUrl } from '@/constants/urls';
import kakaoLoginLargeWideIcon from '@/icon/kakao_login_large_wide.png';
import '@/types/kakao.types';
import { KakaoAuth } from '@/utils/auth';

export default function LoginPage() {
  const router = useRouter();
  const { returnUrl } = router.query;

  const onClickKakaoAppLogin = () => {
    KakaoAuth.login(router);
  };

  const onClickKakaoAccountLogin = () => {
    const currentHost = window.location.host;
    const redirectUri = getKakaoCallbackUrl(currentHost);
    const state = returnUrl ? returnUrl.toString() : '/clubs';

    const KAKAO_AUTH_URL = `https://kauth.kakao.com/oauth/authorize?client_id=${
      process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID
    }&redirect_uri=${redirectUri}&response_type=code&state=${encodeURIComponent(state)}`;

    window.location.href = KAKAO_AUTH_URL;
  };

  return (
    <div className="flex min-h-[80dvh] items-center justify-center">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div>
          <h1 className="text-large-title text-primary">환영합니다</h1>
          <p className="mt-2 text-body text-secondary">
            서비스 이용을 위해 로그인해주세요
          </p>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={onClickKakaoAppLogin}
            className="flex w-full items-center justify-center transition-opacity duration-150 active:opacity-70"
          >
            <Image src={kakaoLoginLargeWideIcon} alt="카카오 로그인" />
          </button>

          {/* 카카오 버튼은 카카오의 브랜드 색을 그대로 쓴다. */}
          <button
            type="button"
            onClick={onClickKakaoAccountLogin}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-kakao text-body font-semibold text-primary transition-opacity duration-150 active:opacity-70"
          >
            <Image src="/kakao.svg" alt="" width={20} height={20} />
            카카오 계정으로 계속하기
          </button>
        </div>
      </div>
    </div>
  );
}
