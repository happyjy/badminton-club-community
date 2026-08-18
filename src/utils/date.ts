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

  const period = hours >= 12 ? '오후' : '오전';
  const hour12 = hours % 12 || 12;
  const formattedHours = hour12.toString().padStart(2, '0');
  const formattedMinutes = minutes.toString().padStart(2, '0');

  return `${period} ${formattedHours}:${formattedMinutes}`;
};

/**
 * 오늘 날짜를 한국 시간(KST) 기준 'YYYY-MM-DD' 문자열로 반환하는 함수
 * 서버(UTC)와 클라이언트(로컬 타임존)에서 동일한 값을 얻기 위해 KST 오프셋(+9h)을 직접 적용한다.
 * @returns 'YYYY-MM-DD' 형식의 오늘 날짜 (예: "2025-02-05")
 */
export const getTodayInKorea = (): string => {
  const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
  return new Date(Date.now() + KST_OFFSET_MS).toISOString().split('T')[0];
};

/**
 * Date를 로컬 시간 기준 'YYYY-MM-DD' 문자열로 변환하는 함수
 * toISOString()은 UTC로 변환하므로 KST에서는 날짜가 하루 밀린다.
 * (예: 2026-08-17 00:30 KST -> "2026-08-16")
 * input[type=date]의 value·min·max처럼 사용자가 보는 날짜와
 * 정확히 일치해야 하는 곳에 쓴다.
 * @param date - 변환할 Date. null이면 빈 문자열을 반환한다.
 * @returns 'YYYY-MM-DD' 형식 문자열 (예: "2026-08-17")
 */
export const toLocalDateString = (date: Date | null): string => {
  if (!date || isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * 방문희망일이 지났는지(오늘 포함) 판단하는 함수
 * visitDate는 'YYYY-MM-DD' 문자열로 저장되므로 같은 형식끼리 문자열 비교한다.
 * @param visitDate - 방문희망일 ('YYYY-MM-DD'). 빈 값이면 지나지 않은 것으로 간주한다.
 * @returns 방문희망일이 오늘이거나 이전이면 true
 */
export const isVisitDatePassed = (visitDate?: string | null): boolean => {
  if (!visitDate) return false;
  return visitDate <= getTodayInKorea();
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
