/**
 * 쉼표로 구분된 입력을 태그 목록으로 나눈다.
 * "S, M, L" 처럼 한 번에 여러 개를 등록할 때 쓴다.
 *
 * - 쉼표(,)와 전각 쉼표(，) 모두 구분자로 인정한다
 * - 앞뒤 공백을 없애고 빈 값은 버린다
 * - 입력 안에서 중복된 값과 이미 등록된 값은 제외한다
 */
export function parseTagInput(raw: string, existing: string[] = []): string[] {
  const existingSet = new Set(existing);
  const seen = new Set<string>();

  return raw
    .split(/[,，]/)
    .map((part) => part.trim())
    .filter((part) => {
      if (!part) return false;
      if (existingSet.has(part) || seen.has(part)) return false;
      seen.add(part);
      return true;
    });
}
