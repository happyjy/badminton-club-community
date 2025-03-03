import { useClubJoinForm } from '@/hooks/useClubJoinForm';
import { ClubJoinFormData } from '@/types/club.types';
import { User } from '@/types';
import { FormField } from '@/components/molecules/form/FormField';
import { Input } from '@/components/atoms/inputs/Input';
import { Select } from '@/components/atoms/inputs/Select';
import { Checkbox } from '@/components/atoms/inputs/Checkbox';
import { Button } from '@/components/atoms/buttons/Button';
import { PhoneInputGroup } from '@/components/molecules/form/PhoneInputGroup';
import { TOURNAMENT_LEVELS, DEFAULT_DATE } from '@/utils/clubForms';

interface JoinClubModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: ClubJoinFormData) => void;
  isSubmitting?: boolean;
  isGuestApplication?: boolean;
}

// todo: jyoon - join club modal과 guest modal 분리
// todo: jyoon - 'react-hook-form' 사용
function JoinClubModal({
  user,
  isOpen,
  onClose,
  onSubmit,
  isGuestApplication = false,
}: JoinClubModalProps) {
  const {
    formData,
    phoneNumbers,
    onChangePhoneNumber,
    onChangeInput,
    //
    initialFormData,
  } = useClubJoinForm(user, isGuestApplication);

  const onSubmitJoinClubModal = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    initialFormData(); // form 초기화
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
        <form onSubmit={onSubmitJoinClubModal} className="space-y-4">
          <FormField label="이름" required>
            <Input
              type="text"
              name="name"
              value={formData.name}
              onChange={onChangeInput}
              required
            />
          </FormField>

          {isGuestApplication && (
            <>
              <div className="flex items-center">
                <Checkbox
                  name="intendToJoin"
                  checked={formData.intendToJoin}
                  onChange={onChangeInput}
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
                  onChange={onChangeInput}
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
              onChange={onChangeInput}
              required
            />
          </FormField>

          <FormField label="전화번호" required>
            <PhoneInputGroup
              values={phoneNumbers}
              onChange={onChangePhoneNumber}
              required
            />
          </FormField>

          <FormField label="구대회 신청 가능 급수" required>
            <Select
              name="localTournamentLevel"
              value={formData.localTournamentLevel}
              onChange={onChangeInput}
              options={tournamentLevelOptions}
              required
            />
          </FormField>

          <FormField label="전국대회 신청 가능 급수" required>
            <Select
              name="nationalTournamentLevel"
              value={formData.nationalTournamentLevel}
              onChange={onChangeInput}
              options={tournamentLevelOptions}
              required
            />
          </FormField>

          <FormField label="레슨 받은 기간" required>
            <Input
              type="text"
              name="lessonPeriod"
              value={formData.lessonPeriod}
              onChange={onChangeInput}
              placeholder="예: 6개월"
              required
            />
          </FormField>

          <FormField label="구력" required>
            <Input
              type="text"
              name="playingPeriod"
              value={formData.playingPeriod}
              onChange={onChangeInput}
              placeholder="예: 2년"
              required
            />
          </FormField>

          {isGuestApplication && (
            <>
              <FormField label="가입 문의">
                <textarea
                  name="message"
                  value={formData.message || ''}
                  onChange={onChangeInput}
                  placeholder="클럽에 전달할 메시지나 문의사항을 입력해주세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                />
              </FormField>
            </>
          )}

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
