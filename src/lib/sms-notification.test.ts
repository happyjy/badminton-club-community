import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';

import { NotificationType } from '@/types/sms.types';

import {
  checkSmsNotificationSent,
  createSmsNotificationLog,
  getSmsNotificationStatus,
  sendCommentAddedSms,
  sendStatusUpdateSms,
} from './sms-notification';

// Mock PrismaClient
jest.mock('@prisma/client');
jest.mock('./sms');

const mockPrisma = {
  smsNotificationLog: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
};

(PrismaClient as jest.MockedClass<typeof PrismaClient>).mockImplementation(
  () => mockPrisma as any
);

describe('SMS Notification Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkSmsNotificationSent', () => {
    it('should return true when SMS notification log exists', async () => {
      mockPrisma.smsNotificationLog.findUnique.mockResolvedValue({ id: 1 });

      const result = await checkSmsNotificationSent(
        'post1',
        1,
        NotificationType.STATUS_UPDATE
      );

      expect(result).toBe(true);
      expect(mockPrisma.smsNotificationLog.findUnique).toHaveBeenCalledWith({
        where: {
          guestPostId_userId_notificationType: {
            guestPostId: 'post1',
            userId: 1,
            notificationType: NotificationType.STATUS_UPDATE,
          },
        },
      });
    });

    it('should return false when SMS notification log does not exist', async () => {
      mockPrisma.smsNotificationLog.findUnique.mockResolvedValue(null);

      const result = await checkSmsNotificationSent(
        'post1',
        1,
        NotificationType.STATUS_UPDATE
      );

      expect(result).toBe(false);
    });
  });

  describe('createSmsNotificationLog', () => {
    it('should create SMS notification log', async () => {
      mockPrisma.smsNotificationLog.create.mockResolvedValue({ id: 1 });

      await createSmsNotificationLog(
        'post1',
        1,
        NotificationType.STATUS_UPDATE
      );

      expect(mockPrisma.smsNotificationLog.create).toHaveBeenCalledWith({
        data: {
          guestPostId: 'post1',
          userId: 1,
          notificationType: NotificationType.STATUS_UPDATE,
        },
      });
    });
  });

  describe('sendStatusUpdateSms', () => {
    it('should send status update SMS when not already sent', async () => {
      mockPrisma.smsNotificationLog.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({
        phoneNumber: '010-1234-5678',
      });

      const result = await sendStatusUpdateSms('post1', 1, 'APPROVED');

      expect(result).toBe(true);
    });

    it('should not send SMS when already sent', async () => {
      mockPrisma.smsNotificationLog.findUnique.mockResolvedValue({ id: 1 });

      const result = await sendStatusUpdateSms('post1', 1, 'APPROVED');

      expect(result).toBe(false);
    });

    it('should not send SMS when user phone number not found', async () => {
      mockPrisma.smsNotificationLog.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await sendStatusUpdateSms('post1', 1, 'APPROVED');

      expect(result).toBe(false);
    });
  });

  describe('sendCommentAddedSms', () => {
    it('should send comment added SMS when not already sent', async () => {
      mockPrisma.smsNotificationLog.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({
        phoneNumber: '010-1234-5678',
      });

      const result = await sendCommentAddedSms('post1', 1, 2);

      expect(result).toBe(true);
    });

    it('should not send SMS when comment author is post author', async () => {
      const result = await sendCommentAddedSms('post1', 1, 1);

      expect(result).toBe(false);
    });

    it('should not send SMS when already sent', async () => {
      mockPrisma.smsNotificationLog.findUnique.mockResolvedValue({ id: 1 });

      const result = await sendCommentAddedSms('post1', 1, 2);

      expect(result).toBe(false);
    });
  });

  describe('getSmsNotificationStatus', () => {
    it('should return SMS notification status', async () => {
      mockPrisma.smsNotificationLog.findUnique
        .mockResolvedValueOnce({ id: 1 }) // STATUS_UPDATE
        .mockResolvedValueOnce(null); // COMMENT_ADDED

      const result = await getSmsNotificationStatus('post1', 1);

      expect(result).toEqual({
        statusUpdateSmsSent: true,
        commentAddedSmsSent: false,
      });
    });
  });
});
