import { describe, expect, it } from '@jest/globals';

import {
  getBirthDateError,
  isValidBirthDate,
  toBirthDateDigits,
  toIsoBirthDate,
} from '@/utils/birthDate';

describe('toBirthDateDigits', () => {
  it('하이픈이 섞인 저장 값을 숫자 8자리로 바꾼다', () => {
    expect(toBirthDateDigits('1990-03-15')).toBe('19900315');
  });

  it('이미 숫자만 있는 입력은 그대로 둔다', () => {
    expect(toBirthDateDigits('19900315')).toBe('19900315');
  });

  it('빈 값과 null을 빈 문자열로 처리한다', () => {
    expect(toBirthDateDigits('')).toBe('');
    expect(toBirthDateDigits(null)).toBe('');
    expect(toBirthDateDigits(undefined)).toBe('');
  });

  it('8자리를 넘는 입력은 잘라낸다', () => {
    expect(toBirthDateDigits('1990031599')).toBe('19900315');
  });
});

describe('toIsoBirthDate', () => {
  it('숫자 8자리를 저장 포맷으로 바꾼다', () => {
    expect(toIsoBirthDate('19900315')).toBe('1990-03-15');
  });

  it('이미 저장 포맷인 값을 그대로 유지한다', () => {
    expect(toIsoBirthDate('1990-03-15')).toBe('1990-03-15');
  });

  it('8자리를 못 채우면 입력값을 그대로 돌려준다', () => {
    expect(toIsoBirthDate('1990')).toBe('1990');
    expect(toIsoBirthDate('')).toBe('');
  });
});

describe('isValidBirthDate', () => {
  it('정상적인 생년월일을 통과시킨다', () => {
    expect(isValidBirthDate('19900315')).toBe(true);
    expect(isValidBirthDate('1990-03-15')).toBe(true);
  });

  it('윤년 2월 29일을 통과시킨다', () => {
    expect(isValidBirthDate('20000229')).toBe(true);
  });

  it('평년 2월 29일을 걸러낸다', () => {
    expect(isValidBirthDate('19000229')).toBe(false);
  });

  it('존재하지 않는 월과 일을 걸러낸다', () => {
    expect(isValidBirthDate('19901315')).toBe(false);
    expect(isValidBirthDate('19900230')).toBe(false);
    expect(isValidBirthDate('19900431')).toBe(false);
    expect(isValidBirthDate('19900300')).toBe(false);
  });

  it('서버 검증이 뚫려 있던 99999999를 걸러낸다', () => {
    expect(isValidBirthDate('99999999')).toBe(false);
  });

  it('미래 날짜를 걸러낸다', () => {
    const nextYear = new Date().getFullYear() + 1;
    expect(isValidBirthDate(`${nextYear}0101`)).toBe(false);
  });

  it('1900년 이전 연도를 걸러낸다', () => {
    expect(isValidBirthDate('18991231')).toBe(false);
  });

  it('자릿수가 모자라거나 빈 값을 걸러낸다', () => {
    expect(isValidBirthDate('199003')).toBe(false);
    expect(isValidBirthDate('')).toBe(false);
    expect(isValidBirthDate(null)).toBe(false);
  });
});

describe('getBirthDateError', () => {
  it('유효한 값이면 undefined를 돌려준다', () => {
    expect(getBirthDateError('19900315')).toBeUndefined();
  });

  it('빈 값이면 입력 요청 메시지를 돌려준다', () => {
    expect(getBirthDateError('')).toBe('생년월일을 입력해주세요.');
  });

  it('자릿수가 모자라면 8자리 안내 메시지를 돌려준다', () => {
    expect(getBirthDateError('1990')).toBe(
      '생년월일 8자리를 입력해주세요. (예: 19900315)'
    );
  });

  it('자릿수는 맞지만 없는 날짜면 형식 오류 메시지를 돌려준다', () => {
    expect(getBirthDateError('19900230')).toBe('올바른 생년월일이 아닙니다.');
  });
});
