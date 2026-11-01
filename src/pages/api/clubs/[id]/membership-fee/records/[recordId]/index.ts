import { Prisma } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

import { APPROVED_STATUS } from '@/lib/clubAuth';
import {
  loadPlannerContext,
  ratesForYear,
} from '@/lib/membership-fee/confirmPlanner';
import { kstYearMonth } from '@/lib/membership-fee/kst';
import { loadMatchInputs } from '@/lib/membership-fee/matchInputsLoader';
import {
  asksMemberCheck,
  manualKindReason,
  storedReviewReason,
} from '@/lib/membership-fee/paymentKind';
import { annotateRecords } from '@/lib/membership-fee/recordAnnotator';
import { judgeStoredState } from '@/lib/membership-fee/rejudgeRecord';
import { rematchMembers } from '@/lib/membership-fee/uploadPipeline';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import { paymentRecordUpdateSchema } from '@/schemas/membership-fee.schema';
import { Role } from '@/types/enums';

/** 읽은 뒤 다른 요청이 먼저 상태를 바꿨다. 트랜잭션을 되돌리려고 던진다 */
class StaleRecordError extends Error {}

export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse
) {
  const { id: clubId, recordId } = req.query;

  if (!clubId || typeof clubId !== 'string') {
    return res.status(400).json({
      error: '클럽 ID가 필요합니다',
      status: 400,
    });
  }

  if (!recordId || typeof recordId !== 'string') {
    return res.status(400).json({
      error: '레코드 ID가 필요합니다',
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
    // 레코드 존재 여부 확인
    const existingRecord = await prisma.paymentRecord.findFirst({
      where: {
        id: recordId,
        clubId: clubIdNumber,
      },
    });

    if (!existingRecord) {
      return res.status(404).json({
        error: '입금 내역을 찾을 수 없습니다',
        status: 404,
      });
    }

    if (req.method === 'GET') {
      const record = await prisma.paymentRecord.findUnique({
        where: { id: recordId },
        include: {
          matchedMember: {
            select: { id: true, name: true },
          },
          matchedMembers: {
            include: {
              clubMember: { select: { id: true, name: true } },
            },
          },
          batch: {
            select: { id: true, fileName: true, uploadedAt: true },
          },
          payments: {
            select: { id: true, month: true, year: true, amount: true },
          },
        },
      });

      return res.status(200).json({
        data: { record },
        status: 200,
        message: '입금 내역을 불러왔습니다',
      });
    }

    if (req.method === 'PUT') {
      const parseResult = paymentRecordUpdateSchema.safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({
          error: parseResult.error.errors[0].message,
          status: 400,
        });
      }

      const input = parseResult.data;
      const { matchedMemberId, matchedMemberIds, kind, nonFeeAmount } = input;

      // 확정된 건은 메모만 고칠 수 있다
      const onlyNote = Object.keys(input).every((key) => key === 'note');
      if (existingRecord.status === 'CONFIRMED' && !onlyNote) {
        return res.status(400).json({
          error: '이미 확정된 입금 내역은 수정할 수 없습니다',
          status: 400,
        });
      }

      if (nonFeeAmount !== undefined && nonFeeAmount >= existingRecord.amount) {
        return res.status(400).json({
          error: '회비가 아닌 금액은 입금액보다 적어야 합니다',
          status: 400,
        });
      }

      // 고칠 회원 목록. 회원을 건드리지 않는 요청이면 null
      const nextMemberIds: number[] | null =
        matchedMemberIds !== undefined
          ? matchedMemberIds
          : matchedMemberId !== undefined
            ? matchedMemberId === null
              ? []
              : [matchedMemberId]
            : null;

      if (nextMemberIds) {
        for (const memberId of nextMemberIds) {
          const member = await prisma.clubMember.findFirst({
            where: { id: memberId, clubId: clubIdNumber },
          });
          if (!member) {
            return res.status(400).json({
              error: `해당 클럽에 속하지 않은 회원입니다 (id: ${memberId})`,
              status: 400,
            });
          }
        }
      }

      const updateData: Prisma.PaymentRecordUncheckedUpdateManyInput = {};
      if (input.note !== undefined) updateData.note = input.note || null;

      const nextKind = kind ?? existingRecord.kind;
      const kindChanged = nextKind !== existingRecord.kind;
      if (kindChanged) {
        updateData.kind = nextKind;
        updateData.kindReason = manualKindReason(existingRecord);
      }

      // 회비가 아닌 건에는 "회비가 아닌 금액"이 의미가 없다
      let nextNonFeeAmount = existingRecord.nonFeeAmount;
      if (nextKind !== 'FEE') {
        nextNonFeeAmount = 0;
        updateData.nonFeeAmount = 0;
        updateData.nonFeeKind = null;
      } else if (nonFeeAmount !== undefined) {
        nextNonFeeAmount = nonFeeAmount;
        updateData.nonFeeAmount = nonFeeAmount;
        updateData.nonFeeKind = nonFeeAmount === 0 ? null : input.nonFeeKind;
      }

      /**
       * 상태를 다시 정해야 하는 경우:
       * - 분류가 바뀜 (회비 ↔ 회비 아님)
       * - 열려 있는 회비 건의 회원이나 회비가 아닌 금액이 바뀜
       * 재무가 직접 건너뛴 회비 건은 메모·금액을 고쳐도 건너뜀으로 둔다.
       */
      const isOpenFee =
        nextKind === 'FEE' && existingRecord.status !== 'SKIPPED';
      const needsRejudge =
        kindChanged ||
        (isOpenFee && (nextMemberIds !== null || nonFeeAmount !== undefined));

      const stale = await prisma
        .$transaction(async (tx) => {
          // 이 건에 붙일 회원. 사람이 골랐으면 그 회원, 아니면 저장된 회원.
          let memberIds: number[];
          let replaceMembers = false;
          if (nextMemberIds) {
            memberIds = nextMemberIds;
            replaceMembers = true;
            // 사람이 회원을 골랐으므로 "회원을 확인해주세요" 표시를 끈다.
            // 회원과 상관없는 표시(행사비일 수 있는 금액)는 남긴다.
            const stored = storedReviewReason(existingRecord);
            if (stored && asksMemberCheck([stored])) {
              updateData.needsReview = false;
              updateData.reviewReason = null;
            }
          } else {
            const storedMembers = (
              await tx.paymentRecordMatchedMember.findMany({
                where: { paymentRecordId: recordId },
                select: { clubMemberId: true },
              })
            ).map((member) => member.clubMemberId);
            memberIds =
              storedMembers.length > 0
                ? storedMembers
                : existingRecord.matchedMemberId != null
                  ? [existingRecord.matchedMemberId]
                  : [];
          }

          if (needsRejudge) {
            const ctx = await loadPlannerContext(prisma, clubIdNumber);

            // 행사·기타로 분류돼 매칭하지 않았던 건을 회비로 되돌리면 입금자명으로 회원을 다시 찾는다.
            if (kindChanged && nextKind === 'FEE' && memberIds.length === 0) {
              const rematched = rematchMembers(
                { ...existingRecord, nonFeeAmount: nextNonFeeAmount },
                await loadMatchInputs(prisma, clubIdNumber, ctx),
                ratesForYear(
                  ctx,
                  kstYearMonth(existingRecord.transactionDate).year
                )?.rates ?? null
              );
              if (rematched.memberIds.length > 0) {
                memberIds = rematched.memberIds;
                replaceMembers = true;
                updateData.needsReview = rematched.needsReview;
                updateData.reviewReason = rematched.reviewReason;
              }
            }

            const judged = judgeStoredState(
              ctx,
              {
                kind: nextKind,
                transactionDate: existingRecord.transactionDate,
                amount: existingRecord.amount,
                nonFeeAmount: nextNonFeeAmount,
                monthHints: existingRecord.monthHints,
              },
              memberIds
            );
            updateData.status = judged.status;
            updateData.errorReason = judged.errorReason;
            if (judged.status === 'SKIPPED') {
              updateData.needsReview = false;
              updateData.reviewReason = null;
            }
          }

          if (replaceMembers) {
            await tx.paymentRecordMatchedMember.deleteMany({
              where: { paymentRecordId: recordId },
            });
            if (memberIds.length > 0) {
              await tx.paymentRecordMatchedMember.createMany({
                data: memberIds.map((clubMemberId) => ({
                  paymentRecordId: recordId,
                  clubMemberId,
                })),
              });
            }
            updateData.matchedMemberId = memberIds[0] ?? null;
          }

          // 읽은 뒤 다른 요청이 이 건을 확정·건너뛰었으면 고치지 않는다.
          // 조건 없이 저장하면 납부가 붙은 확정 건이 매칭됨으로 되돌아가 다시 확정될 수 있다.
          const guarded = await tx.paymentRecord.updateMany({
            where: { id: recordId, status: existingRecord.status },
            data: updateData,
          });
          if (guarded.count === 0) throw new StaleRecordError();
          return false;
        })
        .catch((error: unknown) => {
          if (error instanceof StaleRecordError) return true;
          throw error;
        });

      if (stale) {
        return res.status(400).json({
          error: '그사이 바뀐 입금 내역입니다. 새로 고친 뒤 다시 시도해주세요',
          status: 400,
        });
      }

      // 배정할 달·검토 사유를 고친 내용으로 다시 계산해 돌려준다
      const [record] = await annotateRecords(prisma, clubIdNumber, {
        id: recordId,
      });

      return res.status(200).json({
        data: { record },
        status: 200,
        message: '입금 내역이 수정되었습니다',
      });
    }

    return res.status(405).json({
      error: '허용되지 않는 메소드입니다',
      status: 405,
    });
  } catch (error) {
    console.error('Error in payment record:', error);
    return res.status(500).json({
      error: '입금 내역 처리 중 오류가 발생했습니다',
      status: 500,
    });
  }
});
