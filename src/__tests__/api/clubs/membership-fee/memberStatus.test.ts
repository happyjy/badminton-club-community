/**
 * 회원 상태 변경: 탈퇴로 바꿀 때 탈퇴월을, 탈퇴에서 되돌릴 때 다시 시작하는 달을 받는다.
 * 탈퇴일(leftAt)은 탈퇴 상태에만 남는다.
 */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

import statusHandler from '@/pages/api/clubs/[id]/members/[userId]/status';
import defaultsHandler from '@/pages/api/clubs/[id]/members/[userId]/status-defaults';

import { ADMIN_MEMBER_ID, buildRes, CLUB_ID, fakeDb } from './fakeFeeDb';

import type { NextApiRequest, NextApiResponse } from 'next';

jest.mock('@/lib/prisma', () => ({
  prisma:
    jest.requireActual<typeof import('./fakeFeeDb')>('./fakeFeeDb').fakeDb
      .prisma,
}));

jest.mock('@/lib/session', () => ({
  withAuth:
    (inner: (req: unknown, res: unknown) => unknown) =>
    (req: Record<string, unknown>, res: unknown) => {
      req.user = { id: 7 };
      return inner(req, res);
    },
}));

const ACTIVE_ID = 1;
const LEFT_ID = 2;
const userIdOf = (memberId: number) => memberId + 1000;

type Result = {
  statusCode: number;
  body: { error?: string; data?: Record<string, unknown> };
};

async function put(memberId: number, body: unknown): Promise<Result> {
  const res = buildRes();
  await statusHandler(
    {
      method: 'PUT',
      query: { id: String(CLUB_ID), userId: String(userIdOf(memberId)) },
      body,
    } as unknown as NextApiRequest,
    res as unknown as NextApiResponse
  );
  return res as unknown as Result;
}

async function getDefaults(memberId: number, method = 'GET'): Promise<Result> {
  const res = buildRes();
  await defaultsHandler(
    {
      method,
      query: { id: String(CLUB_ID), userId: String(userIdOf(memberId)) },
    } as unknown as NextApiRequest,
    res as unknown as NextApiResponse
  );
  return res as unknown as Result;
}

const saved = (memberId: number) =>
  fakeDb.state.members.find((member) => member.id === memberId)!;

const iso = (value: unknown) => (value as Date | null)?.toISOString() ?? null;

beforeEach(() => {
  fakeDb.reset();
  fakeDb.addMember({
    id: ACTIVE_ID,
    name: '가나다',
    feeObligationStartAt: new Date('2025-03-01T00:00:00.000Z'),
  });
  fakeDb.addMember({
    id: LEFT_ID,
    name: '라마바',
    status: 'LEFT',
    feeObligationStartAt: new Date('2024-03-01T00:00:00.000Z'),
    leftAt: new Date('2025-01-01T00:00:00.000Z'),
  });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('PUT members/[userId]/status — 탈퇴', () => {
  it('탈퇴월을 그 달 1일 UTC로 저장한다', async () => {
    const res = await put(ACTIVE_ID, { status: 'LEFT', leftMonth: '2026-07' });

    expect(res.statusCode).toBe(200);
    expect(saved(ACTIVE_ID).status).toBe('LEFT');
    expect(iso(saved(ACTIVE_ID).leftAt)).toBe('2026-07-01T00:00:00.000Z');
  });

  it.each([[undefined], ['2026-13'], [202607]])(
    '탈퇴월이 %p이면 거부하고 회원은 그대로다',
    async (leftMonth) => {
      const res = await put(ACTIVE_ID, { status: 'LEFT', leftMonth });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('탈퇴월을 골라주세요');
      expect(saved(ACTIVE_ID).status).toBe('APPROVED');
      expect(saved(ACTIVE_ID).leftAt).toBeNull();
    }
  );
});

describe('PUT members/[userId]/status — 다시 가입', () => {
  it.each([['APPROVED'], ['ON_LEAVE']])(
    '%s로 되돌리면 탈퇴일을 지우고 다시 시작하는 달을 저장한다',
    async (status) => {
      const res = await put(LEFT_ID, { status, feeStartMonth: '2026-12' });

      expect(res.statusCode).toBe(200);
      expect(saved(LEFT_ID).status).toBe(status);
      expect(saved(LEFT_ID).leftAt).toBeNull();
      expect(iso(saved(LEFT_ID).feeObligationStartAt)).toBe(
        '2026-12-01T00:00:00.000Z'
      );
    }
  );

  it('다시 시작하는 달이 없으면 거부한다', async () => {
    const res = await put(LEFT_ID, { status: 'APPROVED' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('다시 시작하는 달을 골라주세요');
    expect(saved(LEFT_ID).status).toBe('LEFT');
    expect(iso(saved(LEFT_ID).leftAt)).toBe('2025-01-01T00:00:00.000Z');
  });
});

describe('PUT members/[userId]/status — 달을 묻지 않는 변경', () => {
  it('승인 → 휴가중은 시작월을 두고, 보낸 탈퇴월은 무시한다', async () => {
    const res = await put(ACTIVE_ID, {
      status: 'ON_LEAVE',
      leftMonth: '2026-07',
    });

    expect(res.statusCode).toBe(200);
    expect(saved(ACTIVE_ID).status).toBe('ON_LEAVE');
    expect(saved(ACTIVE_ID).leftAt).toBeNull();
    expect(iso(saved(ACTIVE_ID).feeObligationStartAt)).toBe(
      '2025-03-01T00:00:00.000Z'
    );
  });

  it('탈퇴 → 탈퇴는 탈퇴일을 지우지 않는다', async () => {
    const res = await put(LEFT_ID, { status: 'LEFT' });

    expect(res.statusCode).toBe(200);
    expect(iso(saved(LEFT_ID).leftAt)).toBe('2025-01-01T00:00:00.000Z');
  });

  it('탈퇴 → 거절됨은 탈퇴일을 지우고 시작월은 둔다', async () => {
    const res = await put(LEFT_ID, { status: 'REJECTED' });

    expect(res.statusCode).toBe(200);
    expect(saved(LEFT_ID).leftAt).toBeNull();
    expect(iso(saved(LEFT_ID).feeObligationStartAt)).toBe(
      '2024-03-01T00:00:00.000Z'
    );
  });
});

describe('PUT members/[userId]/status — 거절', () => {
  it('없는 회원은 404', async () => {
    const res = await put(99, { status: 'LEFT', leftMonth: '2026-07' });

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('회원을 찾을 수 없습니다');
  });

  it('관리자가 아니면 403', async () => {
    saved(ADMIN_MEMBER_ID).role = 'MEMBER';

    const res = await put(ACTIVE_ID, { status: 'LEFT', leftMonth: '2026-07' });

    expect(res.statusCode).toBe(403);
    expect(saved(ACTIVE_ID).status).toBe('APPROVED');
  });
});

describe('GET members/[userId]/status-defaults', () => {
  it('마지막 납부 달은 직접 추가와 미리 낸 달까지 본다', async () => {
    fakeDb.addPayment({ clubMemberId: ACTIVE_ID, year: 2026, month: 3 });
    fakeDb.addManualPayment({ clubMemberId: ACTIVE_ID, year: 2026, month: 12 });
    fakeDb.addPayment({ clubMemberId: ACTIVE_ID, year: 2025, month: 11 });

    const res = await getDefaults(ACTIVE_ID);

    expect(res.statusCode).toBe(200);
    expect(res.body.data?.lastPaidMonth).toBe('2026-12');
    expect(res.body.data?.previousStartMonth).toBe('2025-03');
  });

  it('낸 회비가 없으면 마지막 납부 달은 null', async () => {
    const res = await getDefaults(ACTIVE_ID);

    expect(res.body.data?.lastPaidMonth).toBeNull();
  });

  it('시작월이 없으면 예전 시작월은 null', async () => {
    saved(ACTIVE_ID).feeObligationStartAt = null;

    const res = await getDefaults(ACTIVE_ID);

    expect(res.body.data?.previousStartMonth).toBeNull();
  });

  it('다시 시작하는 달은 가입 규칙대로 (20일이면 다음 달)', async () => {
    jest.useFakeTimers({ now: new Date('2026-11-20T03:00:00Z') });

    const res = await getDefaults(LEFT_ID);

    expect(res.body.data?.rejoinStartMonth).toBe('2026-12');
  });

  it('없는 회원은 404', async () => {
    const res = await getDefaults(99);

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('회원을 찾을 수 없습니다');
  });

  it('관리자가 아니면 403', async () => {
    saved(ADMIN_MEMBER_ID).role = 'MEMBER';

    const res = await getDefaults(ACTIVE_ID);

    expect(res.statusCode).toBe(403);
  });

  it('GET이 아니면 405', async () => {
    const res = await getDefaults(ACTIVE_ID, 'POST');

    expect(res.statusCode).toBe(405);
  });
});
