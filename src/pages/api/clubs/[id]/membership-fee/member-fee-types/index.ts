import { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import { memberFeeTypeSchema } from '@/schemas/membership-fee.schema';
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
    // GET: 회원 회비 유형 목록 조회
    if (req.method === 'GET') {
      const { feeTypeId } = req.query;

      const where: {
        clubMember: { clubId: number };
        feeTypeId?: number;
      } = {
        clubMember: {
          clubId: clubIdNumber,
        },
      };

      if (feeTypeId) {
        where.feeTypeId = Number(feeTypeId);
      }

      const memberFeeTypes = await prisma.memberFeeType.findMany({
        where,
        include: {
          clubMember: {
            select: {
              id: true,
              name: true,
            },
          },
          feeType: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          clubMember: {
            name: 'asc',
          },
        },
      });

      return res.status(200).json({
        data: { memberFeeTypes },
        status: 200,
        message: '회원 회비 유형 목록을 불러왔습니다',
      });
    }

    // POST: 회원 회비 유형 지정
    if (req.method === 'POST') {
      const parseResult = memberFeeTypeSchema.safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({
          error: parseResult.error.errors[0].message,
          status: 400,
        });
      }

      const { clubMemberId, feeTypeId } = parseResult.data;

      // 회원이 해당 클럽에 속하는지 확인
      const clubMember = await prisma.clubMember.findFirst({
        where: {
          id: clubMemberId,
          clubId: clubIdNumber,
        },
      });

      if (!clubMember) {
        return res.status(404).json({
          error: '회원을 찾을 수 없습니다',
          status: 404,
        });
      }

      // 회비 유형이 해당 클럽에 속하는지 확인
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

      // upsert로 생성 또는 업데이트
      const memberFeeType = await prisma.memberFeeType.upsert({
        where: {
          clubMemberId,
        },
        update: {
          feeTypeId,
        },
        create: {
          clubMemberId,
          feeTypeId,
        },
        include: {
          clubMember: {
            select: {
              id: true,
              name: true,
            },
          },
          feeType: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return res.status(200).json({
        data: { memberFeeType },
        status: 200,
        message: '회원 회비 유형이 지정되었습니다',
      });
    }

    return res.status(405).json({
      error: '허용되지 않는 메소드입니다',
      status: 405,
    });
  } catch (error) {
    console.error('Error in member fee types:', error);
    return res.status(500).json({
      error: '회원 회비 유형 처리 중 오류가 발생했습니다',
      status: 500,
    });
  }
});
