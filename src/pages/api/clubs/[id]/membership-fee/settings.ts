import { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import { membershipFeeSettingsSchema } from '@/schemas/membership-fee.schema';
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

      const settings = await prisma.membershipFee.findUnique({
        where: {
          clubId_year: {
            clubId: clubIdNumber,
            year: targetYear,
          },
        },
      });

      return res.status(200).json({
        data: { settings },
        status: 200,
        message: '회비 설정을 불러왔습니다',
      });
    }

    if (req.method === 'POST') {
      const parseResult = membershipFeeSettingsSchema.safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({
          error: parseResult.error.errors[0].message,
          status: 400,
        });
      }

      const { year, regularAmount, coupleAmount } = parseResult.data;

      const settings = await prisma.membershipFee.upsert({
        where: {
          clubId_year: {
            clubId: clubIdNumber,
            year,
          },
        },
        update: {
          regularAmount,
          coupleAmount,
        },
        create: {
          clubId: clubIdNumber,
          year,
          regularAmount,
          coupleAmount,
        },
      });

      return res.status(200).json({
        data: { settings },
        status: 200,
        message: '회비 설정이 저장되었습니다',
      });
    }

    return res.status(405).json({
      error: '허용되지 않는 메소드입니다',
      status: 405,
    });
  } catch (error) {
    console.error('Error in membership fee settings:', error);
    return res.status(500).json({
      error: '회비 설정 처리 중 오류가 발생했습니다',
      status: 500,
    });
  }
});
