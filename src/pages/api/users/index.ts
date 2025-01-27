import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

type ApiResponse = {
  users?: any[];
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '허용되지 않는 메소드입니다' });
  }

  try {
    const { data: users, error } = await supabase
      .from('User')
      .select('id, email, name, created_at');

    if (error) throw error;

    return res.status(200).json({ users });
  } catch (error) {
    console.error('사용자 조회 중 오류 발생:', error);
    return res
      .status(500)
      .json({ error: '사용자 데이터를 가져오는데 실패했습니다' });
  }
}
