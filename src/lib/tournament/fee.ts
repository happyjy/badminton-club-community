import type { EntryEventStatus } from '@/types/tournament.types';

export type FeeCalculable = {
  fee: number;
  status: EntryEventStatus;
};

/**
 * ACTIVE 상태인 신청 종목의 참가비를 합산한다.
 * 취소된 종목은 청구 대상이 아니므로 제외한다.
 */
export function calculateTotalFee(events: FeeCalculable[]): number {
  return events
    .filter((event) => event.status === 'ACTIVE')
    .reduce((sum, event) => sum + event.fee, 0);
}
