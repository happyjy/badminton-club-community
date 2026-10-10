import { NextApiRequest, NextApiResponse } from 'next';

import { APPROVED_STATUS } from '@/lib/clubAuth';
import {
  loadPlannerContext,
  ratesForYear,
} from '@/lib/membership-fee/confirmPlanner';
import { kstYearMonth } from '@/lib/membership-fee/kst';
import { loadMatchInputs } from '@/lib/membership-fee/matchInputsLoader';
import {
  manualKindReason,
  PAYMENT_KIND_LABEL,
} from '@/lib/membership-fee/paymentKind';
import { judgeStoredState } from '@/lib/membership-fee/rejudgeRecord';
import { rematchMembers } from '@/lib/membership-fee/uploadPipeline';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import { bulkSetKindSchema } from '@/schemas/membership-fee.schema';
import { Role } from '@/types/enums';

import type { Prisma } from '@prisma/client';

/**
 * POST: 고른 입금 내역의 분류를 한 번에 바꾼다.
 * 회비가 아닌 분류로 바꾸면 건너뜀이 되고, 회비로 바꾸면 매칭 회원을 보고 상태를 다시 정한다
 * (단건 수정과 같은 규칙). 매칭 회원이 없던 건은 입금자명으로 회원을 다시 찾는다.
 * 확정된 건은 바꾸지 않는다.
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
    const parseResult = bulkSetKindSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({
        error: parseResult.error.errors[0].message,
        status: 400,
      });
    }

    const { kind } = parseResult.data;
    const recordIds = [...new Set(parseResult.data.recordIds)];

    const records = await prisma.paymentRecord.findMany({
      where: {
        id: { in: recordIds },
        clubId: clubIdNumber,
      },
      select: {
        id: true,
        status: true,
        kind: true,
        kindReason: true,
        depositorName: true,
        transactionDate: true,
        amount: true,
        monthHints: true,
        matchedMemberId: true,
        matchedMembers: { select: { clubMemberId: true } },
      },
    });

    const recordMap = new Map(records.map((r) => [r.id, r]));

    const results = {
      success: [] as string[],
      failed: [] as { recordId: string; reason: string }[],
    };

    const targets: (typeof records)[number][] = [];
    for (const id of recordIds) {
      const record = recordMap.get(id);
      if (!record) {
        results.failed.push({
          recordId: id,
          reason: '입금 내역을 찾을 수 없습니다',
        });
        continue;
      }
      if (record.status === 'CONFIRMED') {
        results.failed.push({
          recordId: id,
          reason: '확정된 입금 내역은 분류를 바꿀 수 없습니다',
        });
        continue;
      }
      if (record.kind === kind) {
        results.failed.push({
          recordId: id,
          reason: `이미 '${PAYMENT_KIND_LABEL[kind]}'로 분류된 내역입니다`,
        });
        continue;
      }
      targets.push(record);
    }

    if (targets.length > 0) {
      // 회비로 되돌릴 때만 상태를 다시 판정한다 (매칭 회원·단가를 본다)
      const ctx =
        kind === 'FEE' ? await loadPlannerContext(prisma, clubIdNumber) : null;
      const storedMembers = (record: (typeof targets)[number]) =>
        record.matchedMembers.length > 0
          ? record.matchedMembers.map((member) => member.clubMemberId)
          : record.matchedMemberId != null
            ? [record.matchedMemberId]
            : [];
      // 행사·기타로 분류돼 매칭하지 않았던 건은 입금자명으로 회원을 다시 찾는다
      const matchInputs =
        ctx && targets.some((record) => storedMembers(record).length === 0)
          ? await loadMatchInputs(prisma, clubIdNumber, ctx)
          : null;

      // 바꿀 내용이 같은 건끼리 묶어 한 번에 고친다
      const groups = new Map<
        string,
        {
          ids: string[];
          fromKind: (typeof targets)[number]['kind'];
          data: Prisma.PaymentRecordUncheckedUpdateManyInput;
        }
      >();
      /** 다시 찾은 회원 (입금 내역 id → 회원 id 목록) */
      const rematchedMembers = new Map<string, number[]>();
      for (const record of targets) {
        let memberIds = storedMembers(record);
        let review = {
          needsReview: false,
          reviewReason: null as string | null,
        };
        if (ctx && matchInputs && memberIds.length === 0) {
          const rematched = rematchMembers(
            { ...record, nonFeeAmount: 0 },
            matchInputs,
            ratesForYear(ctx, kstYearMonth(record.transactionDate).year)
              ?.rates ?? null
          );
          if (rematched.memberIds.length > 0) {
            memberIds = rematched.memberIds;
            review = rematched;
            rematchedMembers.set(record.id, memberIds);
          }
        }
        const judged = ctx
          ? judgeStoredState(
              ctx,
              {
                kind,
                transactionDate: record.transactionDate,
                amount: record.amount,
                nonFeeAmount: 0,
                monthHints: record.monthHints,
              },
              memberIds
            )
          : { status: 'SKIPPED' as const, errorReason: null };
        const data = {
          kind,
          kindReason: manualKindReason(record),
          status: judged.status,
          errorReason: judged.errorReason,
          // 회비가 아닌 건에는 "회비가 아닌 금액"이 의미가 없고, 회비로 되돌린 건은 처음부터 다시 본다
          nonFeeAmount: 0,
          nonFeeKind: null,
          needsReview: review.needsReview,
          reviewReason: review.reviewReason,
          ...(rematchedMembers.has(record.id) && {
            matchedMemberId: memberIds[0],
          }),
        };
        const key = JSON.stringify([record.kind, data]);
        const group = groups.get(key) ?? {
          ids: [] as string[],
          fromKind: record.kind,
          data,
        };
        group.ids.push(record.id);
        groups.set(key, group);
      }

      const changed = await prisma.$transaction(async (tx) => {
        for (const { ids, fromKind, data } of groups.values()) {
          await tx.paymentRecord.updateMany({
            // 그사이 확정됐거나 분류가 바뀐 건은 건드리지 않는다
            where: {
              id: { in: ids },
              clubId: clubIdNumber,
              kind: fromKind,
              status: { not: 'CONFIRMED' },
            },
            data,
          });
        }

        const changedIds = new Set(
          (
            await tx.paymentRecord.findMany({
              where: {
                id: { in: targets.map((record) => record.id) },
                clubId: clubIdNumber,
                kind,
              },
              select: { id: true },
            })
          ).map((record) => record.id)
        );

        // 실제로 바뀐 건에만 다시 찾은 회원을 붙인다
        const newMembers = [...rematchedMembers]
          .filter(([recordId]) => changedIds.has(recordId))
          .flatMap(([recordId, memberIds]) =>
            memberIds.map((clubMemberId) => ({
              paymentRecordId: recordId,
              clubMemberId,
            }))
          );
        if (newMembers.length > 0) {
          await tx.paymentRecordMatchedMember.createMany({ data: newMembers });
        }
        return changedIds;
      });

      for (const record of targets) {
        if (changed.has(record.id)) {
          results.success.push(record.id);
        } else {
          results.failed.push({
            recordId: record.id,
            reason: '그사이 바뀐 입금 내역입니다',
          });
        }
      }
    }

    return res.status(200).json({
      data: {
        results,
        summary: {
          total: recordIds.length,
          processed: records.length,
          success: results.success.length,
          failed: results.failed.length,
        },
      },
      status: 200,
      message: `${results.success.length}건 분류 변경, ${results.failed.length}건 실패`,
    });
  } catch (error) {
    console.error('Error in bulk set kind:', error);
    return res.status(500).json({
      error: '분류 변경 중 오류가 발생했습니다',
      status: 500,
    });
  }
});
