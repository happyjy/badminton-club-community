/**
 * 여러 클래스명을 조건부로 결합하는 유틸리티 함수
 * @param classes - 결합할 클래스명 배열
 * @returns 필터링되어 결합된 클래스명 문자열
 * @example
 * classNames('foo', undefined, 'bar', null) // 'foo bar'
 * classNames('a', condition && 'b') // condition이 true면 'a b', false면 'a'
 */
export function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}
