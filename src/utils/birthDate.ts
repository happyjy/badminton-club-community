import { getTodayInKorea } from './date';

/** 생년월일로 인정하는 가장 이른 연도. 이보다 앞선 값은 오타로 본다. */
const MIN_BIRTH_YEAR = 1900;

/**
 * 생년월일 입력을 숫자 8자리로만 남기는 함수
 * 사용자가 '1990-03-15'처럼 하이픈을 넣거나, 저장된 값이 자동으로 채워져도
 * 동일하게 '19900315' 형태로 맞춘다.
 * @param value - 사용자 입력 또는 저장된 생년월일 문자열
 * @returns 숫자만 남긴 최대 8자리 문자열
 */
export const toBirthDateDigits = (value?: string | null): string => {
  if (!value) return '';
  return value.replace(/\D/g, '').slice(0, 8);
};

/**
 * 숫자 8자리 생년월일을 저장 포맷('YYYY-MM-DD')으로 바꾸는 함수
 * calculateAgeGroup 등 기존 소비처가 모두 하이픈 포맷을 전제하므로
 * 폼에서 서버로 넘어가는 값은 반드시 이 함수를 거쳐야 한다.
 * @param value - '19900315' 형태의 문자열 (하이픈이 섞여 있어도 된다)
 * @returns 'YYYY-MM-DD' 문자열. 8자리를 못 채우면 입력값을 그대로 돌려준다.
 */
export const toIsoBirthDate = (value?: string | null): string => {
  const digits = toBirthDateDigits(value);
  if (digits.length !== 8) return value ?? '';
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
};

/**
 * 'YYYY-MM-DD' 형식의 문자열이 실재하는 날짜인지 검사하는 함수
 * Date 생성자는 2월 30일을 3월 2일로 조용히 넘기므로, 만들어진 Date를
 * 다시 분해해 입력과 같은지 확인한다.
 * @param isoDate - 'YYYY-MM-DD' 형식 문자열
 * @returns 실재하는 날짜면 true
 */
const isRealDate = (isoDate: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return false;

  const [year, month, day] = isoDate.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
};

/**
 * 생년월일이 유효한지 검사하는 함수
 * 형식·실재 여부에 더해, 미래 날짜와 지나치게 이른 연도를 걸러낸다.
 * 오늘 날짜 비교는 타임존 차이를 피하려고 KST 기준 문자열끼리 비교한다.
 * @param value - '19900315' 또는 '1990-03-15' 형태의 문자열
 * @returns 유효하면 true
 */
export const isValidBirthDate = (value?: string | null): boolean => {
  const digits = toBirthDateDigits(value);
  if (digits.length !== 8) return false;

  const isoDate = toIsoBirthDate(digits);
  if (!isRealDate(isoDate)) return false;

  const year = Number(digits.slice(0, 4));
  if (year < MIN_BIRTH_YEAR) return false;

  return isoDate <= getTodayInKorea();
};

/**
 * 생년월일 입력값에 대한 오류 메시지를 돌려주는 함수
 * 폼에서 react-hook-form의 validate에 그대로 연결해 쓴다.
 * @param value - 사용자가 입력한 문자열
 * @returns 오류 메시지. 유효하면 undefined
 */
export const getBirthDateError = (
  value?: string | null
): string | undefined => {
  const digits = toBirthDateDigits(value);

  if (digits.length === 0) return '생년월일을 입력해주세요.';
  if (digits.length !== 8)
    return '생년월일 8자리를 입력해주세요. (예: 19900315)';
  if (!isValidBirthDate(digits)) return '올바른 생년월일이 아닙니다.';

  return undefined;
};
