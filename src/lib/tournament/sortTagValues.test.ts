import { describe, expect, it } from '@jest/globals';

import { moveTagValue, sortTagValues } from './sortTagValues';

describe('sortTagValues', () => {
  it('숫자로 시작하는 값을 숫자 크기순으로 정렬한다', () => {
    expect(sortTagValues(['30대', '20대', '50대', '40대'])).toEqual([
      '20대',
      '30대',
      '40대',
      '50대',
    ]);
  });

  it('나중에 추가한 중간 연령대를 제자리에 넣는다', () => {
    expect(
      sortTagValues(['20대', '30대', '40대', '50대', '25대', '35대', '45대'])
    ).toEqual(['20대', '25대', '30대', '35대', '40대', '45대', '50대']);
  });

  it('문자열이 아니라 숫자 크기로 비교한다', () => {
    expect(sortTagValues(['100대', '20대', '9대'])).toEqual([
      '9대',
      '20대',
      '100대',
    ]);
  });

  it('숫자가 없는 값은 숫자 값들 뒤에 모은다', () => {
    expect(sortTagValues(['시니어', '30대', '학생', '20대'])).toEqual([
      '20대',
      '30대',
      '시니어',
      '학생',
    ]);
  });

  it('숫자가 없는 값끼리는 원래 순서를 유지한다', () => {
    expect(sortTagValues(['학생', '시니어', '20대'])).toEqual([
      '20대',
      '학생',
      '시니어',
    ]);
  });

  it('숫자가 같으면 원래 순서를 유지한다', () => {
    expect(sortTagValues(['1부', '1군', '2부'])).toEqual(['1부', '1군', '2부']);
  });

  it('값 중간에 있는 숫자도 인식한다', () => {
    expect(sortTagValues(['B조', 'A조', '초심'])).toEqual([
      'B조',
      'A조',
      '초심',
    ]);
  });

  it('원본 배열을 바꾸지 않는다', () => {
    const values = ['30대', '20대'];
    sortTagValues(values);
    expect(values).toEqual(['30대', '20대']);
  });

  it('빈 배열과 1개짜리도 그대로 둔다', () => {
    expect(sortTagValues([])).toEqual([]);
    expect(sortTagValues(['20대'])).toEqual(['20대']);
  });
});

describe('moveTagValue', () => {
  it('앞으로 한 칸 옮긴다', () => {
    expect(moveTagValue(['A', 'B', 'C'], 2, -1)).toEqual(['A', 'C', 'B']);
  });

  it('뒤로 한 칸 옮긴다', () => {
    expect(moveTagValue(['A', 'B', 'C'], 0, 1)).toEqual(['B', 'A', 'C']);
  });

  it('첫 번째를 앞으로 옮기면 그대로 둔다', () => {
    expect(moveTagValue(['A', 'B', 'C'], 0, -1)).toEqual(['A', 'B', 'C']);
  });

  it('마지막을 뒤로 옮기면 그대로 둔다', () => {
    expect(moveTagValue(['A', 'B', 'C'], 2, 1)).toEqual(['A', 'B', 'C']);
  });

  it('범위 밖 인덱스는 그대로 둔다', () => {
    expect(moveTagValue(['A', 'B'], 5, -1)).toEqual(['A', 'B']);
    expect(moveTagValue(['A', 'B'], -1, 1)).toEqual(['A', 'B']);
  });

  it('원본 배열을 바꾸지 않는다', () => {
    const values = ['A', 'B'];
    moveTagValue(values, 0, 1);
    expect(values).toEqual(['A', 'B']);
  });
});
