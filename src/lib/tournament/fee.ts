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
  isClubMember: boolean;
};

/** 추가금 부과 단위. Prisma의 SurchargeUnit enum과 값이 같아야 한다. */
export type SurchargeUnitValue = 'PER_PLAYER' | 'PER_TEAM';

export type EventFeeInput = {
  /** 종목에 정의된 기본 참가비 */
  baseFee: number;
  /** 외부 선수에게 붙는 추가금. 0이면 추가금 미사용 */
  surcharge: number;
  /** 부과 단위. 생략하면 기존 동작인 1인당 부과 */
  unit?: SurchargeUnitValue;
  /** 이 종목에 배정된 선수 key 목록 */
  playerKeys: string[];
  /** 신청서 전체 선수 명단 */
  players: SurchargeablePlayer[];
};

/**
 * 종목 1줄의 참가비를 계산한다.
 *
 * 추가금 부과 단위는 대회마다 다르다.
 * - PER_PLAYER: "소속이 아닌 경우 1인당 1만원 추가" — 외부 선수 수만큼 붙는다
 * - PER_TEAM:   "외부 선수가 낀 팀은 1만원 추가" — 몇 명이든 종목당 1회만 붙는다
 *
 * 한 선수가 여러 종목에 나가면 어느 단위든 종목마다 각각 부과된다.
 */
export function calculateEventFee({
  baseFee,
  surcharge,
  unit = 'PER_PLAYER',
  playerKeys,
  players,
}: EventFeeInput): number {
  if (surcharge <= 0) return baseFee;

  const memberByKey = new Map(
    players.map((player) => [player.key, player.isClubMember])
  );
  // 명단에 없는 key는 검증 단계에서 걸러지므로 여기서는 소속으로 본다
  const externalCount = playerKeys.filter(
    (key) => memberByKey.get(key) === false
  ).length;

  if (externalCount === 0) return baseFee;
  // 팀당 부과는 외부 선수가 1명이라도 있으면 1회만 붙인다
  if (unit === 'PER_TEAM') return baseFee + surcharge;

  return baseFee + externalCount * surcharge;
}
