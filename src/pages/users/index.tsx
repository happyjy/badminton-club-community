import { useEffect, useState } from 'react';
import { User } from '@/types';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users');
        const result = await response.json();

        if (!response.ok) throw new Error(result.data.error);

        setUsers(result.data.users);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : '사용자 데이터를 불러오는데 실패했습니다'
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-500 bg-red-50 p-4 rounded-lg">{error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">사용자 목록</h1>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {users.length > 0 ? (
          users.map((user) => (
            <div
              key={user.id}
              className="p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow"
            >
              <h2 className="font-semibold text-lg mb-2">
                {user.nickname || '이름 없음'}
              </h2>
              <p className="text-gray-600 text-sm mb-2">{user.email}</p>
              <p className="text-gray-500 text-xs">
                가입일: {new Date(user.createdAt).toLocaleDateString('ko-KR')}
              </p>
            </div>
          ))
        ) : (
          <p className="col-span-full text-center text-gray-500">
            등록된 사용자가 없습니다.
          </p>
        )}
      </div>
    </div>
  );
}
