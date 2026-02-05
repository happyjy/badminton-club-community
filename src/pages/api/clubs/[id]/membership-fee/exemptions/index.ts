import { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import { feeExemptionSchema } from '@/schemas/membership-fee.schema';
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
      const { year } = req.query;
      const targetYear = year ? Number(year) : new Date().getFullYear();

      const exemptions = await prisma.feeExemption.findMany({
        where: {
          clubMember: { clubId: clubIdNumber },
          year: targetYear,
        },
        include: {
          clubMember: {
            select: {
              id: true,
              name: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.status(200).json({
        data: { exemptions },
        status: 200,
        message: '면제 목록을 불러왔습니다',
      });
    }

    if (req.method === 'POST') {
      const parseResult = feeExemptionSchema.safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({
          error: parseResult.error.errors[0].message,
          status: 400,
        });
      }

      const { clubMemberId, year, reason } = parseResult.data;

      // 회원이 해당 클럽 소속인지 확인
      const clubMember = await prisma.clubMember.findFirst({
        where: {
          id: clubMemberId,
          clubId: clubIdNumber,
        },
      });

      if (!clubMember) {
        return res.status(400).json({
          error: '해당 클럽에 속하지 않은 회원입니다',
          status: 400,
        });
      }

      // 이미 면제 등록된 경우 확인
      const existingExemption = await prisma.feeExemption.findUnique({
        where: {
          clubMemberId_year: {
            clubMemberId,
            year,
          },
        },
      });

      if (existingExemption) {
        return res.status(400).json({
          error: '해당 연도에 이미 면제 등록되어 있습니다',
          status: 400,
        });
      }

      const exemption = await prisma.feeExemption.create({
        data: {
          clubMemberId,
          year,
          reason,
          createdById: adminMember.id,
        },
        include: {
          clubMember: {
            select: {
              id: true,
              name: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return res.status(201).json({
        data: { exemption },
        status: 201,
        message: '면제가 등록되었습니다',
      });
    }

    return res.status(405).json({
      error: '허용되지 않는 메소드입니다',
      status: 405,
    });
  } catch (error) {
    console.error('Error in fee exemptions:', error);
    return res.status(500).json({
      error: '면제 처리 중 오류가 발생했습니다',
      status: 500,
    });
  }
});
