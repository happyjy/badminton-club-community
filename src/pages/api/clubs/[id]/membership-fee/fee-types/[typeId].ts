import { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import { feeTypeSchema } from '@/schemas/membership-fee.schema';
import { Role } from '@/types/enums';

export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse
) {
  const { id: clubId, typeId } = req.query;

  if (!clubId || typeof clubId !== 'string') {
    return res.status(400).json({
      error: '클럽 ID가 필요합니다',
      status: 400,
    });
  }

  if (!typeId || typeof typeId !== 'string') {
    return res.status(400).json({
      error: '회비 유형 ID가 필요합니다',
      status: 400,
    });
  }

  const clubIdNumber = Number(clubId);
  const typeIdNumber = Number(typeId);

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

  // 회비 유형 존재 확인
  const feeType = await prisma.feeType.findFirst({
    where: {
      id: typeIdNumber,
      clubId: clubIdNumber,
    },
    include: {
      _count: {
        select: {
          members: true,
        },
      },
    },
  });

  if (!feeType) {
    return res.status(404).json({
      error: '회비 유형을 찾을 수 없습니다',
      status: 404,
    });
  }

  try {
    // GET: 회비 유형 상세 조회
    if (req.method === 'GET') {
      const { year } = req.query;

      const feeTypeWithRates = await prisma.feeType.findUnique({
        where: { id: typeIdNumber },
        include: {
          rates: {
            where: year
              ? {
                  year: Number(year),
                }
              : undefined,
            orderBy: [{ year: 'desc' }, { period: 'asc' }],
          },
          members: {
            include: {
              clubMember: {
                select: { id: true, name: true },
              },
            },
          },
        },
      });

      return res.status(200).json({
        data: { feeType: feeTypeWithRates },
        status: 200,
        message: '회비 유형을 불러왔습니다',
      });
    }

    // PUT: 회비 유형 수정
    if (req.method === 'PUT') {
      const parseResult = feeTypeSchema.safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({
          error: parseResult.error.errors[0].message,
          status: 400,
        });
      }

      const { name, description, isActive, sortOrder } = parseResult.data;

      // 이름 변경 시 중복 확인
      if (name !== feeType.name) {
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
      }

      const updatedFeeType = await prisma.feeType.update({
        where: { id: typeIdNumber },
        data: {
          name,
          description,
          isActive,
          sortOrder,
        },
      });

      return res.status(200).json({
        data: { feeType: updatedFeeType },
        status: 200,
        message: '회비 유형이 수정되었습니다',
      });
    }

    // DELETE: 회비 유형 삭제
    if (req.method === 'DELETE') {
      // 사용 중인 유형은 삭제 불가
      if (feeType._count.members > 0) {
        return res.status(400).json({
          error: `이 유형을 사용 중인 회원이 ${feeType._count.members}명 있습니다. 먼저 회원의 유형을 변경해주세요.`,
          status: 400,
        });
      }

      await prisma.feeType.delete({
        where: { id: typeIdNumber },
      });

      return res.status(200).json({
        status: 200,
        message: '회비 유형이 삭제되었습니다',
      });
    }

    return res.status(405).json({
      error: '허용되지 않는 메소드입니다',
      status: 405,
    });
  } catch (error) {
    console.error('Error in fee type:', error);
    return res.status(500).json({
      error: '회비 유형 처리 중 오류가 발생했습니다',
      status: 500,
    });
  }
});
