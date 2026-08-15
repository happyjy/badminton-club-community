import type { EntrySubmissionInput } from '@/types/tournament.types';

export type ValidatableOption = {
  id: string;
  playerCount: number;
  isActive: boolean;
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
  options: ValidatableOption[]
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

  const optionMap = new Map(options.map((option) => [option.id, option]));
  const seenOptionIds = new Set<string>();

  for (const event of input.events) {
    const option = optionMap.get(event.eventOptionId);
    if (!option || !option.isActive) {
      return fail('선택할 수 없는 종목입니다.');
    }
    if (seenOptionIds.has(event.eventOptionId)) {
      return fail('같은 종목을 중복 신청했습니다.');
    }
    seenOptionIds.add(event.eventOptionId);

    if (event.playerKeys.length !== option.playerCount) {
      return fail(
        `종목별 선수 인원이 맞지 않습니다. (필요: ${option.playerCount}명)`
      );
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
