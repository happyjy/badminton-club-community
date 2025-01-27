import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: '인증 코드가 없습니다.' });
  }

  try {
    // 여기에 카카오 토큰 교환 로직 구현
    // 실제 구현시에는 카카오 API를 호출하여 액세스 토큰을 받아야 합니다
    console.log(code);

    // 로그인 성공 후 리다이렉트
    res.redirect('/');
  } catch (error) {
    console.error('카카오 로그인 에러:', error);
    res.status(500).json({ error: '로그인 처리 중 오류가 발생했습니다.' });
  }
}
