import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';

import { BoardToolbar } from '@/components/organisms/board/BoardToolbar';

import {
  openPicker,
  pickerValue,
  pickOption,
} from '@/__tests__/helpers/optionPicker';

const base = {
  sort: 'latest' as const,
  onChangeSort: () => {},
  canWrite: true,
  canManageCategories: true,
  onClickWrite: () => {},
  onClickManageCategories: () => {},
};

describe('BoardToolbar', () => {
  it('정렬 버튼이 고른 값을 보여 주고, 누르면 네 가지 항목이 나온다', async () => {
    render(<BoardToolbar {...base} sort="likes" />);

    expect(pickerValue('정렬')).toBe('좋아요순');
    expect(await openPicker('정렬')).toEqual([
      '최신순',
      '조회수순',
      '좋아요순',
      '댓글순',
    ]);
  });

  it('정렬을 바꾸면 그 값으로 알린다', async () => {
    const onChangeSort = jest.fn();
    render(<BoardToolbar {...base} onChangeSort={onChangeSort} />);

    await pickOption('정렬', '조회수순');
    expect(onChangeSort).toHaveBeenCalledWith('views');
  });

  it('작성하기와 카테고리 관리를 누르면 각각 알린다', () => {
    const onClickWrite = jest.fn();
    const onClickManageCategories = jest.fn();
    render(
      <BoardToolbar
        {...base}
        onClickWrite={onClickWrite}
        onClickManageCategories={onClickManageCategories}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '작성하기' }));
    fireEvent.click(screen.getByRole('button', { name: '카테고리 관리' }));
    expect(onClickWrite).toHaveBeenCalledTimes(1);
    expect(onClickManageCategories).toHaveBeenCalledTimes(1);
  });

  it('권한이 없으면 그 버튼이 없다', () => {
    const { rerender } = render(
      <BoardToolbar {...base} canManageCategories={false} />
    );
    expect(screen.queryByRole('button', { name: '카테고리 관리' })).toBeNull();
    expect(screen.getByRole('button', { name: '작성하기' })).toBeTruthy();

    rerender(
      <BoardToolbar {...base} canWrite={false} canManageCategories={false} />
    );
    // 정렬 버튼만 남는다.
    expect(
      screen.getAllByRole('button').map((button) => button.textContent)
    ).toEqual(['최신순']);
  });

  it('좁은 화면에서 넘치지 않도록 줄바꿈하고, 글자가 세로로 꺾이지 않는다', () => {
    const { container } = render(<BoardToolbar {...base} />);

    // 한 줄에 다 들어가지 않으면 버튼 묶음이 다음 줄로 내려간다.
    const classes = (container.firstChild as HTMLElement).className.split(' ');
    expect(classes).toContain('flex-wrap');
    // "정렬:" 글자를 따로 두지 않는다 (좁아지면 한 글자씩 꺾였다).
    expect(screen.queryByText(/정렬\s*:/)).toBeNull();
    for (const button of screen.getAllByRole('button')) {
      expect(button.className.split(' ')).toContain('shrink-0');
    }
  });
});
