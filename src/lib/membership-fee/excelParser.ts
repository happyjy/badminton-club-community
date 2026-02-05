import * as XLSX from 'xlsx';

import { ParsedPaymentRow } from '@/types/membership-fee.types';

interface KakaoBankRow {
  거래일시?: string;
  거래일?: string;
  '보낸분/받는분'?: string;
  보낸분?: string;
  입금?: number | string;
  출금?: number | string;
  메모?: string;
  적요?: string;
}

function parseKakaoBankDate(dateStr: string): Date {
  if (!dateStr) return new Date();

  // 다양한 형식 지원
  // "2025-01-15 14:30:00" 또는 "2025.01.15" 또는 "2025/01/15"
  const cleaned = dateStr.replace(/\./g, '-').replace(/\//g, '-');
  const date = new Date(cleaned);

  if (isNaN(date.getTime())) {
    // Excel 날짜 serial number인 경우
    const serial = parseFloat(dateStr);
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
  if (!amount) return 0;
  if (typeof amount === 'number') return amount;

  // 문자열인 경우 숫자만 추출
  const cleaned = amount.toString().replace(/[^0-9]/g, '');
  return parseInt(cleaned, 10) || 0;
}

function extractDepositorName(row: KakaoBankRow): string {
  const name = row['보낸분/받는분'] || row['보낸분'] || '';
  return name.trim();
}

export function parseKakaoBankExcel(buffer: Buffer): ParsedPaymentRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const rows = XLSX.utils.sheet_to_json<KakaoBankRow>(sheet);

  return rows
    .filter((row) => {
      const amount = parseAmount(row.입금);
      return amount > 0; // 입금 내역만 필터링
    })
    .map((row) => {
      const dateStr = row.거래일시 || row.거래일 || '';

      return {
        transactionDate: parseKakaoBankDate(dateStr),
        depositorName: extractDepositorName(row),
        amount: parseAmount(row.입금),
        memo: row.메모 || row.적요 || null,
      };
    });
}

export function validateExcelFile(fileName: string): boolean {
  const validExtensions = ['.xlsx', '.xls'];
  const extension = fileName.toLowerCase().slice(fileName.lastIndexOf('.'));
  return validExtensions.includes(extension);
}
