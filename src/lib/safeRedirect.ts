/** 돌아갈 주소가 없거나 믿을 수 없을 때 보낼 곳 */
export const DEFAULT_RETURN_PATH = '/clubs';

// 검사용 가상 출처. 실제 요청 주소와 무관하게 '같은 출처인지'만 본다.
const PROBE_ORIGIN = 'http://same-site.invalid';

/**
 * 로그인 뒤 돌아갈 주소를 같은 사이트 안의 경로로만 좁힌다.
 *
 * 호출부는 `${baseUrl}${경로}`로 주소를 만들기 때문에, '@evil.com'이나
 * '//evil.com' 같은 값이 그대로 붙으면 다른 사이트로 보내진다.
 * 그래서 '/' 하나로 시작하는 경로만 받고, 나머지는 기본 경로로 바꾼다.
 */
export function getSafeReturnPath(raw: unknown): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string' || value === '') {
    return DEFAULT_RETURN_PATH;
  }

  let path: string;
  try {
    path = decodeURIComponent(value);
  } catch {
    // 잘못된 인코딩은 로그인 실패로 이어지지 않게 기본 경로로 보낸다
    return DEFAULT_RETURN_PATH;
  }

  if (!path.startsWith('/') || path.startsWith('//')) {
    return DEFAULT_RETURN_PATH;
  }

  // 브라우저는 백슬래시를 슬래시로 읽고 탭·줄바꿈은 지워 버려서
  // '/\evil.com', '/\t/evil.com'이 '//evil.com'이 된다. 아예 받지 않는다.
  // eslint-disable-next-line no-control-regex
  if (/[\\\u0000-\u001f\u007f]/.test(path)) {
    return DEFAULT_RETURN_PATH;
  }

  // 위 규칙을 빠져나간 경우를 대비해 실제 URL 해석으로 한 번 더 확인한다
  try {
    if (new URL(path, PROBE_ORIGIN).origin !== PROBE_ORIGIN) {
      return DEFAULT_RETURN_PATH;
    }
  } catch {
    return DEFAULT_RETURN_PATH;
  }

  return path;
}
