import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';
import { User, ApiResponse } from '@/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<User | User[]>>
) {
  if (req.method === 'GET') {
    try {
      const { data: users, error } = await supabase
        .from('User')
        .select('id, email, name, created_at');

      if (error) throw error;

      return res.status(200).json({ data: users, status: 200 });
    } catch (error) {
      console.error('사용자 조회 중 오류 발생:', error);
      return res
        .status(500)
        .json({ error: '서버 에러가 발생했습니다.', status: 500 });
    }
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: '허용되지 않는 메소드입니다' });
  }
}
