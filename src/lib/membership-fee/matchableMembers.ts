import { kstMonthIndex } from './kst';

import type { Prisma } from '@prisma/client';

/**
 * 입금을 매칭할 후보 회원의 조건.
 * 업로드 자동 매칭(`isMatchableAt`)과 회원 드롭다운(`matchableMembersWhere`)이 쓴다.
 */

interface MatchableMemberFields {
  status: string;
  leftAt: Date | null;
  feeObligationStartAt: Date | null;
}

/**
 * 의무 구간 앞뒤로 봐주는 개월 수.
 * 신규 회원은 가입비와 첫 달 회비를 의무 시작 전 달에 내고,
 * 탈퇴 회원은 마지막 달 회비를 다음 달에 내는 일이 있다.
 */
const GRACE_MONTHS = 1;

/** 거래일에 자동 매칭 후보가 되는 회원인지 (월 단위로 본다) */
export function isMatchableAt(
  member: MatchableMemberFields,
  at: Date
): boolean {
  if (member.status !== 'APPROVED' && member.status !== 'LEFT') return false;
  const atMonth = kstMonthIndex(at);
  if (member.leftAt && kstMonthIndex(member.leftAt) + GRACE_MONTHS < atMonth) {
    return false;
  }
  if (
    member.feeObligationStartAt &&
    kstMonthIndex(member.feeObligationStartAt) - GRACE_MONTHS > atMonth
  ) {
    return false;
  }
  return true;
}

/** 거래일 범위 [from, to]에 한 번이라도 활동한 회원의 조회 조건 */
export function matchableMembersWhere(
  clubId: number,
  from: Date,
  to: Date
): Prisma.ClubMemberWhereInput {
  return {
    clubId,
    status: { in: ['APPROVED', 'LEFT'] },
    // 거래일 범위 시작 이후에 탈퇴했거나 아직 활동 중인 회원
    OR: [{ leftAt: null }, { leftAt: { gte: from } }],
    // 회비 의무 시작이 거래일 범위 끝 이전인 회원만 (의무 시작 전 매칭 방지)
    AND: [
      {
        OR: [
          { feeObligationStartAt: null },
          { feeObligationStartAt: { lte: to } },
        ],
      },
    ],
  };
}
