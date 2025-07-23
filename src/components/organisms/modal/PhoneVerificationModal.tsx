import React from 'react';

import PhoneVerificationStep from '@/components/organisms/forms/PhoneVerificationStep';

interface PhoneVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  clubId: string;
  userPhoneNumber?: string;
  onVerificationComplete: (phoneNumber: string) => void;
  onSkipVerification: (phoneNumber: string) => void;
}

function PhoneVerificationModal({
  isOpen,
  onClose,
  clubId,
  userPhoneNumber,
  onVerificationComplete,
  onSkipVerification,
}: PhoneVerificationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto my-4">
        <PhoneVerificationStep
          clubId={clubId}
          userPhoneNumber={userPhoneNumber}
          onVerificationComplete={onVerificationComplete}
          onSkipVerification={onSkipVerification}
          onBack={onClose}
        />
      </div>
    </div>
  );
}

export default PhoneVerificationModal;
