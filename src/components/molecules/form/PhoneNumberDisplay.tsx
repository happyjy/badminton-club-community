import React from 'react';

import { Button } from '@/components/atoms/buttons/Button';

interface PhoneNumberDisplayProps {
  phoneNumber: string;
  isPhoneVerified: boolean;
  phoneVerifiedAt?: string;
  onChangePhone: () => void;
}

function PhoneNumberDisplay({
  phoneNumber,
  isPhoneVerified,
  phoneVerifiedAt,
  onChangePhone,
}: PhoneNumberDisplayProps) {
  const formatVerifiedAt = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">현재 전화번호</p>
            <p className="text-lg font-medium">{phoneNumber}</p>
            {isPhoneVerified && phoneVerifiedAt && (
              <p className="text-sm text-green-600 mt-1">
                ✓ {formatVerifiedAt(phoneVerifiedAt)}에 인증 완료
              </p>
            )}
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={onChangePhone}
              variant="outline"
              className="px-4 py-2 text-sm"
            >
              새 전화번호로 인증
            </Button>
          </div>
        </div>
      </div>

      {!isPhoneVerified && (
        <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
          <p className="text-sm text-yellow-800">
            이 전화번호는 아직 인증되지 않았습니다. 새 인증을 진행해주세요.
          </p>
        </div>
      )}
    </div>
  );
}

export default PhoneNumberDisplay;
