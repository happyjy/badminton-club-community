// Kakao SDK 타입 정의
declare global {
  interface Window {
    // SDK는 async 스크립트로 들어오므로 아직 없을 수 있다.
    // 반드시 있다고 선언하면 로드 전에 접근하는 코드를 타입 검사가 놓친다.
    Kakao?: {
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
