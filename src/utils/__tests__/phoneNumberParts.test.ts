import { describe, expect, it } from '@jest/globals';

import {
  fillPhoneParts,
  joinPhoneParts,
  splitPhoneParts,
  stripKoreanCountryCode,
} from '@/utils/phoneNumber';

describe('stripKoreanCountryCode', () => {
  it('+82로 시작하는 번호를 0으로 되돌린다', () => {
    // 크롬 자동완성이 '+82 10-6636-8962' 형태로 채운다.
    expect(stripKoreanCountryCode('821066368962')).toBe('01066368962');
  });

  it('국가번호 뒤에 이미 0이 있으면 겹쳐 붙이지 않는다', () => {
    expect(stripKoreanCountryCode('8201066368962')).toBe('01066368962');
  });

  it('국가번호가 없으면 그대로 둔다', () => {
    expect(stripKoreanCountryCode('01066368962')).toBe('01066368962');
  });

  it('82로 시작해도 국내 번호 길이면 건드리지 않는다', () => {
    // '지역번호 82'는 없지만, 짧은 값을 성급히 고치지 않는다는 뜻이다.
    expect(stripKoreanCountryCode('821')).toBe('821');
  });

  it('빈 값은 빈 문자열로 다룬다', () => {
    expect(stripKoreanCountryCode('')).toBe('');
    expect(stripKoreanCountryCode(null)).toBe('');
  });
});

describe('splitPhoneParts', () => {
  it('하이픈이 붙은 번호를 세 칸으로 나눈다', () => {
    expect(splitPhoneParts('010-2743-9047')).toEqual({
      first: '010',
      second: '2743',
      third: '9047',
    });
  });

  it('하이픈이 없는 번호도 자리 수 기준으로 나눈다', () => {
    // split('-')에 의존하면 '01079366342'가 first 칸에 통째로 들어갔다.
    expect(splitPhoneParts('01079366342')).toEqual({
      first: '010',
      second: '7936',
      third: '6342',
    });
  });

  it('10자리 번호는 가운데를 3자리로 나눈다', () => {
    expect(splitPhoneParts('0111234567')).toEqual({
      first: '011',
      second: '123',
      third: '4567',
    });
  });

  it('칸을 넘치는 손상된 값은 각 칸의 최대 길이를 넘기지 않는다', () => {
    // '010-71347219-7219'을 split('-')하면 second에 8자리가 들어가고,
    // 그 상태로 다시 합쳐지며 손상이 영구화됐다.
    const parts = splitPhoneParts('010-71347219-7219');
    expect(parts.first.length).toBeLessThanOrEqual(3);
    expect(parts.second.length).toBeLessThanOrEqual(4);
    expect(parts.third.length).toBeLessThanOrEqual(4);
  });

  it('빈 값은 빈 칸 세 개로 만든다', () => {
    expect(splitPhoneParts('')).toEqual({ first: '', second: '', third: '' });
    expect(splitPhoneParts(null)).toEqual({ first: '', second: '', third: '' });
  });
});

describe('fillPhoneParts', () => {
  const empty = { first: '', second: '', third: '' };

  it('한 칸에 번호 전체가 들어오면 세 칸으로 나눠 담는다', () => {
    // 크롬 자동완성은 세 칸 구조를 모르고 한 칸에 통째로 채운다.
    expect(fillPhoneParts(empty, 'first', '010-6636-8962')).toEqual({
      first: '010',
      second: '6636',
      third: '8962',
    });
  });

  it('국가번호가 붙은 자동완성 값도 제자리에 담는다', () => {
    expect(fillPhoneParts(empty, 'first', '+82 10-6636-8962')).toEqual({
      first: '010',
      second: '6636',
      third: '8962',
    });
  });

  it('가운데 칸에 번호 전체가 들어와도 처음부터 나눠 담는다', () => {
    expect(fillPhoneParts(empty, 'second', '01066368962')).toEqual({
      first: '010',
      second: '6636',
      third: '8962',
    });
  });

  it('한 칸 분량만 입력하면 그 칸만 바꾼다', () => {
    const parts = { first: '010', second: '', third: '' };
    expect(fillPhoneParts(parts, 'second', '6636')).toEqual({
      first: '010',
      second: '6636',
      third: '',
    });
  });

  it('칸을 넘치는 값은 넘친 만큼만 다음 칸으로 밀어 넣는다', () => {
    // 가운데 칸에 5자리를 넣으면 4자리만 남고 나머지가 다음 칸으로 간다.
    expect(fillPhoneParts(empty, 'second', '66368')).toEqual({
      first: '',
      second: '6636',
      third: '8',
    });
  });

  it('숫자가 아닌 문자는 버린다', () => {
    expect(fillPhoneParts(empty, 'first', 'abc')).toEqual(empty);
  });

  it('지우는 입력도 그대로 반영한다', () => {
    const parts = { first: '010', second: '6636', third: '8962' };
    expect(fillPhoneParts(parts, 'third', '')).toEqual({
      first: '010',
      second: '6636',
      third: '',
    });
  });
});

describe('joinPhoneParts', () => {
  it('세 칸을 하이픈으로 합친다', () => {
    expect(
      joinPhoneParts({ first: '010', second: '2743', third: '9047' })
    ).toBe('010-2743-9047');
  });

  it('아직 덜 채운 칸은 하이픈을 남기지 않는다', () => {
    // 입력 도중 '010--'처럼 빈 하이픈이 저장되지 않아야 한다.
    expect(joinPhoneParts({ first: '010', second: '', third: '' })).toBe('010');
    expect(joinPhoneParts({ first: '010', second: '2743', third: '' })).toBe(
      '010-2743'
    );
  });

  it('모두 비면 빈 문자열을 돌려준다', () => {
    expect(joinPhoneParts({ first: '', second: '', third: '' })).toBe('');
  });
});
