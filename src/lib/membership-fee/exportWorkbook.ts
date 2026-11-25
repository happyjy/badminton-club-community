import ExcelJS from 'exceljs';

import {
  buildFeeStatusSheet,
  CELL_FILL,
  FEE_STATUS_LEGEND,
  type FeeStatusSheetRow,
  HEADER_FILL,
  PAPER,
} from './feeStatusSheet';
import { type MemberYearStatus } from './memberYearStatus';

/**
 * 연간 월회비 납부현황표를 엑셀로 만든다.
 * 재무가 손으로 만들어 온 표(제목·반영일·범례·NO/성명/1~12월/비고)와 같은 모양이다.
 * 줄 순서·비고·칸 색은 이미지 내보내기와 같이 쓰는 `feeStatusSheet`에서 온다.
 */

export { CELL_FILL };

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

// 열: A=NO, B=성명, C~N=1~12월, O=비고
const NO_COLUMN = 1;
const NAME_COLUMN = 2;
const FIRST_MONTH_COLUMN = 3;
const NOTE_COLUMN = 15;
const TITLE_ROW = 1;
const AS_OF_ROW = 2;
const LEGEND_ROW = 3;
const HEADER_ROW = 4;
const FIRST_DATA_ROW = 5;

const solid = (argb: string): ExcelJS.FillPattern => ({
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb },
});
const thin: Partial<ExcelJS.Border> = { style: 'thin' };
const medium: Partial<ExcelJS.Border> = { style: 'medium' };
const box = (
  bottom: Partial<ExcelJS.Border> = thin
): Partial<ExcelJS.Borders> => ({
  top: thin,
  left: thin,
  right: thin,
  bottom,
});
const center: Partial<ExcelJS.Alignment> = {
  horizontal: 'center',
  vertical: 'middle',
};

function writeMemberRow(row: ExcelJS.Row, member: FeeStatusSheetRow) {
  const bottom = member.thickBottom ? medium : thin;
  row.getCell(NO_COLUMN).value = member.no;
  row.getCell(NAME_COLUMN).value = member.name;
  if (member.remark) row.getCell(NOTE_COLUMN).value = member.remark;

  member.cells.forEach((status, index) => {
    const cell = row.getCell(FIRST_MONTH_COLUMN + index);
    if (status !== 'FUTURE') cell.fill = solid(CELL_FILL[status]);
    cell.border = box(bottom);
  });

  for (const column of [NO_COLUMN, NAME_COLUMN, NOTE_COLUMN]) {
    const cell = row.getCell(column);
    cell.border = box(bottom);
    cell.alignment = center;
  }
  row.getCell(NOTE_COLUMN).font = { size: 9 };
}

export async function buildFeeStatusWorkbook(params: {
  year: number;
  /** 반영일 (내보낸 날) */
  asOf: Date;
  rows: MemberYearStatus[];
}): Promise<Buffer> {
  const { year, asOf, rows } = params;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(`${year}년 납부현황`, {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      // 쪽마다 범례와 머리글을 반복한다
      printTitlesRow: `${LEGEND_ROW}:${HEADER_ROW}`,
      horizontalCentered: true,
    },
    headerFooter: { oddFooter: '&C- &P -' },
  });
  sheet.columns = [
    { width: 6 },
    { width: 9 },
    ...MONTHS.map(() => ({ width: 6.5 })),
    { width: 10 },
  ];

  sheet.mergeCells(TITLE_ROW, NO_COLUMN, TITLE_ROW, NOTE_COLUMN);
  const title = sheet.getCell(TITLE_ROW, NO_COLUMN);
  title.value = `${year}년 월회비 납부현황`;
  title.font = { size: 20, bold: true };
  title.alignment = center;
  sheet.getRow(TITLE_ROW).height = 40;

  const asOfCell = sheet.getCell(AS_OF_ROW, NOTE_COLUMN);
  asOfCell.value = `반영일 : ${asOf.getFullYear()}.${asOf.getMonth() + 1}.${asOf.getDate()}`;
  asOfCell.font = { bold: true };
  asOfCell.alignment = { horizontal: 'right' };

  // 범례: 표의 오른쪽 끝에 맞춰 "이름 + 색칸"을 다섯 쌍 둔다
  const legendStart = NOTE_COLUMN - FEE_STATUS_LEGEND.length * 2 + 1;
  FEE_STATUS_LEGEND.forEach(({ label, status }, index) => {
    const labelCell = sheet.getCell(LEGEND_ROW, legendStart + index * 2);
    labelCell.value = label;
    labelCell.alignment = { horizontal: 'right', vertical: 'middle' };
    const colorCell = sheet.getCell(LEGEND_ROW, legendStart + index * 2 + 1);
    colorCell.fill = solid(CELL_FILL[status]);
  });

  const header = sheet.getRow(HEADER_ROW);
  header.values = [
    'NO',
    '성명',
    ...MONTHS.map((month) => `${month}월`),
    '비고',
  ];
  header.eachCell((cell) => {
    cell.fill = solid(HEADER_FILL);
    cell.font = { bold: true, color: { argb: PAPER } };
    cell.alignment = center;
    cell.border = box();
  });

  // 활동 회원(직책 있는 회원 먼저) → 탈퇴 회원
  let rowNumber = FIRST_DATA_ROW;
  for (const member of buildFeeStatusSheet(rows)) {
    writeMemberRow(sheet.getRow(rowNumber++), member);
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
