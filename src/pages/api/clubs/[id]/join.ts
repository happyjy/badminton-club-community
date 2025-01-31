import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { PrismaClient } from '@prisma/client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id } = req.query;
  const prisma = new PrismaClient();

  try {
    const membership = await prisma.clubMembership.create({
      data: {
        clubId: Number(id),
        userId: session.user.id,
        role: 'MEMBER',
      },
    });

    return res.status(200).json(membership);
  } catch (error) {
    console.error('Error joining club:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
