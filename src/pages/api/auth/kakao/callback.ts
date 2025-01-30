import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { sign } from 'jsonwebtoken';
import cookie from 'cookie';
import { getBaseUrl, getKakaoCallbackUrl } from '@/constants/urls';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({
      error: '인증 코드가 없습니다.',
      status: 400,
    });
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
        redirect_uri: getKakaoCallbackUrl(req.headers.host),
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

      // JWT 토큰 생성
      const token = sign({ userId: user.id }, JWT_SECRET, {
        expiresIn: '7d',
      });

      // 쿠키에 토큰 저장
      res.setHeader(
        'Set-Cookie',
        cookie.serialize('auth-token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7, // 7일
          path: '/',
        })
      );

      // 리다이렉트 주소를 동적으로 생성
      const baseUrl = getBaseUrl(req.headers.host);
      const redirectUrl = `${baseUrl}/workouts`;

      res.redirect(redirectUrl);
    } catch (dbError) {
      console.error('데이터베이스 저장 오류:', dbError);
      throw dbError;
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    console.error('카카오 로그인 에러:', error);
    return res.status(500).json({
      error: '로그인 처리 중 오류가 발생했습니다',
      status: 500,
    });
  }
}
