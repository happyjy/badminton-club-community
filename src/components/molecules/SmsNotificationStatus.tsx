import React, { useEffect } from 'react';

import { Label } from '@/components/atoms/Label';
import { Spinner } from '@/components/atoms/Spinner';

import { useSmsNotification } from '@/hooks/useSmsNotification';

interface SmsNotificationStatusProps {
  clubId: string;
  guestId: string;
}

function SmsNotificationStatus({
  clubId,
  guestId,
}: SmsNotificationStatusProps) {
  const { smsStatus, loading, error, fetchSmsStatus } = useSmsNotification({
    clubId,
    guestId,
  });

  useEffect(() => {
    fetchSmsStatus();
  }, [fetchSmsStatus]);

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <Spinner size="sm" />
        <span className="text-sm text-gray-600">SMS 상태 확인 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-600">SMS 상태 확인 실패: {error}</div>
    );
  }

  if (!smsStatus) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-700">SMS 알림 상태</Label>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">상태 업데이트 알림</span>
          <span
            className={`text-sm ${smsStatus.statusUpdateSmsSent ? 'text-green-600' : 'text-gray-400'}`}
          >
            {smsStatus.statusUpdateSmsSent ? '전송됨' : '미전송'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">댓글 알림</span>
          <span
            className={`text-sm ${smsStatus.commentAddedSmsSent ? 'text-green-600' : 'text-gray-400'}`}
          >
            {smsStatus.commentAddedSmsSent ? '전송됨' : '미전송'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default SmsNotificationStatus;
