import { FormEvent, useState } from 'react';

import { useSelector } from 'react-redux';

import { Button } from '@/components/atoms/buttons/Button';
import { Checkbox } from '@/components/atoms/inputs/Checkbox';
import CustomDatePicker from '@/components/atoms/inputs/DatePicker';
import { Input } from '@/components/atoms/inputs/Input';
import { Select } from '@/components/atoms/inputs/Select';
import { FormField } from '@/components/molecules/form/FormField';
import { PhoneInputGroup } from '@/components/molecules/form/PhoneInputGroup';

import { useClubJoinForm } from '@/hooks/useClubJoinForm';

import { RootState } from '@/store';
import { getGuestPageStrategy } from '@/strategies/GuestPageStrategy';
import { User } from '@/types';
import { ClubJoinFormData } from '@/types/club.types';
import { TOURNAMENT_LEVELS } from '@/utils/clubForms';

import PhoneVerificationStep from '../forms/PhoneVerificationStep';

import PrivacyModal from './PrivacyModal';

interface PhoneVerificationStatus {
  isVerified: boolean;
  phoneNumber?: string;
  verifiedAt?: string;
  isPreviouslyVerified: boolean;
  canSkipVerification: boolean;
}

interface JoinClubModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: ClubJoinFormData) => void;
  isSubmitting?: boolean;
  isGuestApplication?: boolean;
  initialValues?: Partial<ClubJoinFormData>;
  // 전화번호 인증 관련 props
  // phone verification state
  phoneVerificationStatus?: PhoneVerificationStatus | null;
  phoneVerificationLoading?: boolean;
  phoneVerificationError?: string | null;
  // phone verification functions
  checkPhoneVerificationStatus?: () => Promise<void>;
  sendPhoneVerificationCode?: (
    phoneNumber: string,
    forceNewVerification?: boolean
  ) => Promise<any>;
  verifyPhoneCode?: (phoneNumber: string, code: string) => Promise<any>;
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
  // 전화번호 인증 관련 props
  // phone verification state
  phoneVerificationStatus,
  phoneVerificationLoading,
  phoneVerificationError,
  // phone verification functions
  checkPhoneVerificationStatus,
  sendPhoneVerificationCode,
  verifyPhoneCode,
}: JoinClubModalProps) {
  // 클럽 멤버 정보 가져오기
  const clubMember = useSelector((state: RootState) => state.auth.clubMember);
  // 사용자 유형에 따른 전략 적용
  const strategy = getGuestPageStrategy(!!clubMember);

  // 폼 데이터 관리 훅
  const {
    formData,
    phoneNumbers,
    onChangePhoneNumber,
    onChangeInput,
    //
    initialFormData,
  } = useClubJoinForm(user, isGuestApplication, initialValues, clubMember);

  // 개인정보 수집 및 이용 동의 모달
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  // 휴대폰 인증 관련 상태
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);

  // 전화번호 문자열 생성 함수
  const getFullPhoneNumber = () =>
    `${phoneNumbers.first}-${phoneNumbers.second}-${phoneNumbers.third}`;

  // 폼 제출 처리
  const onSubmitJoinClubModal = (e: FormEvent) => {
    e.preventDefault();

    // 전화번호가 입력되었는지 확인
    const currentPhoneNumber = getFullPhoneNumber();
    if (!currentPhoneNumber) {
      alert('전화번호를 입력해주세요.');
      return;
    }

    // 이미 인증된 전화번호인지 확인
    if (
      phoneVerificationStatus?.isVerified &&
      phoneVerificationStatus.phoneNumber === currentPhoneNumber
    ) {
      // 이미 인증된 전화번호라면 바로 제출
      onSubmit(formData);
      initialFormData();
      return;
    }

    // 인증이 필요하거나 다른 전화번호라면 인증 모달 표시
    setShowPhoneVerification(true);
  };

  // 인증 완료 처리
  const handleVerificationComplete = async () => {
    // 인증 상태 다시 확인
    if (checkPhoneVerificationStatus) {
      await checkPhoneVerificationStatus();
    }

    setShowPhoneVerification(false);

    // 인증 완료 후 폼 제출
    onSubmit(formData);
    initialFormData();
  };

  // 인증 건너뛰기 처리
  const handleSkipVerification = () => {
    setShowPhoneVerification(false);

    // 인증 건너뛰기 후 폼 제출
    onSubmit(formData);
    initialFormData();
  };

  // 인증 모달 닫기
  const handleClosePhoneVerification = () => {
    setShowPhoneVerification(false);
  };

  // 화면 렌더링
  if (!isOpen) return null;

  // 토너먼트 레벨 옵션
  const tournamentLevelOptions = TOURNAMENT_LEVELS.map((level) => ({
    value: level,
    label: level,
  }));

  // 전략 패턴을 사용하여 텍스트 결정
  const modalTitle = isGuestApplication
    ? strategy.getModalTitle(!!initialValues)
    : '모임 가입 신청';

  const submitButtonText = isGuestApplication
    ? strategy.getModalSubmitText(!!initialValues)
    : initialValues
      ? '수정하기'
      : '신청하기';

  // 게스트 신규 신청(게스트 수정이 아닌 경우)
  const isNewGuestApplication = isGuestApplication && !initialValues;

  // 날짜 변환 헬퍼 함수
  const parseDate = (dateString: string): Date | null => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  // 생년월일 날짜 범위 설정 (1900년 ~ 현재)
  const today = new Date();
  const minBirthDate = new Date(1950, 0, 1);
  const maxBirthDate = today;

  // 방문 날짜 범위 설정 (오늘 ~ 1년 후)
  const minVisitDate = today;
  const maxVisitDate = new Date(
    today.getFullYear() + 1,
    today.getMonth(),
    today.getDate()
  );

  // 휴대폰 인증 모달이 표시되는 경우
  if (showPhoneVerification) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
        <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto my-4">
          <PhoneVerificationStep
            userPhoneNumber={getFullPhoneNumber()}
            onVerificationComplete={handleVerificationComplete}
            onSkipVerification={handleSkipVerification}
            onBack={handleClosePhoneVerification}
            // 전화번호 인증 관련 props 전달
            // phone verification state
            phoneVerificationStatus={phoneVerificationStatus}
            phoneVerificationLoading={phoneVerificationLoading}
            phoneVerificationError={phoneVerificationError}
            // phone verification functions
            checkPhoneVerificationStatus={checkPhoneVerificationStatus}
            sendPhoneVerificationCode={sendPhoneVerificationCode}
            verifyPhoneCode={verifyPhoneCode}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto my-4">
        <h2 className="text-xl font-bold mb-4">{modalTitle}</h2>
        {isGuestApplication && (
          <p className="text-gray-600 text-sm mb-4">
            {strategy.getModalDescription()}
          </p>
        )}
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
                  checked={!clubMember ? true : formData.intendToJoin}
                  onChange={!clubMember ? undefined : onChangeInput}
                  disabled={!clubMember}
                />
                <span className="text-sm font-medium text-gray-700">
                  클럽 가입 의사
                  {!clubMember && (
                    <span className="ml-1 text-blue-600">
                      (비회원은 자동으로 체크됩니다)
                    </span>
                  )}
                </span>
              </div>

              <FormField label="방문 날짜" required>
                <CustomDatePicker
                  selected={parseDate(formData.visitDate || '')}
                  onChange={(date) => {
                    const event = {
                      target: {
                        name: 'visitDate',
                        value: formatDate(date),
                      },
                    } as React.ChangeEvent<HTMLInputElement>;
                    onChangeInput(event);
                  }}
                  placeholderText="방문 날짜를 선택하세요"
                  required
                  minDate={minVisitDate}
                  maxDate={maxVisitDate}
                  showYearDropdown
                  showMonthDropdown
                  dropdownMode="select"
                  yearDropdownItemNumber={5}
                  scrollableYearDropdown
                />
              </FormField>
            </>
          )}

          <FormField label="생년월일" required>
            <CustomDatePicker
              selected={parseDate(formData.birthDate || '')}
              onChange={(date) => {
                const event = {
                  target: {
                    name: 'birthDate',
                    value: formatDate(date),
                  },
                } as React.ChangeEvent<HTMLInputElement>;
                onChangeInput(event);
              }}
              placeholderText="생년월일을 선택하세요"
              required
              minDate={minBirthDate}
              maxDate={maxBirthDate}
              showYearDropdown
              showMonthDropdown
              dropdownMode="select"
              yearDropdownItemNumber={50}
              scrollableYearDropdown
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
            {/* 인증 상태 표시 */}
            {phoneVerificationStatus?.isVerified &&
              phoneVerificationStatus.phoneNumber === getFullPhoneNumber() && (
                <div className="mt-1 text-sm text-green-600">
                  ✓ 인증된 전화번호입니다
                </div>
              )}
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
            <FormField label={strategy.getMessageFieldLabel()}>
              <textarea
                name="message"
                value={formData.message || ''}
                onChange={onChangeInput}
                placeholder={strategy.getMessagePlaceholder()}
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
