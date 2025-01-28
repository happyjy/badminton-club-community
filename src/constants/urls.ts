export const BASE_URL = {
  LOCAL: 'http://localhost:3000',
  NETWORK: 'http://192.168.219.104:3000',
};

export const AUTH_URLS = {
  KAKAO_CALLBACK: {
    LOCAL: `${BASE_URL.LOCAL}/api/auth/kakao/callback`,
    NETWORK: `${BASE_URL.NETWORK}/api/auth/kakao/callback`,
  },
  WORKOUTS: {
    LOCAL: `${BASE_URL.LOCAL}/workouts`,
    NETWORK: `${BASE_URL.NETWORK}/workouts`,
  },
};

export const getBaseUrl = (host: string | undefined | null) => {
  return host?.includes('localhost') ? BASE_URL.LOCAL : `http://${host}`;
};

export const getKakaoCallbackUrl = (host: string | undefined | null) => {
  return host?.includes('localhost')
    ? AUTH_URLS.KAKAO_CALLBACK.LOCAL
    : AUTH_URLS.KAKAO_CALLBACK.NETWORK;
};
