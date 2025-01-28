import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession(req);

  return res.status(200).json({
    isAuthenticated: !!session,
    user: session
      ? {
          id: session.id,
          email: session.email,
          nickname: session.nickname,
        }
      : null,
  });
}
