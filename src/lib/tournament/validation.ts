import type { EntrySubmissionInput } from '@/types/tournament.types';

import { formatEventLabel } from './display';

export type ValidatableEventType = {
  id: string;
  name: string;
  playerCount: number;
  isActive: boolean;
};

export type ValidatableTournament = {
  eventTypes: ValidatableEventType[];
  ageGroups: string[];
  levels: string[];
  /** 소속 기준 라벨 (예: 당산클럽 소속). 오류 메시지에 쓴다 */
  memberLabel?: string | null;
  /** 팀당 최소 소속 인원. 0이면 제한 없음 */
  minClubMembersPerTeam?: number;
};

export type ValidationResult = { ok: true } | { ok: false; error: string };

function fail(error: string): ValidationResult {
  return { ok: false, error };
}

/**
 * 신청 제출 페이로드를 검증한다.
 * 클라이언트가 보낸 값을 신뢰하지 않고 서버에서 재검증하는 것이 목적이다.
 * 대회 마감 여부는 isAcceptingEntries()의 책임이므로 여기서 다루지 않는다.
 */
export function validateEntrySubmission(
  input: EntrySubmissionInput,
  tournament: ValidatableTournament
): ValidationResult {
  if (!input.privacyAgreed) {
    return fail('개인정보 수집·이용에 동의해야 신청할 수 있습니다.');
  }
  if (!input.depositorName?.trim()) {
    return fail('입금자명을 입력해주세요.');
  }
  if (input.players.length === 0) {
    return fail('선수를 1명 이상 등록해주세요.');
  }
  if (input.events.length === 0) {
    return fail('종목을 1개 이상 선택해주세요.');
  }

  const playerKeys = new Set(input.players.map((player) => player.key));
  if (playerKeys.size !== input.players.length) {
    return fail('선수 정보가 올바르지 않습니다.');
  }
  if (input.players.some((player) => !player.name?.trim())) {
    return fail('선수 이름을 모두 입력해주세요.');
  }

  const eventTypeMap = new Map(
    tournament.eventTypes.map((eventType) => [eventType.id, eventType])
  );
  const ageGroupSet = new Set(tournament.ageGroups);
  const levelSet = new Set(tournament.levels);
  // 대회가 급수를 쓰지 않으면 빈 문자열만 허용한다
  const usesLevel = tournament.levels.length > 0;

  const minClubMembers = tournament.minClubMembersPerTeam ?? 0;
  const memberByKey = new Map(
    input.players.map((player) => [player.key, player.isClubMember])
  );

  const seenCombinations = new Set<string>();

  for (const event of input.events) {
    const eventType = eventTypeMap.get(event.eventTypeId);
    if (!eventType || !eventType.isActive) {
      return fail('선택할 수 없는 종목입니다.');
    }
    if (!ageGroupSet.has(event.ageGroup)) {
      return fail('선택할 수 없는 연령입니다.');
    }
    if (usesLevel ? !levelSet.has(event.level) : event.level !== '') {
      return fail('선택할 수 없는 급수입니다.');
    }

    // 같은 종목이라도 연령·급수가 다르면 별개 신청이다
    const key = `${event.eventTypeId}|${event.ageGroup}|${event.level}`;
    if (seenCombinations.has(key)) {
      return fail('같은 종목을 중복 신청했습니다.');
    }
    seenCombinations.add(key);

    if (event.playerKeys.length !== eventType.playerCount) {
      return fail(
        `종목별 선수 인원이 맞지 않습니다. (필요: ${eventType.playerCount}명)`
      );
    }

    // 주최측에 본회 소속으로 등록하려면 팀에 소속 회원이 있어야 한다.
    // 외부 선수만으로 이루어진 팀은 등록 자체가 불가능하므로 여기서 막는다.
    if (minClubMembers > 0) {
      const clubMemberCount = event.playerKeys.filter(
        (key) => memberByKey.get(key) !== false
      ).length;
      if (clubMemberCount < minClubMembers) {
        const label = tournament.memberLabel?.trim() || '클럽 소속';
        const eventLabel = formatEventLabel({
          eventType: eventType.name,
          ageGroup: event.ageGroup,
          level: event.level,
        });
        return fail(
          `한 종목에 ${label}이 최소 ${minClubMembers}명 있어야 신청할 수 있습니다. (${eventLabel})`
        );
      }
    }
    if (new Set(event.playerKeys).size !== event.playerKeys.length) {
      return fail('한 종목에 같은 선수를 중복 배정할 수 없습니다.');
    }
    if (event.playerKeys.some((key) => !playerKeys.has(key))) {
      return fail('종목에 배정된 선수를 찾을 수 없습니다.');
    }
  }

  return { ok: true };
}
