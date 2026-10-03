export type PageItem = number | '…';

/**
 * 쪽 번호 줄에 보여 줄 번호. 첫 쪽·끝 쪽·현재 쪽은 늘 들어가고,
 * 건너뛴 구간은 '…'로 적는다. 전체 칸 수는 max(홀수, 7 이상)를 넘지 않는다.
 */
export function getPageNumbers(
  current: number,
  total: number,
  max = 7
): PageItem[] {
  const last = Math.max(1, total);
  const page = Math.min(Math.max(1, current), last);

  if (last <= max) {
    return Array.from({ length: last }, (_, i) => i + 1);
  }

  const range = (from: number, to: number) =>
    Array.from({ length: to - from + 1 }, (_, i) => from + i);

  // 한쪽만 줄일 때 이어서 보여 주는 칸 수 (첫/끝 쪽과 '…'를 뺀 나머지)
  const edge = max - 2;
  // 양쪽을 줄일 때 현재 쪽의 앞뒤로 보여 주는 칸 수
  const side = (max - 5) / 2;

  if (page < edge) {
    return [...range(1, edge), '…', last];
  }
  if (page > last - edge + 1) {
    return [1, '…', ...range(last - edge + 1, last)];
  }
  return [1, '…', ...range(page - side, page + side), '…', last];
}
