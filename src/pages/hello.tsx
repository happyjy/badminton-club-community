// pages/hello.tsx
import { useEffect, useState } from 'react';

import { withAuth } from '@/lib/withAuth';
import { ApiResponse } from '@/types';

interface HelloResponse {
  message: string;
}

function HelloPage() {
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/hello')
      .then((response) => response.json())
      .then((data: ApiResponse<'message', HelloResponse>) => {
        if ('error' in data) {
          throw new Error(data.error);
        }
        setMessage(data.message);
      })
      .catch((error) => {
        console.error('Error fetching API:', error);
        setError(
          error instanceof Error
            ? error.message
            : '알 수 없는 오류가 발생했습니다'
        );
      });
  }, []);

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-500 bg-red-50 p-4 rounded-lg">{error}</div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4">API 응답:</h1>
        <p className="text-gray-600">{message || '로딩 중...'}</p>
      </div>
    </div>
  );
}

export default withAuth(HelloPage);
