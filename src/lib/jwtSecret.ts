// 예전에 코드에 기본값으로 박혀 있던 값. 공개 저장소에 노출됐으므로 절대 쓰지 않는다.
const LEAKED_SECRETS = ['your-secret-key'];
const MIN_LENGTH = 32;

/**
 * 로그인 토큰을 서명·검증하는 비밀키를 돌려준다.
 * 값이 없거나 약하면 기본값으로 넘어가지 않고 에러를 던진다.
 * 모듈을 불러오는 시점이 아니라 요청 시점에 읽어서, 빌드 단계에서는 실패하지 않게 한다.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (
    !secret ||
    secret.length < MIN_LENGTH ||
    LEAKED_SECRETS.includes(secret)
  ) {
    throw new Error(
      `JWT_SECRET 환경변수가 없거나 안전하지 않습니다. ${MIN_LENGTH}자 이상의 임의 값으로 설정하세요.`
    );
  }
  return secret;
}
