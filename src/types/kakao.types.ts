// Kakao SDK 타입 정의
declare global {
  interface Window {
    Kakao: {
      init: (appKey: string) => boolean;
      isInitialized: () => boolean;
      Auth: {
        authorize: (settings: { redirectUri: string; state: string }) => void;
      };
    };
  }
}

// 카카오 인터페이스 정의 내보내기
export interface KakaoSDK {
  init: (appKey: string) => boolean;
  isInitialized: () => boolean;
  Auth: {
    authorize: (settings: { redirectUri: string }) => void;
  };
}
