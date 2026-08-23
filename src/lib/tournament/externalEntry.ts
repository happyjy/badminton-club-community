import { toPhoneDigits } from '@/utils/phoneNumber';

/** 조회에 쓰는 휴대폰 뒷자리 길이 */
export const PHONE_TAIL_LENGTH = 4;

/**
 * 조회 키로 쓸 이름을 정규화한다.
 * "김 철수"와 "김철수"가 같은 사람으로 취급되도록 공백을 모두 없앤다.
 * 중복 신청 차단(부분 유니크 인덱스)도 이 값을 기준으로 하므로,
 * 저장할 때와 조회할 때 반드시 같은 함수를 거쳐야 한다.
 */
export function normalizeContactName(value: string): string {
  return value.replace(/\s/g, '');
}

/** 전화번호에서 숫자만 남긴 뒤 마지막 4자리를 돌려준다. */
export function getPhoneTail(value: string): string {
  const digits = toPhoneDigits(value);
  return digits.slice(-PHONE_TAIL_LENGTH);
}

/**
 * 저장된 전화번호의 뒷자리가 사용자가 입력한 뒷자리와 일치하는지 본다.
 * 입력이 4자리가 아니면 대조 범위가 넓어져 타인 신청서가 열릴 수 있으므로 거부한다.
 */
export function matchesPhoneTail(
  storedPhone: string,
  inputTail: string
): boolean {
  const digits = toPhoneDigits(inputTail);
  if (digits.length !== PHONE_TAIL_LENGTH) return false;
  return getPhoneTail(storedPhone) === digits;
}
