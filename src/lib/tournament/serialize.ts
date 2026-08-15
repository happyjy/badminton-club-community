import type {
  EntryEventStatus,
  PublicParticipant,
} from '@/types/tournament.types';

export type MaskableEntry = {
  entryEvents: Array<{
    status: EntryEventStatus;
    ageGroup: string;
    level: string;
    eventType: { name: string };
    eventPlayers: Array<{ entryPlayer: { name: string } }>;
  }>;
};

/**
 * 회원 전체에게 공개되는 참가자 목록을 만든다.
 * 이름과 종목 정보만 담고 생년월일·전화번호·티셔츠 사이즈는 포함하지 않는다.
 *
 * 이 함수에 넘기는 데이터부터 PUBLIC_PARTICIPANT_SELECT로 조회해야 한다.
 * 민감정보를 조회한 뒤 여기서 버리는 방식은 쓰지 않는다.
 */
export function toPublicParticipants(
  entries: MaskableEntry[]
): PublicParticipant[] {
  return entries.flatMap((entry) =>
    entry.entryEvents
      .filter((event) => event.status === 'ACTIVE')
      .flatMap((event) =>
        event.eventPlayers.map((eventPlayer) => ({
          name: eventPlayer.entryPlayer.name,
          eventType: event.eventType.name,
          ageGroup: event.ageGroup,
          level: event.level,
        }))
      )
  );
}

/**
 * 회원용 참가자 목록 조회 시 사용하는 Prisma select.
 * 민감 필드를 애초에 DB에서 가져오지 않는 것이 핵심이다.
 */
export const PUBLIC_PARTICIPANT_SELECT = {
  entryEvents: {
    select: {
      status: true,
      ageGroup: true,
      level: true,
      eventType: { select: { name: true } },
      eventPlayers: {
        select: { entryPlayer: { select: { name: true } } },
      },
    },
  },
} as const;
