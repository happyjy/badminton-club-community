import type {
  TournamentEffectiveStatus,
  TournamentStatus,
} from '@/types/tournament.types';

export type StatusResolvable = {
  status: TournamentStatus;
  applyStartAt: Date | null;
  applyDeadline: Date;
};

/**
 * DB의 status(관리자 수동 의도)와 신청 기간을 조합해 실제 노출 상태를 파생한다.
 * 스케줄러 없이 조회 시점에 계산하므로 cron이 필요 없다.
 */
export function resolveTournamentStatus(
  input: StatusResolvable,
  now: Date
): TournamentEffectiveStatus {
  if (input.status === 'DRAFT') return 'DRAFT';
  if (input.status === 'CLOSED') return 'CLOSED';
  if (now.getTime() > input.applyDeadline.getTime()) return 'CLOSED';
  if (input.applyStartAt && now.getTime() < input.applyStartAt.getTime()) {
    return 'UPCOMING';
  }
  return 'OPEN';
}

/**
 * 신청서 제출·수정·취소가 가능한 상태인지 판단한다.
 */
export function isAcceptingEntries(
  input: StatusResolvable,
  now: Date
): boolean {
  return resolveTournamentStatus(input, now) === 'OPEN';
}
