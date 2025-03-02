import { useState, useEffect } from 'react';
import { withAuth } from '@/lib/withAuth';
import { User } from '@/types';
import Image from 'next/image';

interface ProfilePageProps {
  user: User | null;
}

interface ExtendedFormData {
  nickname: string;
  email: string;
  thumbnailImageUrl: string;
  name?: string;
  birthDate?: string;
  phoneNumber?: string;
  localTournamentLevel?: string;
  nationalTournamentLevel?: string;
  lessonPeriod?: string;
  playingPeriod?: string;
}

const TOURNAMENT_LEVELS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

function ProfilePage({ user }: ProfilePageProps) {
  const [formData, setFormData] = useState<ExtendedFormData>({
    nickname: user?.nickname || '',
    email: user?.email || '',
    thumbnailImageUrl: user?.thumbnailImageUrl || '',
  });
  const [phoneNumbers, setPhoneNumbers] = useState({
    first: '',
    second: '',
    third: '',
  });

  useEffect(() => {
    const fetchMemberInfo = async () => {
      try {
        const response = await fetch('/api/users/me/member-info');
        if (!response.ok)
          throw new Error('회원 정보를 불러오는데 실패했습니다');

        const data = await response.json();
        const memberInfo = data.data.memberInfo;

        if (memberInfo) {
          setFormData((prev) => ({
            ...prev,
            name: memberInfo.name,
            birthDate: memberInfo.birthDate,
            phoneNumber: memberInfo.phoneNumber,
            localTournamentLevel: memberInfo.localTournamentLevel,
            nationalTournamentLevel: memberInfo.nationalTournamentLevel,
            lessonPeriod: memberInfo.lessonPeriod,
            playingPeriod: memberInfo.playingPeriod,
          }));

          // 전화번호 파싱
          const [first, second, third] = memberInfo.phoneNumber.split('-');
          setPhoneNumbers({ first, second, third });
        }
      } catch (error) {
        console.error('회원 정보 조회 오류:', error);
      }
    };

    fetchMemberInfo();
  }, []);

  const onChangePhoneNumber = (
    e: React.ChangeEvent<HTMLInputElement>,
    part: 'first' | 'second' | 'third'
  ) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    const maxLength = part === 'first' ? 3 : 4;

    if (value.length > maxLength) return;

    setPhoneNumbers((prev) => ({
      ...prev,
      [part]: value,
    }));

    const fullPhoneNumber = `${part === 'first' ? value : phoneNumbers.first}-${
      part === 'second' ? value : phoneNumbers.second
    }-${part === 'third' ? value : phoneNumbers.third}`;

    setFormData((prev) => ({
      ...prev,
      phoneNumber: fullPhoneNumber,
    }));
  };

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

        {/* <div>
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
        </div> */}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            이메일
          </label>
          <input
            type="email"
            value={formData.email}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
          />
          <p className="mt-1 text-sm text-gray-500">
            이메일은 카카오 계정과 연동되어 있어 변경할 수 없습니다
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            이름
          </label>
          <input
            type="text"
            value={formData.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            생년월일
          </label>
          <input
            type="date"
            value={formData.birthDate || ''}
            onChange={(e) =>
              setFormData({ ...formData, birthDate: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            전화번호
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={phoneNumbers.first}
              onChange={(e) => onChangePhoneNumber(e, 'first')}
              maxLength={3}
              placeholder="010"
              className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
            />
            <span className="flex items-center">-</span>
            <input
              type="text"
              value={phoneNumbers.second}
              onChange={(e) => onChangePhoneNumber(e, 'second')}
              maxLength={4}
              placeholder="0000"
              className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
            />
            <span className="flex items-center">-</span>
            <input
              type="text"
              value={phoneNumbers.third}
              onChange={(e) => onChangePhoneNumber(e, 'third')}
              maxLength={4}
              placeholder="0000"
              className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            구대회 신청 가능 급수
          </label>
          <select
            value={formData.localTournamentLevel || ''}
            onChange={(e) =>
              setFormData({ ...formData, localTournamentLevel: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">선택해주세요</option>
            {TOURNAMENT_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            전국대회 신청 가능 급수
          </label>
          <select
            value={formData.nationalTournamentLevel || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                nationalTournamentLevel: e.target.value,
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">선택해주세요</option>
            {TOURNAMENT_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            레슨 받은 기간
          </label>
          <input
            type="text"
            value={formData.lessonPeriod || ''}
            onChange={(e) =>
              setFormData({ ...formData, lessonPeriod: e.target.value })
            }
            placeholder="예: 6개월"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            구력
          </label>
          <input
            type="text"
            value={formData.playingPeriod || ''}
            onChange={(e) =>
              setFormData({ ...formData, playingPeriod: e.target.value })
            }
            placeholder="예: 2년"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
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
