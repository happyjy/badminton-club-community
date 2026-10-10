import { describe, expect, it } from '@jest/globals';

import { extractNameToken, isNameLikeToken } from './nameNormalizer';

describe('extractNameToken', () => {
  it.each([
    ['가나다3월회비', '가나다'],
    ['26.3월가나다', '가나다'],
    ['가나다-1월', '가나다'],
    ['12월가나다', '가나다'],
    ['가나다(2월회비)', '가나다'],
    ['가나다_회비', '가나다'],
    ['가나다 연회비', '가나다'],
    ['가나다가입비', '가나다'],
    ['가나다마바사5월', '가나다마바사'],
    ['가나다 월회비', '가나다'],
    ['가나다45월회비', '가나다'],
    ['입출금통장 이자', '입출금통장이자'],
    ['', ''],
  ])('%s → %s', (input, expected) => {
    expect(extractNameToken(input)).toBe(expected);
  });
});

describe('isNameLikeToken', () => {
  it('2~4자 한글만 이름으로 본다', () => {
    expect(isNameLikeToken('가나다')).toBe(true);
    expect(isNameLikeToken('가')).toBe(false);
    expect(isNameLikeToken('가나다마바사')).toBe(false);
  });
});
