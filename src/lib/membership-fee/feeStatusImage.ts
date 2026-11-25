import {
  argbToCss,
  CELL_FILL,
  FEE_STATUS_LEGEND,
  type FeeStatusSheetResponse,
  type FeeStatusSheetRow,
  HEADER_FILL,
  INK,
  paginateFeeStatusSheet,
  PAPER,
} from './feeStatusSheet';

/**
 * 연간 월회비 납부현황표를 PNG로 그린다 (브라우저).
 * 카톡방에 이미지로 올리기 위한 것으로, 재무의 표·엑셀과 같은 배치(제목·반영일·범례·머리글·회원·쪽 번호)다.
 * 색은 라이트·다크와 상관없이 엑셀과 같은 고정 색이다.
 */

/** 가로 800 기준으로 배치하고 2배로 그린다 (가로 1600px) */
export const IMAGE_WIDTH = 800;
export const IMAGE_SCALE = 2;

const MARGIN_X = 16;
const columns = { no: 32, name: 76, month: 48, remark: 84 } as const;
const heights = {
  title: 72,
  asOf: 24,
  legend: 28,
  header: 28,
  row: 24,
  footer: 40,
} as const;
const HEADER_TOP = heights.title + heights.asOf + heights.legend;
const FIRST_ROW_TOP = HEADER_TOP + heights.header;
const NAME_LEFT = MARGIN_X + columns.no;
const MONTHS_LEFT = NAME_LEFT + columns.name;
const REMARK_LEFT = MONTHS_LEFT + columns.month * 12;
const TABLE_RIGHT = REMARK_LEFT + columns.remark;

/** 칸 위치 (논리 px). 테스트와 미리보기가 쓴다 */
export const IMAGE_LAYOUT = {
  columns,
  heights,
  /** 0이 1월 */
  monthLeft: (monthIndex: number) => MONTHS_LEFT + columns.month * monthIndex,
  /** 장 안에서 몇 번째 줄인지 (0부터) */
  rowTop: (rowIndex: number) => FIRST_ROW_TOP + heights.row * rowIndex,
};

/** 회원 n명을 싣는 장의 높이 (논리 px) */
export function pageHeight(rowCount: number): number {
  return FIRST_ROW_TOP + heights.row * rowCount + heights.footer;
}

const FONT_FAMILY = '"Pretendard Variable", Pretendard, sans-serif';
const font = (weight: 400 | 700, size: number) =>
  `${weight} ${size}px ${FONT_FAMILY}`;

/** 그리는 데 쓰는 캔버스 기능만 (테스트는 기록용 가짜를 넘긴다) */
export type CanvasPainter = Pick<
  CanvasRenderingContext2D,
  | 'fillStyle'
  | 'strokeStyle'
  | 'lineWidth'
  | 'font'
  | 'textAlign'
  | 'textBaseline'
  | 'fillRect'
  | 'strokeRect'
  | 'fillText'
  | 'beginPath'
  | 'moveTo'
  | 'lineTo'
  | 'stroke'
  | 'measureText'
  | 'scale'
>;

const CELL_PADDING = 4;
const MIN_NAME_SIZE = 9;

/** 폭에 들어갈 때까지 글자 크기를 줄인다. 가장 작은 크기로도 안 들어가면 그 크기를 돌려준다 */
function fitFontSize(
  ctx: CanvasPainter,
  text: string,
  maxWidth: number,
  size: number,
  minSize: number
): number {
  for (let current = size; current > minSize; current--) {
    ctx.font = font(400, current);
    if (ctx.measureText(text).width <= maxWidth) return current;
  }
  ctx.font = font(400, minSize);
  return minSize;
}

/** 지금 글꼴로 폭에 들어가게 뒤를 잘라 "…"를 붙인다 */
function truncate(ctx: CanvasPainter, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let end = text.length;
  while (
    end > 0 &&
    ctx.measureText(`${text.slice(0, end)}…`).width > maxWidth
  ) {
    end--;
  }
  return `${text.slice(0, end)}…`;
}

const asOfLabel = (asOf: string) => {
  const [year, month, day] = asOf.split('-').map(Number);
  return `반영일 : ${year}.${month}.${day}`;
};

const titleOf = (year: number) => `${year}년 월회비 납부현황`;

const HEADER_LABELS = [
  'NO',
  '성명',
  ...Array.from({ length: 12 }, (_, index) => `${index + 1}월`),
  '비고',
];

/** 한 장을 그린다. 캔버스는 이미 2배로 늘려 둔 상태여야 한다 */
export function paintFeeStatusPage(
  ctx: CanvasPainter,
  page: {
    year: number;
    asOf: string;
    rows: FeeStatusSheetRow[];
    pageNumber: number;
  }
): void {
  const { rows } = page;
  const tableBottom = IMAGE_LAYOUT.rowTop(rows.length);
  const ink = argbToCss(INK);
  const paper = argbToCss(PAPER);

  // 바탕
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, IMAGE_WIDTH, pageHeight(rows.length));

  // 제목
  ctx.fillStyle = ink;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.font = font(700, 26);
  ctx.fillText(titleOf(page.year), IMAGE_WIDTH / 2, 40);

  // 반영일
  ctx.textAlign = 'right';
  ctx.font = font(700, 13);
  ctx.fillText(
    asOfLabel(page.asOf),
    TABLE_RIGHT,
    heights.title + heights.asOf / 2
  );

  // 범례: 표의 오른쪽 끝에서부터 "이름 + 색칸"을 왼쪽으로 늘어놓는다
  const legendMiddle = heights.title + heights.asOf + heights.legend / 2;
  ctx.font = font(400, 12);
  let right = TABLE_RIGHT;
  for (const { label, status } of [...FEE_STATUS_LEGEND].reverse()) {
    const boxLeft = right - 36;
    ctx.fillStyle = argbToCss(CELL_FILL[status]);
    ctx.fillRect(boxLeft, legendMiddle - 8, 36, 16);
    ctx.fillStyle = ink;
    ctx.textAlign = 'right';
    ctx.fillText(label, boxLeft - 6, legendMiddle);
    right = boxLeft - 6 - ctx.measureText(label).width - 14;
  }

  // 머리글
  ctx.fillStyle = argbToCss(HEADER_FILL);
  ctx.fillRect(MARGIN_X, HEADER_TOP, TABLE_RIGHT - MARGIN_X, heights.header);
  ctx.fillStyle = paper;
  ctx.textAlign = 'center';
  ctx.font = font(700, 13);
  const columnLefts = [
    MARGIN_X,
    NAME_LEFT,
    ...Array.from({ length: 12 }, (_, index) => IMAGE_LAYOUT.monthLeft(index)),
    REMARK_LEFT,
  ];
  const columnWidths = [
    columns.no,
    columns.name,
    ...Array<number>(12).fill(columns.month),
    columns.remark,
  ];
  HEADER_LABELS.forEach((label, index) => {
    ctx.fillText(
      label,
      columnLefts[index] + columnWidths[index] / 2,
      HEADER_TOP + heights.header / 2
    );
  });

  // 회원 줄
  rows.forEach((row, rowIndex) => {
    const top = IMAGE_LAYOUT.rowTop(rowIndex);
    const middle = top + heights.row / 2;

    row.cells.forEach((status, monthIndex) => {
      if (status === 'FUTURE') return;
      ctx.fillStyle = argbToCss(CELL_FILL[status]);
      ctx.fillRect(
        IMAGE_LAYOUT.monthLeft(monthIndex),
        top,
        columns.month,
        heights.row
      );
    });

    ctx.fillStyle = ink;
    ctx.textAlign = 'center';
    ctx.font = font(400, 12);
    ctx.fillText(String(row.no), MARGIN_X + columns.no / 2, middle);

    const nameWidth = columns.name - CELL_PADDING * 2;
    fitFontSize(ctx, row.name, nameWidth, 13, MIN_NAME_SIZE);
    ctx.fillText(
      truncate(ctx, row.name, nameWidth),
      NAME_LEFT + columns.name / 2,
      middle
    );

    if (row.remark) {
      ctx.font = font(400, 10);
      ctx.fillText(
        truncate(ctx, row.remark, columns.remark - CELL_PADDING * 2),
        REMARK_LEFT + columns.remark / 2,
        middle
      );
    }
  });

  // 선: 세로선은 머리글부터 표 끝까지, 가로선은 줄마다 (굵은 선은 2px)
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const x of [...columnLefts, TABLE_RIGHT]) {
    ctx.moveTo(x, HEADER_TOP);
    ctx.lineTo(x, tableBottom);
  }
  ctx.moveTo(MARGIN_X, HEADER_TOP);
  ctx.lineTo(TABLE_RIGHT, HEADER_TOP);
  ctx.moveTo(MARGIN_X, FIRST_ROW_TOP);
  ctx.lineTo(TABLE_RIGHT, FIRST_ROW_TOP);
  rows.forEach((row, rowIndex) => {
    if (row.thickBottom) return;
    const bottom = IMAGE_LAYOUT.rowTop(rowIndex + 1);
    ctx.moveTo(MARGIN_X, bottom);
    ctx.lineTo(TABLE_RIGHT, bottom);
  });
  ctx.stroke();

  const thickRows = rows
    .map((row, rowIndex) => (row.thickBottom ? rowIndex : -1))
    .filter((rowIndex) => rowIndex >= 0);
  if (thickRows.length > 0) {
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (const rowIndex of thickRows) {
      const bottom = IMAGE_LAYOUT.rowTop(rowIndex + 1);
      ctx.moveTo(MARGIN_X, bottom);
      ctx.lineTo(TABLE_RIGHT, bottom);
    }
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  // 쪽 번호
  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.font = font(400, 12);
  ctx.fillText(
    `- ${page.pageNumber} -`,
    IMAGE_WIDTH / 2,
    tableBottom + heights.footer / 2
  );
}

/** 표에 들어가는 모든 글자. 글꼴은 글자 묶음별로 나뉘어 있어 그리기 전에 이 글자로 불러온다 */
function allText(sheet: FeeStatusSheetResponse): string {
  return [
    titleOf(sheet.year),
    asOfLabel(sheet.asOf),
    ...HEADER_LABELS,
    ...FEE_STATUS_LEGEND.map(({ label }) => label),
    '- 0123456789…·탈퇴',
    ...sheet.rows.flatMap((row) => [row.name, row.remark]),
  ].join('');
}

function toPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('이미지를 만들지 못했습니다'));
    }, 'image/png');
  });
}

/** 납부현황표를 40명씩 나눠 PNG로 그린다 */
export async function renderFeeStatusImages(
  sheet: FeeStatusSheetResponse,
  deps: {
    createCanvas?: () => HTMLCanvasElement;
    /** `document.fonts`. 글자 묶음을 미리 불러온다 */
    fonts?: { load: (font: string, text?: string) => Promise<unknown> };
  } = {}
): Promise<Blob[]> {
  const createCanvas =
    deps.createCanvas ?? (() => document.createElement('canvas'));
  const fonts =
    deps.fonts ??
    (typeof document === 'undefined' ? undefined : document.fonts);

  if (fonts) {
    const text = allText(sheet);
    try {
      await Promise.all([
        fonts.load(font(400, 13), text),
        fonts.load(font(700, 13), text),
      ]);
    } catch {
      // 글꼴을 못 받아도 대체 글꼴로 그린다
    }
  }

  const pages = paginateFeeStatusSheet(sheet.rows);
  const blobs: Blob[] = [];
  for (let index = 0; index < pages.length; index++) {
    const rows = pages[index];
    const canvas = createCanvas();
    canvas.width = IMAGE_WIDTH * IMAGE_SCALE;
    canvas.height = pageHeight(rows.length) * IMAGE_SCALE;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('캔버스를 만들 수 없습니다');
    ctx.scale(IMAGE_SCALE, IMAGE_SCALE);
    paintFeeStatusPage(ctx, {
      year: sheet.year,
      asOf: sheet.asOf,
      rows,
      pageNumber: index + 1,
    });
    blobs.push(await toPng(canvas));
  }
  return blobs;
}
