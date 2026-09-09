import { describe, expect, it } from '@jest/globals';

import { joinPhoneParts, splitPhoneParts } from '@/utils/phoneNumber';

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
