export type WorkoutUpdateInput = {
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  maxParticipants: number;
};

export type ValidationResult = { ok: true } | { ok: false; error: string };

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function fail(error: string): ValidationResult {
  return { ok: false, error };
}

function toMinutes(time: string): number {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

/**
 * 운동 일정 수정 페이로드를 검증한다.
 * 클라이언트가 보낸 값을 신뢰하지 않고 서버에서 재검증하는 것이 목적이다.
 * 수정 권한 여부는 requireClubAdmin()의 책임이므로 여기서 다루지 않는다.
 */
export function validateWorkoutUpdate(
  input: WorkoutUpdateInput,
  currentParticipantCount: number
): ValidationResult {
  if (!input.title?.trim()) {
    return fail('제목을 입력해주세요.');
  }
  if (!input.location?.trim()) {
    return fail('장소를 입력해주세요.');
  }
  if (!DATE_PATTERN.test(input.date)) {
    return fail('날짜 형식이 올바르지 않습니다.');
  }
  if (
    !TIME_PATTERN.test(input.startTime) ||
    !TIME_PATTERN.test(input.endTime)
  ) {
    return fail('시간 형식이 올바르지 않습니다.');
  }
  if (toMinutes(input.endTime) <= toMinutes(input.startTime)) {
    return fail('종료 시간은 시작 시간보다 이후여야 합니다.');
  }
  if (!Number.isInteger(input.maxParticipants) || input.maxParticipants < 1) {
    return fail('최대 인원은 1명 이상이어야 합니다.');
  }
  if (input.maxParticipants < currentParticipantCount) {
    return fail(
      `이미 참여한 인원(${currentParticipantCount}명)보다 적게 설정할 수 없습니다.`
    );
  }
  return { ok: true };
}
