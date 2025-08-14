import React from 'react';

import { Button } from '@/components/atoms/buttons/Button';

import { useSmsNotification } from '@/hooks/useSmsNotification';

import { NotificationType } from '@/types/sms.types';

interface SmsNotificationButtonProps {
  clubId: string;
  guestId: string;
  notificationType: NotificationType;
  commentUserId?: number;
  disabled?: boolean;
  className?: string;
}

function SmsNotificationButton({
  clubId,
  guestId,
  notificationType,
  commentUserId,
  disabled = false,
  className = '',
}: SmsNotificationButtonProps) {
  const { loading, sendStatusUpdateSms, sendCommentAddedSms } =
    useSmsNotification({ clubId, guestId });

  const handleClick = async () => {
    try {
      if (notificationType === NotificationType.STATUS_UPDATE) {
        await sendStatusUpdateSms();
      } else if (
        notificationType === NotificationType.COMMENT_ADDED &&
        commentUserId
      ) {
        await sendCommentAddedSms(commentUserId);
      }
    } catch (error) {
      console.error('Failed to send SMS notification:', error);
    }
  };

  const getButtonText = () => {
    if (loading) return '전송 중...';

    switch (notificationType) {
      case NotificationType.STATUS_UPDATE:
        return '상태 업데이트 SMS 전송';
      case NotificationType.COMMENT_ADDED:
        return '댓글 알림 SMS 전송';
      default:
        return 'SMS 전송';
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || loading}
      className={className}
      variant="outline"
      size="sm"
    >
      {getButtonText()}
    </Button>
  );
}

export default SmsNotificationButton;
