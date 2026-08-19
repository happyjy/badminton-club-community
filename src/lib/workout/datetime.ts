/**
 * 운동 일정의 날짜·시간 변환 유틸.
 *
 * 이 레포는 운동 시간을 "벽시계 시각을 UTC 슬롯에 그대로 담는" 방식으로 저장한다.
 * 즉 19:00 운동은 2026-09-02T19:00:00Z로 저장되며, 표시할 때
 * formatToKoreanTime()이 getUTCHours()로 다시 꺼낸다.
 * 서버 타임존에 관계없이 같은 값이 나오도록 Date.UTC를 쓴다.
 */

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

/** 'YYYY-MM-DD' + 'HH:mm' → 저장용 Date */
export function toWorkoutDateTime(date: string, time: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
}

/** 저장된 Date → <input type="date"> 값 */
export function toDateInput(value: Date | string): string {
  const date = new Date(value);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** 저장된 Date → <input type="time"> 값 */
export function toTimeInput(value: Date | string): string {
  const date = new Date(value);
  return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}
