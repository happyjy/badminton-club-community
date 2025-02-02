import { NextApiRequest, NextApiResponse } from 'next';
import { Role, Status } from '@/types/enums';
import { getSession } from '@/lib/session';
import { PrismaClient } from '@prisma/client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getSession(req);
    if (!session?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const clubId = Number(req.query.id);
    const userId = Number(req.query.userId);

    // 요청한 사용자가 해당 클럽의 ADMIN인지 확인
    const prisma = new PrismaClient();
    const adminMember = await prisma.clubMember.findFirst({
      where: {
        clubId,
        userId: session.id,
        role: Role.ADMIN,
      },
    });

    if (!adminMember) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // 멤버 상태 업데이트
    const updatedMember = await prisma.clubMember.update({
      where: {
        clubId_userId: {
          clubId,
          userId,
        },
      },
      data: {
        status: Status.APPROVED,
      },
    });

    return res.status(200).json({ data: updatedMember });
  } catch (error) {
    console.error('Error approving member:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
