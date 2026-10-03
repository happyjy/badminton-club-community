import {
  ACTIVE_MEMBER_STATUSES,
  isActiveMemberStatus,
} from '@/constants/memberStatus';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/session';

import type { NextApiRequest } from 'next';

export type ClubMemberContext = {
  id: number;
  role: string;
  status: string;
  name: string | null;
};

/**
 * 회원 기능(게시판 등)을 쓸 수 있는 가입 상태.
 * 가입 신청만 한 PENDING이나 REJECTED·LEFT는 회원으로 보지 않는다.
 * 휴가 중(ON_LEAVE)인 회원은 계속 쓸 수 있다.
 * 메뉴도 같은 목록으로 회원 여부를 정한다 (`ACTIVE_MEMBER_STATUSES`).
 */
export const ACTIVE_MEMBER_STATUS = { in: [...ACTIVE_MEMBER_STATUSES] };

/** 임원 기능은 승인된 상태에서만 쓸 수 있다. */
export const APPROVED_STATUS = 'APPROVED';

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
 * 회원 기능을 쓸 수 있는 클럽 회원(승인·휴가)인지 확인한다. 아니면 ClubAuthError를 던진다.
 * 휴가 중인 회원도 대회 신청·운동 참여 같은 회원 기능은 그대로 쓴다.
 */
export async function requireClubMember(
  userId: number,
  clubId: number
): Promise<ClubMemberContext> {
  const member = await findMember(userId, clubId);
  if (!member || !isActiveMemberStatus(member.status)) {
    throw new ClubAuthError('클럽 회원만 이용할 수 있습니다.', 403);
  }
  return member;
}

/**
 * 회원 기능을 쓸 수 있는 회원(APPROVED·ON_LEAVE)인지 확인한다.
 * 아니면 ClubAuthError(403)를 던진다.
 * 휴가 중인 회원도 출석·운동 기능은 계속 써야 하므로 requireClubMember와 구분한다.
 */
export async function requireActiveClubMember(
  userId: number,
  clubId: number
): Promise<ClubMemberContext> {
  const member = await findMember(userId, clubId);
  if (!member || !ACTIVE_MEMBER_STATUS.in.includes(member.status)) {
    throw new ClubAuthError('클럽 회원만 이용할 수 있습니다.', 403);
  }
  return member;
}

/**
 * 클럽 임원(ADMIN)인지 확인한다. 아니면 ClubAuthError를 던진다.
 * 임원 기능은 휴가 중에는 쓸 수 없고 승인 상태여야 한다.
 */
export async function requireClubAdmin(
  userId: number,
  clubId: number
): Promise<ClubMemberContext> {
  const member = await requireClubMember(userId, clubId);
  if (member.role !== 'ADMIN' || member.status !== APPROVED_STATUS) {
    throw new ClubAuthError('권한이 없습니다.', 403);
  }
  return member;
}

/**
 * 요청 쿠키로 로그인 사용자를 확인한 뒤 클럽 임원(ADMIN)인지 확인한다.
 * 같은 API 안에서 조회는 공개, 저장은 임원 전용처럼 메서드별로 권한이
 * 다를 때 withAuth 대신 쓴다. 로그인하지 않았으면 401을 던진다.
 */
export async function requireClubAdminRequest(
  req: NextApiRequest,
  clubId: number
): Promise<ClubMemberContext> {
  const user = await getAuthUser(req);
  if (!user) {
    throw new ClubAuthError('로그인이 필요합니다', 401);
  }
  return requireClubAdmin(user.id, clubId);
}
