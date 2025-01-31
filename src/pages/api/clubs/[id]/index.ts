import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client/extension';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { id } = req.query;
  const prisma = new PrismaClient();

  try {
    const club = await prisma.club.findUnique({
      where: {
        id: String(id),
      },
    });

    if (!club) {
      return res.status(404).json({ message: 'Club not found' });
    }

    return res.status(200).json(club);
  } catch (error) {
    console.error('Error fetching club:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
