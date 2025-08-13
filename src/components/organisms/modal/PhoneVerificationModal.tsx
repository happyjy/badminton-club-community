import React from 'react';

import PhoneVerificationStep from '@/components/organisms/forms/PhoneVerificationStep';

interface PhoneVerificationStatus {
  isVerified: boolean;
  phoneNumber?: string;
  verifiedAt?: string;
  isPreviouslyVerified: boolean;
  canSkipVerification: boolean;
}

interface PhoneVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userPhoneNumber?: string;
  onVerificationComplete: (phoneNumber: string) => void;
  onSkipVerification: (phoneNumber: string) => void;
  // 전화번호 인증 관련 props 전달
  // phone verification state
  phoneVerificationStatus: PhoneVerificationStatus | null;
  phoneVerificationLoading: boolean;
  phoneVerificationError: string | null;
  // phone verification functions
  checkPhoneVerificationStatus: () => Promise<void>;
  sendPhoneVerificationCode: (
    phoneNumber: string,
    forceNewVerification?: boolean
  ) => Promise<any>;
  verifyPhoneCode: (phoneNumber: string, code: string) => Promise<any>;
}

function PhoneVerificationModal({
  isOpen,
  onClose,
  userPhoneNumber,
  onVerificationComplete,
  onSkipVerification,
  // 전화번호 인증 관련 props 전달
  // phone verification state
  phoneVerificationStatus,
  phoneVerificationLoading,
  phoneVerificationError,
  // phone verification functions
  checkPhoneVerificationStatus,
  sendPhoneVerificationCode,
  verifyPhoneCode,
}: PhoneVerificationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto my-4">
        <PhoneVerificationStep
          userPhoneNumber={userPhoneNumber}
          onVerificationComplete={onVerificationComplete}
          onSkipVerification={onSkipVerification}
          onBack={onClose}
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

export default PhoneVerificationModal;
