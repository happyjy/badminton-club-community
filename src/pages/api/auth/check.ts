import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import { ApiResponse } from '@/types/common.types';
import { User } from '@/types/user.types';

type AuthUser = Pick<User, 'id' | 'email' | 'nickname'>;

// type AuthUser = {
//   id: number;
//   email: string | null;
//   nickname: string;
// };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<
    ApiResponse<'auth', { isAuthenticated: boolean; user: AuthUser | null }>
  >
) {
  try {
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
  } catch (error) {
    console.error('세션 확인 중 오류 발생:', error);
    return res.status(401).json({
      error: '인증 상태 확인에 실패했습니다',
      status: 401,
    });
  }
}
