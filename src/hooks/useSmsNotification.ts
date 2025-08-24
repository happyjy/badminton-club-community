import { useState, useCallback } from 'react';

import axios from 'axios';

import {
  SmsStatusResponse,
  SendSmsRequest,
  NotificationType,
} from '@/types/sms.types';

interface UseSmsNotificationProps {
  clubId: string;
  guestId: string;
}

function useSmsNotification({ clubId, guestId }: UseSmsNotificationProps) {
  const [smsStatus, setSmsStatus] = useState<SmsStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // SMS 전송 상태 조회
  const fetchSmsStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get<SmsStatusResponse>(
        `/api/clubs/${clubId}/guests/${guestId}/sms-status`
      );

      setSmsStatus(response.data);
      return response.data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch SMS status';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [clubId, guestId]);

  // SMS 전송 실행
  const sendSms = useCallback(
    async (notificationType: NotificationType, commentUserId?: number) => {
      try {
        setLoading(true);
        setError(null);

        const requestData: SendSmsRequest & { commentUserId?: number } = {
          notificationType,
          ...(commentUserId && { commentUserId }),
        };

        const response = await axios.post(
          `/api/clubs/${clubId}/guests/${guestId}/send-sms`,
          requestData
        );

        // SMS 전송 후 상태 업데이트
        await fetchSmsStatus();

        return response.data;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to send SMS';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [clubId, guestId, fetchSmsStatus]
  );

  // 상태 업데이트 SMS 전송
  const sendStatusUpdateSms = useCallback(async () => {
    return sendSms(NotificationType.STATUS_UPDATE);
  }, [sendSms]);

  // 댓글 추가 SMS 전송
  const sendCommentAddedSms = useCallback(
    async (commentUserId: number) => {
      return sendSms(NotificationType.COMMENT_ADDED, commentUserId);
    },
    [sendSms]
  );

  return {
    smsStatus,
    loading,
    error,
    fetchSmsStatus,
    sendSms,
    sendStatusUpdateSms,
    sendCommentAddedSms,
  };
}

export default useSmsNotification;
