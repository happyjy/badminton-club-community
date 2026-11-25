import { NextApiRequest, NextApiResponse } from 'next';

import { APPROVED_STATUS } from '@/lib/clubAuth';
import { loadFeeStatusExport } from '@/lib/membership-fee/feeStatusExport';
import {
  buildFeeStatusSheet,
  type FeeStatusSheetResponse,
} from '@/lib/membership-fee/feeStatusSheet';
import { kstYearMonth } from '@/lib/membership-fee/kst';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import { ApiResponse } from '@/types';
import { Role } from '@/types/enums';

/**
 * GET: 연간 월회비 납부현황표의 줄을 준다 (관리자).
 * 브라우저가 이 줄로 카톡에 올릴 이미지를 그린다. 엑셀 내보내기(`export`)와 같은 순서·비고다.
 * 탈퇴 회원은 싣지 않는다. 카톡방은 지금 회원만 보고, 재무의 표도 그렇다 (2026-11-26 사용자 결정).
 */
export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse<ApiResponse<'sheet', FeeStatusSheetResponse>>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: '허용되지 않는 메소드입니다',
      status: 405,
    });
  }

  const { id: clubId, year: yearQuery } = req.query;

  if (!clubId || typeof clubId !== 'string') {
    return res.status(400).json({
      error: '클럽 ID가 필요합니다',
      status: 400,
    });
  }
  const clubIdNumber = Number(clubId);

  const now = new Date();
  const year =
    yearQuery === undefined ? kstYearMonth(now).year : Number(yearQuery);
  if (!Number.isInteger(year) || year < 2020 || year > 2100) {
    return res.status(400).json({
      error: '연도가 올바르지 않습니다',
      status: 400,
    });
  }

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
    const { rows, asOfIso, stamp } = await loadFeeStatusExport(
      prisma,
      clubIdNumber,
      year,
      now
    );
    // 탈퇴 회원을 계산 전에 빼야 마지막 회원 아래에 탈퇴 묶음용 굵은 선이 생기지 않는다
    const activeRows = rows.filter((row) => !row.isLeft);
    return res.status(200).json({
      data: {
        sheet: {
          year,
          asOf: asOfIso,
          stamp,
          rows: buildFeeStatusSheet(activeRows),
        },
      },
      status: 200,
      message: '납부현황을 불러왔습니다',
    });
  } catch (error) {
    console.error('Error loading fee status sheet:', error);
    return res.status(500).json({
      error: '납부현황을 불러오지 못했습니다',
      status: 500,
    });
  }
});
