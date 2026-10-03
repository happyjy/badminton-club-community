import { describe, expect, it } from '@jest/globals';

import { DEFAULT_RETURN_PATH, getSafeReturnPath } from './safeRedirect';

describe('getSafeReturnPath', () => {
  it('값이 없으면 기본 경로를 돌려준다', () => {
    expect(getSafeReturnPath(undefined)).toBe(DEFAULT_RETURN_PATH);
    expect(getSafeReturnPath('')).toBe(DEFAULT_RETURN_PATH);
    expect(DEFAULT_RETURN_PATH).toBe('/clubs');
  });

  it('같은 사이트의 상대 경로는 그대로 통과시킨다', () => {
    expect(getSafeReturnPath('/clubs')).toBe('/clubs');
    expect(getSafeReturnPath('/clubs/3/guest?tab=apply#top')).toBe(
      '/clubs/3/guest?tab=apply#top'
    );
    expect(getSafeReturnPath('/')).toBe('/');
  });

  it('인코딩된 상대 경로는 풀어서 통과시킨다', () => {
    expect(getSafeReturnPath('%2Fclubs%2F3')).toBe('/clubs/3');
  });

  it('배열로 들어오면 첫 값을 쓴다', () => {
    expect(getSafeReturnPath(['/clubs/1', '/clubs/2'])).toBe('/clubs/1');
  });

  it.each([
    ['@ 트릭', '@evil.com'],
    ['프로토콜 상대 경로', '//evil.com'],
    ['인코딩된 프로토콜 상대 경로', '%2F%2Fevil.com'],
    ['백슬래시 우회', '/\\evil.com'],
    ['경로 중간 백슬래시', '/clubs\\..\\\\evil.com'],
    ['절대 URL', 'https://evil.com'],
    ['javascript 스킴', 'javascript:alert(1)'],
    ['슬래시 없는 상대 경로', 'evil.com'],
    ['탭으로 슬래시 사이를 띄움', '/\t/evil.com'],
    ['줄바꿈으로 슬래시 사이를 띄움', '/\n/evil.com'],
    ['헤더 주입 시도', '/clubs\r\nSet-Cookie: x=1'],
  ])('%s(%s)는 기본 경로로 바꾼다', (_label, input) => {
    expect(getSafeReturnPath(input)).toBe(DEFAULT_RETURN_PATH);
  });

  it('잘못된 인코딩이어도 예외 없이 기본 경로를 돌려준다', () => {
    expect(getSafeReturnPath('%E0%A4%A')).toBe(DEFAULT_RETURN_PATH);
  });
});
