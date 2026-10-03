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
        <div className="rounded-md bg-negative-soft p-4 text-negative">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="rounded-md bg-surface p-6">
        <h1 className="mb-4 text-title text-primary">API 응답:</h1>
        <p className="text-secondary">{message || '로딩 중...'}</p>
      </div>
    </div>
  );
}

export default withAuth(HelloPage);
