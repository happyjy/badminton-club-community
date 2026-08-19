import { TOURNAMENT_FILE_BUCKET, getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { MAX_FILE_SIZE } from '@/lib/tournament/fileValidation';

import type { NextApiRequest } from 'next';

/**
 * 본문 전체의 상한. 파일 1개(10MB)에 multipart 경계와 필드 오버헤드를 더한 여유분이다.
 * 이 선을 넘으면 파싱하지 않고 즉시 끊어 메모리를 지킨다.
 */
const MAX_BODY_SIZE = MAX_FILE_SIZE + 1024 * 1024;

/** 본문이 상한을 넘었을 때 던진다. 핸들러가 413으로 바꿔 응답한다. */
export class UploadTooLargeError extends Error {
  constructor() {
    super('파일 크기는 10MB 이하여야 합니다.');
    this.name = 'UploadTooLargeError';
  }
}

/**
 * multipart 요청에서 파일 하나를 꺼낸다.
 *
 * Node 22의 내장 Request/FormData를 쓴다. formidable 같은 의존성을 더하지 않으려는 선택이다.
 * 이 핸들러는 bodyParser를 꺼야 동작한다. (export const config)
 */
export async function readSingleUpload(
  req: NextApiRequest,
  fieldName = 'file'
): Promise<File | null> {
  const contentType = req.headers['content-type'];
  if (!contentType?.includes('multipart/form-data')) return null;

  // Content-Length가 있으면 한 바이트도 읽기 전에 거른다.
  const declaredLength = Number(req.headers['content-length']);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_SIZE) {
    throw new UploadTooLargeError();
  }

  // 헤더는 위조할 수 있으므로 실제로 읽는 양도 함께 센다.
  //
  // `for await (const chunk of req)`를 쓰면 안 된다. 그 안에서 예외를 던지면
  // 비동기 이터레이터가 스트림을 자동으로 파괴하고, 소켓이 끊겨 핸들러가
  // 413을 쓸 대상을 잃는다. 클라이언트는 안내 문구 대신 연결 초기화를 본다.
  // 이터레이터를 직접 돌리면 중단해도 스트림이 살아 있어 응답을 보낼 수 있다.
  const iterator = req[Symbol.asyncIterator]();
  const chunks: Buffer[] = [];
  let received = 0;

  let next = await iterator.next();
  while (!next.done) {
    const value = next.value;
    const buffer = typeof value === 'string' ? Buffer.from(value) : value;
    received += buffer.length;
    if (received > MAX_BODY_SIZE) {
      // 더 읽지 않는 것만으로 메모리는 지켜진다. 소켓은 응답을 위해 남겨둔다.
      req.pause();
      throw new UploadTooLargeError();
    }
    chunks.push(buffer);
    next = await iterator.next();
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
