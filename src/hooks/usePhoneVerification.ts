import { useState, useCallback } from 'react';

import axios from 'axios';

interface PhoneVerificationStatus {
  isVerified: boolean;
  phoneNumber?: string;
  verifiedAt?: string;
  isPreviouslyVerified: boolean;
  canSkipVerification: boolean;
}

interface UsePhoneVerificationProps {
  clubId: string;
}

export function usePhoneVerification({ clubId }: UsePhoneVerificationProps) {
  const [status, setStatus] = useState<PhoneVerificationStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 인증 상태 확인
  const checkVerificationStatus = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(
        `/api/clubs/${clubId}/phone-verification/status`
      );
      setStatus(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || '인증 상태 확인에 실패했습니다');
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  // 인증번호 발송
  const sendVerificationCode = useCallback(
    async (phoneNumber: string, forceNewVerification = false) => {
      setLoading(true);
      setError(null);

      try {
        const response = await axios.post(
          `/api/clubs/${clubId}/phone-verification/send`,
          {
            phoneNumber,
            forceNewVerification,
          }
        );

        return response.data;
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.message || '인증번호 발송에 실패했습니다';
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [clubId]
  );

  // 인증번호 확인
  const verifyCode = useCallback(
    async (phoneNumber: string, code: string) => {
      setLoading(true);
      setError(null);

      try {
        const response = await axios.post(
          `/api/clubs/${clubId}/phone-verification/verify`,
          {
            phoneNumber,
            verificationCode: code,
          }
        );

        // 인증 완료 후 상태 업데이트
        await checkVerificationStatus();

        return response.data;
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.message || '인증번호 확인에 실패했습니다';
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [clubId, checkVerificationStatus]
  );

  // 전화번호 업데이트
  const updatePhoneNumber = useCallback(
    async (phoneNumber: string) => {
      setLoading(true);
      setError(null);

      try {
        const response = await axios.put('/api/users/me/phone', {
          phoneNumber,
        });

        // 전화번호 변경 후 상태 업데이트
        await checkVerificationStatus();

        return response.data;
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.message || '전화번호 업데이트에 실패했습니다';
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [checkVerificationStatus]
  );

  return {
    status,
    loading,
    error,
    checkVerificationStatus,
    sendVerificationCode,
    verifyCode,
    updatePhoneNumber,
  };
}
