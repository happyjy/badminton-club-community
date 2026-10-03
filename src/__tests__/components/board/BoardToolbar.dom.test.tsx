import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';

import { BoardToolbar } from '@/components/organisms/board/BoardToolbar';

const base = {
  sort: 'latest' as const,
  onChangeSort: () => {},
  canWrite: true,
  canManageCategories: true,
  onClickWrite: () => {},
  onClickManageCategories: () => {},
};

describe('BoardToolbar', () => {
  it('정렬 선택칸에 네 가지 항목이 있고 고른 값을 보여 준다', () => {
    render(<BoardToolbar {...base} sort="likes" />);

    const select = screen.getByRole('combobox', {
      name: '정렬',
    }) as HTMLSelectElement;
    expect(select.value).toBe('likes');
    expect(
      [...select.options].map((option) => [option.value, option.textContent])
    ).toEqual([
      ['latest', '최신순'],
      ['views', '조회수순'],
      ['likes', '좋아요순'],
      ['comments', '댓글순'],
    ]);
  });

  it('정렬을 바꾸면 그 값으로 알린다', () => {
    const onChangeSort = jest.fn();
    render(<BoardToolbar {...base} onChangeSort={onChangeSort} />);

    fireEvent.change(screen.getByRole('combobox', { name: '정렬' }), {
      target: { value: 'views' },
    });
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
    expect(screen.queryByRole('button')).toBeNull();
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
