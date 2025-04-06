/**
 * 랭킹 정렬용 유틸리티 함수
 * 카운트 기준 내림차순 정렬 후, 카운트가 동일할 경우 ID 기준 오름차순 정렬
 * @param a - 비교할 첫 번째 객체
 * @param b - 비교할 두 번째 객체
 * @returns 정렬 결과값
 */
export const sortRankingByCountAndId = <
  T extends { count: number; id: number },
>(
  a: T,
  b: T
): number => {
  // 같은 카운트일 경우 ID 순으로 정렬
  if (a.count === b.count) {
    return a.id - b.id;
  }
  // 카운트 내림차순 정렬
  return b.count - a.count;
};
