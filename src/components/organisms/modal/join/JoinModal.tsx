import { FormEvent, useState, ReactNode } from 'react';

import { useClubJoinForm } from '@/hooks/useClubJoinForm';
import { PhoneVerificationStatus } from '@/hooks/usePhoneVerification';
import { User } from '@/types';
import { ClubJoinFormData } from '@/types/club.types';
import { getVisitDate, TOURNAMENT_LEVELS } from '@/utils/clubForms';

import PhoneVerificationStep from '../../forms/PhoneVerificationStep';
import PrivacyModal from '../PrivacyModal';

import JoinModalContext from './JoinModalContext';
// Sub-components
import Footer from './components/Footer';
import Header from './components/Header';
import Section from './components/Section';
import BirthDateField from './components/fields/BirthDateField';
import GenderField from './components/fields/GenderField';
import IntendToJoinField from './components/fields/IntendToJoinField';
import MessageField from './components/fields/MessageField';
import NameField from './components/fields/NameField';
import PhoneField from './components/fields/PhoneField';
import PrivacyAgreementField from './components/fields/PrivacyAgreementField';
import TournamentFields from './components/fields/TournamentFields';
import VisitDateField from './components/fields/VisitDateField';

export interface JoinModalProps {
  children: ReactNode;
  user: User;
  clubId: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: ClubJoinFormData) => void;
  isSubmitting?: boolean;
  initialValues?: Partial<ClubJoinFormData>;
  isClubMember?: boolean;
  // 전화번호 인증 관련 props
  phoneVerificationStatus?: PhoneVerificationStatus | null;
  phoneVerificationLoading?: boolean;
  phoneVerificationError?: string | null;
  checkPhoneVerificationStatus?: () => Promise<void>;
  sendPhoneVerificationCode?: (
    phoneNumber: string,
    forceNewVerification?: boolean
  ) => Promise<any>;
  verifyPhoneCode?: (phoneNumber: string, code: string) => Promise<any>;
}

function JoinModal({
  children,
  user,
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
  initialValues,
  isClubMember = false,
  // 전화번호 인증 관련 props
  phoneVerificationStatus,
  phoneVerificationLoading,
  phoneVerificationError,
  checkPhoneVerificationStatus,
  sendPhoneVerificationCode,
  verifyPhoneCode,
}: JoinModalProps) {
  // 폼 데이터 관리 훅
  const { formData, phoneNumbers, onChangePhoneNumber, onChangeInput, initialFormData } =
    useClubJoinForm(user, true, initialValues, isClubMember ? {} : undefined);

  // 개인정보 수집 및 이용 동의 모달
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  // 휴대폰 인증 관련 상태
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);

  // 전화번호 문자열 생성 함수
  const getFullPhoneNumber = () =>
    `${phoneNumbers.first}-${phoneNumbers.second}-${phoneNumbers.third}`;

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

  // 날짜 범위 설정
  const today = new Date();
  const minBirthDate = new Date(1950, 0, 1);
  const maxBirthDate = today;
  const minVisitDate = new Date(getVisitDate(isClubMember));
  const maxVisitDate = new Date(
    today.getFullYear() + 1,
    today.getMonth(),
    today.getDate()
  );

  // 토너먼트 레벨 옵션
  const tournamentLevelOptions = TOURNAMENT_LEVELS.map((level) => ({
    value: level,
    label: level,
  }));

  // 폼 제출 처리
  const onSubmitForm = (e: FormEvent) => {
    e.preventDefault();

    // 전화번호가 입력되었는지 확인
    const currentPhoneNumber = getFullPhoneNumber();
    if (!currentPhoneNumber || currentPhoneNumber === '--') {
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
    if (checkPhoneVerificationStatus) {
      await checkPhoneVerificationStatus();
    }
    setShowPhoneVerification(false);
    onSubmit(formData);
    initialFormData();
  };

  // 인증 건너뛰기 처리
  const handleSkipVerification = () => {
    setShowPhoneVerification(false);
    onSubmit(formData);
    initialFormData();
  };

  // 인증 모달 닫기
  const handleClosePhoneVerification = () => {
    setShowPhoneVerification(false);
  };

  // 화면 렌더링
  if (!isOpen) return null;

  // Context 값 생성
  const contextValue = {
    formData,
    phoneNumbers,
    onChangeInput,
    onChangePhoneNumber,
    getFullPhoneNumber,
    phoneVerificationStatus,
    phoneVerificationLoading,
    phoneVerificationError,
    checkPhoneVerificationStatus,
    sendPhoneVerificationCode,
    verifyPhoneCode,
    parseDate,
    formatDate,
    minBirthDate,
    maxBirthDate,
    minVisitDate,
    maxVisitDate,
    tournamentLevelOptions,
    isPrivacyModalOpen,
    setIsPrivacyModalOpen,
  };

  // 휴대폰 인증 모달이 표시되는 경우
  if (showPhoneVerification) {
    if (
      !checkPhoneVerificationStatus ||
      !sendPhoneVerificationCode ||
      !verifyPhoneCode
    ) {
      onSubmit(formData);
      initialFormData();
      setShowPhoneVerification(false);
      return null;
    }

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
        <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto my-4">
          <PhoneVerificationStep
            userPhoneNumber={getFullPhoneNumber()}
            onVerificationComplete={handleVerificationComplete}
            onSkipVerification={handleSkipVerification}
            onBack={handleClosePhoneVerification}
            phoneVerificationStatus={phoneVerificationStatus || null}
            phoneVerificationLoading={phoneVerificationLoading || false}
            phoneVerificationError={phoneVerificationError || null}
            checkPhoneVerificationStatus={checkPhoneVerificationStatus}
            sendPhoneVerificationCode={sendPhoneVerificationCode}
            verifyPhoneCode={verifyPhoneCode}
          />
        </div>
      </div>
    );
  }

  return (
    <JoinModalContext.Provider value={contextValue}>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
        <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto my-4">
          <form onSubmit={onSubmitForm} className="space-y-4">
            {children}
          </form>
        </div>

        {/* 개인정보 수집 및 이용 동의 모달 */}
        <PrivacyModal
          isOpen={isPrivacyModalOpen}
          onClose={() => setIsPrivacyModalOpen(false)}
        />
      </div>
    </JoinModalContext.Provider>
  );
}

// Sub-components 연결
JoinModal.Header = Header;
JoinModal.Section = Section;
JoinModal.Footer = Footer;
JoinModal.NameField = NameField;
JoinModal.BirthDateField = BirthDateField;
JoinModal.GenderField = GenderField;
JoinModal.PhoneField = PhoneField;
JoinModal.TournamentFields = TournamentFields;
JoinModal.VisitDateField = VisitDateField;
JoinModal.IntendToJoinField = IntendToJoinField;
JoinModal.MessageField = MessageField;
JoinModal.PrivacyAgreement = PrivacyAgreementField;

export default JoinModal;
