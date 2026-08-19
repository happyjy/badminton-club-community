import { createClient } from '@supabase/supabase-js';

/**
 * 서버 전용 Supabase 클라이언트.
 *
 * service_role 키는 RLS를 모두 우회하는 마스터 키다.
 * 절대 NEXT_PUBLIC_ 접두어를 붙이거나 클라이언트 컴포넌트에서 import하면 안 된다.
 * 브라우저에서 쓰는 익명 클라이언트는 src/lib/supabase.ts에 따로 있다.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** 모집 요강 첨부파일을 담는 공개 버킷 */
export const TOURNAMENT_FILE_BUCKET = 'tournament-files';

if (typeof window !== 'undefined') {
  throw new Error('supabaseAdmin은 서버에서만 사용할 수 있습니다.');
}

/**
 * 환경변수가 없으면 여기서 바로 알린다.
 * 업로드 시점에 Supabase가 뱉는 모호한 401보다 원인을 찾기 쉽다.
 */
export function getSupabaseAdmin() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      '파일 업로드 설정이 없습니다. NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY를 확인해주세요.'
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
