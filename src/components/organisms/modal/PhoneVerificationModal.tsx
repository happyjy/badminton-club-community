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
  verificationStatus: PhoneVerificationStatus | null;
  verificationLoading: boolean;
  verificationError: string | null;
  checkVerificationStatus: () => Promise<void>;
  sendVerificationCode: (
    phoneNumber: string,
    forceNewVerification?: boolean
  ) => Promise<any>;
  verifyCode: (phoneNumber: string, code: string) => Promise<any>;
}

function PhoneVerificationModal({
  isOpen,
  onClose,
  userPhoneNumber,
  onVerificationComplete,
  onSkipVerification,
  verificationStatus,
  verificationLoading,
  verificationError,
  checkVerificationStatus,
  sendVerificationCode,
  verifyCode,
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
          verificationStatus={verificationStatus}
          verificationLoading={verificationLoading}
          verificationError={verificationError}
          checkVerificationStatus={checkVerificationStatus}
          sendVerificationCode={sendVerificationCode}
          verifyCode={verifyCode}
        />
      </div>
    </div>
  );
}

export default PhoneVerificationModal;
