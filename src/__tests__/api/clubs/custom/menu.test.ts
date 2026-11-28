import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import handler from '@/pages/api/clubs/[id]/custom/menu';

import type { NextApiRequest, NextApiResponse } from 'next';

const mockFindUnique = jest.fn<() => Promise<unknown>>();
const mockCount = jest.fn<(args: unknown) => Promise<number>>();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    clubCustomSettings: { findUnique: () => mockFindUnique() },
    feeType: { count: (args: unknown) => mockCount(args) },
  },
}));

jest.mock('@/lib/clubAuth', () => ({
  ClubAuthError: class extends Error {},
  requireClubAdminRequest: jest.fn(),
}));

async function getMenu() {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  await handler(
    { method: 'GET', query: { id: '1' } } as unknown as NextApiRequest,
    res as unknown as NextApiResponse
  );
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFindUnique.mockResolvedValue({ tournamentMenuEnabled: false });
});

describe('GET /api/clubs/[id]/custom/menu — 내 회비 메뉴', () => {
  it('활성 회비 유형이 있으면 feeMenuEnabled가 true', async () => {
    mockCount.mockResolvedValue(2);
    const res = await getMenu();
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      tournamentMenuEnabled: false,
      feeMenuEnabled: true,
    });
    expect(mockCount).toHaveBeenCalledWith({
      where: { clubId: 1, isActive: true },
    });
  });

  it('활성 회비 유형이 없으면 false', async () => {
    mockCount.mockResolvedValue(0);
    const res = await getMenu();
    expect(res.body).toEqual({
      tournamentMenuEnabled: false,
      feeMenuEnabled: false,
    });
  });

  it('설정 행이 없어도 두 값이 온다', async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCount.mockResolvedValue(1);
    const res = await getMenu();
    expect(res.body).toEqual({
      tournamentMenuEnabled: true,
      feeMenuEnabled: true,
    });
  });
});
