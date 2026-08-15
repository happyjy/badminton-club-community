import type {
  EntryPaymentStatus,
  TournamentEffectiveStatus,
} from '@/types/tournament.types';

export const STATUS_LABEL: Record<TournamentEffectiveStatus, string> = {
  DRAFT: '임시저장',
  UPCOMING: '모집예정',
  OPEN: '모집중',
  CLOSED: '마감',
};

export const STATUS_CLASS: Record<TournamentEffectiveStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  UPCOMING: 'bg-yellow-100 text-yellow-700',
  OPEN: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-200 text-gray-500',
};

export const PAYMENT_LABEL: Record<EntryPaymentStatus, string> = {
  PENDING: '입금대기',
  CONFIRMED: '입금확인',
  CANCELED: '취소',
};

export const PAYMENT_CLASS: Record<EntryPaymentStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  CANCELED: 'bg-gray-200 text-gray-500',
};

export function formatFee(fee: number): string {
  if (fee === 0) return '무료';
  return `${fee.toLocaleString('ko-KR')}원`;
}

export function formatEventLabel(option: {
  eventType: string;
  ageGroup: string;
  level: string;
}): string {
  return [option.eventType, option.ageGroup, option.level]
    .filter((part) => part.trim().length > 0)
    .join(' ');
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function getDaysUntil(deadline: Date, now: Date): number {
  return Math.ceil((deadline.getTime() - now.getTime()) / MS_PER_DAY);
}
