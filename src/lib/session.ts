import { IncomingMessage } from 'http';
import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';

import { verify } from 'jsonwebtoken';

import { prisma } from '@/lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export type AuthUser = { id: number };

// JWT만 디코드해서 최소 정보(id) 반환
export async function getAuthUser(
  req: IncomingMessage & { cookies: Partial<Record<string, string>> }
): Promise<AuthUser | null> {
  const token = req.cookies?.['auth-token'];
  if (!token) return null;
  try {
    const decoded = verify(token, JWT_SECRET) as { userId?: number } | undefined;
    if (!decoded?.userId) return null;
    return { id: decoded.userId };
  } catch (err) {
    console.error('세션 검증 오류:', err);
    return null;
  }
}

// 필요한 경우에만 사용자 상세 조회 (최소 필드 선택 권장)
export function getUserDetail<T extends object>(
  id: number,
  select?: T
) {
  return prisma.user.findUnique({
    where: { id },
    // @ts-expect-error - select 제네릭 간소화
    select: select ?? { id: true },
  });
}

// 인증이 필요한 API 핸들러 래퍼
export function withAuth<T = any>(
  handler: (
    req: NextApiRequest & { user: AuthUser },
    res: NextApiResponse<T>
  ) => Promise<any> | any
): NextApiHandler<T> {
  return async (req: NextApiRequest, res: NextApiResponse<T>) => {
    const user = await getAuthUser(req);
    if (!user) {
      // @ts-expect-error - 공통 에러 포맷이 없는 라우트도 존재
      return res.status(401).json({ error: '로그인이 필요합니다', status: 401 });
    }
    // 사용자 최소 정보 주입
    (req as any).user = user;
    return handler(req as any, res);
  };
}

// 과거 호환: 기존 getSession 사용처가 있을 수 있어 최소 id만 반환
export const getSession = getAuthUser;
