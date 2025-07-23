import React, { useState, useEffect } from 'react';

import { Button } from '@/components/atoms/buttons/Button';
import { Input } from '@/components/atoms/inputs/Input';
import PhoneNumberDisplay from '@/components/molecules/form/PhoneNumberDisplay';
import VerificationCodeInput from '@/components/molecules/form/VerificationCodeInput';
import { usePhoneVerification } from '@/hooks/usePhoneVerification';

interface PhoneVerificationStepProps {
  clubId: string;
  userPhoneNumber?: string;
  onVerificationComplete: (phoneNumber: string) => void;
  onSkipVerification: (phoneNumber: string) => void;
  onBack: () => void;
}

type VerificationStep =
  | 'CHECKING'
  | 'PREVIOUSLY_VERIFIED'
  | 'PENDING'
  | 'SENT'
  | 'VERIFYING'
  | 'VERIFIED'
  | 'EXPIRED'
  | 'FAILED';

function PhoneVerificationStep({
  clubId,
  userPhoneNumber,
  onVerificationComplete,
  onSkipVerification,
  onBack,
}: PhoneVerificationStepProps) {
  const [step, setStep] = useState<VerificationStep>('CHECKING');
  const [phoneNumber, setPhoneNumber] = useState(userPhoneNumber || '');
  const [error, setError] = useState<string | null>(null);

  const {
    status,
    loading,
    error: apiError,
    checkVerificationStatus,
    sendVerificationCode,
    verifyCode,
  } = usePhoneVerification({ clubId });

  useEffect(() => {
    checkVerificationStatus();
  }, [checkVerificationStatus]);

  useEffect(() => {
    if (status) {
      if (status.isVerified && status.phoneNumber) {
        setStep('PREVIOUSLY_VERIFIED');
        setPhoneNumber(status.phoneNumber);
      } else if (status.phoneNumber) {
        setPhoneNumber(status.phoneNumber);
        setStep('PENDING');
      } else {
        setStep('PENDING');
      }
    }
  }, [status]);

  useEffect(() => {
    if (apiError) {
      setError(apiError);
    }
  }, [apiError]);

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhoneNumber(e.target.value);
    setError(null);
  };

  const handleSendCode = async () => {
    if (!phoneNumber) {
      setError('전화번호를 입력해주세요');
      return;
    }

    try {
      setStep('SENT');
      await sendVerificationCode(phoneNumber);
    } catch {
      setStep('FAILED');
    }
  };

  const handleVerifyCode = async (code: string) => {
    try {
      setStep('VERIFYING');
      await verifyCode(phoneNumber, code);
      setStep('VERIFIED');
      onVerificationComplete(phoneNumber);
    } catch {
      setStep('FAILED');
    }
  };

  const handleResendCode = async () => {
    try {
      setStep('SENT');
      await sendVerificationCode(phoneNumber, true);
    } catch {
      setStep('FAILED');
    }
  };

  const handleUseExistingPhone = () => {
    if (status?.phoneNumber) {
      onSkipVerification(status.phoneNumber);
    }
  };

  const handleChangePhone = () => {
    setStep('PENDING');
    setError(null);
  };

  if (step === 'CHECKING' || loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">인증 상태를 확인하고 있습니다...</p>
        </div>
      </div>
    );
  }

  if (step === 'PREVIOUSLY_VERIFIED' && status?.phoneNumber) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            전화번호 인증
          </h3>
          <p className="text-sm text-gray-600">
            이미 인증된 전화번호가 있습니다
          </p>
        </div>

        <PhoneNumberDisplay
          phoneNumber={status.phoneNumber}
          isVerified={status.isVerified}
          verifiedAt={status.verifiedAt}
          onChangePhone={handleChangePhone}
          onUseExisting={handleUseExistingPhone}
        />

        <div className="flex space-x-3">
          <Button onClick={onBack} variant="outline" className="flex-1">
            뒤로
          </Button>
          <Button onClick={handleUseExistingPhone} className="flex-1">
            기존 전화번호 사용
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'PENDING') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            전화번호 인증
          </h3>
          <p className="text-sm text-gray-600">
            인증번호를 받을 전화번호를 입력해주세요
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            전화번호
          </label>
          <Input
            type="tel"
            value={phoneNumber}
            onChange={handlePhoneNumberChange}
            placeholder="010-1234-5678"
            className="w-full"
          />
          {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
        </div>

        <div className="flex space-x-3">
          <Button onClick={onBack} variant="outline" className="flex-1">
            뒤로
          </Button>
          <Button onClick={handleSendCode} className="flex-1">
            인증번호 발송
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'SENT' || step === 'VERIFYING') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            인증번호 확인
          </h3>
        </div>

        <VerificationCodeInput
          phoneNumber={phoneNumber}
          onVerify={handleVerifyCode}
          onResend={handleResendCode}
          loading={step === 'VERIFYING'}
          error={error}
        />

        <Button onClick={onBack} variant="outline" className="w-full">
          뒤로
        </Button>
      </div>
    );
  }

  if (step === 'VERIFIED') {
    return (
      <div className="text-center py-8">
        <div className="text-green-600 text-4xl mb-4">✓</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">인증 완료</h3>
        <p className="text-sm text-gray-600 mb-6">
          전화번호 인증이 완료되었습니다
        </p>
        <Button
          onClick={() => onVerificationComplete(phoneNumber)}
          className="w-full"
        >
          다음 단계로
        </Button>
      </div>
    );
  }

  if (step === 'FAILED') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="text-red-600 text-4xl mb-4">✗</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">인증 실패</h3>
          <p className="text-sm text-gray-600 mb-4">
            {error || '인증 과정에서 오류가 발생했습니다'}
          </p>
        </div>

        <div className="flex space-x-3">
          <Button onClick={onBack} variant="outline" className="flex-1">
            뒤로
          </Button>
          <Button onClick={() => setStep('PENDING')} className="flex-1">
            다시 시도
          </Button>
        </div>
      </div>
    );
  }

  return null;
}

export default PhoneVerificationStep;
