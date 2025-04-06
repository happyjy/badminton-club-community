/**
 * UTC 시간을 한국 시간 형식(오후 19:30)으로 변환하는 함수
 * @param dateStr - UTC 시간 문자열 (예: "2025-02-05T19:30:00.000Z")
 * @returns 포맷팅된 시간 문자열 (예: "오후 19:30")
 */
export const formatToKoreanTime = (dateStr: Date) => {
  // UTC 시간을 파싱
  const date = new Date(dateStr);
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();

  // 12시간제로 변환
  const period = hours >= 12 ? '오후' : '오전';
  const hour12 = hours % 12 || 12;

  // 시간과 분을 2자리 숫자로 포맷팅
  const formattedHours = hour12.toString().padStart(2, '0');
  const formattedMinutes = minutes.toString().padStart(2, '0');

  return `${period} ${formattedHours}:${formattedMinutes}`;
};

/**
 * 현재 달의 시작일과 종료일을 계산하는 함수
 * @param date - 기준 날짜 (기본값: 현재 날짜)
 * @returns 시작일과 종료일 객체
 */
export const getMonthRange = (date = new Date()) => {
  const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const endOfMonth = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );

  return {
    startOfMonth,
    endOfMonth,
  };
};
