import { describe, expect, it } from '@jest/globals';
import * as XLSX from 'xlsx';

import { parseKakaoBankExcel } from './excelParser';

function buildWorkbook(rows: unknown[][]): Buffer {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, '카카오뱅크 거래내역');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

const HEADER = [
  '거래일시',
  '구분',
  '거래금액',
  '거래 후 잔액',
  '거래구분',
  '내용',
  '메모',
];

describe('parseKakaoBankExcel', () => {
  it('거래구분을 보존하고 출금은 뺀다', () => {
    const buf = buildWorkbook([
      ['카카오뱅크 거래내역'],
      ['성명', '홍길동'],
      HEADER,
      [
        '2026.05.03 10:00:00',
        '입금',
        '25,000',
        '1,000,000',
        '일반입금',
        '가나다5월',
        '',
      ],
      [
        '2026.05.22 09:00:00',
        '입금',
        '377',
        '1,000,377',
        '예금이자',
        '입출금통장 이자',
        '',
      ],
      [
        '2026.05.25 09:00:00',
        '출금',
        '-25,000',
        '975,377',
        '일반이체',
        '가나다',
        '환불',
      ],
    ]);

    const rows = parseKakaoBankExcel(buf);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      depositorName: '가나다5월',
      amount: 25000,
      transactionType: '일반입금',
      memo: null,
    });
    expect(rows[1]).toMatchObject({ amount: 377, transactionType: '예금이자' });
    expect(rows[0].transactionDate.getFullYear()).toBe(2026);
  });

  // 서버(UTC)에서도, 개발 PC(한국 시각)에서도 같은 순간으로 읽혀야 한다.
  // `TZ=UTC npx jest`로 돌리면 서버와 같은 조건이 된다.
  it('거래일시는 서버 시간대와 무관하게 한국 시각으로 읽는다', () => {
    const buf = buildWorkbook([
      HEADER,
      [
        '2026.05.01 00:30:00',
        '입금',
        '25,000',
        '1,000,000',
        '일반입금',
        '가나다',
        '',
      ],
    ]);

    const [parsed] = parseKakaoBankExcel(buf);

    expect(parsed.transactionDate.toISOString()).toBe(
      '2026-04-30T15:30:00.000Z'
    );
  });
});
