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
    // 1. 액세스 토큰 받기
    const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID!,
        redirect_uri: process.env.NEXT_PUBLIC_KAKAO_REDIRECT_URI!,
        code: code.toString(),
      }),
    });

    const tokenData = await tokenResponse.json();
    // 2. 사용자 정보 가져오기
    const userResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const userData = await userResponse.json();
    console.log('카카오 사용자 정보:', userData);

    // 여기서 userData를 활용하여 필요한 처리를 할 수 있습니다
    // userData는 다음과 같은 정보를 포함합니다:
    // - id: 카카오 회원번호
    // - properties: 닉네임 등의 정보
    // - kakao_account: 이메일, 프로필 이미지 등

    // 로그인 성공 후 리다이렉트
    res.redirect('/');
  } catch (error) {
    console.error('카카오 로그인 에러:', error);
    res.status(500).json({ error: '로그인 처리 중 오류가 발생했습니다.' });
  }
}
