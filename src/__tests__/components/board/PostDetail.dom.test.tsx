import { ReactNode } from 'react';

import { describe, expect, it, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';

import PostDetail from '@/components/organisms/board/PostDetail';
import { ConfirmProvider } from '@/components/organisms/sheet/ConfirmProvider';

import { store } from '@/store';
import { PostWithRelations } from '@/types/board.types';

jest.mock('next/router', () => ({
  __esModule: true,
  // ConfirmProvider가 기본 내보내기(싱글턴 라우터)의 events를 쓴다.
  default: { events: { on: jest.fn(), off: jest.fn() } },
  useRouter: () => ({ query: { id: '1', postId: '5' }, push: jest.fn() }),
}));
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const post = {
  id: 5,
  title: '공지',
  content: '내용',
  isPinned: false,
  authorId: 9,
  author: { name: '홍길동' },
  category: { name: '공지사항' },
  createdAt: '2026-10-01T00:00:00.000Z',
  viewCount: 12,
  likeCount: 7,
  _count: { comments: 3 },
} as unknown as PostWithRelations;

describe('게시글 상세', () => {
  it('클럽 회원이 아니어도 좋아요 수를 볼 수 있다 (누를 수는 없다)', () => {
    // 스토어의 처음 상태는 클럽 회원 정보가 없다.
    render(
      <Provider store={store}>
        <QueryClientProvider client={new QueryClient()}>
          <ConfirmProvider>
            <PostDetail post={post} />
          </ConfirmProvider>
        </QueryClientProvider>
      </Provider>
    );

    expect(screen.queryByRole('button', { name: /좋아요/ })).toBeNull();
    expect(screen.getByLabelText('좋아요 7')).toBeTruthy();
  });
});
