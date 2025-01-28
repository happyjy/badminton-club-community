import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

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
    // console.log('카카오 사용자 정보:', userData);
    // console.log('nickname', userData.kakao_account.profile.nickname);
    // console.log(
    //   'thumbnail_image_url',
    //   userData.kakao_account.profile.thumbnail_image_url
    // );
    // console.log('email', userData.kakao_account.email);

    // Prisma client 초기화
    const prisma = new PrismaClient();

    try {
      // 사용자 정보 저장 또는 업데이트
      const user = await prisma.user.upsert({
        where: {
          kakaoId: userData.id.toString(),
        },
        update: {
          email: userData.kakao_account.email,
          nickname: userData.kakao_account.profile.nickname,
          thumbnailImageUrl: userData.kakao_account.profile.thumbnail_image_url,
        },
        create: {
          kakaoId: userData.id.toString(),
          email: userData.kakao_account.email,
          nickname: userData.kakao_account.profile.nickname,
          thumbnailImageUrl: userData.kakao_account.profile.thumbnail_image_url,
        },
      });

      console.log('사용자 정보 저장 완료:', user);
    } catch (dbError) {
      console.error('데이터베이스 저장 오류:', dbError);
      throw dbError;
    } finally {
      await prisma.$disconnect();
    }

    // 로그인 성공 후 리다이렉트
    res.redirect('/workouts');
  } catch (error) {
    console.error('카카오 로그인 에러:', error);
    res.status(500).json({ error: '로그인 처리 중 오류가 발생했습니다.' });
  }
}
