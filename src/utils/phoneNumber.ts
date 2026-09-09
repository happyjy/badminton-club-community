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
/** 3칸으로 나뉜 전화번호 입력 상태. */
export interface PhoneNumberParts {
  first: string;
  second: string;
  third: string;
}

/** 각 입력 칸이 받을 수 있는 최대 자리 수. */
const PART_MAX_LENGTH = { first: 3, second: 4, third: 4 } as const;

/**
 * 전화번호 문자열을 3칸 입력 상태로 나누는 함수
 *
 * 하이픈 위치가 아니라 자리 수를 기준으로 나눈다. split('-')에 의존하면
 * 하이픈이 빠진 '01079366342'가 first 칸에 통째로 들어가고,
 * 손상된 '010-71347219-7219'은 second 칸에 8자리를 실은 채 되살아난다.
 *
 * @param value - 저장된 전화번호 문자열
 * @returns 각 칸의 최대 길이를 넘지 않는 3칸 상태
 */
export const splitPhoneParts = (value?: string | null): PhoneNumberParts => {
  const digits = toPhoneDigits(value);
  if (!digits) return { first: '', second: '', third: '' };

  const middleLength = digits.length === 10 ? 3 : 4;
  return {
    first: digits.slice(0, 3),
    second: digits.slice(3, 3 + middleLength),
    third: digits.slice(3 + middleLength),
  };
};

/**
 * 3칸 입력 상태를 저장용 문자열로 합치는 함수
 *
 * 아직 덜 채운 칸 때문에 '010--'처럼 빈 하이픈만 남은 값이 저장되지 않도록
 * 채워진 칸만 이어 붙인다.
 *
 * @param parts - 3칸 입력 상태
 * @returns '010-1234-5678' 형태의 문자열
 */
export const joinPhoneParts = (parts: PhoneNumberParts): string =>
  [parts.first, parts.second, parts.third].filter(Boolean).join('-');

/** 입력 칸이 받을 수 있는 만큼만 숫자를 남기는 함수. */
export const clampPhonePart = (
  value: string,
  part: keyof PhoneNumberParts
): string => value.replace(/\D/g, '').slice(0, PART_MAX_LENGTH[part]);

/** 화면에 전화번호를 어떻게 내보낼지 담는 결과. */
export interface DisplayPhoneNumber {
  /** 실제로 화면에 찍을 문자열. */
  text: string;
  /** 형식을 신뢰할 수 없어 사람이 확인해야 하는 값인지. */
  isMalformed: boolean;
}

/**
 * 저장된 전화번호를 화면 표시용으로 바꾸는 함수
 *
 * 하이픈이 빠졌을 뿐인 값('01079366342')은 정규화해서 보여준다.
 * 반면 숫자가 11자리를 넘는 값('010-71347219-7219'은 숫자만 15자리)은
 * 잘라내지 않는다. 잘라내면 버려진 자리 때문에 근거 없는 추측이
 * 정상 번호처럼 보이고, 임원진이 엉뚱한 곳으로 연락할 수 있다.
 * 이런 값은 원본을 그대로 두고 손상으로 표시해 사람이 판단하게 한다.
 *
 * @param value - DB에 저장된 전화번호 문자열
 * @returns 표시 문자열과 손상 여부
 */
export const toDisplayPhoneNumber = (
  value?: string | null
): DisplayPhoneNumber => {
  if (!value) return { text: '', isMalformed: false };

  // toPhoneDigits는 11자리에서 잘라내므로, 잘림 여부는 원본에서 직접 센다.
  const rawDigits = value.replace(/\D/g, '');
  if (rawDigits.length > MAX_PHONE_DIGITS) {
    return { text: value, isMalformed: true };
  }

  if (!isValidPhoneNumber(value)) {
    return { text: value, isMalformed: true };
  }

  return { text: formatPhoneNumber(value), isMalformed: false };
};

export const getPhoneNumberError = (
  value?: string | null
): string | undefined => {
  const digits = toPhoneDigits(value);

  if (digits.length === 0) return '전화번호를 입력해주세요.';
  if (!isValidPhoneNumber(digits))
    return '올바른 전화번호가 아닙니다. (예: 010-1234-5678)';

  return undefined;
};
