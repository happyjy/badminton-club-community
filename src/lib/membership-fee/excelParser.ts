import * as XLSX from 'xlsx';

import { ParsedPaymentRow } from '@/types/membership-fee.types';

/**
 * 카카오뱅크 거래내역 엑셀 실제 컬럼 (헤더 행: 거래일시, 구분, 거래금액, 거래 후 잔액, 거래구분, 내용, 메모)
 * 데이터는 헤더 다음 행부터 시작하며, 상단에 제목/조회기간 등 메타 행이 있음.
 */
interface KakaoBankRow {
  거래일시?: string;
  구분?: string;
  거래금액?: number | string;
  '거래 후 잔액'?: number | string;
  거래구분?: string;
  내용?: string;
  메모?: string;
}

function parseKakaoBankDate(dateStr: string): Date {
  if (!dateStr) return new Date();

  const cleaned = String(dateStr).replace(/\./g, '-').replace(/\//g, '-');
  const date = new Date(cleaned);

  if (isNaN(date.getTime())) {
    const serial = parseFloat(String(dateStr));
    if (!isNaN(serial)) {
      const utcDays = Math.floor(serial - 25569);
      const utcValue = utcDays * 86400;
      return new Date(utcValue * 1000);
    }
    return new Date();
  }

  return date;
}

function parseAmount(amount: number | string | undefined): number {
  if (amount === undefined || amount === null) return 0;
  if (typeof amount === 'number') return amount;

  const cleaned = String(amount).replace(/[^0-9-]/g, '');
  const value = parseInt(cleaned, 10);
  return isNaN(value) ? 0 : Math.abs(value);
}

/**
 * 헤더 행 인덱스 찾기.
 * 카카오뱅크 엑셀은 상단에 제목/조회기간 등이 있어, '거래일시','구분','거래금액'이 모두 있는 행을 헤더로 사용.
 */
function findHeaderRowIndex(rows: unknown[][]): number {
  return rows.findIndex((row) => {
    if (!row || !Array.isArray(row)) return false;
    const cells = row.map((c) => String(c ?? '').trim());
    const hasFirst = cells[0]?.includes('거래일시') ?? false;
    const has구분 = cells.some((c) => c === '구분');
    const has거래금액 = cells.some((c) => c === '거래금액');
    return hasFirst && has구분 && has거래금액;
  });
}

/**
 * 배열 행을 헤더 키로 객체로 변환
 */
function rowToObject(
  headers: string[],
  row: unknown[]
): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  headers.forEach((h, i) => {
    obj[h] = row[i];
  });
  return obj;
}

export function parseKakaoBankExcel(buffer: Buffer): ParsedPaymentRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const rowsArrays = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
  }) as unknown[][];

  const headerRowIndex = findHeaderRowIndex(rowsArrays);
  if (headerRowIndex < 0) {
    return [];
  }

  const headers = (rowsArrays[headerRowIndex] as string[]).map((h) =>
    String(h ?? '').trim()
  );
  const dataRows = rowsArrays.slice(headerRowIndex + 1);

  return dataRows
    .filter((row) => {
      const obj = rowToObject(headers, row as unknown[]);
      const type = String(obj['구분'] ?? '').trim();
      const amount = parseAmount(
        obj['거래금액'] as number | string | undefined
      );
      return type === '입금' && amount > 0;
    })
    .map((row) => {
      const obj = rowToObject(headers, row as unknown[]) as KakaoBankRow;
      const dateStr = obj.거래일시 ?? '';
      const depositorName = (obj.내용 ?? '').trim();
      const amount = parseAmount(obj.거래금액);
      const memo = obj.메모 ? String(obj.메모).trim() : null;

      return {
        transactionDate: parseKakaoBankDate(dateStr),
        depositorName: depositorName || '(이름 없음)',
        amount,
        memo: memo || null,
      };
    });
}

export function validateExcelFile(fileName: string): boolean {
  const validExtensions = ['.xlsx', '.xls'];
  const extension = fileName.toLowerCase().slice(fileName.lastIndexOf('.'));
  return validExtensions.includes(extension);
}
