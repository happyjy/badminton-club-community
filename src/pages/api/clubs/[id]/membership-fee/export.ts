import { NextApiRequest, NextApiResponse } from 'next';

import { APPROVED_STATUS } from '@/lib/clubAuth';
import { buildFeeStatusWorkbook } from '@/lib/membership-fee/exportWorkbook';
import { kstYearMonth } from '@/lib/membership-fee/kst';
import { buildMemberYearStatus } from '@/lib/membership-fee/memberYearStatus';
import { loadMemberYearData } from '@/lib/membership-fee/memberYearStatusLoader';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import { Role } from '@/types/enums';

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * GET: 연간 월회비 납부현황표를 엑셀 파일로 내려 준다 (관리자).
 * 성공하면 JSON이 아니라 파일 본문을 보낸다. 실패 응답은 다른 API와 같은 `{ error, status }`다.
 */
export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse
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
    // 대시보드와 같은 조회·계산을 쓴다. 화면과 파일이 다를 수 없다.
    const { members } = await loadMemberYearData(prisma, clubIdNumber, year);
    const rows = members
      .map((member) => buildMemberYearStatus(year, member, now))
      // 그 해에 회비 의무(또는 휴회·면제)가 있었던 회원만 싣는다
      .filter(
        (row) => row.obligationMonths.length > 0 || row.leaveMonths.length > 0
      );

    // 반영일과 파일 이름의 날짜는 한국 시각으로 적는다
    const today = new Date(now.getTime() + KST_OFFSET_MS);
    const asOf = new Date(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate()
    );
    const buffer = await buildFeeStatusWorkbook({ year, asOf, rows });

    const stamp = today.toISOString().slice(0, 10).replace(/-/g, '');
    const fileName = `회비납부현황_${year}_${stamp}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`
    );
    return res.status(200).send(buffer);
  } catch (error) {
    console.error('Error exporting fee status:', error);
    return res.status(500).json({
      error: '납부현황 내보내기 중 오류가 발생했습니다',
      status: 500,
    });
  }
});
