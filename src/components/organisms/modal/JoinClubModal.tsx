import { useState, useEffect } from 'react';
import { ClubJoinFormData } from '@/types/club.types';
import { User } from '@/types';
import { FormField } from '@/components/molecules/form/FormField';
import { Input } from '@/components/atoms/inputs/Input';
import { Select } from '@/components/atoms/inputs/Select';
import { Checkbox } from '@/components/atoms/inputs/Checkbox';
import { Button } from '@/components/atoms/buttons/Button';
import { PhoneInputGroup } from '@/components/molecules/form/PhoneInputGroup';

interface JoinClubModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: ClubJoinFormData) => void;
  isSubmitting?: boolean;
  isGuestApplication?: boolean;
}

const TOURNAMENT_LEVELS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
const DEFAULT_DATE = '1990-01-01';
const DEFAULT_VISIT_DATE = new Date().toISOString().split('T')[0];

const createInitialFormData = ({
  name = '',
  isGuestApplication = false,
}: {
  name?: string;
  isGuestApplication?: boolean;
}): ClubJoinFormData => ({
  name,
  birthDate: DEFAULT_DATE,
  phoneNumber: '',
  localTournamentLevel: '',
  nationalTournamentLevel: '',
  lessonPeriod: '',
  playingPeriod: '',
  ...(isGuestApplication && {
    intendToJoin: false,
    visitDate: DEFAULT_VISIT_DATE,
  }),
});

// todo: jyoon - join club modal과 guest modal 분리
// todo: jyoon - 'react-hook-form' 사용
function JoinClubModal({
  user,
  isOpen,
  onClose,
  onSubmit,
  isGuestApplication = false,
}: JoinClubModalProps) {
  const [formData, setFormData] = useState<ClubJoinFormData>(() =>
    createInitialFormData({
      name: user?.nickname || '',
      isGuestApplication,
    })
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
    const { name, value, type } = e.target as HTMLInputElement;

    if (type === 'checkbox') {
      setFormData((prev) => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!isOpen) return null;

  const tournamentLevelOptions = TOURNAMENT_LEVELS.map((level) => ({
    value: level,
    label: level,
  }));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          {isGuestApplication ? '게스트 신청' : '모임 가입 신청'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="이름" required>
            <Input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
          </FormField>

          {isGuestApplication && (
            <>
              <div className="flex items-center">
                <Checkbox
                  name="intendToJoin"
                  checked={formData.intendToJoin}
                  onChange={handleInputChange}
                />
                <span className="text-sm font-medium text-gray-700">
                  클럽 가입 의사
                </span>
              </div>

              <FormField label="방문 날짜" required>
                <Input
                  type="date"
                  name="visitDate"
                  value={formData.visitDate}
                  onChange={handleInputChange}
                  required
                />
              </FormField>
            </>
          )}

          <FormField label="생년월일" required>
            <Input
              type="date"
              name="birthDate"
              value={formData.birthDate}
              defaultValue={DEFAULT_DATE}
              onChange={handleInputChange}
              required
            />
          </FormField>

          <FormField label="전화번호" required>
            <PhoneInputGroup
              values={phoneNumbers}
              onChange={handlePhoneNumberChange}
              required
            />
          </FormField>

          <FormField label="구대회 신청 가능 급수" required>
            <Select
              name="localTournamentLevel"
              value={formData.localTournamentLevel}
              onChange={handleInputChange}
              options={tournamentLevelOptions}
              required
            />
          </FormField>

          <FormField label="전국대회 신청 가능 급수" required>
            <Select
              name="nationalTournamentLevel"
              value={formData.nationalTournamentLevel}
              onChange={handleInputChange}
              options={tournamentLevelOptions}
              required
            />
          </FormField>

          <FormField label="레슨 받은 기간" required>
            <Input
              type="text"
              name="lessonPeriod"
              value={formData.lessonPeriod}
              onChange={handleInputChange}
              placeholder="예: 6개월"
              required
            />
          </FormField>

          <FormField label="구력" required>
            <Input
              type="text"
              name="playingPeriod"
              value={formData.playingPeriod}
              onChange={handleInputChange}
              placeholder="예: 2년"
              required
            />
          </FormField>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" variant="primary">
              신청하기
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default JoinClubModal;
