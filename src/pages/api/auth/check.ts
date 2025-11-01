import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/session';
import { ApiResponse } from '@/types/common.types';
import { User } from '@/types/user.types';

import type { NextApiRequest, NextApiResponse } from 'next';

type AuthUser = Pick<User, 'id' | 'email' | 'nickname' | 'thumbnailImageUrl'>;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<
    ApiResponse<'auth', { isAuthenticated: boolean; user: AuthUser | null }>
  >
) {
  try {
    const auth = await getAuthUser(req);
    let user: AuthUser | null = null;
    if (auth) {
      const detail = await prisma.user.findUnique({
        where: { id: auth.id },
        select: {
          id: true,
          email: true,
          nickname: true,
          thumbnailImageUrl: true,
        },
      });
      if (detail) {
        user = {
          id: detail.id,
          email: detail.email,
          nickname: detail.nickname,
          thumbnailImageUrl: detail.thumbnailImageUrl,
        };
      }
    }

    return res.status(200).json({
      data: {
        auth: {
          isAuthenticated: !!user,
          user: user,
        },
      },
      status: 200,
      message: '인증 상태를 확인했습니다',
    });
  } catch (error) {
    console.error('세션 확인 중 오류 발생:', error);
    return res.status(401).json({
      error: '인증 상태 확인에 실패했습니다',
      status: 401,
    });
  }
}
