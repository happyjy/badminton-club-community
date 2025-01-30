import type { NextApiRequest, NextApiResponse } from 'next';
import { serialize } from 'cookie';
import { ApiResponse } from '@/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<'logout', { success: boolean }>>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: '허용되지 않는 메소드입니다',
      status: 405,
    });
  }

  // 쿠키 삭제
  res.setHeader(
    'Set-Cookie',
    serialize('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(0), // 과거 날짜로 설정하여 쿠키 즉시 만료
    })
  );

  return res.status(200).json({
    data: { logout: { success: true } },
    status: 200,
    message: '로그아웃 되었습니다',
  });
}
