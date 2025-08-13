import React, { useState, useEffect } from 'react';

import { Button } from '@/components/atoms/buttons/Button';
import { Input } from '@/components/atoms/inputs/Input';
import PhoneNumberDisplay from '@/components/molecules/form/PhoneNumberDisplay';
import VerificationCodeInput from '@/components/molecules/form/VerificationCodeInput';

interface PhoneVerificationStatus {
  isVerified: boolean;
  phoneNumber?: string;
  verifiedAt?: string;
  isPreviouslyVerified: boolean;
  canSkipVerification: boolean;
}

interface PhoneVerificationStepProps {
  userPhoneNumber?: string;
  onVerificationComplete: (phoneNumber: string) => void;
  onSkipVerification: (phoneNumber: string) => void;
  onBack: () => void;
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
  userPhoneNumber,
  onVerificationComplete,
  onSkipVerification,
  onBack,
  // phone verification state
  phoneVerificationStatus,
  phoneVerificationLoading,
  phoneVerificationError,
  // phone verification functions
  checkPhoneVerificationStatus,
  sendPhoneVerificationCode,
  verifyPhoneCode,
}: PhoneVerificationStepProps) {
  const [step, setStep] = useState<VerificationStep>('CHECKING');
  const [phoneNumber, setPhoneNumber] = useState(userPhoneNumber || '');
  const [error, setError] = useState<string | null>(null);

  // 컴포넌트 마운트 시 사용자의 전화번호 인증 상태를 확인
  useEffect(() => {
    checkPhoneVerificationStatus();
  }, [checkPhoneVerificationStatus]);

  // 인증 상태 변경 시 단계(step)와 전화번호를 업데이트
  // - 이미 인증된 경우: PREVIOUSLY_VERIFIED 단계로 이동
  // - 전화번호만 있는 경우: PENDING 단계로 이동하고 전화번호 설정
  // - 전화번호가 없는 경우: PENDING 단계로 이동
  useEffect(() => {
    if (phoneVerificationStatus) {
      if (
        phoneVerificationStatus.isVerified &&
        phoneVerificationStatus.phoneNumber
      ) {
        setStep('PREVIOUSLY_VERIFIED');
        setPhoneNumber(phoneVerificationStatus.phoneNumber);
      } else if (phoneVerificationStatus.phoneNumber) {
        setStep('PENDING');
        setPhoneNumber(phoneVerificationStatus.phoneNumber);
      } else {
        setStep('PENDING');
      }
    }
  }, [phoneVerificationStatus]);

  // API 에러 발생 시 에러 상태 업데이트
  useEffect(() => {
    if (phoneVerificationError) {
      setError(phoneVerificationError);
    }
  }, [phoneVerificationError]);

  // 전화번호 입력 필드 변경 핸들러
  // 입력 시 기존 에러 메시지를 제거
  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhoneNumber(e.target.value);
    setError(null);
  };

  // 인증번호 발송 처리
  // 1. 전화번호 유효성 검사
  // 2. SENT 단계로 변경 후 인증번호 발송
  // 3. 실패 시 FAILED 단계로 변경
  const handleSendCode = async () => {
    if (!phoneNumber) {
      setError('전화번호를 입력해주세요');
      return;
    }

    try {
      setStep('SENT');
      await sendPhoneVerificationCode(phoneNumber);
    } catch {
      setStep('FAILED');
    }
  };

  // 인증번호 확인 처리
  // 1. VERIFYING 단계로 변경
  // 2. 인증번호 검증 API 호출
  // 3. 성공 시 VERIFIED 단계로 변경하고 완료 콜백 호출
  // 4. 실패 시 FAILED 단계로 변경
  const handleVerifyCode = async (code: string) => {
    try {
      setStep('VERIFYING');
      await verifyPhoneCode(phoneNumber, code);
      setStep('VERIFIED');
      onVerificationComplete(phoneNumber);
    } catch {
      setStep('FAILED');
    }
  };

  // 인증번호 재발송 처리
  // resend 플래그를 true로 설정하여 재발송 요청
  const handleResendCode = async () => {
    try {
      setStep('SENT');
      await sendPhoneVerificationCode(phoneNumber, true);
    } catch {
      setStep('FAILED');
    }
  };

  // 기존에 인증된 전화번호 사용
  // 이미 인증된 전화번호가 있을 때 재인증 없이 진행
  const handleUseExistingPhone = () => {
    //
    if (phoneVerificationStatus?.phoneNumber) {
      onSkipVerification(phoneVerificationStatus.phoneNumber);
    }
  };

  // 다른 전화번호로 변경
  // PENDING 단계로 돌아가서 새 전화번호 입력 가능
  const handleChangePhone = () => {
    setStep('PENDING');
    setError(null);
  };

  if (step === 'CHECKING' || phoneVerificationLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">인증 상태를 확인하고 있습니다...</p>
        </div>
      </div>
    );
  }

  if (step === 'PREVIOUSLY_VERIFIED' && phoneVerificationStatus?.phoneNumber) {
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
          phoneNumber={phoneVerificationStatus.phoneNumber}
          isPhoneVerified={phoneVerificationStatus.isVerified}
          phoneVerifiedAt={phoneVerificationStatus.verifiedAt}
          onChangePhone={handleChangePhone}
        />

        <div className="flex space-x-3">
          <Button onClick={onBack} variant="outline" className="flex-1">
            뒤로
          </Button>
          <Button onClick={handleUseExistingPhone} className="flex-1">
            현재 전화번호 사용
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
          error={error || undefined}
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
