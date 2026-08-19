import {
  TOURNAMENT_FILE_BUCKET,
  getSupabaseAdmin,
} from '@/lib/supabaseAdmin';

import type { NextApiRequest } from 'next';

/**
 * multipart 요청에서 파일 하나를 꺼낸다.
 *
 * Node 22의 내장 Request/FormData를 쓴다. formidable 같은 의존성을 더하지 않으려는 선택이며,
 * 파일 크기를 10MB로 제한하므로 요청 전체를 메모리에 올려도 안전하다.
 * 이 핸들러는 bodyParser를 꺼야 동작한다. (export const config)
 */
export async function readSingleUpload(
  req: NextApiRequest,
  fieldName = 'file'
): Promise<File | null> {
  const contentType = req.headers['content-type'];
  if (!contentType?.includes('multipart/form-data')) return null;

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const body = Buffer.concat(chunks);

  const formData = await new Request('http://localhost', {
    method: 'POST',
    headers: { 'content-type': contentType },
    body,
  }).formData();

  const value = formData.get(fieldName);
  return value instanceof File ? value : null;
}

/**
 * Storage에 파일을 올리고 공개 URL을 돌려준다.
 */
export async function uploadTournamentFile(params: {
  storagePath: string;
  file: File;
}): Promise<{ publicUrl: string }> {
  const supabase = getSupabaseAdmin();
  const buffer = Buffer.from(await params.file.arrayBuffer());

  const { error } = await supabase.storage
    .from(TOURNAMENT_FILE_BUCKET)
    .upload(params.storagePath, buffer, {
      contentType: params.file.type,
      upsert: false,
    });

  if (error) {
    throw new Error(`파일 업로드에 실패했습니다. (${error.message})`);
  }

  const { data } = supabase.storage
    .from(TOURNAMENT_FILE_BUCKET)
    .getPublicUrl(params.storagePath);

  return { publicUrl: data.publicUrl };
}

/**
 * Storage에서 파일을 지운다.
 *
 * 실패해도 예외를 던지지 않는다. 호출부는 이미 DB 행을 지운 뒤라
 * 사용자에게는 파일이 사라진 상태이고, 여기서 에러를 올리면
 * 성공한 작업이 실패로 보고된다. 남은 파일은 로그로만 추적한다.
 */
export async function removeTournamentFiles(
  storagePaths: string[]
): Promise<void> {
  if (storagePaths.length === 0) return;

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.storage
      .from(TOURNAMENT_FILE_BUCKET)
      .remove(storagePaths);

    if (error) {
      console.error('Storage 파일 삭제 실패:', storagePaths, error.message);
    }
  } catch (error) {
    console.error('Storage 파일 삭제 중 오류:', storagePaths, error);
  }
}
