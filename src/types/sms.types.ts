export enum NotificationType {
  STATUS_UPDATE = 'STATUS_UPDATE', // 승인/거절 상태 업데이트
  COMMENT_ADDED = 'COMMENT_ADDED', // 댓글 추가
}

export interface SmsNotificationLog {
  id: number;
  guestPostId: string;
  userId: number;
  notificationType: NotificationType;
  sentAt: Date;
}

export interface SmsStatusResponse {
  statusUpdateSmsSent: boolean;
  commentAddedSmsSent: boolean;
}

export interface SendSmsRequest {
  notificationType: NotificationType;
}

export interface SmsNotificationData {
  guestPostId: string;
  userId: number;
  notificationType: NotificationType;
  phoneNumber: string;
  message: string;
}
