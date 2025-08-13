import { useState, useCallback } from 'react';

import axios from 'axios';

export interface PhoneVerificationStatus {
  canSkipVerification: boolean;
  isVerified: boolean;
  isPreviouslyVerified: boolean;
  phoneNumber?: string;
  verifiedAt?: string;
}

interface UsePhoneVerificationProps {
  clubId: string;
}

interface UsePhoneVerificationReturn {
  phoneVerificationStatus: PhoneVerificationStatus | null;
  phoneVerificationLoading: boolean;
  phoneVerificationError: string | null;
  checkPhoneVerificationStatus: () => Promise<void>;
  sendPhoneVerificationCode: (
    phoneNumber: string,
    forceNewVerification?: boolean
  ) => Promise<any>;
  verifyPhoneCode: (phoneNumber: string, code: string) => Promise<any>;
  updatePhoneNumber: (phoneNumber: string) => Promise<any>;
}

function usePhoneVerification({
  clubId,
}: UsePhoneVerificationProps): UsePhoneVerificationReturn {
  const [status, setStatus] = useState<PhoneVerificationStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 전화번호 인증 상태 확인
  const checkPhoneVerificationStatus = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(
        `/api/clubs/${clubId}/phone-verification/status`
      );
      console.log(
        `🌸 ~ usePhoneVerification ~ response.data.data:`,
        response.data.data
      );
      setStatus(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || '인증 상태 확인에 실패했습니다');
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  // 전화번호 인증코드 발송
  const sendPhoneVerificationCode = useCallback(
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

  // 전화번호 인증코드 확인
  const verifyPhoneCode = useCallback(
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
        await checkPhoneVerificationStatus();

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
    [clubId, checkPhoneVerificationStatus]
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
        await checkPhoneVerificationStatus();

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
    [checkPhoneVerificationStatus]
  );

  return {
    // local state
    phoneVerificationStatus: status,
    phoneVerificationLoading: loading,
    phoneVerificationError: error,
    // functions
    checkPhoneVerificationStatus,
    sendPhoneVerificationCode,
    verifyPhoneCode,
    updatePhoneNumber,
  };
}

export default usePhoneVerification;
