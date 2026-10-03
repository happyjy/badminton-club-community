import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';

import { SegmentedControl } from '@/components/molecules/SegmentedControl';

const options = [
  { value: 'all', label: '전체' },
  { value: 'active', label: '활동' },
  { value: 'unpaid', label: '미납' },
];

describe('SegmentedControl', () => {
  it('항목을 모두 그리고 고른 것을 표시한다', () => {
    render(
      <SegmentedControl
        aria-label="회원 필터"
        options={options}
        value="active"
        onChange={() => {}}
      />
    );

    expect(screen.getByRole('radiogroup', { name: '회원 필터' })).toBeTruthy();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(
      screen.getByRole('radio', { name: '활동' }).getAttribute('aria-checked')
    ).toBe('true');
    expect(
      screen.getByRole('radio', { name: '전체' }).getAttribute('aria-checked')
    ).toBe('false');
  });

  it('다른 항목을 누르면 그 값으로 onChange가 불린다', () => {
    const onChange = jest.fn();
    render(
      <SegmentedControl
        aria-label="회원 필터"
        options={options}
        value="all"
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole('radio', { name: '미납' }));
    expect(onChange).toHaveBeenCalledWith('unpaid');
  });

  it('이미 고른 항목을 다시 눌러도 onChange를 부르지 않는다', () => {
    const onChange = jest.fn();
    render(
      <SegmentedControl
        aria-label="회원 필터"
        options={options}
        value="all"
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole('radio', { name: '전체' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('value가 어느 항목과도 맞지 않으면 아무것도 고르지 않은 채로 그린다', () => {
    render(
      <SegmentedControl
        aria-label="회원 필터"
        options={options}
        value={'gone' as 'all'}
        onChange={() => {}}
      />
    );

    const checked = screen
      .getAllByRole('radio')
      .filter((radio) => radio.getAttribute('aria-checked') === 'true');
    expect(checked).toHaveLength(0);
  });

  it('고른 항목만 흰 바탕이다', () => {
    render(
      <SegmentedControl
        aria-label="회원 필터"
        options={options}
        value="all"
        onChange={() => {}}
      />
    );

    expect(screen.getByRole('radio', { name: '전체' }).className).toContain(
      'bg-raised'
    );
    expect(screen.getByRole('radio', { name: '활동' }).className).not.toContain(
      'bg-raised'
    );
  });

  it('방향키로 옆 항목을 고르고 초점을 옮긴다 (끝에서는 반대쪽으로 돈다)', () => {
    const onChange = jest.fn();
    render(
      <SegmentedControl
        aria-label="보기"
        options={[
          { value: 'a', label: '가' },
          { value: 'b', label: '나' },
          { value: 'c', label: '다' },
        ]}
        value="a"
        onChange={onChange}
      />
    );
    const radios = screen.getAllByRole('radio');

    fireEvent.keyDown(radios[0], { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith('b');
    expect(document.activeElement).toBe(radios[1]);

    fireEvent.keyDown(radios[0], { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenLastCalledWith('c');
    expect(document.activeElement).toBe(radios[2]);
  });

  it('고른 항목만 탭으로 닿는다', () => {
    render(
      <SegmentedControl
        aria-label="보기"
        options={[
          { value: 'a', label: '가' },
          { value: 'b', label: '나' },
        ]}
        value="b"
        onChange={() => {}}
      />
    );
    expect(
      screen
        .getAllByRole('radio')
        .map((radio) => radio.getAttribute('tabindex'))
    ).toEqual(['-1', '0']);
  });
});
