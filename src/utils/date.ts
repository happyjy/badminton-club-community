/**
 * Date를 사용자 로컬 시간 기준 한국어 12시간제(오전/오후 HH:mm)로 포맷
 * - 서버가 UTC로 저장해도, 브라우저 로컬 타임존으로 변환된 시간을 표시
 * @param dateInput - Date 객체 또는 파싱 가능한 날짜 값
 * @returns 포맷 문자열 (예: "오전 01:56", "오후 07:30")
 */
export const formatToKoreanTime = (dateInput: Date | string) => {
  const date = new Date(dateInput);
  const hours = date.getHours();
  const minutes = date.getMinutes();

  const period = hours >= 12 ? '오후' : '오전';
  const hour12 = hours % 12 || 12;
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
