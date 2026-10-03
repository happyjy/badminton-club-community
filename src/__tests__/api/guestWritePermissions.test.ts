import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    clubMember: { findUnique: jest.fn() },
    guestPost: { findUnique: jest.fn(), update: jest.fn() },
    guestComment: { findMany: jest.fn(), create: jest.fn() },
    workout: { create: jest.fn(), findFirst: jest.fn() },
  },
}));

jest.mock('@/lib/sms-notification', () => ({
  sendStatusUpdateSms: jest.fn(),
  sendCommentAddedSms: jest.fn(),
  getSmsNotificationStatus: jest.fn(),
}));

// withAuth는 같은 모듈의 getAuthUser를 내부에서 부르므로 둘 다 대체한다.
jest.mock('@/lib/session', () => {
  const getAuthUser = jest.fn();
  return {
    getAuthUser,
    withAuth:
      (handler: (req: unknown, res: unknown) => unknown) =>
      async (
        req: { user?: unknown },
        res: { status: (code: number) => { json: (body: unknown) => unknown } }
      ) => {
        const user = await getAuthUser(req);
        if (!user)
          return res.status(401).json({ error: '로그인이 필요합니다' });
        req.user = user;
        return handler(req, res);
      },
  };
});

import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/session';
import {
  getSmsNotificationStatus,
  sendCommentAddedSms,
  sendStatusUpdateSms,
} from '@/lib/sms-notification';
import commentsHandler from '@/pages/api/clubs/[id]/guests/[guestId]/comments/index';
import sendSmsHandler from '@/pages/api/clubs/[id]/guests/[guestId]/send-sms';
import smsStatusHandler from '@/pages/api/clubs/[id]/guests/[guestId]/sms-status';
import statusHandler from '@/pages/api/clubs/[id]/guests/[guestId]/status';
import scheduleHandler from '@/pages/api/clubs/[id]/workouts/schedule';

import type { NextApiRequest, NextApiResponse } from 'next';

type Handler = (req: NextApiRequest, res: NextApiResponse) => unknown;
type AsyncMock = jest.Mock<(...args: unknown[]) => Promise<unknown>>;

const mockGetAuthUser = getAuthUser as unknown as AsyncMock;
const mockFindMember = prisma.clubMember.findUnique as unknown as AsyncMock;
const mockFindGuestPost = prisma.guestPost.findUnique as unknown as AsyncMock;
const mockUpdateGuestPost = prisma.guestPost.update as unknown as AsyncMock;
const mockFindComments = prisma.guestComment.findMany as unknown as AsyncMock;
const mockCreateComment = prisma.guestComment.create as unknown as AsyncMock;
const mockCreateWorkout = prisma.workout.create as unknown as AsyncMock;
const mockSendStatusSms = sendStatusUpdateSms as unknown as AsyncMock;
const mockSendCommentSms = sendCommentAddedSms as unknown as AsyncMock;
const mockGetSmsStatus = getSmsNotificationStatus as unknown as AsyncMock;

const ADMIN = { id: 1, role: 'ADMIN', status: 'APPROVED', name: '임원' };
const MEMBER = { id: 2, role: 'MEMBER', status: 'APPROVED', name: '회원' };
// 클럽 1에 사용자 7이 쓴 게스트 신청
const POST = { id: 'g1', clubId: 1, userId: 7, status: 'APPROVED' };

function createRes() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status: jest.fn((code: number) => {
      res.statusCode = code;
      return res;
    }),
    json: jest.fn((body: unknown) => {
      res.body = body;
      return res;
    }),
    end: jest.fn(() => res),
    setHeader: jest.fn(() => res),
  };
  return res;
}

async function call(
  handler: Handler,
  method: string,
  query: Record<string, string>,
  body: unknown = {}
) {
  const req = { method, query, body, cookies: {} };
  const res = createRes();
  await handler(
    req as unknown as NextApiRequest,
    res as unknown as NextApiResponse
  );
  return res;
}

function loginAs(userId: number | null, member: unknown = null) {
  mockGetAuthUser.mockResolvedValue(userId ? { id: userId } : null);
  mockFindMember.mockResolvedValue(member);
}

const GUEST_QUERY = { id: '1', guestId: 'g1' };

describe('게스트 신청 쓰기 권한', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindGuestPost.mockResolvedValue(POST);
    mockUpdateGuestPost.mockResolvedValue(POST);
    mockFindComments.mockResolvedValue([]);
    mockCreateComment.mockResolvedValue({ id: 1 });
    mockSendStatusSms.mockResolvedValue(true);
    mockSendCommentSms.mockResolvedValue(true);
    mockGetSmsStatus.mockResolvedValue({});
  });

  describe('PUT 상태 변경', () => {
    const body = { status: 'APPROVED' };

    it('임원이 아니면 403이고 상태를 바꾸지도 문자를 보내지도 않는다', async () => {
      loginAs(2, MEMBER);

      const res = await call(statusHandler, 'PUT', GUEST_QUERY, body);

      expect(res.statusCode).toBe(403);
      expect(mockUpdateGuestPost).not.toHaveBeenCalled();
      expect(mockSendStatusSms).not.toHaveBeenCalled();
    });

    it('임원은 상태를 바꿀 수 있다', async () => {
      loginAs(1, ADMIN);

      const res = await call(statusHandler, 'PUT', GUEST_QUERY, body);

      expect(res.statusCode).toBe(200);
      expect(mockUpdateGuestPost).toHaveBeenCalledTimes(1);
    });
  });

  describe('댓글', () => {
    it('로그인하지 않으면 조회도 401', async () => {
      loginAs(null);
      const res = await call(commentsHandler, 'GET', GUEST_QUERY);
      expect(res.statusCode).toBe(401);
    });

    it('작성자도 임원도 아니면 조회 403', async () => {
      loginAs(2, MEMBER);
      const res = await call(commentsHandler, 'GET', GUEST_QUERY);
      expect(res.statusCode).toBe(403);
      expect(mockFindComments).not.toHaveBeenCalled();
    });

    it('URL의 클럽과 신청서의 클럽이 다르면 404', async () => {
      loginAs(1, ADMIN);
      mockFindGuestPost.mockResolvedValue({ ...POST, clubId: 2 });
      const res = await call(commentsHandler, 'GET', GUEST_QUERY);
      expect(res.statusCode).toBe(404);
    });

    it('로그인하지 않으면 작성 401이고 저장하지 않는다', async () => {
      loginAs(null);
      const res = await call(commentsHandler, 'POST', GUEST_QUERY, {
        content: '안녕하세요',
        userId: 1,
      });
      expect(res.statusCode).toBe(401);
      expect(mockCreateComment).not.toHaveBeenCalled();
    });

    it('작성자도 임원도 아니면 작성 403', async () => {
      loginAs(2, MEMBER);
      const res = await call(commentsHandler, 'POST', GUEST_QUERY, {
        content: '안녕하세요',
      });
      expect(res.statusCode).toBe(403);
      expect(mockCreateComment).not.toHaveBeenCalled();
    });

    it('작성자는 body의 userId와 관계없이 로그인 사용자로 저장된다', async () => {
      loginAs(1, ADMIN);

      const res = await call(commentsHandler, 'POST', GUEST_QUERY, {
        content: '확인했습니다',
        userId: 999,
        clubMemberId: 999,
      });

      expect(res.statusCode).toBe(201);
      const args = mockCreateComment.mock.calls[0][0] as {
        data: { userId: number; clubMemberId: number | null };
      };
      expect(args.data.userId).toBe(1);
      expect(args.data.clubMemberId).toBeNull();
      // 문자도 로그인 사용자 이름으로 나간다.
      expect(mockSendCommentSms).toHaveBeenCalledWith('g1', 7, 1);
    });
  });

  describe('POST 문자 재발송', () => {
    const body = { notificationType: 'STATUS_UPDATE' };

    it('로그인하지 않으면 401', async () => {
      loginAs(null);
      const res = await call(sendSmsHandler, 'POST', GUEST_QUERY, body);
      expect(res.statusCode).toBe(401);
      expect(mockSendStatusSms).not.toHaveBeenCalled();
    });

    it('임원이 아니면 403', async () => {
      loginAs(7, null);
      const res = await call(sendSmsHandler, 'POST', GUEST_QUERY, body);
      expect(res.statusCode).toBe(403);
      expect(mockSendStatusSms).not.toHaveBeenCalled();
    });

    it('다른 클럽 신청서면 404', async () => {
      loginAs(1, ADMIN);
      mockFindGuestPost.mockResolvedValue({ ...POST, clubId: 2 });
      const res = await call(sendSmsHandler, 'POST', GUEST_QUERY, body);
      expect(res.statusCode).toBe(404);
    });

    it('댓글 알림은 body가 아니라 로그인 사용자 기준으로 보낸다', async () => {
      loginAs(1, ADMIN);
      const res = await call(sendSmsHandler, 'POST', GUEST_QUERY, {
        notificationType: 'COMMENT_ADDED',
        commentUserId: 999,
      });
      expect(res.statusCode).toBe(200);
      expect(mockSendCommentSms).toHaveBeenCalledWith('g1', 7, 1);
    });
  });

  describe('GET 문자 발송 상태', () => {
    it('로그인하지 않으면 401', async () => {
      loginAs(null);
      const res = await call(smsStatusHandler, 'GET', GUEST_QUERY);
      expect(res.statusCode).toBe(401);
    });

    it('작성자도 임원도 아니면 403', async () => {
      loginAs(2, MEMBER);
      const res = await call(smsStatusHandler, 'GET', GUEST_QUERY);
      expect(res.statusCode).toBe(403);
      expect(mockGetSmsStatus).not.toHaveBeenCalled();
    });
  });
});

describe('POST 운동 일정 생성', () => {
  const body = {
    startDate: '2026-10-05',
    endDate: '2026-10-05',
    weekdayStartTime: '19:00',
    weekdayEndTime: '22:00',
    weekendStartTime: '10:00',
    weekendEndTime: '13:00',
    location: '체육관',
    maxParticipants: 20,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('로그인하지 않으면 401이고 일정을 만들지 않는다', async () => {
    loginAs(null);
    const res = await call(scheduleHandler, 'POST', { id: '1' }, body);
    expect(res.statusCode).toBe(401);
    expect(mockCreateWorkout).not.toHaveBeenCalled();
  });

  it('임원이 아니면 403이고 일정을 만들지 않는다', async () => {
    loginAs(2, MEMBER);
    const res = await call(scheduleHandler, 'POST', { id: '1' }, body);
    expect(res.statusCode).toBe(403);
    expect(mockCreateWorkout).not.toHaveBeenCalled();
  });
});
