import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { sign } from 'jsonwebtoken';

import { getJwtSecret } from './jwtSecret';
import { getAuthUser } from './session';

jest.mock('@/lib/prisma', () => ({ prisma: {} }));

const STRONG_SECRET = 'a'.repeat(32) + '-test-only-secret';
const ORIGINAL = process.env.JWT_SECRET;

function requestWithToken(token: string) {
  return { cookies: { 'auth-token': token } } as unknown as Parameters<
    typeof getAuthUser
  >[0];
}

describe('getJwtSecret', () => {
  afterEach(() => {
    process.env.JWT_SECRET = ORIGINAL;
  });

  it('환경변수가 없으면 에러를 던진다', () => {
    delete process.env.JWT_SECRET;
    expect(() => getJwtSecret()).toThrow('JWT_SECRET');
  });

  it('예전 기본값은 거부한다', () => {
    process.env.JWT_SECRET = 'your-secret-key';
    expect(() => getJwtSecret()).toThrow('JWT_SECRET');
  });

  it('32자보다 짧으면 거부한다', () => {
    process.env.JWT_SECRET = 'short-secret';
    expect(() => getJwtSecret()).toThrow('JWT_SECRET');
  });

  it('충분히 긴 값이면 그대로 돌려준다', () => {
    process.env.JWT_SECRET = STRONG_SECRET;
    expect(getJwtSecret()).toBe(STRONG_SECRET);
  });
});

describe('getAuthUser 토큰 검증', () => {
  afterEach(() => {
    process.env.JWT_SECRET = ORIGINAL;
  });

  it('설정된 비밀키로 서명한 토큰은 통과한다', async () => {
    process.env.JWT_SECRET = STRONG_SECRET;
    const token = sign({ userId: 5 }, STRONG_SECRET);
    await expect(getAuthUser(requestWithToken(token))).resolves.toEqual({
      id: 5,
    });
  });

  it('예전 기본값으로 위조한 토큰은 거부한다', async () => {
    process.env.JWT_SECRET = STRONG_SECRET;
    const forged = sign({ userId: 1 }, 'your-secret-key');
    await expect(getAuthUser(requestWithToken(forged))).resolves.toBeNull();
  });

  it('비밀키가 설정되지 않았으면 누구도 로그인되지 않는다', async () => {
    delete process.env.JWT_SECRET;
    const forged = sign({ userId: 1 }, 'your-secret-key');
    await expect(getAuthUser(requestWithToken(forged))).resolves.toBeNull();
  });
});
