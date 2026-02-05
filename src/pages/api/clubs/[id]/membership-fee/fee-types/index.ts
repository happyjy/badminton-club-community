import { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import { feeTypeSchema } from '@/schemas/membership-fee.schema';
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
    // GET: 회비 유형 목록 조회
    if (req.method === 'GET') {
      const { year, includeRates } = req.query;

      const feeTypes = await prisma.feeType.findMany({
        where: {
          clubId: clubIdNumber,
        },
        include: {
          rates:
            includeRates === 'true'
              ? {
                  where: year
                    ? {
                        year: Number(year),
                      }
                    : undefined,
                  orderBy: {
                    period: 'asc',
                  },
                }
              : false,
          _count: {
            select: {
              members: true,
            },
          },
        },
        orderBy: {
          sortOrder: 'asc',
        },
      });

      return res.status(200).json({
        data: { feeTypes },
        status: 200,
        message: '회비 유형 목록을 불러왔습니다',
      });
    }

    // POST: 회비 유형 생성
    if (req.method === 'POST') {
      const parseResult = feeTypeSchema.safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({
          error: parseResult.error.errors[0].message,
          status: 400,
        });
      }

      const { name, description, isActive, sortOrder } = parseResult.data;

      // 중복 이름 확인
      const existing = await prisma.feeType.findUnique({
        where: {
          clubId_name: {
            clubId: clubIdNumber,
            name,
          },
        },
      });

      if (existing) {
        return res.status(400).json({
          error: '이미 존재하는 회비 유형 이름입니다',
          status: 400,
        });
      }

      const feeType = await prisma.feeType.create({
        data: {
          clubId: clubIdNumber,
          name,
          description,
          isActive,
          sortOrder,
        },
      });

      return res.status(201).json({
        data: { feeType },
        status: 201,
        message: '회비 유형이 생성되었습니다',
      });
    }

    return res.status(405).json({
      error: '허용되지 않는 메소드입니다',
      status: 405,
    });
  } catch (error) {
    console.error('Error in fee types:', error);
    return res.status(500).json({
      error: '회비 유형 처리 중 오류가 발생했습니다',
      status: 500,
    });
  }
});
