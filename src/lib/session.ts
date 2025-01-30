import { PrismaClient } from '@prisma/client';
import { verify } from 'jsonwebtoken';
import { IncomingMessage } from 'http';

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
    const decoded = verify(token, JWT_SECRET) as { userId: string };
    const prisma = new PrismaClient();

    const user = await prisma.user.findUnique({
      where: { id: parseInt(decoded.userId) },
    });

    await prisma.$disconnect();

    return user;
  } catch (err) {
    console.error(err);
    return null;
  }
};
