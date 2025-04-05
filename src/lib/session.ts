import { IncomingMessage } from 'http';

import { PrismaClient } from '@prisma/client';
import { verify } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const getSession = async (
  req: IncomingMessage & {
    cookies: Partial<{ [key: string]: string }>;
  }
) => {
  const token = req.cookies['auth-token'];

  if (!token) {
    return null;
  }

  try {
    const decoded = verify(token, JWT_SECRET) as { userId: number };
    if (!decoded || !decoded.userId) {
      return null;
    }

    const prisma = new PrismaClient();
    try {
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user) {
        return null;
      }

      return user;
    } catch (dbError) {
      console.error('데이터베이스 조회 오류:', dbError);
      return null;
    } finally {
      await prisma.$disconnect();
    }
  } catch (err) {
    console.error('세션 검증 오류:', err);
    return null;
  }
};
