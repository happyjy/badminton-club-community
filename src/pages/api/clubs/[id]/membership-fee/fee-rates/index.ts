import { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import {
  feeRateSchema,
  feeRateBulkSchema,
} from '@/schemas/membership-fee.schema';
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
    // GET: 회비 금액 목록 조회
    if (req.method === 'GET') {
      const { year, feeTypeId } = req.query;

      const where: {
        feeType: { clubId: number };
        year?: number;
        feeTypeId?: number;
      } = {
        feeType: {
          clubId: clubIdNumber,
        },
      };

      if (year) {
        where.year = Number(year);
      }

      if (feeTypeId) {
        where.feeTypeId = Number(feeTypeId);
      }

      const feeRates = await prisma.feeRate.findMany({
        where,
        include: {
          feeType: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
        orderBy: [{ feeTypeId: 'asc' }, { year: 'desc' }, { period: 'asc' }],
      });

      return res.status(200).json({
        data: { feeRates },
        status: 200,
        message: '회비 금액 목록을 불러왔습니다',
      });
    }

    // POST: 회비 금액 생성/수정 (단일)
    if (req.method === 'POST') {
      const parseResult = feeRateSchema.safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({
          error: parseResult.error.errors[0].message,
          status: 400,
        });
      }

      const { feeTypeId, year, period, amount, monthCount } = parseResult.data;

      // feeType이 해당 클럽에 속하는지 확인
      const feeType = await prisma.feeType.findFirst({
        where: {
          id: feeTypeId,
          clubId: clubIdNumber,
        },
      });

      if (!feeType) {
        return res.status(404).json({
          error: '회비 유형을 찾을 수 없습니다',
          status: 404,
        });
      }

      const feeRate = await prisma.feeRate.upsert({
        where: {
          feeTypeId_year_period: {
            feeTypeId,
            year,
            period,
          },
        },
        update: {
          amount,
          monthCount,
        },
        create: {
          feeTypeId,
          year,
          period,
          amount,
          monthCount,
        },
        include: {
          feeType: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return res.status(200).json({
        data: { feeRate },
        status: 200,
        message: '회비 금액이 저장되었습니다',
      });
    }

    // PUT: 회비 금액 일괄 설정 (한 유형의 모든 주기)
    if (req.method === 'PUT') {
      const parseResult = feeRateBulkSchema.safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({
          error: parseResult.error.errors[0].message,
          status: 400,
        });
      }

      const { feeTypeId, year, rates } = parseResult.data;

      // feeType이 해당 클럽에 속하는지 확인
      const feeType = await prisma.feeType.findFirst({
        where: {
          id: feeTypeId,
          clubId: clubIdNumber,
        },
      });

      if (!feeType) {
        return res.status(404).json({
          error: '회비 유형을 찾을 수 없습니다',
          status: 404,
        });
      }

      // 트랜잭션으로 일괄 처리
      const updatedRates = await prisma.$transaction(
        rates.map((rate) =>
          prisma.feeRate.upsert({
            where: {
              feeTypeId_year_period: {
                feeTypeId,
                year,
                period: rate.period,
              },
            },
            update: {
              amount: rate.amount,
              monthCount: rate.monthCount,
            },
            create: {
              feeTypeId,
              year,
              period: rate.period,
              amount: rate.amount,
              monthCount: rate.monthCount,
            },
            include: {
              feeType: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          })
        )
      );

      return res.status(200).json({
        data: { feeRates: updatedRates },
        status: 200,
        message: '회비 금액이 일괄 저장되었습니다',
      });
    }

    return res.status(405).json({
      error: '허용되지 않는 메소드입니다',
      status: 405,
    });
  } catch (error) {
    console.error('Error in fee rates:', error);
    return res.status(500).json({
      error: '회비 금액 처리 중 오류가 발생했습니다',
      status: 500,
    });
  }
});
