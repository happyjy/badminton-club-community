import fs from 'fs';

import { Prisma } from '@prisma/client';
import formidable from 'formidable';
import { NextApiRequest, NextApiResponse } from 'next';

import { APPROVED_STATUS } from '@/lib/clubAuth';
import {
  loadPlannerContext,
  ratesForYear,
} from '@/lib/membership-fee/confirmPlanner';
import {
  splitDuplicates,
  transactionKey,
} from '@/lib/membership-fee/duplicateDetector';
import {
  parseKakaoBankExcel,
  validateExcelFile,
} from '@/lib/membership-fee/excelParser';
import { kstYearMonth } from '@/lib/membership-fee/kst';
import { loadMatchInputs } from '@/lib/membership-fee/matchInputsLoader';
import {
  annotateRecords,
  isBulkConfirmable,
} from '@/lib/membership-fee/recordAnnotator';
import {
  judgeUploadRows,
  summarizeDrafts,
} from '@/lib/membership-fee/uploadPipeline';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import { Role } from '@/types/enums';

export const config = {
  api: {
    bodyParser: false,
  },
};

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
    // 파일 파싱
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });

    const [, files] = await form.parse(req);
    const file = files.file?.[0];

    if (!file) {
      return res.status(400).json({
        error: '파일이 필요합니다',
        status: 400,
      });
    }

    if (!validateExcelFile(file.originalFilename || '')) {
      return res.status(400).json({
        error: '엑셀 파일(.xlsx, .xls)만 업로드 가능합니다',
        status: 400,
      });
    }

    // 파일 읽기. 임시 파일은 읽자마자 지운다 (뒤에서 일찍 끝나도 남지 않게).
    const buffer = fs.readFileSync(file.filepath);
    fs.unlinkSync(file.filepath);
    const parsedRows = parseKakaoBankExcel(buffer);

    if (parsedRows.length === 0) {
      return res.status(400).json({
        error: '입금 내역이 없습니다',
        status: 400,
      });
    }

    // 1) 이미 올라온 거래는 뺀다. 기간이 겹치는 파일을 다시 올려도 두 번 들어가지 않는다.
    const existing = await prisma.paymentRecord.findMany({
      where: { clubId: clubIdNumber },
      select: { transactionDate: true, amount: true, depositorName: true },
    });
    const { fresh, duplicates } = splitDuplicates(
      parsedRows,
      new Set(existing.map(transactionKey))
    );
    if (fresh.length === 0) {
      return res.status(400).json({
        error: `이 파일의 입금 ${parsedRows.length}건은 모두 이미 올라와 있습니다`,
        status: 400,
      });
    }

    // 2) 판정에 필요한 맥락을 읽는다
    const ctx = await loadPlannerContext(prisma, clubIdNumber);
    const matchInputs = await loadMatchInputs(prisma, clubIdNumber, ctx);

    // 거래 연도의 단가가 없으면 직전 연도 단가로 판정한다. 어느 해의 단가도 없을 때만 막는다.
    const years = [
      ...new Set(fresh.map((row) => kstYearMonth(row.transactionDate).year)),
    ].sort((a, b) => a - b);
    const ratesFallback: { year: number; usedYear: number }[] = [];
    for (const year of years) {
      const picked = ratesForYear(ctx, year);
      if (!picked) {
        return res.status(400).json({
          error: `${year}년 회비 설정이 필요합니다`,
          status: 400,
        });
      }
      if (picked.fallbackYear != null) {
        ratesFallback.push({ year, usedYear: picked.fallbackYear });
      }
    }

    // 3) 분류 → 거래일 시점의 회원 매칭 → 단가·개월 수·납부월 계획
    const drafts = judgeUploadRows(fresh, { ctx, ...matchInputs });

    // 4) 배치·입금 내역·매칭 회원을 한 트랜잭션으로 저장한다
    const batch = await prisma.$transaction(
      async (tx) => {
        const createdBatch = await tx.paymentUploadBatch.create({
          data: {
            clubId: clubIdNumber,
            uploadedById: adminMember.id,
            fileName: file.originalFilename || 'unknown.xlsx',
            recordCount: drafts.length,
          },
        });

        const created = await tx.paymentRecord.createManyAndReturn({
          data: drafts.map((draft) => ({
            batchId: createdBatch.id,
            clubId: clubIdNumber,
            transactionDate: draft.row.transactionDate,
            depositorName: draft.row.depositorName,
            amount: draft.row.amount,
            memo: draft.row.memo,
            matchedMemberId: draft.memberIds[0] ?? null,
            status: draft.status,
            errorReason: draft.errorReason,
            kind: draft.kind,
            kindReason: draft.kindReason,
            nonFeeAmount: draft.nonFeeAmount,
            nonFeeKind: draft.nonFeeKind,
            monthHints: draft.monthHints
              ? (draft.monthHints as unknown as Prisma.InputJsonValue)
              : Prisma.DbNull,
            needsReview: draft.needsReview,
            reviewReason: draft.reviewReason,
          })),
          select: {
            id: true,
            transactionDate: true,
            amount: true,
            depositorName: true,
          },
        });

        // 중복을 걸러 낸 뒤라 (거래일시·금액·입금자명)이 배치 안에서 겹치지 않는다
        const idByKey = new Map(
          created.map((record) => [transactionKey(record), record.id])
        );
        const matchedMembers = drafts.flatMap((draft) =>
          draft.memberIds.map((clubMemberId) => ({
            paymentRecordId: idByKey.get(transactionKey(draft.row))!,
            clubMemberId,
          }))
        );
        if (matchedMembers.length > 0) {
          await tx.paymentRecordMatchedMember.createMany({
            data: matchedMembers,
          });
        }
        return createdBatch;
      },
      { timeout: 30_000 }
    );

    // 5) 저장한 건에 배정할 달과 검토 사유를 붙여 돌려준다
    const records = await annotateRecords(prisma, clubIdNumber, {
      batchId: batch.id,
    });

    return res.status(200).json({
      data: {
        batch,
        records,
        duplicates: duplicates.map((row) => ({
          transactionDate: row.transactionDate,
          amount: row.amount,
          depositorName: row.depositorName,
        })),
        summary: {
          ...summarizeDrafts(drafts),
          needsReview: records.filter((record) => record.needsReview).length,
          confirmable: records.filter(isBulkConfirmable).length,
          duplicates: duplicates.length,
          ratesFallback,
        },
      },
      status: 200,
      message:
        duplicates.length > 0
          ? `파일 분석이 완료되었습니다. 이미 올라온 ${duplicates.length}건은 제외했습니다`
          : '파일 업로드 및 분석이 완료되었습니다',
    });
  } catch (error) {
    console.error('Error in payment upload:', error);
    return res.status(500).json({
      error: '파일 업로드 처리 중 오류가 발생했습니다',
      status: 500,
    });
  }
});
