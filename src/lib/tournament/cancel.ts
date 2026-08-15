import type {
  EntryEventStatus,
  EntryPaymentStatus,
} from '@/types/tournament.types';

import { calculateTotalFee } from './fee';

export type CancelableEvent = {
  id: string;
  fee: number;
  status: EntryEventStatus;
};

export type EntryStateAfterCancel = {
  totalFee: number;
  paymentStatus: EntryPaymentStatus;
  allCanceled: boolean;
};

/**
 * 종목 하나를 취소했을 때 신청서가 가져야 할 상태를 계산한다.
 *
 * - 남은 ACTIVE 종목이 있으면 paymentStatus는 그대로 둔다.
 *   (입금확인 후 부분 취소 시 CONFIRMED를 유지하고 totalFee만 줄어든다.
 *    임원이 "입금액 > 청구액"을 보고 환불을 판단한다)
 * - 모든 종목이 취소되면 신청서 자체를 CANCELED로 내린다.
 */
export function resolveEntryStateAfterCancel(
  events: CancelableEvent[],
  currentPaymentStatus: EntryPaymentStatus,
  canceledEventId: string
): EntryStateAfterCancel {
  const nextEvents = events.map((event) =>
    event.id === canceledEventId
      ? { ...event, status: 'CANCELED' as EntryEventStatus }
      : event
  );

  const totalFee = calculateTotalFee(nextEvents);
  const allCanceled = nextEvents.every((event) => event.status === 'CANCELED');

  return {
    totalFee,
    paymentStatus: allCanceled ? 'CANCELED' : currentPaymentStatus,
    allCanceled,
  };
}
