import type { Prisma, PrismaClient } from '@prisma/client';

/**
 * CoupleHistory(이력) ↔ CoupleGroup(현재 부부) 동기화.
 *
 * 정책: active(endedAt=null) 이력 = 현재 부부 그룹.
 *
 * - 한 회원에게 active 이력 row는 동시에 1건만 허용
 * - 새 active row가 생기면 동일 멤버 쌍으로 CoupleGroup 생성 (이미 있으면 그대로)
 * - active row가 닫히면(endedAt 채워짐) 그 멤버들의 CoupleGroup 삭제
 *
 * 모든 작업은 호출부 트랜잭션(tx) 안에서 실행되어야 정합성을 보장한다.
 */

type Tx = PrismaClient | Prisma.TransactionClient;

/**
 * 두 회원 모두에 대해 active 이력이 다른 partner와 이미 존재하면 충돌.
 * 단, ignoreHistoryId가 주어지면 그 row는 검사 대상에서 제외 (수정 시 자기 자신 무시).
 */
export async function assertNoConflictingActive(
  tx: Tx,
  params: {
    clubId: number;
    clubMemberId: number;
    partnerClubMemberId: number;
    ignoreHistoryId?: number;
  }
): Promise<void> {
  const conflicts = await tx.coupleHistory.findMany({
    where: {
      clubId: params.clubId,
      endedAt: null,
      clubMemberId: { in: [params.clubMemberId, params.partnerClubMemberId] },
      ...(params.ignoreHistoryId
        ? { id: { not: params.ignoreHistoryId } }
        : {}),
    },
    select: {
      clubMemberId: true,
      partnerClubMemberId: true,
    },
  });

  // 같은 짝의 active row가 이미 있으면 OK (등록 시 멱등하게 동작)
  const samePair = conflicts.every(
    (c) =>
      (c.clubMemberId === params.clubMemberId &&
        c.partnerClubMemberId === params.partnerClubMemberId) ||
      (c.clubMemberId === params.partnerClubMemberId &&
        c.partnerClubMemberId === params.clubMemberId)
  );
  if (!samePair) {
    throw new Error(
      '대상 회원이 이미 다른 활성(active) 부부 관계에 속해 있습니다'
    );
  }
}

/**
 * 두 회원으로 구성된 CoupleGroup이 이미 있는지 조회.
 * 멤버가 정확히 두 명이고 두 회원 ID 집합이 일치하는 그룹만 일치로 본다.
 */
async function findGroupForPair(
  tx: Tx,
  clubId: number,
  memberA: number,
  memberB: number
): Promise<{ id: number } | null> {
  const groups = await tx.coupleGroup.findMany({
    where: {
      clubId,
      members: { some: { clubMemberId: memberA } },
    },
    include: { members: { select: { clubMemberId: true } } },
  });
  for (const g of groups) {
    if (g.members.length !== 2) continue;
    const ids = new Set(g.members.map((m) => m.clubMemberId));
    if (ids.has(memberA) && ids.has(memberB)) {
      return { id: g.id };
    }
  }
  return null;
}

/** active 멤버 쌍에 해당하는 CoupleGroup이 없으면 생성 (이미 있으면 그대로). */
export async function ensureGroupForActivePair(
  tx: Tx,
  params: { clubId: number; memberA: number; memberB: number }
): Promise<void> {
  const existing = await findGroupForPair(
    tx,
    params.clubId,
    params.memberA,
    params.memberB
  );
  if (existing) return;
  await tx.coupleGroup.create({
    data: {
      clubId: params.clubId,
      members: {
        create: [
          { clubMemberId: params.memberA },
          { clubMemberId: params.memberB },
        ],
      },
    },
  });
}

/**
 * 멤버 쌍이 더 이상 active가 아니면 그룹을 제거.
 * (다른 active row가 있으면 그대로 둔다 — 화면에서 멱등하게 활성 1건 유지를 책임짐)
 */
export async function removeGroupIfNoActivePair(
  tx: Tx,
  params: { clubId: number; memberA: number; memberB: number }
): Promise<void> {
  const stillActive = await tx.coupleHistory.findFirst({
    where: {
      clubId: params.clubId,
      endedAt: null,
      OR: [
        {
          clubMemberId: params.memberA,
          partnerClubMemberId: params.memberB,
        },
        {
          clubMemberId: params.memberB,
          partnerClubMemberId: params.memberA,
        },
      ],
    },
    select: { id: true },
  });
  if (stillActive) return;

  const group = await findGroupForPair(
    tx,
    params.clubId,
    params.memberA,
    params.memberB
  );
  if (!group) return;
  await tx.coupleGroup.delete({ where: { id: group.id } });
}
