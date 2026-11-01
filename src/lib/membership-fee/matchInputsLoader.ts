import type { PlannerContext } from './confirmPlanner';
import type { MatchInputs } from './uploadPipeline';
import type { PrismaClient } from '@prisma/client';

/**
 * 입금자명으로 회원을 찾는 데 필요한 클럽의 회원과 부부 그룹을 읽는다.
 * 업로드와, 분류를 회비로 되돌릴 때의 재매칭이 같은 입력을 쓴다.
 */
export async function loadMatchInputs(
  prisma: PrismaClient,
  clubId: number,
  ctx: Pick<PlannerContext, 'leaveMap'>
): Promise<MatchInputs> {
  const [members, coupleGroups] = await Promise.all([
    prisma.clubMember.findMany({
      where: { clubId },
      select: {
        id: true,
        name: true,
        status: true,
        leftAt: true,
        feeObligationStartAt: true,
      },
    }),
    prisma.coupleGroup.findMany({
      where: { clubId },
      include: {
        members: {
          include: {
            clubMember: {
              select: {
                id: true,
                name: true,
                feeObligationStartAt: true,
                leftAt: true,
              },
            },
          },
        },
      },
    }),
  ]);

  return {
    members,
    coupleGroups: coupleGroups.map((group) => ({
      id: group.id,
      members: group.members.map((member) => ({
        clubMemberId: member.clubMemberId,
        clubMember: {
          ...member.clubMember,
          leavePeriods: ctx.leaveMap.get(member.clubMemberId) ?? [],
        },
      })),
    })),
  };
}
