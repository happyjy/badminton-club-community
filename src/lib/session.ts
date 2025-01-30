import { NextApiRequest } from 'next';
import { PrismaClient } from '@prisma/client';
import { verify } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function getSession(req: NextApiRequest) {
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
}
