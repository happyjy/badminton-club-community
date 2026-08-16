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

describe('TagListField 선택 목록 구분', () => {
  it('아직 선택하지 않은 프리셋만 빠른 선택에 보여준다', () => {
    renderTagListField(['20대', '30대']);

    // 선택한 값은 빠른 선택에서 빠지고 선택 목록으로 옮겨간다
    expect(screen.queryByRole('button', { name: '20대' })).toBeNull();
    expect(screen.queryByRole('button', { name: '30대' })).toBeNull();

    expect(screen.getByRole('button', { name: '40대' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '50대' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '60대' })).toBeTruthy();
  });

  it('프리셋을 고르면 빠른 선택에서 빠지고 선택 목록에 들어간다', () => {
    const { currentValues } = renderTagListField([]);

    fireEvent.click(screen.getByRole('button', { name: '40대' }));

    expect(currentValues()).toBe('40대');
    expect(screen.queryByRole('button', { name: '40대' })).toBeNull();
    expect(screen.getByRole('button', { name: '40대 제거' })).toBeTruthy();
  });

  it('선택 목록에서 빼면 빠른 선택으로 되돌아온다', () => {
    renderTagListField(['40대']);

    fireEvent.click(screen.getByRole('button', { name: '40대 제거' }));

    expect(screen.getByRole('button', { name: '40대' })).toBeTruthy();
  });

  it('프리셋을 모두 고르면 빠른 선택 영역을 감춘다', () => {
    renderTagListField([...PRESETS]);

    expect(screen.queryByText('빠른 선택')).toBeNull();
    expect(screen.getByText('선택한 연령')).toBeTruthy();
  });

  it('두 영역에 각각 라벨을 보여준다', () => {
    renderTagListField(['20대']);

    expect(screen.getByText('빠른 선택')).toBeTruthy();
    expect(screen.getByText('선택한 연령')).toBeTruthy();
  });

  it('직접 입력한 값은 빠른 선택에 추가되지 않는다', () => {
    renderTagListField([]);

    const input = screen.getByPlaceholderText('예: 시니어');
    fireEvent.change(input, { target: { value: '시니어' } });
    fireEvent.click(screen.getByRole('button', { name: '추가' }));

    // 선택 목록에만 있고 프리셋 칩으로는 생기지 않는다
    expect(screen.getByRole('button', { name: '시니어 제거' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '시니어' })).toBeNull();
  });
});

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
