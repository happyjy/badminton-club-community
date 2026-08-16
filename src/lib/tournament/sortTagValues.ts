/** 값 안에서 처음 나오는 숫자를 뽑는다. 숫자가 없으면 null. */
function extractNumber(value: string): number | null {
  const matched = value.match(/\d+/);
  return matched ? Number(matched[0]) : null;
}

/**
 * 연령·급수 목록을 사람이 기대하는 순서로 정렬한다.
 *
 * - 숫자가 들어간 값끼리는 숫자 크기순 ("9대 < 20대 < 100대")
 * - 숫자가 없는 값("시니어")은 숫자 값들 뒤로 보낸다
 * - 그 외에는 원래 순서를 유지한다 (안정 정렬)
 *
 * 나중에 추가한 "25대"가 목록 끝에 붙는 문제를 해결하는 용도다.
 */
export function sortTagValues(values: string[]): string[] {
  return [...values].sort((a, b) => {
    const numberA = extractNumber(a);
    const numberB = extractNumber(b);

    if (numberA === null && numberB === null) return 0;
    if (numberA === null) return 1;
    if (numberB === null) return -1;

    return numberA - numberB;
  });
}

/**
 * 목록에서 index 위치의 값을 direction(-1: 앞, 1: 뒤)만큼 옮긴다.
 * 목록 밖으로 나가는 이동은 무시한다.
 */
export function moveTagValue(
  values: string[],
  index: number,
  direction: -1 | 1
): string[] {
  const target = index + direction;
  if (index < 0 || index >= values.length) return values;
  if (target < 0 || target >= values.length) return values;

  const next = [...values];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
