import { ReactNode } from 'react';

import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, within } from '@testing-library/react';

import BoardCategoryTabs from '@/components/organisms/board/BoardCategoryTabs';
import PostCard from '@/components/organisms/board/PostCard';
import PostList from '@/components/organisms/board/PostList';

import { PostWithRelations } from '@/types/board.types';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
jest.mock('next/router', () => ({
  useRouter: () => ({ query: { id: '1' }, push: jest.fn() }),
}));

let mockCategories: Array<{ id: number; name: string }> | undefined = [
  { id: 1, name: '공지사항' },
  { id: 2, name: '중고장터' },
];
let mockLoading = false;
jest.mock('@/hooks/useBoardCategories', () => ({
  useBoardCategories: () => ({ data: mockCategories, isLoading: mockLoading }),
}));

const post = (patch: Record<string, unknown> = {}) =>
  ({
    id: 12,
    title: '이번 주 토요일 운동 안내',
    content: '체육관 공사로 시작 시간이 30분 늦어집니다.',
    isPinned: false,
    viewCount: 34,
    likeCount: 5,
    createdAt: new Date(2026, 9, 1),
    category: { id: 1, name: '공지사항' },
    author: { name: '김민수' },
    _count: { comments: 3 },
    ...patch,
  }) as unknown as PostWithRelations;

describe('PostCard', () => {
  it('제목·내용·카테고리·작성자와 조회·좋아요·댓글 수를 보여 준다', () => {
    render(<PostCard post={post()} />);

    expect(screen.getByText('이번 주 토요일 운동 안내')).toBeTruthy();
    expect(screen.getByText(/체육관 공사로/)).toBeTruthy();
    expect(screen.getByText('공지사항')).toBeTruthy();
    expect(screen.getByText(/김민수/)).toBeTruthy();
    expect(screen.getByLabelText('조회 34')).toBeTruthy();
    expect(screen.getByLabelText('좋아요 5')).toBeTruthy();
    expect(screen.getByLabelText('댓글 3')).toBeTruthy();
  });

  it('행 전체가 글 상세로 가는 링크다', () => {
    render(<PostCard post={post()} />);

    expect(screen.getByRole('link').getAttribute('href')).toBe(
      '/clubs/1/board/12'
    );
  });

  it('고정 글에만 고정 표시가 붙는다', () => {
    const { rerender } = render(<PostCard post={post()} />);
    expect(screen.queryByLabelText('고정 게시글')).toBeNull();

    rerender(<PostCard post={post({ isPinned: true })} />);
    expect(screen.getByLabelText('고정 게시글')).toBeTruthy();
  });

  it('작성자 이름이 없으면 "알 수 없음", 댓글 수가 없으면 0', () => {
    render(
      <PostCard post={post({ author: { name: null }, _count: undefined })} />
    );

    expect(screen.getByText(/알 수 없음/)).toBeTruthy();
    expect(screen.getByLabelText('댓글 0')).toBeTruthy();
  });

  it('긴 제목과 내용은 두 줄에서 자른다', () => {
    render(<PostCard post={post()} />);

    expect(screen.getByText('이번 주 토요일 운동 안내').className).toContain(
      'line-clamp-2'
    );
    expect(screen.getByText(/체육관 공사로/).className).toContain(
      'line-clamp-2'
    );
  });
});

describe('PostList', () => {
  it('글이 없으면 빈 화면 안내를 보여 준다', () => {
    render(<PostList posts={[]} />);

    expect(screen.getByText('아직 게시글이 없어요')).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('넘긴 순서대로 글을 그린다', () => {
    render(
      <PostList
        posts={[
          post({ id: 1, title: '첫 글' }),
          post({ id: 2, title: '둘째 글' }),
        ]}
      />
    );

    expect(
      screen.getAllByRole('link').map((link) => link.getAttribute('href'))
    ).toEqual(['/clubs/1/board/1', '/clubs/1/board/2']);
  });
});

describe('BoardCategoryTabs', () => {
  it('"전체"와 카테고리들을 보여 주고, 고른 것만 눌린 상태다', () => {
    mockLoading = false;
    render(
      <BoardCategoryTabs selectedCategoryId={2} onCategoryChange={() => {}} />
    );

    const nav = screen.getByRole('navigation', { name: '게시판 카테고리' });
    const buttons = within(nav).getAllByRole('button');
    expect(buttons.map((button) => button.textContent)).toEqual([
      '전체',
      '공지사항',
      '중고장터',
    ]);
    expect(
      buttons.map((button) => button.getAttribute('aria-pressed'))
    ).toEqual(['false', 'false', 'true']);
  });

  it('아무것도 고르지 않았으면 "전체"가 눌린 상태다', () => {
    render(
      <BoardCategoryTabs
        selectedCategoryId={null}
        onCategoryChange={() => {}}
      />
    );

    expect(
      screen.getByRole('button', { name: '전체' }).getAttribute('aria-pressed')
    ).toBe('true');
  });

  it('카테고리를 누르면 그 id로, "전체"를 누르면 null로 알린다', () => {
    const onCategoryChange = jest.fn();
    render(
      <BoardCategoryTabs
        selectedCategoryId={null}
        onCategoryChange={onCategoryChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '중고장터' }));
    fireEvent.click(screen.getByRole('button', { name: '전체' }));

    expect(onCategoryChange.mock.calls).toEqual([[2], [null]]);
  });

  it('버튼의 터치 영역은 44 이상이다', () => {
    render(
      <BoardCategoryTabs
        selectedCategoryId={null}
        onCategoryChange={() => {}}
      />
    );

    expect(screen.getByRole('button', { name: '전체' }).className).toContain(
      'h-11'
    );
  });

  it('불러오는 중에는 버튼 대신 자리 표시를 보여 준다', () => {
    mockLoading = true;
    render(
      <BoardCategoryTabs
        selectedCategoryId={null}
        onCategoryChange={() => {}}
      />
    );

    expect(screen.queryByRole('button')).toBeNull();
    mockLoading = false;
  });

  it('카테고리가 없어도 "전체"는 보인다', () => {
    mockCategories = undefined;
    render(
      <BoardCategoryTabs
        selectedCategoryId={null}
        onCategoryChange={() => {}}
      />
    );

    expect(screen.getAllByRole('button')).toHaveLength(1);
    mockCategories = [
      { id: 1, name: '공지사항' },
      { id: 2, name: '중고장터' },
    ];
  });
});
