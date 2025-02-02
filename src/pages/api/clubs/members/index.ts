import { NextApiRequest, NextApiResponse } from 'next';
import { Role } from '@/types/enums';
import { getSession } from '@/lib/session';
import { PrismaClient } from '@prisma/client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getSession(req);
    if (!session?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { clubIds } = req.query;
    if (!clubIds) {
      return res.status(400).json({ error: 'Club IDs are required' });
    }

    const clubIdArray = (clubIds as string).split(',').map(Number);

    // 요청한 사용자가 해당 클럽들의 ADMIN인지 확인
    const prisma = new PrismaClient();
    const userClubRoles = await prisma.clubMember.findMany({
      where: {
        userId: session.id,
        clubId: { in: clubIdArray },
        role: Role.ADMIN,
      },
    });

    if (userClubRoles.length === 0) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const users = await prisma.user.findMany({
      where: {
        ClubMember: {
          some: {
            clubId: { in: clubIdArray },
          },
        },
      },
      include: {
        ClubMember: {
          where: {
            clubId: { in: clubIdArray },
          },
          select: {
            status: true,
            role: true,
            clubId: true,
          },
        },
      },
    });

    return res.status(200).json({ data: { users } });
  } catch (error) {
    console.error('Error fetching club members:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
