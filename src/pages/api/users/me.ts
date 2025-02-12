import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getSession } from '@/lib/session';
import { ApiResponse } from '@/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<'user', { success: boolean }>>
) {
  if (req.method !== 'PUT') {
    return res.status(405).json({
      error: '허용되지 않는 메소드입니다',
      status: 405,
    });
  }

  try {
    const session = await getSession(req);
    if (!session?.id) {
      return res.status(401).json({
        error: '로그인이 필요합니다',
        status: 401,
      });
    }

    const { nickname } = req.body;
    const prisma = new PrismaClient();

    await prisma.user.update({
      where: { id: session.id },
      data: { nickname },
    });

    return res.status(200).json({
      data: { user: { success: true } },
      status: 200,
      message: '프로필이 성공적으로 업데이트되었습니다',
    });
  } catch (error) {
    console.error('프로필 업데이트 중 오류 발생:', error);
    return res.status(500).json({
      error: '프로필 업데이트에 실패했습니다',
      status: 500,
    });
  }
}
