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
 * 예: '010-1234-5678' -> '01012345678'
 * 예: '01012345678' -> '01012345678'
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

/**
 * 국가번호 '+82'를 국내 표기 '0'으로 되돌리는 함수
 *
 * 크롬 자동완성은 저장된 번호를 '+82 10-6636-8962'로 채운다. 숫자만 남기면
 * '821066368962'가 되는데, 이걸 그대로 나눠 담으면 '821'로 시작하는 엉뚱한
 * 번호가 된다.
 *
 * 국내 번호 길이(10~11자리)를 넘는 값만 손댄다. 짧은 값까지 고치면 아직
 * 입력 중인 '82...'를 성급하게 바꿔 버린다.
 *
 * @param digits - 숫자만 남은 전화번호 문자열
 * @returns 국가번호를 걷어낸 문자열
 */
export const stripKoreanCountryCode = (digits?: string | null): string => {
  if (!digits) return '';

  const cleaned = digits.replace(/\D/g, '');
  if (!cleaned.startsWith('82') || cleaned.length < 11) return cleaned;

  // '82' 다음이 이미 0이면 그 0을 살리고, 아니면 0을 붙여 국내 표기로 만든다.
  const rest = cleaned.slice(2);
  return rest.startsWith('0') ? rest : `0${rest}`;
};

/**
 * 입력된 값을 세 칸에 나눠 담는 함수
 *
 * 자동완성과 붙여넣기는 세 칸 구조를 모르고 한 칸에 번호 전체를 넣는다.
 * 칸마다 제 몫만 자르면 나머지 자리가 버려지므로, 칸을 넘치는 값은
 * 뒤 칸으로 밀어 넣는다.
 *
 * @param parts - 현재 세 칸 상태
 * @param part - 사용자가 입력한 칸
 * @param value - 그 칸에 들어온 값 (하이픈·공백이 섞여 있어도 된다)
 * @returns 새 세 칸 상태
 */
export const fillPhoneParts = (
  parts: PhoneNumberParts,
  part: keyof PhoneNumberParts,
  value: string
): PhoneNumberParts => {
  const digits = stripKoreanCountryCode(value);

  // 한 칸 분량을 넘지 않으면 그 칸만 바꾼다. 지우는 입력도 이 경로로 처리된다.
  if (digits.length <= PART_MAX_LENGTH[part]) {
    return { ...parts, [part]: digits };
  }

  // 번호 하나가 통째로 들어온 경우다. 자동완성은 어느 칸에든 채울 수 있으므로
  // 입력된 칸과 무관하게 처음부터 나눠 담는다.
  if (part === 'first' || isValidPhoneNumber(digits)) {
    return splitPhoneParts(digits);
  }

  // 뒤쪽 칸에서 넘친 경우, 그 칸부터 차례로 채운다.
  const order: (keyof PhoneNumberParts)[] = ['first', 'second', 'third'];
  const next = { ...parts };
  let rest = digits;

  for (const key of order.slice(order.indexOf(part))) {
    next[key] = rest.slice(0, PART_MAX_LENGTH[key]);
    rest = rest.slice(PART_MAX_LENGTH[key]);
  }

  return next;
};

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
