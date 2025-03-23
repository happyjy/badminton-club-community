import { FormEvent, useState } from 'react';

import { Button } from '@/components/atoms/buttons/Button';
import { Checkbox } from '@/components/atoms/inputs/Checkbox';
import { Input } from '@/components/atoms/inputs/Input';
import { Select } from '@/components/atoms/inputs/Select';
import { FormField } from '@/components/molecules/form/FormField';
import { PhoneInputGroup } from '@/components/molecules/form/PhoneInputGroup';
import { useClubJoinForm } from '@/hooks/useClubJoinForm';
import { User } from '@/types';
import { ClubJoinFormData } from '@/types/club.types';
import { TOURNAMENT_LEVELS, DEFAULT_DATE } from '@/utils/clubForms';

import PrivacyModal from './PrivacyModal';

interface JoinClubModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: ClubJoinFormData) => void;
  isSubmitting?: boolean;
  isGuestApplication?: boolean;
  initialValues?: Partial<ClubJoinFormData>;
}

// todo: jyoon - join club modal과 guest modal 분리
// todo: jyoon - 'react-hook-form' 사용

// 사용 범위: 회원가입, 게스트 신규 신청, 게스트 수정
function JoinClubModal({
  user,
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
  isGuestApplication = false,
  initialValues,
}: JoinClubModalProps) {
  const {
    formData,
    phoneNumbers,
    onChangePhoneNumber,
    onChangeInput,
    //
    initialFormData,
  } = useClubJoinForm(user, isGuestApplication, initialValues);

  // 개인정보 수집 및 이용 동의 모달
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  const onSubmitJoinClubModal = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    initialFormData(); // form 초기화
  };

  if (!isOpen) return null;

  const tournamentLevelOptions = TOURNAMENT_LEVELS.map((level) => ({
    value: level,
    label: level,
  }));

  // 조건부 렌더링 로직을 변수로 추출
  const modalTitle = isGuestApplication
    ? initialValues
      ? '게스트 신청 수정'
      : '게스트 신청'
    : '모임 가입 신청';
  const submitButtonText = initialValues ? '수정하기' : '신청하기';
  // 게스트 신규 신청(게스트 수정이 아닌 경우)
  const isNewGuestApplication = isGuestApplication && !initialValues;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">{modalTitle}</h2>
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

          <FormField label="성별" required>
            <div className="flex space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="gender"
                  value="남성"
                  checked={formData.gender === '남성'}
                  onChange={onChangeInput}
                  className="h-4 w-4 text-blue-600"
                  required
                />
                <span className="ml-2 text-gray-700">남성</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="gender"
                  value="여성"
                  checked={formData.gender === '여성'}
                  onChange={onChangeInput}
                  className="h-4 w-4 text-blue-600"
                />
                <span className="ml-2 text-gray-700">여성</span>
              </label>
            </div>
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
            <FormField label="가입 문의">
              <textarea
                name="message"
                value={formData.message || ''}
                onChange={onChangeInput}
                placeholder="클럽에 전달할 메시지나 문의사항을 입력해주세요"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
              />
            </FormField>
          )}

          {/* 개인정보 수집 및 이용 동의 - 게스트 신청시에만 표시 (수정시에는 표시 안함) */}
          {isNewGuestApplication && (
            <div className="mt-4">
              <div className="flex items-center">
                <Checkbox
                  name="privacyAgreement"
                  checked={formData.privacyAgreement || false}
                  onChange={onChangeInput}
                  required
                />
                <div className="ml-2">
                  <span className="text-sm font-medium text-gray-700">
                    개인정보 수집 및 이용에 동의합니다.
                    <span className="text-red-500">*</span>
                  </span>
                  <button
                    type="button"
                    className="ml-2 text-sm text-blue-600 underline"
                    onClick={() => setIsPrivacyModalOpen(true)}
                  >
                    내용 보기
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              취소
            </Button>
            <Button
              type="submit"
              variant="primary"
              pending={isSubmitting}
              disabled={isSubmitting}
            >
              {submitButtonText}
            </Button>
          </div>
        </form>
      </div>

      {/* 개인정보 수집 및 이용 동의 모달 */}
      <PrivacyModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
      />
    </div>
  );
}

export default JoinClubModal;
