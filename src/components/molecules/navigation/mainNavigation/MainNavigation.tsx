import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import SideMenu from './SideMenu';

export default function MainNavigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const currClub = useSelector((state: RootState) => state.club.currentClub);

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

  return (
    <>
      <nav className="bg-white shadow-md w-full top-0 z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-14">
            <div className="flex items-center">
              <Link href="/clubs">
                <h1 className="text-xl font-bold cursor-pointer hover:text-gray-700">
                  배드민턴 클럽
                </h1>
              </Link>
              <Link href={`/clubs/${currClub.id}`}>
                <h2 className="text-lg font-bold cursor-pointer hover:text-gray-700">
                  {currClub && (
                    <span className="ml-2 text-gray-600"> {currClub.name}</span>
                  )}
                </h2>
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

      <SideMenu
        isMenuOpen={isMenuOpen}
        isAuthenticated={isAuthenticated}
        //
        setIsMenuOpen={setIsMenuOpen}
      />
    </>
  );
}
