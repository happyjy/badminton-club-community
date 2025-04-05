import { PrismaClient } from '@prisma/client';

import { User, ApiResponse } from '@/types';

import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<'users', User[]>>
) {
  if (req.method === 'GET') {
    const prisma = new PrismaClient();
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          nickname: true,
          thumbnailImageUrl: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      /* 
        // 아래 supabse로 조회 시 오류 발생
        사용자 조회 중 오류 발생: {
          code: '42501',
          details: null,
          hint: null,
          message: 'permission denied for schema public'
        } 
        */
      // const users = await supabase
      //   .from('User')
      //   .select('id, email, name, created_at');

      // const typedUsers: User[] = users.map((user) => ({
      //   ...user,
      //   id: user.id.toString(),
      // }));

      return res.status(200).json({
        data: { users },
        status: 200,
        message: '사용자 목록을 성공적으로 가져왔습니다',
      });
    } catch (error) {
      console.error('사용자 조회 중 오류 발생:', error);
      return res
        .status(500)
        .json({ error: '서버 에러가 발생했습니다.', status: 500 });
    } finally {
      await prisma.$disconnect();
    }
  }

  return res.status(405).json({
    error: '허용되지 않는 메소드입니다',
    status: 405,
  });
}
