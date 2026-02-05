import { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import { coupleGroupSchema } from '@/schemas/membership-fee.schema';
import { Role } from '@/types/enums';

export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse
) {
  const { id: clubId } = req.query;

  if (!clubId || typeof clubId !== 'string') {
    return res.status(400).json({
      error: '클럽 ID가 필요합니다',
      status: 400,
    });
  }

  const clubIdNumber = Number(clubId);

  // ADMIN 권한 확인
  const adminMember = await prisma.clubMember.findFirst({
    where: {
      userId: req.user.id,
      clubId: clubIdNumber,
      role: Role.ADMIN,
    },
  });

  if (!adminMember) {
    return res.status(403).json({
      error: '권한이 없습니다',
      status: 403,
    });
  }

  try {
    if (req.method === 'GET') {
      const coupleGroups = await prisma.coupleGroup.findMany({
        where: { clubId: clubIdNumber },
        include: {
          members: {
            include: {
              clubMember: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.status(200).json({
        data: { coupleGroups },
        status: 200,
        message: '부부 그룹 목록을 불러왔습니다',
      });
    }

    if (req.method === 'POST') {
      const parseResult = coupleGroupSchema.safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({
          error: parseResult.error.errors[0].message,
          status: 400,
        });
      }

      const { memberIds } = parseResult.data;

      // 이미 다른 부부 그룹에 속한 회원이 있는지 확인
      const existingMembers = await prisma.coupleMember.findMany({
        where: {
          clubMemberId: { in: memberIds },
        },
        include: {
          clubMember: {
            select: { name: true },
          },
        },
      });

      if (existingMembers.length > 0) {
        const names = existingMembers
          .map((m) => m.clubMember.name)
          .filter(Boolean)
          .join(', ');
        return res.status(400).json({
          error: `${names}님은 이미 다른 부부 그룹에 속해 있습니다`,
          status: 400,
        });
      }

      // 회원이 해당 클럽 소속인지 확인
      const clubMembers = await prisma.clubMember.findMany({
        where: {
          id: { in: memberIds },
          clubId: clubIdNumber,
        },
      });

      if (clubMembers.length !== memberIds.length) {
        return res.status(400).json({
          error: '해당 클럽에 속하지 않은 회원이 포함되어 있습니다',
          status: 400,
        });
      }

      // 부부 그룹 생성
      const coupleGroup = await prisma.coupleGroup.create({
        data: {
          clubId: clubIdNumber,
          members: {
            create: memberIds.map((clubMemberId) => ({
              clubMemberId,
            })),
          },
        },
        include: {
          members: {
            include: {
              clubMember: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      return res.status(201).json({
        data: { coupleGroup },
        status: 201,
        message: '부부 그룹이 등록되었습니다',
      });
    }

    return res.status(405).json({
      error: '허용되지 않는 메소드입니다',
      status: 405,
    });
  } catch (error) {
    console.error('Error in couple groups:', error);
    return res.status(500).json({
      error: '부부 그룹 처리 중 오류가 발생했습니다',
      status: 500,
    });
  }
});
