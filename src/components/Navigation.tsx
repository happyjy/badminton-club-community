import { useRouter } from 'next/router';

export default function Navigation() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '로그아웃 처리 중 오류가 발생했습니다');
      }

      router.push('/');
    } catch (error) {
      console.error('로그아웃 오류:', error);
      alert(
        error instanceof Error
          ? error.message
          : '로그아웃 처리 중 오류가 발생했습니다'
      );
    }
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-bold">당산 클럽</h1>
          </div>
          <div className="flex items-center">
            <button
              onClick={handleLogout}
              className="ml-4 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
