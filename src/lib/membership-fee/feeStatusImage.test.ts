import { describe, expect, it, jest } from '@jest/globals';

import {
  type CanvasPainter,
  IMAGE_LAYOUT,
  pageHeight,
  paintFeeStatusPage,
  renderFeeStatusImages,
} from './feeStatusImage';

import type {
  FeeStatusSheetResponse,
  FeeStatusSheetRow,
} from './feeStatusSheet';
import type { CellStatus } from './memberYearStatus';

type Call = {
  op: string;
  args: unknown[];
  fillStyle: string;
  font: string;
  lineWidth: number;
};

/** 가짜 글자 폭: 한글은 글자 크기만큼, 숫자·기호·공백은 0.6배 */
const widthOf = (text: string, size: number) =>
  Array.from(text).reduce(
    (sum, char) => sum + (/[가-힣]/.test(char) ? size : size * 0.6),
    0
  );

/** 그린 것을 기록하는 가짜 캔버스 */
function recorder() {
  const calls: Call[] = [];
  const ctx = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '10px sans-serif',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    scale: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    measureText: (text: string) => ({
      width: widthOf(text, Number(/(\d+)px/.exec(ctx.font)?.[1] ?? 0)),
    }),
  } as Record<string, unknown> & { font: string };
  for (const op of ['fillRect', 'strokeRect', 'fillText', 'stroke']) {
    ctx[op] = (...args: unknown[]) =>
      calls.push({
        op,
        args,
        fillStyle: ctx.fillStyle as string,
        font: ctx.font,
        lineWidth: ctx.lineWidth as number,
      });
  }
  return { ctx: ctx as unknown as CanvasPainter, calls };
}

const row = (over: Partial<FeeStatusSheetRow> = {}): FeeStatusSheetRow => ({
  no: 1,
  name: '가나다',
  cells: Array<CellStatus>(12).fill('PAID'),
  remark: '',
  thickBottom: false,
  ...over,
});

const sheet = (count: number): FeeStatusSheetResponse => ({
  year: 2026,
  asOf: '2026-11-26',
  stamp: '20261126',
  rows: Array.from({ length: count }, (_, index) =>
    row({ no: index + 1, name: index === 0 ? '가나다' : `회원${index}` })
  ),
});

const paint = (rows: FeeStatusSheetRow[], pageNumber = 1) => {
  const { ctx, calls } = recorder();
  paintFeeStatusPage(ctx, { year: 2026, asOf: '2026-11-26', rows, pageNumber });
  return calls;
};

const texts = (calls: Call[]) =>
  calls.filter((call) => call.op === 'fillText').map((call) => call.args[0]);

const fillAt = (calls: Call[], x: number, y: number) =>
  calls.filter(
    (call) => call.op === 'fillRect' && call.args[0] === x && call.args[1] === y
  );

const sizeOf = (call: Call) => Number(/(\d+)px/.exec(call.font)?.[1]);

describe('paintFeeStatusPage', () => {
  it('칸마다 상태 색으로 칠하고, 아직 오지 않은 달은 칠하지 않는다', () => {
    const cells: CellStatus[] = [
      'PAID',
      'UNPAID',
      'EXEMPT',
      'LEAVE',
      'NONE',
      'PAID',
      'PAID',
      'PAID',
      'PAID',
      'PAID',
      'PAID',
      'FUTURE',
    ];
    const calls = paint([row({ cells })]);
    const top = IMAGE_LAYOUT.rowTop(0);

    expect(fillAt(calls, IMAGE_LAYOUT.monthLeft(0), top)[0].fillStyle).toBe(
      '#FFF2CC'
    );
    expect(fillAt(calls, IMAGE_LAYOUT.monthLeft(1), top)[0].fillStyle).toBe(
      '#CC3300'
    );
    expect(fillAt(calls, IMAGE_LAYOUT.monthLeft(2), top)[0].fillStyle).toBe(
      '#2E75B6'
    );
    expect(fillAt(calls, IMAGE_LAYOUT.monthLeft(3), top)[0].fillStyle).toBe(
      '#548235'
    );
    expect(fillAt(calls, IMAGE_LAYOUT.monthLeft(4), top)[0].fillStyle).toBe(
      '#A6A6A6'
    );
    expect(fillAt(calls, IMAGE_LAYOUT.monthLeft(11), top)).toEqual([]);
  });

  it('제목·반영일·범례·머리글·쪽 번호와 줄의 글자를 적는다', () => {
    const calls = paint(
      [row({ no: '탈퇴', name: '라탈퇴', remark: '2026.02 탈퇴' })],
      2
    );

    expect(texts(calls)).toEqual(
      expect.arrayContaining([
        '2026년 월회비 납부현황',
        '반영일 : 2026.11.26',
        '완납',
        '해당없음',
        'NO',
        '성명',
        '1월',
        '12월',
        '비고',
        '탈퇴',
        '라탈퇴',
        '2026.02 탈퇴',
        '- 2 -',
      ])
    );
  });

  it('반영일은 엑셀처럼 0을 붙이지 않는다', () => {
    const { ctx, calls } = recorder();
    paintFeeStatusPage(ctx, {
      year: 2026,
      asOf: '2026-03-05',
      rows: [],
      pageNumber: 1,
    });

    expect(texts(calls)).toContain('반영일 : 2026.3.5');
  });

  it('긴 이름은 글자 크기를 줄여 칸 안에 넣는다', () => {
    const calls = paint([
      row({ name: '가나다' }),
      row({ name: '가나다라마바사' }),
    ]);
    const nameCall = (name: string) =>
      calls.find((call) => call.op === 'fillText' && call.args[0] === name)!;
    const maxWidth = IMAGE_LAYOUT.columns.name - 8;

    expect(sizeOf(nameCall('가나다'))).toBe(13);
    const long = nameCall('가나다라마바사');
    expect(sizeOf(long)).toBeLessThan(13);
    expect('가나다라마바사'.length * sizeOf(long)).toBeLessThanOrEqual(
      maxWidth
    );
  });

  it('병가 칸은 색만 칠하고 글자를 쓰지 않는다', () => {
    const cells = Array<CellStatus>(12).fill('PAID');
    cells[2] = cells[3] = 'LEAVE';
    const calls = paint([row({ cells })]);
    const left = IMAGE_LAYOUT.monthLeft(2);
    const right = IMAGE_LAYOUT.monthLeft(4);
    const top = IMAGE_LAYOUT.rowTop(0);

    expect(fillAt(calls, left, top)[0].fillStyle).toBe('#548235');
    expect(
      calls.filter(
        (call) =>
          call.op === 'fillText' &&
          Number(call.args[1]) >= left &&
          Number(call.args[1]) < right &&
          Number(call.args[2]) > top &&
          Number(call.args[2]) < IMAGE_LAYOUT.rowTop(1)
      )
    ).toEqual([]);
  });

  it('긴 비고는 칸 너비에서 자르고, 탈퇴 비고는 다 적는다', () => {
    const calls = paint([
      row({ remark: '부회장 · 부부 · 총무 · 감사' }),
      row({ no: '탈퇴', remark: '2026.02 탈퇴' }),
    ]);
    const long = texts(calls).find((text) => String(text).startsWith('부회장'));

    expect(String(long).endsWith('…')).toBe(true);
    expect(texts(calls)).toContain('2026.02 탈퇴');
  });

  it('굵은 선을 그어야 하는 줄 아래에만 2px 선', () => {
    expect(
      paint([row(), row()]).filter(
        (call) => call.op === 'stroke' && call.lineWidth === 2
      )
    ).toEqual([]);
    expect(
      paint([row({ thickBottom: true }), row()]).filter(
        (call) => call.op === 'stroke' && call.lineWidth === 2
      )
    ).toHaveLength(1);
  });
});

describe('pageHeight', () => {
  it('40명이면 1152', () => {
    expect(pageHeight(40)).toBe(1152);
  });
});

describe('renderFeeStatusImages', () => {
  const setup = () => {
    const canvases: { width: number; height: number }[] = [];
    const createCanvas = () => {
      const canvas = {
        width: 0,
        height: 0,
        getContext: () => recorder().ctx,
        toBlob: (done: (blob: Blob | null) => void) =>
          done(new Blob(['png'], { type: 'image/png' })),
      };
      canvases.push(canvas);
      return canvas as unknown as HTMLCanvasElement;
    };
    const load = jest.fn(async () => []);
    return { canvases, createCanvas, fonts: { load } };
  };

  it('81명이면 3장, 앞 두 장은 1600×2304, 마지막 장은 1명 높이', async () => {
    const { canvases, createCanvas, fonts } = setup();

    const blobs = await renderFeeStatusImages(sheet(81), {
      createCanvas,
      fonts,
    });

    expect(blobs).toHaveLength(3);
    expect(blobs[0].type).toBe('image/png');
    expect(canvases.map((canvas) => [canvas.width, canvas.height])).toEqual([
      [1600, 2304],
      [1600, 2304],
      [1600, pageHeight(1) * 2],
    ]);
  });

  it('그리기 전에 표의 글자로 글꼴을 불러온다', async () => {
    const { createCanvas, fonts } = setup();

    await renderFeeStatusImages(sheet(2), { createCanvas, fonts });

    expect(fonts.load).toHaveBeenCalled();
    for (const [, text] of fonts.load.mock.calls as unknown as [
      string,
      string,
    ][]) {
      expect(text).toContain('가나다');
      expect(text).toContain('납부현황');
    }
  });

  it('글꼴을 못 불러와도 그린다', async () => {
    const { createCanvas } = setup();
    const fonts = {
      load: jest.fn(async () => {
        throw new Error('network');
      }),
    };

    await expect(
      renderFeeStatusImages(sheet(2), { createCanvas, fonts })
    ).resolves.toHaveLength(1);
  });

  it('캔버스를 못 만들면 실패한다', async () => {
    const createCanvas = () =>
      ({ getContext: () => null }) as unknown as HTMLCanvasElement;

    await expect(
      renderFeeStatusImages(sheet(2), {
        createCanvas,
        fonts: { load: async () => [] },
      })
    ).rejects.toThrow();
  });
});
