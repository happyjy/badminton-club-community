import { createContext, useContext, ChangeEvent } from 'react';

import { PhoneVerificationStatus } from '@/hooks/usePhoneVerification';

import { ClubJoinFormData } from '@/types/club.types';

// 전화번호 부분별 타입 정의
export interface PhoneNumberParts {
  first: string;
  second: string;
  third: string;
}

// Context 타입 정의
export interface JoinModalContextType {
  // 폼 데이터
  formData: ClubJoinFormData;
  phoneNumbers: PhoneNumberParts;

  // 입력 핸들러
  onChangeInput: (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => void;
  onChangePhoneNumber: (
    e: ChangeEvent<HTMLInputElement>,
    part: 'first' | 'second' | 'third'
  ) => void;

  // 전화번호 관련
  getFullPhoneNumber: () => string;

  // 전화번호 인증 관련 (optional)
  phoneVerificationStatus?: PhoneVerificationStatus | null;
  phoneVerificationLoading?: boolean;
  phoneVerificationError?: string | null;
  checkPhoneVerificationStatus?: () => Promise<void>;
  sendPhoneVerificationCode?: (
    phoneNumber: string,
    forceNewVerification?: boolean
  ) => Promise<any>;
  verifyPhoneCode?: (phoneNumber: string, code: string) => Promise<any>;

  // 날짜 관련 유틸
  parseDate: (dateString: string) => Date | null;
  formatDate: (date: Date | null) => string;

  // 날짜 범위
  minBirthDate: Date;
  maxBirthDate: Date;
  minVisitDate: Date;
  maxVisitDate: Date;

  // 토너먼트 레벨 옵션
  tournamentLevelOptions: { value: string; label: string }[];

  // 개인정보 모달 관련
  isPrivacyModalOpen: boolean;
  setIsPrivacyModalOpen: (isOpen: boolean) => void;
}

// Context 생성
const JoinModalContext = createContext<JoinModalContextType | null>(null);

// Context Hook
export function useJoinModalContext() {
  const context = useContext(JoinModalContext);
  if (!context) {
    throw new Error(
      'useJoinModalContext must be used within a JoinModalProvider'
    );
  }
  return context;
}

export default JoinModalContext;
