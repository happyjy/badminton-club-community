import React, { useState } from 'react';

import { describe, expect, it } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';

import TagListField from '@/components/organisms/tournament/admin/TagListField';

const PRESETS = ['20대', '30대', '40대', '50대', '60대'];

/**
 * TagListField는 값을 부모가 들고 있는 제어 컴포넌트라,
 * 상태를 가진 래퍼로 감싸 실제 순서 변경을 확인한다.
 */
function renderTagListField(initialValues: string[] = []) {
  function Wrapper() {
    const [values, setValues] = useState(initialValues);

    return (
      <>
        <TagListField
          label="연령"
          values={values}
          presets={PRESETS}
          placeholder="예: 시니어"
          emptyHint="연령을 1개 이상 선택해야 합니다."
          onChangeValues={setValues}
        />
        <output data-testid="values">{values.join(',')}</output>
      </>
    );
  }

  render(<Wrapper />);

  return {
    currentValues: () => screen.getByTestId('values').textContent,
  };
}

describe('TagListField 순서 조절', () => {
  it('선택한 값을 배열 순서대로 보여준다', () => {
    renderTagListField(['20대', '30대', '25대']);

    const chips = screen.getAllByRole('listitem').map((li) => li.textContent);

    expect(chips[0]).toContain('20대');
    expect(chips[1]).toContain('30대');
    expect(chips[2]).toContain('25대');
  });

  it('나중에 추가한 값은 목록 끝에 붙는다', () => {
    const { currentValues } = renderTagListField(['20대', '30대']);

    const input = screen.getByPlaceholderText('예: 시니어');
    fireEvent.change(input, { target: { value: '25대' } });
    fireEvent.click(screen.getByRole('button', { name: '추가' }));

    expect(currentValues()).toBe('20대,30대,25대');
  });

  it('숫자순 정렬 버튼이 중간에 추가한 값을 제자리로 옮긴다', () => {
    const { currentValues } = renderTagListField([
      '20대',
      '30대',
      '40대',
      '50대',
      '25대',
      '35대',
      '45대',
    ]);

    fireEvent.click(screen.getByRole('button', { name: '숫자순 정렬' }));

    expect(currentValues()).toBe('20대,25대,30대,35대,40대,45대,50대');
  });

  it('이미 정렬돼 있으면 정렬 버튼을 비활성화한다', () => {
    renderTagListField(['20대', '30대']);

    const sortButton = screen.getByRole('button', {
      name: '숫자순 정렬',
    }) as HTMLButtonElement;

    expect(sortButton.disabled).toBe(true);
  });

  it('앞으로 버튼으로 순서를 한 칸 당긴다', () => {
    const { currentValues } = renderTagListField(['20대', '30대', '25대']);

    fireEvent.click(screen.getByRole('button', { name: '25대 앞으로' }));

    expect(currentValues()).toBe('20대,25대,30대');
  });

  it('뒤로 버튼으로 순서를 한 칸 민다', () => {
    const { currentValues } = renderTagListField(['20대', '30대', '25대']);

    fireEvent.click(screen.getByRole('button', { name: '20대 뒤로' }));

    expect(currentValues()).toBe('30대,20대,25대');
  });

  it('첫 값의 앞으로 · 마지막 값의 뒤로 버튼은 비활성화한다', () => {
    renderTagListField(['20대', '30대']);

    const first = screen.getByRole('button', {
      name: '20대 앞으로',
    }) as HTMLButtonElement;
    const last = screen.getByRole('button', {
      name: '30대 뒤로',
    }) as HTMLButtonElement;

    expect(first.disabled).toBe(true);
    expect(last.disabled).toBe(true);
  });

  it('제거 버튼으로 값을 뺀다', () => {
    const { currentValues } = renderTagListField(['20대', '30대']);

    fireEvent.click(screen.getByRole('button', { name: '20대 제거' }));

    expect(currentValues()).toBe('30대');
  });

  it('직접 입력한 값도 순서를 조절할 수 있다', () => {
    const { currentValues } = renderTagListField(['30대']);

    const input = screen.getByPlaceholderText('예: 시니어');
    fireEvent.change(input, { target: { value: '시니어' } });
    fireEvent.click(screen.getByRole('button', { name: '추가' }));

    expect(currentValues()).toBe('30대,시니어');

    fireEvent.click(screen.getByRole('button', { name: '시니어 앞으로' }));

    expect(currentValues()).toBe('시니어,30대');
  });

  it('값이 없으면 안내 문구를 보여준다', () => {
    renderTagListField([]);

    expect(screen.getByText('연령을 1개 이상 선택해야 합니다.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '숫자순 정렬' })).toBeNull();
  });
});
