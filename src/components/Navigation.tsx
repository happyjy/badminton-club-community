import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getKakaoCallbackUrl } from '@/constants/urls';

export default function Navigation() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // 인증 상태 확인 함수를 컴포넌트 레벨로 이동
  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/check');
      const result = await response.json();
      setIsAuthenticated(result.data.auth.isAuthenticated);
    } catch (error) {
      console.error('인증 상태 확인 실패:', error);
      setIsAuthenticated(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const handleLoginClick = () => {
    router.push('/auth/login');
    setIsMenuOpen(false);
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });
      console.log(`🚨 ~ handleLogout ~ response:`, response);

      if (response.ok) {
        setIsAuthenticated(false); // 로그아웃 성공 시 인증 상태 업데이트
        setIsMenuOpen(false);
        router.push('/');
      }
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  return (
    <>
      <nav className="bg-white shadow-md w-full top-0 z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/clubs">
                <h1 className="text-xl font-bold cursor-pointer hover:text-gray-700">
                  배드민턴 클럽
                </h1>
              </Link>
            </div>
            <button
              onClick={() => setIsMenuOpen(true)}
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
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* 오버레이 */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={() => setIsMenuOpen(false)}
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
              onClick={() => setIsMenuOpen(false)}
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
                  onClick={() => setIsMenuOpen(false)}
                >
                  프로필
                </Link>
                <Link
                  href="/workouts"
                  className="block px-4 py-2 text-gray-800 hover:bg-gray-100 rounded"
                  onClick={() => setIsMenuOpen(false)}
                >
                  내 운동 일정
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 rounded"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <button
                onClick={handleLoginClick}
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
