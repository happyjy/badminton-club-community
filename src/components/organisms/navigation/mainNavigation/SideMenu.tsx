import Link from 'next/link';
import { useRouter } from 'next/router';
import { redirectToLogin } from '@/utils/auth';

interface SideMenuProps {
  isMenuOpen: boolean;
  isAuthenticated: boolean;
  //
  setIsMenuOpen: (isOpen: boolean) => void;
}

export default function SideMenu({
  isMenuOpen,
  isAuthenticated,
  //
  setIsMenuOpen,
}: SideMenuProps) {
  const router = useRouter();

  const onClickLink = () => {
    setIsMenuOpen(false);
  };

  const onClickLogin = () => {
    setIsMenuOpen(false);
    redirectToLogin(router);
  };

  const onClickLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (response.ok) {
        setIsMenuOpen(false);
        router.push('/');
      }
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  return (
    <>
      {/* 오버레이 */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={onClickLink}
        />
      )}

      {/* 사이드 메뉴 */}
      <div
        className={`fixed top-0 right-0 w-64 h-full bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-30 ${
          isMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">메뉴</h2>
            <button
              onClick={onClickLink}
              className="p-2 rounded-md hover:bg-gray-100"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div className="space-y-4">
            {isAuthenticated ? (
              <>
                <Link
                  href="/profile"
                  className="block px-4 py-2 text-gray-800 hover:bg-gray-100 rounded"
                  onClick={onClickLink}
                >
                  프로필
                </Link>
                <Link
                  href="/workouts"
                  className="block px-4 py-2 text-gray-800 hover:bg-gray-100 rounded"
                  onClick={onClickLink}
                >
                  내 운동 일정
                </Link>
                <Link
                  href="/clubs/guest/admin"
                  className="block px-4 py-2 text-gray-800 hover:bg-gray-100 rounded"
                  onClick={onClickLink}
                >
                  게스트 확인
                </Link>
                <button
                  onClick={onClickLogout}
                  className="w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 rounded"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <button
                onClick={onClickLogin}
                className="w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 rounded"
              >
                로그인
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
