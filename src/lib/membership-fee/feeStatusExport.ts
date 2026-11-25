import {
  buildMemberYearStatus,
  type MemberYearStatus,
} from './memberYearStatus';
import { loadMemberYearData } from './memberYearStatusLoader';

import type { PrismaClient } from '@prisma/client';

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export interface FeeStatusExport {
  /** 그 해에 회비 의무(또는 휴회·면제)가 있었던 회원의 한 해 현황 */
  rows: MemberYearStatus[];
  /** 반영일 (한국 날짜의 로컬 자정. 엑셀에 적는다) */
  asOf: Date;
  /** 반영일 'YYYY-MM-DD' */
  asOfIso: string;
  /** 파일 이름에 붙이는 날짜 'YYYYMMDD' */
  stamp: string;
}

/**
 * 납부현황 내보내기(엑셀·이미지)가 쓰는 회원과 반영일을 읽는다.
 * 대시보드와 같은 조회·계산을 쓴다. 화면과 파일이 다를 수 없다.
 */
export async function loadFeeStatusExport(
  prisma: PrismaClient,
  clubId: number,
  year: number,
  now: Date
): Promise<FeeStatusExport> {
  const { members } = await loadMemberYearData(prisma, clubId, year);
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
  const asOfIso = today.toISOString().slice(0, 10);
  return { rows, asOf, asOfIso, stamp: asOfIso.replace(/-/g, '') };
}
