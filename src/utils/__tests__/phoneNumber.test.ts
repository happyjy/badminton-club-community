import { describe, expect, it } from '@jest/globals';

import {
  formatPhoneNumber,
  getPhoneNumberError,
  isValidPhoneNumber,
  toPhoneDigits,
} from '@/utils/phoneNumber';

describe('toPhoneDigits', () => {
  it('하이픈이 섞인 입력에서 숫자만 남긴다', () => {
    expect(toPhoneDigits('010-1234-5678')).toBe('01012345678');
  });

  it('공백과 괄호도 걷어낸다', () => {
    expect(toPhoneDigits('(010) 1234 5678')).toBe('01012345678');
  });

  it('빈 값과 null을 빈 문자열로 처리한다', () => {
    expect(toPhoneDigits('')).toBe('');
    expect(toPhoneDigits(null)).toBe('');
    expect(toPhoneDigits(undefined)).toBe('');
  });

  it('11자리를 넘는 입력은 잘라낸다', () => {
    expect(toPhoneDigits('010123456789999')).toBe('01012345678');
  });
});

describe('formatPhoneNumber', () => {
  it('11자리를 3-4-4로 끊는다', () => {
    expect(formatPhoneNumber('01012345678')).toBe('010-1234-5678');
  });

  it('10자리를 3-3-4로 끊는다', () => {
    expect(formatPhoneNumber('0111234567')).toBe('011-123-4567');
  });

  it('이미 하이픈이 붙은 값을 그대로 유지한다', () => {
    expect(formatPhoneNumber('010-1234-5678')).toBe('010-1234-5678');
  });

  it('입력 중인 값도 자리 수에 맞춰 끊는다', () => {
    expect(formatPhoneNumber('010')).toBe('010');
    expect(formatPhoneNumber('0101')).toBe('010-1');
    expect(formatPhoneNumber('0101234')).toBe('010-1234');
  });

  it('빈 값을 빈 문자열로 처리한다', () => {
    expect(formatPhoneNumber('')).toBe('');
    expect(formatPhoneNumber(null)).toBe('');
  });
});

describe('isValidPhoneNumber', () => {
  it('휴대폰 번호를 통과시킨다', () => {
    expect(isValidPhoneNumber('010-1234-5678')).toBe(true);
    expect(isValidPhoneNumber('01012345678')).toBe(true);
    expect(isValidPhoneNumber('011-123-4567')).toBe(true);
  });

  it('자리 수가 모자라면 거절한다', () => {
    // 국번을 뺀 뒷자리가 7자리는 되어야 한다.
    expect(isValidPhoneNumber('010-123-456')).toBe(false);
    expect(isValidPhoneNumber('0101')).toBe(false);
  });

  it('휴대폰 국번이 아니면 거절한다', () => {
    expect(isValidPhoneNumber('02-1234-5678')).toBe(false);
    expect(isValidPhoneNumber('070-1234-5678')).toBe(false);
  });

  it('빈 값을 거절한다', () => {
    expect(isValidPhoneNumber('')).toBe(false);
    expect(isValidPhoneNumber(null)).toBe(false);
  });
});

describe('getPhoneNumberError', () => {
  it('빈 값에 입력 안내를 돌려준다', () => {
    expect(getPhoneNumberError('')).toBe('전화번호를 입력해주세요.');
  });

  it('형식이 어긋나면 예시를 담은 안내를 돌려준다', () => {
    expect(getPhoneNumberError('010-1234')).toBe(
      '올바른 전화번호가 아닙니다. (예: 010-1234-5678)'
    );
  });

  it('유효한 번호에는 undefined를 돌려준다', () => {
    expect(getPhoneNumberError('010-1234-5678')).toBeUndefined();
    expect(getPhoneNumberError('01012345678')).toBeUndefined();
  });
});
