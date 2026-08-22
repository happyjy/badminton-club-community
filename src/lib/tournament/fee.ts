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

export type SurchargeablePlayer = {
  key: string;
  isLocalMember: boolean;
};

export type EventFeeInput = {
  /** 종목에 정의된 기본 참가비 */
  baseFee: number;
  /** 비회원 1인당 추가금. 0이면 추가금 미사용 */
  surcharge: number;
  /** 이 종목에 배정된 선수 key 목록 */
  playerKeys: string[];
  /** 신청서 전체 선수 명단 */
  players: SurchargeablePlayer[];
};

/**
 * 종목 1줄의 참가비를 계산한다.
 *
 * 규칙이 "팀당 60,000원, 회원이 아닌 경우 1인당 1만원 추가"이므로
 * 추가금은 그 종목에 배정된 비회원 수만큼 붙는다.
 * 한 선수가 여러 종목에 나가면 종목마다 각각 부과된다.
 */
export function calculateEventFee({
  baseFee,
  surcharge,
  playerKeys,
  players,
}: EventFeeInput): number {
  if (surcharge <= 0) return baseFee;

  const memberByKey = new Map(
    players.map((player) => [player.key, player.isLocalMember])
  );
  // 명단에 없는 key는 검증 단계에서 걸러지므로 여기서는 회원으로 본다
  const nonMemberCount = playerKeys.filter(
    (key) => memberByKey.get(key) === false
  ).length;

  return baseFee + nonMemberCount * surcharge;
}
