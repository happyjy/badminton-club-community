import { useState } from 'react';
import { withAuth } from '@/lib/withAuth';
import { User } from '@/types';
import Image from 'next/image';

interface ProfilePageProps {
  user: User;
}

function ProfilePage({ user }: ProfilePageProps) {
  const [formData, setFormData] = useState({
    nickname: user?.nickname || '',
    email: user?.email || '',
    thumbnailImageUrl: user?.thumbnailImageUrl || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('프로필 업데이트에 실패했습니다');
      }

      alert('프로필이 성공적으로 업데이트되었습니다');
    } catch (error) {
      console.error('프로필 업데이트 오류:', error);
      alert('프로필 업데이트 중 오류가 발생했습니다');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">회원 정보</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex justify-center mb-6">
          {formData.thumbnailImageUrl && (
            <Image
              src={formData.thumbnailImageUrl}
              alt="프로필 이미지"
              width={100}
              height={100}
              className="rounded-full"
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            닉네임
          </label>
          <input
            type="text"
            value={formData.nickname}
            onChange={(e) =>
              setFormData({ ...formData, nickname: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            이메일
          </label>
          <input
            type="email"
            value={formData.email || ''}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
          />
          <p className="mt-1 text-sm text-gray-500">
            이메일은 카카오 계정과 연동되어 있어 변경할 수 없습니다
          </p>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            저장하기
          </button>
        </div>
      </form>
    </div>
  );
}

export default withAuth(ProfilePage);
