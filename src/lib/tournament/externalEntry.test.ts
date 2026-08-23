import { describe, expect, it } from '@jest/globals';

import {
  getPhoneTail,
  matchesPhoneTail,
  normalizeContactName,
} from './externalEntry';

describe('normalizeContactName', () => {
  it('이름 안팎의 공백을 모두 제거한다', () => {
    expect(normalizeContactName(' 김 철수 ')).toBe('김철수');
  });

  it('공백이 없는 이름은 그대로 둔다', () => {
    expect(normalizeContactName('김철수')).toBe('김철수');
  });

  it('탭이나 연속 공백도 제거한다', () => {
    expect(normalizeContactName('김\t철  수')).toBe('김철수');
  });
});

describe('getPhoneTail', () => {
  it('하이픈이 있는 번호에서 뒤 4자리를 뽑는다', () => {
    expect(getPhoneTail('010-1234-5678')).toBe('5678');
  });

  it('숫자만 있는 번호에서도 뒤 4자리를 뽑는다', () => {
    expect(getPhoneTail('01012345678')).toBe('5678');
  });

  it('4자리 미만이면 있는 만큼 반환한다', () => {
    expect(getPhoneTail('123')).toBe('123');
  });

  it('빈 문자열이면 빈 문자열을 반환한다', () => {
    expect(getPhoneTail('')).toBe('');
  });
});

describe('matchesPhoneTail', () => {
  it('저장된 번호의 뒤 4자리가 입력과 같으면 true', () => {
    expect(matchesPhoneTail('010-1234-5678', '5678')).toBe(true);
  });

  it('입력에 하이픈이 섞여 있어도 숫자만 비교한다', () => {
    expect(matchesPhoneTail('010-1234-5678', '-5678')).toBe(true);
  });

  it('뒤 4자리가 다르면 false', () => {
    expect(matchesPhoneTail('010-1234-5678', '9999')).toBe(false);
  });

  it('입력이 4자리가 아니면 false로 막는다', () => {
    expect(matchesPhoneTail('010-1234-5678', '678')).toBe(false);
  });

  it('빈 입력은 false', () => {
    expect(matchesPhoneTail('010-1234-5678', '')).toBe(false);
  });
});
