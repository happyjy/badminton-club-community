import { prisma } from '@/lib/prisma';

export type ClubMemberContext = {
  id: number;
  role: string;
  status: string;
  name: string | null;
};

export class ClubAuthError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ClubAuthError';
    this.status = status;
  }
}

async function findMember(
  userId: number,
  clubId: number
): Promise<ClubMemberContext | null> {
  return prisma.clubMember.findUnique({
    where: { clubId_userId: { clubId, userId } },
    select: { id: true, role: true, status: true, name: true },
  });
}

/**
 * 승인된 클럽 회원인지 확인한다. 아니면 ClubAuthError를 던진다.
 */
export async function requireClubMember(
  userId: number,
  clubId: number
): Promise<ClubMemberContext> {
  const member = await findMember(userId, clubId);
  if (!member || member.status !== 'APPROVED') {
    throw new ClubAuthError('클럽 회원만 이용할 수 있습니다.', 403);
  }
  return member;
}

/**
 * 클럽 임원(ADMIN)인지 확인한다. 아니면 ClubAuthError를 던진다.
 */
export async function requireClubAdmin(
  userId: number,
  clubId: number
): Promise<ClubMemberContext> {
  const member = await requireClubMember(userId, clubId);
  if (member.role !== 'ADMIN') {
    throw new ClubAuthError('권한이 없습니다.', 403);
  }
  return member;
}
