/**
 * 모집 요강 첨부파일 검증.
 * 클라이언트(선택 즉시 차단)와 서버(재검증)가 같은 함수를 쓴다.
 */

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * 확장자 하나에 허용 MIME 여러 개를 매핑한다.
 * 브라우저·OS에 따라 jpg의 MIME이 흔들리므로 배열로 둔다.
 */
const ALLOWED_TYPES: Record<string, string[]> = {
  pdf: ['application/pdf'],
  jpg: ['image/jpeg', 'image/jpg'],
  jpeg: ['image/jpeg', 'image/jpg'],
  png: ['image/png'],
};

export const ALLOWED_EXTENSIONS = Object.keys(ALLOWED_TYPES);

/** <input accept> 속성에 넣을 값 */
export const FILE_ACCEPT_ATTR = '.pdf,.jpg,.jpeg,.png';

export type FileValidationTarget = {
  fileName: string;
  mimeType: string;
  fileSize: number;
};

export type FileValidationResult = { ok: true } | { ok: false; error: string };

function fail(error: string): FileValidationResult {
  return { ok: false, error };
}

/**
 * 파일명에서 확장자를 소문자로 뽑는다. 없으면 빈 문자열.
 */
export function extractExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot < 0 || lastDot === fileName.length - 1) return '';
  return fileName.slice(lastDot + 1).toLowerCase();
}

/**
 * 업로드 파일이 허용 범위인지 확인한다.
 *
 * 확장자와 MIME을 모두 검사한다. 확장자만 보면 이름만 바꾼 파일이 통과하고,
 * MIME만 보면 브라우저마다 값이 달라 정상 파일이 막힌다.
 */
export function validateTournamentFile(
  target: FileValidationTarget
): FileValidationResult {
  const fileName = target.fileName?.trim() ?? '';
  if (!fileName) {
    return fail('파일 이름이 올바르지 않습니다.');
  }

  const extension = extractExtension(fileName);
  const allowedMimes = ALLOWED_TYPES[extension];
  if (!allowedMimes) {
    return fail('PDF 또는 이미지(JPG, PNG) 파일만 업로드할 수 있습니다.');
  }

  if (!allowedMimes.includes(target.mimeType?.toLowerCase())) {
    return fail('파일 형식이 확장자와 일치하지 않습니다.');
  }

  if (target.fileSize <= 0) {
    return fail('빈 파일은 업로드할 수 없습니다.');
  }

  if (target.fileSize > MAX_FILE_SIZE) {
    return fail('파일 크기는 10MB 이하여야 합니다.');
  }

  return { ok: true };
}

/**
 * Supabase Storage 키를 만든다.
 *
 * 원본 파일명은 쓰지 않는다. 한글·공백이 들어가면 URL 인코딩 문제가 생기고,
 * 같은 이름을 두 번 올릴 때 서로 덮어쓴다. 원본 이름은 DB에만 남긴다.
 */
export function buildStoragePath(params: {
  clubId: number;
  tournamentId: string;
  fileId: string;
  fileName: string;
}): string {
  const extension = extractExtension(params.fileName);
  return `${params.clubId}/${params.tournamentId}/${params.fileId}.${extension}`;
}

/**
 * 바이트를 사람이 읽는 크기로 바꾼다.
 * 1MB 미만은 KB로, 그 이상은 소수점 한 자리 MB로 보여준다.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(0, Math.ceil(bytes / 1024))}KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
