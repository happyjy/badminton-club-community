import { FeePeriod } from '@prisma/client';
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

      // FeeType과 해당 연도의 FeeRate 조회
      const feeTypes = await prisma.feeType.findMany({
        where: {
          clubId: clubIdNumber,
          isActive: true,
        },
        include: {
          rates: {
            where: {
              year: targetYear,
            },
            orderBy: {
              period: 'asc',
            },
          },
        },
        orderBy: {
          sortOrder: 'asc',
        },
      });

      // 하위 호환성을 위한 간단한 설정 추출 (일반/부부 MONTHLY 기준)
      const regularType = feeTypes.find((t) => t.name === '일반');
      const coupleType = feeTypes.find((t) => t.name === '부부');

      const regularMonthlyRate = regularType?.rates.find(
        (r) => r.period === FeePeriod.MONTHLY
      );
      const coupleMonthlyRate = coupleType?.rates.find(
        (r) => r.period === FeePeriod.MONTHLY
      );

      const settings = {
        year: targetYear,
        regularAmount: regularMonthlyRate?.amount || 0,
        coupleAmount: coupleMonthlyRate?.amount || 0,
        feeTypes,
      };

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

      // 트랜잭션으로 일반/부부 유형과 금액 설정
      await prisma.$transaction(async (tx) => {
        // 일반 유형 생성/조회
        const regularType = await tx.feeType.upsert({
          where: {
            clubId_name: {
              clubId: clubIdNumber,
              name: '일반',
            },
          },
          update: {},
          create: {
            clubId: clubIdNumber,
            name: '일반',
            description: '일반 회원 회비',
            sortOrder: 0,
          },
        });

        // 부부 유형 생성/조회
        const coupleType = await tx.feeType.upsert({
          where: {
            clubId_name: {
              clubId: clubIdNumber,
              name: '부부',
            },
          },
          update: {},
          create: {
            clubId: clubIdNumber,
            name: '부부',
            description: '부부 회원 회비 (2인 합산)',
            sortOrder: 1,
          },
        });

        // 일반 - 월납 금액 설정
        await tx.feeRate.upsert({
          where: {
            feeTypeId_year_period: {
              feeTypeId: regularType.id,
              year,
              period: FeePeriod.MONTHLY,
            },
          },
          update: {
            amount: regularAmount,
            monthCount: 1,
          },
          create: {
            feeTypeId: regularType.id,
            year,
            period: FeePeriod.MONTHLY,
            amount: regularAmount,
            monthCount: 1,
          },
        });

        // 일반 - 연납 금액 설정 (12개월 = 월납 x 12, 할인 없음 기본)
        await tx.feeRate.upsert({
          where: {
            feeTypeId_year_period: {
              feeTypeId: regularType.id,
              year,
              period: FeePeriod.ANNUAL,
            },
          },
          update: {
            amount: regularAmount * 12,
            monthCount: 12,
          },
          create: {
            feeTypeId: regularType.id,
            year,
            period: FeePeriod.ANNUAL,
            amount: regularAmount * 12,
            monthCount: 12,
          },
        });

        // 부부 - 월납 금액 설정
        await tx.feeRate.upsert({
          where: {
            feeTypeId_year_period: {
              feeTypeId: coupleType.id,
              year,
              period: FeePeriod.MONTHLY,
            },
          },
          update: {
            amount: coupleAmount,
            monthCount: 1,
          },
          create: {
            feeTypeId: coupleType.id,
            year,
            period: FeePeriod.MONTHLY,
            amount: coupleAmount,
            monthCount: 1,
          },
        });

        // 부부 - 연납 금액 설정
        await tx.feeRate.upsert({
          where: {
            feeTypeId_year_period: {
              feeTypeId: coupleType.id,
              year,
              period: FeePeriod.ANNUAL,
            },
          },
          update: {
            amount: coupleAmount * 12,
            monthCount: 12,
          },
          create: {
            feeTypeId: coupleType.id,
            year,
            period: FeePeriod.ANNUAL,
            amount: coupleAmount * 12,
            monthCount: 12,
          },
        });
      });

      // 저장된 설정 다시 조회
      const feeTypes = await prisma.feeType.findMany({
        where: {
          clubId: clubIdNumber,
          isActive: true,
        },
        include: {
          rates: {
            where: {
              year,
            },
          },
        },
        orderBy: {
          sortOrder: 'asc',
        },
      });

      const settings = {
        year,
        regularAmount,
        coupleAmount,
        feeTypes,
      };

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
