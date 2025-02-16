import Image from 'next/image';
import { getKakaoCallbackUrl } from '@/constants/urls';

export default function LoginPage() {
  const handleKakaoLogin = () => {
    const currentHost = window.location.host;
    const redirectUri = getKakaoCallbackUrl(currentHost);
    const KAKAO_AUTH_URL = `https://kauth.kakao.com/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code`;
    window.location.href = KAKAO_AUTH_URL;
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md m-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">환영합니다</h1>
          <p className="text-gray-600">서비스 이용을 위해 로그인해주세요</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleKakaoLogin}
            className="w-full flex items-center justify-center gap-2 bg-[#FEE500] text-[#000000] py-3 rounded-lg hover:bg-[#FDD835] transition-colors"
          >
            <Image src="/kakao.svg" alt="Kakao Logo" width={20} height={20} />
            카카오톡으로 계속하기
          </button>

          {/* 추후 다른 소셜 로그인 버튼 추가 */}
          {/* <button
            disabled
            className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-400 py-3 rounded-lg cursor-not-allowed"
          >
            <Image src="/naver.svg" alt="Naver Logo" width={20} height={20} />
            네이버로 계속하기 (준비중)
          </button>

          <button
            disabled
            className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-400 py-3 rounded-lg cursor-not-allowed"
          >
            <Image src="/google.svg" alt="Google Logo" width={20} height={20} />
            구글로 계속하기 (준비중)
          </button> */}
        </div>
      </div>
    </main>
  );
}
