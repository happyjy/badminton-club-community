import {
  type CellStatus,
  type MemberYearStatus,
  sortForExport,
} from './memberYearStatus';

/**
 * 연간 월회비 납부현황표의 줄과 색.
 * 엑셀 내보내기와 이미지 내보내기가 같이 써서, 두 결과의 줄 순서·비고·칸 색이 어긋나지 않게 한다.
 * 브라우저에서도 쓰므로 exceljs·prisma를 가져오지 않는다.
 */

/** 칸의 색 (ARGB). 아직 오지 않은 달(FUTURE)은 칠하지 않는다 */
export const CELL_FILL: Record<Exclude<CellStatus, 'FUTURE'>, string> = {
  PAID: 'FFFFF2CC',
  UNPAID: 'FFCC3300',
  EXEMPT: 'FF2E75B6',
  LEAVE: 'FF548235',
  NONE: 'FFA6A6A6',
};

/** 머리글 바탕 */
export const HEADER_FILL = 'FF305496';
/** 글자·선 */
export const INK = 'FF000000';
/** 종이 바탕·머리글 글자 */
export const PAPER = 'FFFFFFFF';

export const FEE_STATUS_LEGEND: {
  label: string;
  status: Exclude<CellStatus, 'FUTURE'>;
}[] = [
  { label: '완납', status: 'PAID' },
  { label: '미납', status: 'UNPAID' },
  { label: '면제', status: 'EXEMPT' },
  { label: '병가', status: 'LEAVE' },
  { label: '해당없음', status: 'NONE' },
];

/** 'FFFFF2CC' → '#FFF2CC' */
export const argbToCss = (argb: string) => `#${argb.slice(2)}`;

export interface FeeStatusSheetRow {
  /** 활동 회원은 1부터, 탈퇴 회원은 '탈퇴' */
  no: number | '탈퇴';
  name: string;
  /** 1~12월 칸 상태 ([0]이 1월). 병가 칸에는 사유를 적지 않고 색만 칠한다 (2026-11-26 사용자 요청) */
  cells: CellStatus[];
  /** 직책, 지금 부부면 "부부"(둘 다면 "총무 · 부부"), 탈퇴 회원은 "YYYY.MM 탈퇴" */
  remark: string;
  /** 이 줄 아래 선이 굵은지 (직책 회원 묶음 끝, 활동 회원 끝) */
  thickBottom: boolean;
}

/** 이미지 내보내기 API(`export-sheet`)의 응답 */
export interface FeeStatusSheetResponse {
  year: number;
  /** 반영일 (한국 날짜, 'YYYY-MM-DD') */
  asOf: string;
  /** 파일 이름에 붙이는 날짜 ('YYYYMMDD') */
  stamp: string;
  rows: FeeStatusSheetRow[];
}

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const toRow = (
  member: MemberYearStatus,
  no: FeeStatusSheetRow['no'],
  remark: string,
  thickBottom: boolean
): FeeStatusSheetRow => ({
  no,
  name: member.name,
  cells: MONTHS.map((month) => member.cells[month]),
  remark,
  thickBottom,
});

/** 표의 줄: 활동 회원(직책 있는 회원 먼저) → 탈퇴 회원 */
export function buildFeeStatusSheet(
  rows: MemberYearStatus[]
): FeeStatusSheetRow[] {
  const active = sortForExport(rows.filter((row) => !row.isLeft));
  const left = rows
    .filter((row) => row.isLeft)
    .sort((a, b) => a.name.localeCompare(b.name, 'ko-KR'));
  const officerCount = active.filter((row) => row.position).length;
  // 비고: 직책, 지금 부부면 "부부" (재무의 표처럼). 둘 다면 "총무 · 부부"
  const remarkOf = (member: MemberYearStatus) =>
    [member.position, member.isCouple ? '부부' : null]
      .filter(Boolean)
      .join(' · ');

  return [
    ...active.map((member, index) => {
      // 직책이 있는 회원 묶음 아래, 탈퇴 회원 묶음 위에 굵은 선을 긋는다
      const isLastOfficer = officerCount > 0 && index === officerCount - 1;
      const isLastActive = left.length > 0 && index === active.length - 1;
      return toRow(
        member,
        index + 1,
        remarkOf(member),
        isLastOfficer || isLastActive
      );
    }),
    ...left.map((member) =>
      toRow(
        member,
        '탈퇴',
        member.leftAtFormatted ? `${member.leftAtFormatted} 탈퇴` : '탈퇴',
        false
      )
    ),
  ];
}

/** 이미지 한 장에 싣는 회원 수 */
export const FEE_STATUS_ROWS_PER_PAGE = 40;

/** 장마다 나눈다. 줄이 없어도 머리글만 있는 한 장을 만든다 */
export function paginateFeeStatusSheet(
  rows: FeeStatusSheetRow[],
  perPage: number = FEE_STATUS_ROWS_PER_PAGE
): FeeStatusSheetRow[][] {
  if (rows.length === 0) return [[]];
  const pages: FeeStatusSheetRow[][] = [];
  for (let start = 0; start < rows.length; start += perPage) {
    pages.push(rows.slice(start, start + perPage));
  }
  return pages;
}
