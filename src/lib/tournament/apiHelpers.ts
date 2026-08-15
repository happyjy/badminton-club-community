import { ClubAuthError } from '@/lib/clubAuth';

import type { NextApiResponse } from 'next';

/**
 * 핸들러에서 던져진 에러를 응답으로 변환한다.
 * ClubAuthError는 의도된 권한 실패이므로 상태 코드를 그대로 쓴다.
 */
export function handleApiError(res: NextApiResponse, error: unknown): void {
  if (error instanceof ClubAuthError) {
    res
      .status(error.status)
      .json({ error: error.message, status: error.status });
    return;
  }
  console.error('대회 신청 API 오류:', error);
  res.status(500).json({ error: '일시적인 오류가 발생했습니다.', status: 500 });
}

/**
 * 쿼리의 클럽 ID를 숫자로 변환한다. 유효하지 않으면 null.
 */
export function parseClubId(
  value: string | string[] | undefined
): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/**
 * 쿼리에서 문자열 하나를 꺼낸다.
 */
export function firstQueryValue(
  value: string | string[] | undefined
): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw ?? null;
}
