import {
  Children,
  FormEvent,
  isValidElement,
  ReactElement,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';

import { Sheet } from '@/components/organisms/sheet/Sheet';

import { useClubJoinForm } from '@/hooks/useClubJoinForm';
import { PhoneVerificationStatus } from '@/hooks/usePhoneVerification';

import { User } from '@/types';
import { ClubJoinFormData } from '@/types/club.types';
import { getVisitDate, TOURNAMENT_LEVELS } from '@/utils/clubForms';
import { getPhoneNumberError, joinPhoneParts } from '@/utils/phoneNumber';

import PrivacyModal from '../PrivacyModal';

// Sub-components
import BirthDateField from './components/fields/BirthDateField';
import GenderField from './components/fields/GenderField';
import IntendToJoinField from './components/fields/IntendToJoinField';
import MessageField from './components/fields/MessageField';
import NameField from './components/fields/NameField';
import PhoneField from './components/fields/PhoneField';
import PrivacyAgreementField from './components/fields/PrivacyAgreementField';
import TournamentFields from './components/fields/TournamentFields';
import VisitDateField from './components/fields/VisitDateField';
import Footer from './components/Footer';
import Header, { HeaderProps } from './components/Header';
import Section from './components/Section';
import JoinModalContext from './JoinModalContext';

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
  // onClose,
  onSubmit,
  // isSubmitting = false,
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
  const {
    formData,
    phoneNumbers,
    onChangePhoneNumber,
    onChangeInput,
    initialFormData,
  } = useClubJoinForm(user, true, initialValues, isClubMember ? {} : undefined);

  // 개인정보 수집 및 이용 동의 모달
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  // PhoneField가 알려주는 인증 완료 여부. 제출 버튼 활성 조건이다.
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  // 제출을 막은 이유. 브라우저 알림창 대신 제출 버튼 위에 보여 준다.
  const [submitError, setSubmitError] = useState<string | null>(null);

  // 인증 함수가 넘어오지 않는 화면에서는 인증을 요구할 수 없다.
  const canVerifyPhone = !!sendPhoneVerificationCode && !!verifyPhoneCode;

  // 모달을 열 때 계정에 인증된 번호가 있는지 받아온다.
  // 이 값이 있어야 이미 인증한 사용자가 다시 인증하지 않고 바로 신청할 수 있다.
  const loadVerificationStatus = useRef(checkPhoneVerificationStatus);
  loadVerificationStatus.current = checkPhoneVerificationStatus;
  useEffect(() => {
    if (isOpen) {
      loadVerificationStatus.current?.();
    }
  }, [isOpen]);

  // 전화번호 문자열 생성 함수
  const getFullPhoneNumber = () => joinPhoneParts(phoneNumbers);

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
  // 전화번호 인증은 PhoneField 안에서 끝나므로, 여기서는 형식과 인증 여부만 본다.
  const onSubmitForm = (e: FormEvent) => {
    e.preventDefault();

    // 전화번호가 올바른 형식으로 입력되었는지 확인
    // 빈 값뿐 아니라 자리 수가 모자란 값도 여기서 걸러, 형식이 어긋난 번호가
    // 저장되지 않도록 한다.
    const phoneNumberError = getPhoneNumberError(getFullPhoneNumber());
    if (phoneNumberError) {
      setSubmitError(phoneNumberError);
      return;
    }

    // 인증 기능을 쓸 수 있는 화면에서는 인증을 마쳐야 제출할 수 있다.
    // 제출 버튼도 비활성이지만, 엔터 제출 같은 경로를 위해 여기서도 막는다.
    if (canVerifyPhone && !isPhoneVerified) {
      setSubmitError('전화번호 인증을 완료해주세요.');
      return;
    }

    setSubmitError(null);
    onSubmit(formData);
    initialFormData();
  };

  // 제목은 시트의 제목 줄에 그린다. 프리셋이 넘긴 <JoinModal.Header>에서 읽는다.
  const header = Children.toArray(children).find(
    (child): child is ReactElement<HeaderProps> =>
      isValidElement(child) && child.type === Header
  );

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
    onPhoneVerifiedChange: setIsPhoneVerified,
    canVerifyPhone,
    isPhoneVerified,
    minBirthDate,
    maxBirthDate,
    minVisitDate,
    maxVisitDate,
    tournamentLevelOptions,
    isPrivacyModalOpen,
    setIsPrivacyModalOpen,
    submitError,
  };

  return (
    <JoinModalContext.Provider value={contextValue}>
      <Sheet
        open={isOpen}
        // 긴 폼이라 ESC·바깥 누르기로는 닫지 않는다. 취소 버튼으로만 닫는다.
        onClose={() => {}}
        title={header?.props.title ?? ''}
        hideCloseButton
      >
        <form onSubmit={onSubmitForm} className="space-y-4">
          {children}
        </form>

        {/* 개인정보 수집 및 이용 동의 창. 신청 창 안에 겹쳐 뜬다. */}
        <PrivacyModal
          isOpen={isPrivacyModalOpen}
          onClose={() => setIsPrivacyModalOpen(false)}
        />
      </Sheet>
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
