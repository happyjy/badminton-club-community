import { describe, expect, it } from '@jest/globals';

import { parseTagInput } from './parseTagInput';

describe('parseTagInput', () => {
  it('쉼표로 구분해 여러 개를 나눈다', () => {
    expect(parseTagInput('S,M,L')).toEqual(['S', 'M', 'L']);
  });

  it('쉼표 앞뒤 공백을 없앤다', () => {
    expect(parseTagInput('S, M ,  L')).toEqual(['S', 'M', 'L']);
  });

  it('한 개만 입력해도 동작한다', () => {
    expect(parseTagInput('XL')).toEqual(['XL']);
  });

  it('빈 값과 연속 쉼표를 버린다', () => {
    expect(parseTagInput('S,,M, ,L,')).toEqual(['S', 'M', 'L']);
  });

  it('입력 안의 중복을 제거한다', () => {
    expect(parseTagInput('S,M,S')).toEqual(['S', 'M']);
  });

  it('이미 등록된 값은 제외한다', () => {
    expect(parseTagInput('S,M,L', ['M'])).toEqual(['S', 'L']);
  });

  it('전각 쉼표도 구분자로 인정한다', () => {
    expect(parseTagInput('S，M，L')).toEqual(['S', 'M', 'L']);
  });

  it('빈 문자열이면 빈 배열', () => {
    expect(parseTagInput('')).toEqual([]);
    expect(parseTagInput('  ')).toEqual([]);
    expect(parseTagInput(',,,')).toEqual([]);
  });

  it('한글 값도 그대로 처리한다', () => {
    expect(parseTagInput('20대, 시니어')).toEqual(['20대', '시니어']);
  });
});
