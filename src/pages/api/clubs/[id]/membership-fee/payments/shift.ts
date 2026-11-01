import { NextApiRequest, NextApiResponse } from 'next';

import { APPROVED_STATUS } from '@/lib/clubAuth';
import { loadPlannerContext } from '@/lib/membership-fee/confirmPlanner';
import { planPaymentShifts } from '@/lib/membership-fee/paymentShift';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import { paymentShiftSchema } from '@/schemas/membership-fee.schema';
import { Role } from '@/types/enums';

/**
 * POST: 의무가 없어진 달(휴회·탈퇴·가입 전)의 납부를 그 회원의 다음 미납 의무월로 옮긴다.
 * 납부의 연·월만 바뀐다. 어느 입금에서 나온 납부인지와 금액은 그대로다.
 * 응답은 일괄 처리 형식이고, `recordId`에는 납부 내역의 id가 들어간다.
 */
export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: '허용되지 않는 메소드입니다',
      status: 405,
    });
  }

  const { id: clubId } = req.query;

  if (!clubId || typeof clubId !== 'string') {
    return res.status(400).json({
      error: '클럽 ID가 필요합니다',
      status: 400,
    });
  }

  const clubIdNumber = Number(clubId);

  const adminMember = await prisma.clubMember.findFirst({
    where: {
      userId: req.user.id,
      clubId: clubIdNumber,
      role: Role.ADMIN,
      status: APPROVED_STATUS,
    },
  });

  if (!adminMember) {
    return res.status(403).json({
      error: '권한이 없습니다',
      status: 403,
    });
  }

  try {
    const parseResult = paymentShiftSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({
        error: parseResult.error.errors[0].message,
        status: 400,
      });
    }

    const paymentIds = [...new Set(parseResult.data.paymentIds)];

    const [payments, ctx] = await Promise.all([
      prisma.membershipPayment.findMany({
        where: {
          id: { in: paymentIds },
          clubMember: { clubId: clubIdNumber },
        },
        select: { id: true, clubMemberId: true, year: true, month: true },
      }),
      loadPlannerContext(prisma, clubIdNumber),
    ]);

    const results = {
      success: [] as string[],
      failed: [] as { recordId: string; reason: string }[],
    };

    const found = new Set(payments.map((payment) => payment.id));
    for (const id of paymentIds) {
      if (!found.has(id)) {
        results.failed.push({
          recordId: id,
          reason: '납부 내역을 찾을 수 없습니다',
        });
      }
    }

    const plan = planPaymentShifts(ctx, payments);
    for (const { paymentId, reason } of plan.failed) {
      results.failed.push({ recordId: paymentId, reason });
    }

    if (plan.moves.length > 0) {
      await prisma.$transaction(async (tx) => {
        for (const { payment, to } of plan.moves) {
          // 그사이 다른 달로 옮겨졌거나 지워진 납부는 건드리지 않는다
          const { count } = await tx.membershipPayment.updateMany({
            where: { id: payment.id, year: payment.year, month: payment.month },
            data: { year: to.year, month: to.month },
          });
          if (count === 1) {
            results.success.push(payment.id);
          } else {
            results.failed.push({
              recordId: payment.id,
              reason: '그사이 바뀐 납부 내역입니다',
            });
          }
        }
      });
    }

    return res.status(200).json({
      data: {
        results,
        summary: {
          total: paymentIds.length,
          processed: payments.length,
          success: results.success.length,
          failed: results.failed.length,
        },
      },
      status: 200,
      message: `${results.success.length}건 이월, ${results.failed.length}건 실패`,
    });
  } catch (error) {
    console.error('Error shifting payments:', error);
    return res.status(500).json({
      error: '납부월 이월 중 오류가 발생했습니다',
      status: 500,
    });
  }
});
