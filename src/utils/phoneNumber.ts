/**
 * 휴대폰 번호로 인정하는 형식.
 * 010~019로 시작하고 뒤에 7~8자리가 붙는다.
 * 문자 발송(src/lib/sms.ts)이 쓰는 규칙과 같은 형식이어야
 * 폼을 통과한 번호가 발송 단계에서 뒤늦게 거절되지 않는다.
 */
const PHONE_NUMBER_PATTERN = /^01[0-9]\d{7,8}$/;

/** 하이픈까지 포함한 최대 길이('010-1234-5678' = 11자리). */
const MAX_PHONE_DIGITS = 11;

/**
 * 전화번호 입력을 숫자만 남기는 함수
 * 사용자가 하이픈이나 공백을 섞어 넣어도 동일한 형태로 맞춘다.
 * @param value - 사용자 입력 또는 저장된 전화번호 문자열
 * @returns 숫자만 남긴 최대 11자리 문자열
 */
export const toPhoneDigits = (value?: string | null): string => {
  if (!value) return '';
  return value.replace(/\D/g, '').slice(0, MAX_PHONE_DIGITS);
};

/**
 * 숫자만 있는 전화번호를 하이픈 포맷으로 바꾸는 함수
 * 입력 중에도 자연스럽게 보이도록 자리 수에 맞춰 점진적으로 끊는다.
 * @param value - '01012345678' 형태의 문자열 (하이픈이 섞여 있어도 된다)
 * @returns '010-1234-5678' 형태의 문자열
 */
export const formatPhoneNumber = (value?: string | null): string => {
  const digits = toPhoneDigits(value);
  if (digits.length < 4) return digits;
  if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`;

  // 10자리(예: 011-123-4567)는 가운데가 3자리, 11자리는 4자리다.
  const middleLength = digits.length === 10 ? 3 : 4;
  return `${digits.slice(0, 3)}-${digits.slice(3, 3 + middleLength)}-${digits.slice(3 + middleLength)}`;
};

/**
 * 전화번호가 유효한지 검사하는 함수
 * @param value - 하이픈이 있든 없든 상관없는 전화번호 문자열
 * @returns 유효하면 true
 */
export const isValidPhoneNumber = (value?: string | null): boolean =>
  PHONE_NUMBER_PATTERN.test(toPhoneDigits(value));

/**
 * 전화번호 입력값에 대한 오류 메시지를 돌려주는 함수
 * 폼에서 react-hook-form의 validate에 그대로 연결해 쓴다.
 * @param value - 사용자가 입력한 문자열
 * @returns 오류 메시지. 유효하면 undefined
 */
export const getPhoneNumberError = (
  value?: string | null
): string | undefined => {
  const digits = toPhoneDigits(value);

  if (digits.length === 0) return '전화번호를 입력해주세요.';
  if (!isValidPhoneNumber(digits))
    return '올바른 전화번호가 아닙니다. (예: 010-1234-5678)';

  return undefined;
};
