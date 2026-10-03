import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@/lib/prisma', () => ({
  prisma: { clubMember: { findUnique: jest.fn() } },
}));

import { prisma } from '@/lib/prisma';

import { canViewGuestPost } from './guestAccess';

const findUnique = prisma.clubMember.findUnique as unknown as jest.Mock<
  () => Promise<unknown>
>;

const POST = { clubId: 1, userId: 7 };

describe('canViewGuestPost', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('작성자 본인이면 볼 수 있다', async () => {
    await expect(canViewGuestPost(7, POST)).resolves.toBe(true);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('신청한 클럽의 임원이면 볼 수 있다', async () => {
    findUnique.mockResolvedValue({ role: 'ADMIN', status: 'APPROVED' });
    await expect(canViewGuestPost(1, POST)).resolves.toBe(true);
  });

  it('일반 회원은 볼 수 없다', async () => {
    findUnique.mockResolvedValue({ role: 'MEMBER', status: 'APPROVED' });
    await expect(canViewGuestPost(2, POST)).resolves.toBe(false);
  });

  it('승인되지 않은 임원은 볼 수 없다', async () => {
    findUnique.mockResolvedValue({ role: 'ADMIN', status: 'PENDING' });
    await expect(canViewGuestPost(1, POST)).resolves.toBe(false);
  });

  it('클럽 회원이 아니면 볼 수 없다', async () => {
    findUnique.mockResolvedValue(null);
    await expect(canViewGuestPost(3, POST)).resolves.toBe(false);
  });
});
