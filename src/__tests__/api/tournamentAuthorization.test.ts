import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@/lib/prisma', () => {
  const prisma = {
    clubMember: { findUnique: jest.fn() },
    tournament: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    tournamentEventType: {
      update: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    tournamentEntry: { findUnique: jest.fn() },
    tournamentFile: { findMany: jest.fn() },
    $transaction: jest.fn(),
  };
  // 트랜잭션 콜백에는 같은 mock을 tx로 넘겨 호출 여부를 그대로 검사한다.
  prisma.$transaction.mockImplementation(((fn: (tx: unknown) => unknown) =>
    fn(prisma)) as never);
  return { prisma };
});

// Storage 클라이언트를 만들지 않도록 파일 저장 모듈을 대체한다.
jest.mock('@/lib/tournament/fileStorage', () => ({
  readSingleUpload: jest.fn(),
  removeTournamentFiles: jest.fn(),
  uploadTournamentFile: jest.fn(),
  UploadTooLargeError: class UploadTooLargeError extends Error {},
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
import externalTournamentHandler from '@/pages/api/clubs/[id]/tournaments/[tournamentId]/external/tournament';
import filesHandler from '@/pages/api/clubs/[id]/tournaments/[tournamentId]/files/index';
import tournamentHandler from '@/pages/api/clubs/[id]/tournaments/[tournamentId]/index';

import type { NextApiRequest, NextApiResponse } from 'next';

type Handler = (req: NextApiRequest, res: NextApiResponse) => unknown;
type AsyncMock = jest.Mock<(...args: unknown[]) => Promise<unknown>>;

const mockGetAuthUser = getAuthUser as unknown as AsyncMock;
const mockFindMember = prisma.clubMember.findUnique as unknown as AsyncMock;
const mockFindTournament = prisma.tournament.findFirst as unknown as AsyncMock;
const mockFindUniqueTournament = prisma.tournament
  .findUnique as unknown as AsyncMock;
const mockUpdateTournament = prisma.tournament.update as unknown as AsyncMock;
const mockUpdateEventType = prisma.tournamentEventType
  .update as unknown as AsyncMock;
const mockCreateEventType = prisma.tournamentEventType
  .create as unknown as AsyncMock;
const mockDeleteEventType = prisma.tournamentEventType
  .delete as unknown as AsyncMock;
const mockFindFiles = prisma.tournamentFile.findMany as unknown as AsyncMock;

const ADMIN = { id: 1, role: 'ADMIN', status: 'APPROVED', name: '임원' };
const MEMBER = { id: 2, role: 'MEMBER', status: 'APPROVED', name: '회원' };

const QUERY = { id: '1', tournamentId: 't1' };

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

function patchBody(eventTypes: unknown[]) {
  return {
    title: '클럽 대회',
    applyDeadline: '2026-12-01T00:00:00.000Z',
    status: 'OPEN',
    useTeamName: false,
    tshirtSizes: [],
    ageGroups: ['20대'],
    levels: [],
    eventTypes,
  };
}

describe('대회 수정(PATCH) - 다른 대회 종목 주입 차단', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    loginAs(1, ADMIN);
    // 이 대회(t1)에는 et-own 종목 하나만 있다
    mockFindTournament.mockResolvedValue({
      id: 't1',
      clubId: 1,
      eventTypes: [
        {
          id: 'et-own',
          name: '남자복식',
          playerCount: 2,
          _count: { entryEvents: 0 },
        },
      ],
    });
    mockUpdateTournament.mockResolvedValue({});
    mockUpdateEventType.mockResolvedValue({});
    mockCreateEventType.mockResolvedValue({});
    mockDeleteEventType.mockResolvedValue({});
    mockFindUniqueTournament.mockResolvedValue({ id: 't1', eventTypes: [] });
  });

  it('다른 대회의 종목 id를 보내면 400으로 거절하고 아무것도 바꾸지 않는다', async () => {
    const res = await call(
      tournamentHandler as Handler,
      'PATCH',
      QUERY,
      patchBody([
        { id: 'et-own', name: '남자복식', playerCount: 2, fee: 30000 },
        { id: 'et-other-club', name: '탈취', playerCount: 2, fee: 0 },
      ])
    );

    expect(res.statusCode).toBe(400);
    expect(mockUpdateTournament).not.toHaveBeenCalled();
    expect(mockUpdateEventType).not.toHaveBeenCalled();
    expect(mockDeleteEventType).not.toHaveBeenCalled();
    expect(mockCreateEventType).not.toHaveBeenCalled();
  });

  it('이 대회의 종목 수정과 신규 종목 추가는 그대로 된다', async () => {
    const res = await call(
      tournamentHandler as Handler,
      'PATCH',
      QUERY,
      patchBody([
        { id: 'et-own', name: '남자복식', playerCount: 2, fee: 30000 },
        { id: '', name: '혼합복식', playerCount: 2, fee: 30000 },
      ])
    );

    expect(res.statusCode).toBe(200);
    expect(mockUpdateEventType).toHaveBeenCalledTimes(1);
    expect(mockUpdateEventType.mock.calls[0][0]).toMatchObject({
      where: { id: 'et-own' },
    });
    expect(mockCreateEventType).toHaveBeenCalledTimes(1);
  });
});

describe('첨부파일 목록(GET) - 임시저장 대회', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindFiles.mockResolvedValue([{ id: 'f1' }]);
    mockFindTournament.mockResolvedValue({
      id: 't1',
      status: 'DRAFT',
      applyStartAt: null,
      applyDeadline: new Date('2026-12-01T00:00:00.000Z'),
    });
  });

  it('일반 회원은 임시저장 대회의 첨부파일을 볼 수 없다 (404)', async () => {
    loginAs(2, MEMBER);

    const res = await call(filesHandler as Handler, 'GET', QUERY);

    expect(res.statusCode).toBe(404);
    expect(mockFindFiles).not.toHaveBeenCalled();
  });

  it('임원은 임시저장 대회의 첨부파일을 볼 수 있다', async () => {
    loginAs(1, ADMIN);

    const res = await call(filesHandler as Handler, 'GET', QUERY);

    expect(res.statusCode).toBe(200);
  });

  it('일반 회원도 공개된 대회의 첨부파일은 볼 수 있다', async () => {
    loginAs(2, MEMBER);
    mockFindTournament.mockResolvedValue({
      id: 't1',
      status: 'OPEN',
      applyStartAt: null,
      applyDeadline: new Date('2026-12-01T00:00:00.000Z'),
    });

    const res = await call(filesHandler as Handler, 'GET', QUERY);

    expect(res.statusCode).toBe(200);
  });
});

describe('외부 신청용 대회 정보(GET)', () => {
  const OPEN_TOURNAMENT = {
    title: '클럽 대회',
    applyNotice: null,
    applyStartAt: null,
    applyDeadline: new Date('2026-12-01T00:00:00.000Z'),
    status: 'OPEN',
    useTeamName: false,
    tshirtSizes: [],
    bankAccount: '국민 123-456',
    memberLabel: null,
    nonMemberSurcharge: 0,
    surchargeUnit: 'PER_PLAYER',
    minClubMembersPerTeam: 0,
    ageGroups: ['20대'],
    levels: [],
    eventTypes: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('외부 신청을 열어 둔 임시저장 대회는 존재를 알리지 않는다 (404)', async () => {
    mockFindTournament.mockResolvedValue({
      ...OPEN_TOURNAMENT,
      status: 'DRAFT',
    });

    const res = await call(externalTournamentHandler as Handler, 'GET', QUERY);

    expect(res.statusCode).toBe(404);
  });

  it('공개된 대회는 내려 주되 신청 화면에서 쓰지 않는 필드는 조회하지 않는다', async () => {
    mockFindTournament.mockResolvedValue(OPEN_TOURNAMENT);

    const res = await call(externalTournamentHandler as Handler, 'GET', QUERY);

    expect(res.statusCode).toBe(200);
    const select = (
      mockFindTournament.mock.calls[0][0] as { select: Record<string, unknown> }
    ).select;
    // 입금 안내에 필요하므로 계좌는 남긴다
    expect(select.bankAccount).toBe(true);
    for (const unused of [
      'hostName',
      'description',
      'tournamentDate',
      'location',
    ]) {
      expect(select).not.toHaveProperty(unused);
    }
  });
});
