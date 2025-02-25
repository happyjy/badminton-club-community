import { useState, useEffect } from 'react';
import { ClubJoinFormData } from '@/types/club.types';
import { User } from '@/types';

interface JoinClubModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: ClubJoinFormData) => void;
}

const TOURNAMENT_LEVELS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
const DEFAULT_DATE = '1990-01-01';

const createInitialFormData = ({
  name = '',
}: {
  [key in keyof ClubJoinFormData]?: ClubJoinFormData[key];
}): ClubJoinFormData => ({
  name,
  birthDate: DEFAULT_DATE,
  phoneNumber: '',
  localTournamentLevel: '',
  nationalTournamentLevel: '',
  lessonPeriod: '',
  playingPeriod: '',
});

export function JoinClubModal({
  user,
  isOpen,
  onClose,
  onSubmit,
}: JoinClubModalProps) {
  const [formData, setFormData] = useState<ClubJoinFormData>(() =>
    createInitialFormData({ name: user?.nickname || '' })
  );

  const [phoneNumbers, setPhoneNumbers] = useState({
    first: '',
    second: '',
    third: '',
  });

  useEffect(() => {
    if (user?.nickname) {
      setFormData((prev) => ({
        ...prev,
        name: user.nickname,
      }));
    }
  }, [user?.nickname]);

  const handlePhoneNumberChange = (
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

    if (value.length === maxLength) {
      const nextInput = {
        first: 'second',
        second: 'third',
        third: 'third',
      }[part];

      const nextElement = document.getElementById(`phone-${nextInput}`);
      nextElement?.focus();
    }

    const fullPhoneNumber = `${part === 'first' ? value : phoneNumbers.first}-${
      part === 'second' ? value : phoneNumbers.second
    }-${part === 'third' ? value : phoneNumbers.third}`;

    setFormData((prev) => ({
      ...prev,
      phoneNumber: fullPhoneNumber,
    }));
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">모임 가입 신청</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              이름
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              생년월일
            </label>
            <input
              type="date"
              name="birthDate"
              value={formData.birthDate}
              defaultValue={DEFAULT_DATE}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              전화번호
            </label>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                id="phone-first"
                value={phoneNumbers.first}
                onChange={(e) => handlePhoneNumberChange(e, 'first')}
                maxLength={3}
                placeholder="010"
                className="block w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-center"
                required
              />
              <span className="flex items-center">-</span>
              <input
                type="text"
                id="phone-second"
                value={phoneNumbers.second}
                onChange={(e) => handlePhoneNumberChange(e, 'second')}
                maxLength={4}
                placeholder="0000"
                className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-center"
                required
              />
              <span className="flex items-center">-</span>
              <input
                type="text"
                id="phone-third"
                value={phoneNumbers.third}
                onChange={(e) => handlePhoneNumberChange(e, 'third')}
                maxLength={4}
                placeholder="0000"
                className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-center"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              구대회 신청 가능 급수
            </label>
            <select
              name="localTournamentLevel"
              value={formData.localTournamentLevel}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
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
            <label className="block text-sm font-medium text-gray-700">
              전국대회 신청 가능 급수
            </label>
            <select
              name="nationalTournamentLevel"
              value={formData.nationalTournamentLevel}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
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
            <label className="block text-sm font-medium text-gray-700">
              레슨 받은 기간
            </label>
            <input
              type="text"
              name="lessonPeriod"
              value={formData.lessonPeriod}
              onChange={handleInputChange}
              placeholder="예: 6개월"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              구력
            </label>
            <input
              type="text"
              name="playingPeriod"
              value={formData.playingPeriod}
              onChange={handleInputChange}
              placeholder="예: 2년"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600"
            >
              신청하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
