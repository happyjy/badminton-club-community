import { NextApiRequest, NextApiResponse } from 'next';

import { APPROVED_STATUS } from '@/lib/clubAuth';
import { manualPaymentBlockReason } from '@/lib/membership-fee/manualPayment';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import { manualPaymentSchema } from '@/schemas/membership-fee.schema';
import { Role } from '@/types/enums';
import type { ManualPaymentItem } from '@/types/membership-fee.types';

/** 넣을 수 없는 달일 때 트랜잭션을 되돌리고 그 까닭을 400으로 알린다 */
class ManualPaymentBlocked extends Error {}

type ManualPaymentRow = {
  id: string;
  year: number;
  month: number;
  amount: number;
  manualReason: string | null;
  confirmedAt: Date;
  confirmedById: number;
};

async function toItems(rows: ManualPaymentRow[]): Promise<ManualPaymentItem[]> {
  const confirmers = await prisma.clubMember.findMany({
    where: { id: { in: [...new Set(rows.map((row) => row.confirmedById))] } },
    select: { id: true, name: true },
  });
  const nameOf = new Map(confirmers.map((m) => [m.id, m.name]));
  return rows.map((row) => ({
    id: row.id,
    year: row.year,
    month: row.month,
    amount: row.amount,
    reason: row.manualReason ?? '',
    confirmedAt: new Date(row.confirmedAt).toISOString(),
    confirmedByName: nameOf.get(row.confirmedById) ?? null,
  }));
}

/**
 * GET: 그 회원의 직접 추가한 납부(통장 입금 없음) 목록, 최근 달부터 (관리자).
 * POST: 한 달을 직접 추가한다 (관리자). 이미 납부가 있거나 의무·면제로 낼 달이 아니면 400.
 */
export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse
) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({
      error: '허용되지 않는 메소드입니다',
      status: 405,
    });
  }

  const clubId = Number(req.query.id);
  const userId = Number(req.query.userId);
  if (!Number.isFinite(clubId) || !Number.isFinite(userId)) {
    return res.status(400).json({
      error: '클럽 ID와 회원 ID가 필요합니다',
      status: 400,
    });
  }

  const adminMember = await prisma.clubMember.findFirst({
    where: {
      clubId,
      userId: req.user.id,
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
    const member = await prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId, userId } },
    });
    if (!member) {
      return res.status(404).json({
        error: '회원을 찾을 수 없습니다',
        status: 404,
      });
    }

    if (req.method === 'GET') {
      const rows = await prisma.membershipPayment.findMany({
        where: { clubMemberId: member.id, paymentRecordId: null },
      });
      const sorted = [...rows].sort(
        (a, b) => b.year - a.year || b.month - a.month
      );
      return res.status(200).json({
        data: { payments: await toItems(sorted) },
        status: 200,
        message: '직접 추가한 납부를 조회했습니다',
      });
    }

    const parseResult = manualPaymentSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: parseResult.error.errors[0].message,
        status: 400,
      });
    }
    const { year, month, amount, reason } = parseResult.data;

    const created = await prisma.$transaction(async (tx) => {
      // 같은 회원의 입금 확정과 겹치지 않게 회원 행을 잠그고, 잠근 뒤에 다시 검사한다 (applyPlan과 같다).
      await tx.$queryRaw`SELECT "id" FROM "ClubMember" WHERE "id" = ${member.id} FOR UPDATE`;
      const [leaves, exemptions, paid] = await Promise.all([
        tx.memberLeave.findMany({ where: { clubMemberId: member.id } }),
        tx.feeExemption.findMany({ where: { clubMemberId: member.id } }),
        tx.membershipPayment.findMany({
          where: { clubMemberId: member.id, year },
        }),
      ]);
      const blocked = manualPaymentBlockReason(
        {
          status: member.status,
          feeObligationStartAt: member.feeObligationStartAt,
          leftAt: member.leftAt,
          leavePeriods: leaves,
          exemptions,
          paidMonths: paid,
        },
        year,
        month
      );
      if (blocked) throw new ManualPaymentBlocked(blocked);

      return tx.membershipPayment.create({
        data: {
          clubMemberId: member.id,
          paymentRecordId: null,
          year,
          month,
          amount,
          period: 'MONTHLY',
          manualReason: reason,
          confirmedById: adminMember.id,
        },
      });
    });

    const [payment] = await toItems([created]);
    return res.status(201).json({
      data: { payment },
      status: 201,
      message: '납부를 직접 추가했습니다',
    });
  } catch (error) {
    if (error instanceof ManualPaymentBlocked) {
      return res.status(400).json({ error: error.message, status: 400 });
    }
    console.error('Error in manual-payments:', error);
    return res.status(500).json({
      error: '처리 중 오류가 발생했습니다',
      status: 500,
    });
  }
});
