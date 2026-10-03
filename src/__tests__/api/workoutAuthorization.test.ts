import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@/lib/prisma', () => {
  const prisma = {
    workout: { findUnique: jest.fn(), findMany: jest.fn() },
    clubMember: { findUnique: jest.fn(), findMany: jest.fn() },
    clubCustomSettings: { findUnique: jest.fn() },
    workoutParticipant: {
      create: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn(),
    },
    workoutHelperStatus: { upsert: jest.fn() },
    parkingRequest: { deleteMany: jest.fn(), findMany: jest.fn() },
    guestPost: { findMany: jest.fn() },
    $transaction: jest.fn(),
  };
  return { prisma };
});

jest.mock('@/lib/workout/parkingAssignment', () => ({
  recalcParkingAssignments: jest.fn(async () => []),
}));

jest.mock('@/lib/workout/parkingSms', () => ({
  notifyParkingPromotion: jest.fn(async () => undefined),
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
import rankingsHandler from '@/pages/api/clubs/[id]/rankings';
import clubWorkoutsHandler from '@/pages/api/clubs/[id]/workouts';
import helperStatusHandler from '@/pages/api/workouts/[workoutId]/helper-status';
import participateHandler from '@/pages/api/workouts/[workoutId]/participate';

import type { NextApiRequest, NextApiResponse } from 'next';

type Handler = (req: NextApiRequest, res: NextApiResponse) => unknown;
type AsyncMock = jest.Mock<(...args: unknown[]) => Promise<unknown>>;

const mockGetAuthUser = getAuthUser as unknown as AsyncMock;
const mockFindWorkout = prisma.workout.findUnique as unknown as AsyncMock;
const mockFindWorkouts = prisma.workout.findMany as unknown as AsyncMock;
const mockFindMember = prisma.clubMember.findUnique as unknown as AsyncMock;
const mockFindMembers = prisma.clubMember.findMany as unknown as AsyncMock;
const mockFindSettings = prisma.clubCustomSettings
  .findUnique as unknown as AsyncMock;
const mockCreateParticipant = prisma.workoutParticipant
  .create as unknown as AsyncMock;
const mockDeleteParticipant = prisma.workoutParticipant
  .delete as unknown as AsyncMock;
const mockFindParticipant = prisma.workoutParticipant
  .findFirst as unknown as AsyncMock;
const mockUpsertHelper = prisma.workoutHelperStatus
  .upsert as unknown as AsyncMock;
const mockFindGuests = prisma.guestPost.findMany as unknown as AsyncMock;
const mockFindParking = prisma.parkingRequest.findMany as unknown as AsyncMock;
const mockTransaction = prisma.$transaction as unknown as jest.Mock<
  (fn: (tx: unknown) => unknown) => Promise<unknown>
>;

// 사용자 1은 클럽 1의 회원이다. 운동 100은 클럽 2 소속이다.
const OTHER_CLUB_WORKOUT = {
  id: 100,
  clubId: 2,
  date: new Date('2026-10-05'),
  parkingCapacity: null,
};

function memberRow(status: string, id = 10) {
  return { id, role: 'MEMBER', status, name: '회원' };
}

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

/** clubId별로 로그인 사용자의 회원 상태를 정한다. 없는 클럽이면 비회원. */
function loginAs(
  userId: number | null,
  memberByClubId: Record<number, ReturnType<typeof memberRow>> = {}
) {
  mockGetAuthUser.mockResolvedValue(userId ? { id: userId } : null);
  mockFindMember.mockImplementation(async (args: unknown) => {
    const { where } = args as {
      where: { clubId_userId: { clubId: number; userId: number } };
    };
    return memberByClubId[where.clubId_userId.clubId] ?? null;
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockTransaction.mockImplementation(async (fn) => fn(prisma));
  mockFindSettings.mockResolvedValue(null);
  mockCreateParticipant.mockResolvedValue({ id: 1 });
  mockDeleteParticipant.mockResolvedValue({ id: 1 });
});

describe('운동 참여 POST/DELETE', () => {
  const query = { workoutId: '100' };

  it('body의 clubId가 아니라 운동이 속한 클럽으로 회원을 확인한다', async () => {
    // 클럽 1 회원이 클럽 2 운동에 clubId: 1을 붙여 참여하려 한다.
    loginAs(1, { 1: memberRow('APPROVED') });
    mockFindWorkout.mockResolvedValue(OTHER_CLUB_WORKOUT);

    const res = await call(participateHandler, 'POST', query, { clubId: 1 });

    expect(res.statusCode).toBe(403);
    expect(mockCreateParticipant).not.toHaveBeenCalled();
  });

  it.each(['PENDING', 'REJECTED', 'LEFT'])(
    '%s 회원은 참여할 수 없다',
    async (status) => {
      loginAs(1, { 2: memberRow(status) });
      mockFindWorkout.mockResolvedValue(OTHER_CLUB_WORKOUT);

      const res = await call(participateHandler, 'POST', query, { clubId: 2 });

      expect(res.statusCode).toBe(403);
      expect(mockCreateParticipant).not.toHaveBeenCalled();
    }
  );

  it.each(['APPROVED', 'ON_LEAVE'])(
    '%s 회원은 참여할 수 있다 (clubId 없이도)',
    async (status) => {
      loginAs(1, { 2: memberRow(status, 22) });
      mockFindWorkout.mockResolvedValue(OTHER_CLUB_WORKOUT);

      const res = await call(participateHandler, 'POST', query);

      expect(res.statusCode).toBe(200);
      const args = mockCreateParticipant.mock.calls[0][0] as {
        data: { workoutId: number; userId: number; clubMemberId: number };
      };
      expect(args.data).toMatchObject({
        workoutId: 100,
        userId: 1,
        clubMemberId: 22,
      });
    }
  );

  it('없는 운동이면 404', async () => {
    loginAs(1, { 2: memberRow('APPROVED') });
    mockFindWorkout.mockResolvedValue(null);

    const res = await call(participateHandler, 'POST', query, { clubId: 2 });

    expect(res.statusCode).toBe(404);
    expect(mockCreateParticipant).not.toHaveBeenCalled();
  });

  it('운동 클럽의 회원이 아니면 취소도 403', async () => {
    loginAs(1, { 1: memberRow('APPROVED') });
    mockFindWorkout.mockResolvedValue(OTHER_CLUB_WORKOUT);

    const res = await call(participateHandler, 'DELETE', query, { clubId: 1 });

    expect(res.statusCode).toBe(403);
    expect(mockDeleteParticipant).not.toHaveBeenCalled();
  });

  it('취소할 때 주차 설정은 운동이 속한 클럽 것을 쓴다', async () => {
    loginAs(1, { 2: memberRow('APPROVED') });
    mockFindWorkout.mockResolvedValue(OTHER_CLUB_WORKOUT);

    const res = await call(participateHandler, 'DELETE', query, { clubId: 1 });

    expect(res.statusCode).toBe(200);
    expect(mockDeleteParticipant).toHaveBeenCalledTimes(1);
    const args = mockFindSettings.mock.calls[0][0] as {
      where: { clubId: number };
    };
    expect(args.where.clubId).toBe(2);
  });
});

describe('도움 기록 helper-status', () => {
  const query = { workoutId: '100' };
  const body = {
    iconType: 'net',
    isSelected: true,
    targetUserId: 5,
    clubMemberId: 55,
  };

  beforeEach(() => {
    mockFindWorkout.mockResolvedValue(OTHER_CLUB_WORKOUT);
    mockUpsertHelper.mockResolvedValue({ helperType: 'NET', helped: true });
  });

  it('PUT 외의 메서드는 405', async () => {
    loginAs(1, { 2: memberRow('APPROVED') });

    const res = await call(helperStatusHandler, 'POST', query, body);

    expect(res.statusCode).toBe(405);
    expect(mockUpsertHelper).not.toHaveBeenCalled();
  });

  it.each(['PENDING', 'LEFT'])(
    '기록하는 사람이 %s 회원이면 403',
    async (status) => {
      loginAs(1, { 2: memberRow(status) });
      mockFindParticipant.mockResolvedValue({ id: 1 });

      const res = await call(helperStatusHandler, 'PUT', query, body);

      expect(res.statusCode).toBe(403);
      expect(mockUpsertHelper).not.toHaveBeenCalled();
    }
  );

  it('대상이 이 운동의 참여자가 아니면 404이고 기록하지 않는다', async () => {
    loginAs(1, { 2: memberRow('APPROVED') });
    mockFindParticipant.mockResolvedValue(null);

    const res = await call(helperStatusHandler, 'PUT', query, body);

    expect(res.statusCode).toBe(404);
    expect(mockUpsertHelper).not.toHaveBeenCalled();
  });

  it('대상은 운동이 속한 클럽 회원이면서 참여자여야 한다', async () => {
    loginAs(1, { 2: memberRow('APPROVED', 20) });
    mockFindParticipant.mockResolvedValue({ id: 1 });

    const res = await call(helperStatusHandler, 'PUT', query, body);

    expect(res.statusCode).toBe(200);
    const findArgs = mockFindParticipant.mock.calls[0][0] as {
      where: Record<string, unknown>;
    };
    expect(findArgs.where).toMatchObject({
      workoutId: 100,
      clubMemberId: 55,
      clubMember: { clubId: 2 },
    });
    const upsertArgs = mockUpsertHelper.mock.calls[0][0] as {
      create: { updatedById: number; clubMemberId: number };
    };
    expect(upsertArgs.create).toMatchObject({
      updatedById: 20,
      clubMemberId: 55,
    });
  });

  it('잘못된 도움 종류는 400', async () => {
    loginAs(1, { 2: memberRow('APPROVED') });
    mockFindParticipant.mockResolvedValue({ id: 1 });

    const res = await call(helperStatusHandler, 'PUT', query, {
      ...body,
      iconType: 'unknown',
    });

    expect(res.statusCode).toBe(400);
    expect(mockUpsertHelper).not.toHaveBeenCalled();
  });
});

describe('클럽 운동 목록 GET', () => {
  const query = { id: '2' };

  beforeEach(() => {
    mockFindWorkouts.mockResolvedValue([
      {
        id: 100,
        clubId: 2,
        date: new Date('2026-10-05T00:00:00.000Z'),
        parkingCapacity: null,
        WorkoutParticipant: [],
      },
    ]);
    mockFindParking.mockResolvedValue([]);
    mockFindGuests.mockResolvedValue([
      { id: 'g1', visitDate: '2026-10-05' },
      { id: 'g2', visitDate: '2026-10-05' },
    ]);
  });

  it('로그인하지 않으면 401', async () => {
    loginAs(null);
    const res = await call(clubWorkoutsHandler, 'GET', query);
    expect(res.statusCode).toBe(401);
    expect(mockFindWorkouts).not.toHaveBeenCalled();
  });

  it.each(['PENDING', 'REJECTED', 'LEFT'])('%s 회원은 403', async (status) => {
    loginAs(1, { 2: memberRow(status) });
    const res = await call(clubWorkoutsHandler, 'GET', query);
    expect(res.statusCode).toBe(403);
    expect(mockFindWorkouts).not.toHaveBeenCalled();
  });

  it('다른 클럽 회원은 403', async () => {
    loginAs(1, { 1: memberRow('APPROVED') });
    const res = await call(clubWorkoutsHandler, 'GET', query);
    expect(res.statusCode).toBe(403);
  });

  it('게스트 개인정보(이름·생년월일 등)는 조회하지도 내려주지도 않는다', async () => {
    loginAs(1, { 2: memberRow('ON_LEAVE') });

    const res = await call(clubWorkoutsHandler, 'GET', query);

    expect(res.statusCode).toBe(200);
    const guestArgs = mockFindGuests.mock.calls[0][0] as {
      select: Record<string, unknown>;
    };
    for (const field of [
      'name',
      'birthDate',
      'gender',
      'localTournamentLevel',
      'nationalTournamentLevel',
      'user',
      'userId',
    ]) {
      expect(guestArgs.select).not.toHaveProperty(field);
    }

    const body = res.body as {
      data: { workouts: Array<Record<string, unknown>> };
    };
    expect(body.data.workouts[0].guestCount).toBe(2);
    expect(body.data.workouts[0]).not.toHaveProperty('guests');
  });
});

describe('클럽 랭킹 GET', () => {
  const query = { id: '2' };

  beforeEach(() => {
    mockFindWorkouts.mockResolvedValue([]);
    mockFindMembers.mockResolvedValue([]);
  });

  it.each(['PENDING', 'REJECTED', 'LEFT'])('%s 회원은 403', async (status) => {
    loginAs(1, { 2: memberRow(status) });
    const res = await call(rankingsHandler, 'GET', query);
    expect(res.statusCode).toBe(403);
    expect(mockFindMembers).not.toHaveBeenCalled();
  });

  it('다른 클럽 회원은 403', async () => {
    loginAs(1, { 1: memberRow('APPROVED') });
    const res = await call(rankingsHandler, 'GET', query);
    expect(res.statusCode).toBe(403);
  });

  it.each(['APPROVED', 'ON_LEAVE'])('%s 회원은 볼 수 있다', async (status) => {
    loginAs(1, { 2: memberRow(status) });
    const res = await call(rankingsHandler, 'GET', query);
    expect(res.statusCode).toBe(200);
  });
});
