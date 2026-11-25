/**
 * 입금자명에서 이름만 남긴다.
 *
 * 입금자가 "가나다3월회비", "26.3월가나다"처럼 월·회비를 붙여 쓰는 일이 많아,
 * 이름 비교는 이 토큰으로 한다. 원문은 부분 일치용으로 따로 쓴다.
 */

// 긴 것부터 지운다. '월회비'를 '월'보다 먼저 지워야 '회비'가 남지 않는다.
const NOISE_WORDS = ['월회비', '연회비', '가입비', '등록비', '회비', '월'];

export function extractNameToken(depositorName: string): string {
  let token = depositorName.normalize('NFC');
  // 숫자·영문·공백·구두점 제거. "3월"의 숫자도 여기서 사라진다.
  token = token.replace(/[0-9A-Za-z\s.\-_/,()[\]~+·:]/g, '');
  for (const word of NOISE_WORDS) token = token.split(word).join('');
  return token;
}

/** 이름으로 볼 만한 토큰인지 (한글 2~4자) */
export function isNameLikeToken(token: string): boolean {
  return /^[가-힣]{2,4}$/.test(token);
}
