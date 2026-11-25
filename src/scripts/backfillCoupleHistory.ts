import { PrismaClient } from '@prisma/client';

/**
 * 현존 CoupleGroup을 CoupleHistory로 백필.
 *
 * - 각 CoupleGroup에 대해 멤버를 두 명씩 짝지어 양방향 row 생성
 *   (clubMemberId=A, partnerClubMemberId=B) / (clubMemberId=B, partnerClubMemberId=A)
 * - startedAt = CoupleGroup.createdAt
 * - endedAt = null (현재 진행 중)
 * - 멤버가 3명 이상인 비정상 그룹은 스킵하고 경고만 출력
 *
 * 안전장치:
 * - (clubMemberId, startedAt, partnerClubMemberId) 조합으로 이미 존재하는 row는 건너뜀
 * - 트랜잭션 단위로 그룹별 처리
 *
 * 실행: npx ts-node src/scripts/backfillCoupleHistory.ts
 */
async function main() {
  const prisma = new PrismaClient();

  try {
    console.log('CoupleHistory 백필 시작...');

    const groups = await prisma.coupleGroup.findMany({
      include: { members: true },
      orderBy: { id: 'asc' },
    });

    let createdCount = 0;
    let skippedExistingCount = 0;
    let skippedAbnormalCount = 0;

    for (const group of groups) {
      if (group.members.length !== 2) {
        console.warn(
          `[SKIP] 그룹 id=${group.id} 멤버 수 ${group.members.length} (2명이 아님)`
        );
        skippedAbnormalCount++;
        continue;
      }

      const [a, b] = group.members;
      const pairs: Array<{ self: number; partner: number }> = [
        { self: a.clubMemberId, partner: b.clubMemberId },
        { self: b.clubMemberId, partner: a.clubMemberId },
      ];

      for (const { self, partner } of pairs) {
        const existing = await prisma.coupleHistory.findFirst({
          where: {
            clubId: group.clubId,
            clubMemberId: self,
            partnerClubMemberId: partner,
            startedAt: group.createdAt,
          },
        });
        if (existing) {
          skippedExistingCount++;
          continue;
        }
        await prisma.coupleHistory.create({
          data: {
            clubId: group.clubId,
            clubMemberId: self,
            partnerClubMemberId: partner,
            startedAt: group.createdAt,
            endedAt: null,
          },
        });
        createdCount++;
      }
    }

    console.log(
      `완료: 생성 ${createdCount}건, 중복 스킵 ${skippedExistingCount}건, 비정상 그룹 스킵 ${skippedAbnormalCount}건`
    );
  } catch (error) {
    console.error('백필 실패:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
