import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@/lib/prisma', () => ({
  prisma: { clubMember: { findUnique: jest.fn() } },
}));

import { prisma } from '@/lib/prisma';

import {
  ClubAuthError,
  requireActiveClubMember,
  requireClubAdmin,
  requireClubMember,
} from './clubAuth';

type MemberRow = {
  id: number;
  role: string;
  status: string;
  name: string | null;
} | null;

const findUnique = prisma.clubMember.findUnique as unknown as jest.Mock<
  () => Promise<MemberRow>
>;

const APPROVED_MEMBER = {
  id: 10,
  role: 'MEMBER',
  status: 'APPROVED',
  name: '홍길동',
};

describe('requireClubMember', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('승인된 회원이면 컨텍스트를 반환한다', async () => {
    findUnique.mockResolvedValue(APPROVED_MEMBER);
    await expect(requireClubMember(1, 2)).resolves.toEqual(APPROVED_MEMBER);
  });

  it('클럽 멤버가 아니면 403', async () => {
    findUnique.mockResolvedValue(null);
    await expect(requireClubMember(1, 2)).rejects.toMatchObject({
      status: 403,
    });
  });

  it('휴가 중인 회원도 회원 기능을 쓸 수 있다', async () => {
    findUnique.mockResolvedValue({ ...APPROVED_MEMBER, status: 'ON_LEAVE' });
    await expect(requireClubMember(1, 2)).resolves.toMatchObject({
      status: 'ON_LEAVE',
    });
  });

  it.each(['REJECTED', 'LEFT'])('%s 회원이면 403', async (status) => {
    findUnique.mockResolvedValue({ ...APPROVED_MEMBER, status });
    await expect(requireClubMember(1, 2)).rejects.toMatchObject({
      status: 403,
    });
  });

  it('승인 대기중이면 403', async () => {
    findUnique.mockResolvedValue({ ...APPROVED_MEMBER, status: 'PENDING' });
    await expect(requireClubMember(1, 2)).rejects.toMatchObject({
      status: 403,
    });
  });
});

describe('requireActiveClubMember', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each(['APPROVED', 'ON_LEAVE'])(
    '%s 회원이면 컨텍스트를 반환한다',
    async (status) => {
      findUnique.mockResolvedValue({ ...APPROVED_MEMBER, status });
      await expect(requireActiveClubMember(1, 2)).resolves.toMatchObject({
        status,
      });
    }
  );

  it.each(['PENDING', 'REJECTED', 'LEFT'])(
    '%s 회원이면 403',
    async (status) => {
      findUnique.mockResolvedValue({ ...APPROVED_MEMBER, status });
      await expect(requireActiveClubMember(1, 2)).rejects.toMatchObject({
        status: 403,
      });
    }
  );

  it('클럽 멤버가 아니면 403', async () => {
    findUnique.mockResolvedValue(null);
    await expect(requireActiveClubMember(1, 2)).rejects.toBeInstanceOf(
      ClubAuthError
    );
  });
});

describe('requireClubAdmin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('휴가 중인 임원은 임원 기능을 쓸 수 없다', async () => {
    findUnique.mockResolvedValue({
      ...APPROVED_MEMBER,
      role: 'ADMIN',
      status: 'ON_LEAVE',
    });
    await expect(requireClubAdmin(1, 2)).rejects.toMatchObject({ status: 403 });
  });

  it('ADMIN이면 컨텍스트를 반환한다', async () => {
    findUnique.mockResolvedValue({ ...APPROVED_MEMBER, role: 'ADMIN' });
    await expect(requireClubAdmin(1, 2)).resolves.toMatchObject({
      role: 'ADMIN',
    });
  });

  it('일반 회원이면 403', async () => {
    findUnique.mockResolvedValue(APPROVED_MEMBER);
    await expect(requireClubAdmin(1, 2)).rejects.toMatchObject({ status: 403 });
  });

  it('ClubAuthError 인스턴스를 던진다', async () => {
    findUnique.mockResolvedValue(APPROVED_MEMBER);
    await expect(requireClubAdmin(1, 2)).rejects.toBeInstanceOf(ClubAuthError);
  });
});
