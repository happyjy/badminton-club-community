/**
 * 회원 상태를 바꿀 때 회비 기간(탈퇴월·다시 시작하는 달)을 정하는 규칙.
 * 상태 API·기본값 API·회원 관리 화면이 함께 쓴다. 화면도 쓰므로 prisma를 가져오지 않는다.
 *
 * 탈퇴일(`leftAt`)은 탈퇴 상태에만 둔다. 탈퇴로 바꿀 때 탈퇴월을 받고,
 * 탈퇴에서 되돌릴 때 탈퇴일을 지우고 새 시작월을 받는다.
 */
import { kstYearMonth } from './kst';

/** 달을 물어야 하는 상태 변경: 탈퇴(탈퇴월) · 다시 가입(다시 시작하는 달) */
export type StatusMonthKind = 'leave' | 'rejoin';

/** 상태 변경 요청에 함께 보내는 달 (`YYYY-MM`) */
export interface StatusMonths {
  leftMonth?: string;
  feeStartMonth?: string;
}

/** 달 시트의 기본값 (`YYYY-MM`) */
export interface MemberStatusDefaults {
  /** 마지막으로 회비를 낸 달. 낸 회비가 없으면 null */
  lastPaidMonth: string | null;
  /** 새 가입 규칙으로 정한 다시 시작하는 달 */
  rejoinStartMonth: string;
  /** 지금 저장된 시작월. 실수로 탈퇴 처리했다가 되돌릴 때 고른다 */
  previousStartMonth: string | null;
}

const ACTIVE_AFTER_REJOIN = ['APPROVED', 'ON_LEAVE'];

/** 이 상태 변경에서 달을 물어야 하는지 */
export function statusMonthKind(
  prev: string,
  next: string
): StatusMonthKind | null {
  if (prev !== 'LEFT' && next === 'LEFT') return 'leave';
  if (prev === 'LEFT' && ACTIVE_AFTER_REJOIN.includes(next)) return 'rejoin';
  return null;
}

const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** `YYYY-MM`을 그 달 1일 00:00 UTC로. 달이 아니면 null */
export function parseMonthInput(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const match = MONTH_PATTERN.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  if (year < 2000 || year > 2100) return null;
  return new Date(Date.UTC(year, Number(match[2]) - 1, 1));
}

const pad = (month: number) => String(month).padStart(2, '0');

/** 저장된 날짜를 `YYYY-MM`으로. 예전 값 중 한국 자정으로 저장된 것이 있어 한국 시각으로 읽는다 */
export function toMonthInput(date: Date): string {
  const { year, month } = kstYearMonth(date);
  return `${year}-${pad(month)}`;
}

/** 납부 가운데 연·월이 가장 늦은 달. 없으면 null */
export function latestPaidMonth(
  payments: { year: number; month: number }[]
): string | null {
  if (payments.length === 0) return null;
  const latest = payments.reduce((a, b) =>
    b.year * 12 + b.month > a.year * 12 + a.month ? b : a
  );
  return `${latest.year}-${pad(latest.month)}`;
}
