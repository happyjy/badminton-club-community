import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import { ApiResponse } from '@/types/common.types';
import { User } from '@/types';

type AuthUser = Pick<User, 'id' | 'email' | 'nickname'>;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<
    ApiResponse<'auth', { isAuthenticated: boolean; user: AuthUser | null }>
  >
) {
  const session = await getSession(req);

  return res.status(200).json({
    data: {
      auth: {
        isAuthenticated: !!session,
        user: session
          ? {
              id: session.id,
              email: session.email,
              nickname: session.nickname,
            }
          : null,
      },
    },
    status: 200,
    message: '인증 상태를 확인했습니다',
  });
}
