import { FeePeriod } from '@prisma/client';
import formidable from 'formidable';
import fs from 'fs';
import { NextApiRequest, NextApiResponse } from 'next';

import {
  validateAmount,
  detectMemberType,
} from '@/lib/membership-fee/amountValidator';
import {
  parseKakaoBankExcel,
  validateExcelFile,
} from '@/lib/membership-fee/excelParser';
import {
  matchDepositor,
  findCoupleGroup,
} from '@/lib/membership-fee/memberMatcher';
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

    // 파일 읽기
    const buffer = fs.readFileSync(file.filepath);
    const parsedRows = parseKakaoBankExcel(buffer);

    if (parsedRows.length === 0) {
      return res.status(400).json({
        error: '입금 내역이 없습니다',
        status: 400,
      });
    }

    // 회비 유형 및 금액 조회
    const currentYear = new Date().getFullYear();
    const feeTypes = await prisma.feeType.findMany({
      where: {
        clubId: clubIdNumber,
        isActive: true,
      },
      include: {
        rates: {
          where: {
            year: currentYear,
          },
        },
      },
    });

    // 일반/부부 월납 금액 추출
    const regularType = feeTypes.find((t) => t.name === '일반');
    const coupleType = feeTypes.find((t) => t.name === '부부');

    const regularMonthlyRate = regularType?.rates.find(
      (r) => r.period === FeePeriod.MONTHLY
    );
    const coupleMonthlyRate = coupleType?.rates.find(
      (r) => r.period === FeePeriod.MONTHLY
    );

    if (!regularMonthlyRate) {
      return res.status(400).json({
        error: `${currentYear}년 회비 설정이 필요합니다`,
        status: 400,
      });
    }

    const feeSettings = {
      regularAmount: regularMonthlyRate.amount,
      coupleAmount: coupleMonthlyRate?.amount || regularMonthlyRate.amount,
    };

    // 회원 목록 조회
    const members = await prisma.clubMember.findMany({
      where: { clubId: clubIdNumber },
      select: { id: true, name: true },
    });

    // 부부 그룹 조회
    const coupleGroups = await prisma.coupleGroup.findMany({
      where: { clubId: clubIdNumber },
      include: {
        members: {
          include: {
            clubMember: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    // 배치 생성
    const batch = await prisma.paymentUploadBatch.create({
      data: {
        clubId: clubIdNumber,
        uploadedById: adminMember.id,
        fileName: file.originalFilename || 'unknown.xlsx',
        recordCount: parsedRows.length,
      },
    });

    // 각 레코드 처리
    const records = [];
    for (const row of parsedRows) {
      // 회원 매칭
      const matchResult = matchDepositor(
        row.depositorName,
        members,
        coupleGroups
      );

      // 금액 검증
      let memberType = null;
      let errorReason = null;
      let status: 'PENDING' | 'MATCHED' | 'ERROR' = 'PENDING';

      if (matchResult.memberId) {
        // 부부 그룹 여부 확인
        const coupleGroup = findCoupleGroup(matchResult.memberId, coupleGroups);
        memberType = coupleGroup ? 'couple' : 'regular';

        const validation = validateAmount(
          row.amount,
          {
            regularAmount: feeSettings.regularAmount,
            coupleAmount: feeSettings.coupleAmount,
          },
          memberType as 'regular' | 'couple'
        );

        if (validation.isValid) {
          status = 'MATCHED';
        } else {
          status = 'ERROR';
          errorReason = validation.error || null;
        }
      } else if (matchResult.matchType === 'none') {
        // 매칭 실패 시 금액만 검증
        const detectedType = detectMemberType(row.amount, {
          regularAmount: feeSettings.regularAmount,
          coupleAmount: feeSettings.coupleAmount,
        });

        if (!detectedType) {
          status = 'ERROR';
          errorReason = '회원 매칭 실패 및 금액 형식 불일치';
        } else {
          errorReason = '회원 매칭 실패';
        }
      }

      const record = await prisma.paymentRecord.create({
        data: {
          batchId: batch.id,
          clubId: clubIdNumber,
          transactionDate: row.transactionDate,
          depositorName: row.depositorName,
          amount: row.amount,
          memo: row.memo,
          matchedMemberId: matchResult.memberId,
          status,
          errorReason,
        },
        include: {
          matchedMember: {
            select: { id: true, name: true },
          },
        },
      });

      records.push(record);
    }

    // 파일 정리
    fs.unlinkSync(file.filepath);

    return res.status(200).json({
      data: {
        batch,
        records,
        summary: {
          total: records.length,
          matched: records.filter((r) => r.status === 'MATCHED').length,
          error: records.filter((r) => r.status === 'ERROR').length,
          pending: records.filter((r) => r.status === 'PENDING').length,
        },
      },
      status: 200,
      message: '파일 업로드 및 분석이 완료되었습니다',
    });
  } catch (error) {
    console.error('Error in payment upload:', error);
    return res.status(500).json({
      error: '파일 업로드 처리 중 오류가 발생했습니다',
      status: 500,
    });
  }
});
