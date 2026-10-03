import { ComponentType } from 'react';

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';

import BoardPage from '@/pages/clubs/[id]/board/index';

// 게시판 화면이 회원 상태와 API 응답에 따라 어떤 안내를 보이는지 본다.
let mockState = {
  auth: {
    user: { id: 7 } as { id: number } | null,
    clubMember: null as { id: number; role: string; status: string } | null,
  },
};
let mockCategories: {
  data: Array<{ id: number; name: string; allowedRoles: string[] }> | undefined;
  isLoading: boolean;
  error: unknown;
};
let mockPosts: { data: unknown; isLoading: boolean; error: unknown };

jest.mock('next/router', () => ({
  useRouter: () => ({ query: { id: '1' }, push: jest.fn() }),
}));
jest.mock('react-redux', () => ({
  useSelector: (selector: (state: typeof mockState) => unknown) =>
    selector(mockState),
}));
jest.mock('@/lib/withAuth', () => ({
  withAuth: (component: unknown) => component,
}));
jest.mock('@/hooks/useBoardCategories', () => ({
  useBoardCategories: () => mockCategories,
}));
jest.mock('@/hooks/useBoardPosts', () => ({
  useBoardPosts: () => mockPosts,
}));
jest.mock('@/components/organisms/board/BoardCategoryTabs', () => ({
  __esModule: true,
  default: () => <div>카테고리 탭</div>,
}));
jest.mock('@/components/organisms/board/PostList', () => ({
  __esModule: true,
  default: () => <div>게시글 목록</div>,
}));

const CATEGORY_MESSAGE = /카테고리가 없어 게시글을 작성할 수 없습니다/;
const MEMBERS_ONLY = '클럽 회원만 볼 수 있는 게시판입니다';
const forbidden = { response: { status: 403 } };

function renderPage() {
  const Page = BoardPage as unknown as ComponentType;
  return render(<Page />);
}

describe('게시판 화면 — 회원이 아닐 때의 안내', () => {
  beforeEach(() => {
    mockState = {
      auth: {
        user: { id: 7 },
        clubMember: { id: 1, role: 'MEMBER', status: 'APPROVED' },
      },
    };
    mockCategories = {
      data: [{ id: 1, name: '자유', allowedRoles: ['MEMBER', 'ADMIN'] }],
      isLoading: false,
      error: null,
    };
    mockPosts = {
      data: { items: [] },
      isLoading: false,
      error: null,
    };
  });

  it('승인된 회원은 게시판을 본다', () => {
    renderPage();

    expect(screen.getByText('게시글 목록')).toBeTruthy();
    expect(screen.queryByText(MEMBERS_ONLY)).toBeNull();
  });

  it.each(['LEFT', 'REJECTED', 'PENDING'])(
    '%s 회원이 주소로 바로 들어오면 카테고리 안내 대신 회원 전용 안내를 본다',
    (status) => {
      mockState.auth.clubMember = { id: 1, role: 'MEMBER', status };
      // 서버는 이 회원에게 403을 준다.
      mockCategories = { data: undefined, isLoading: false, error: forbidden };
      mockPosts = { data: undefined, isLoading: false, error: forbidden };

      renderPage();

      expect(screen.getByText(MEMBERS_ONLY)).toBeTruthy();
      expect(screen.queryByText(CATEGORY_MESSAGE)).toBeNull();
      expect(screen.queryByText('게시글 목록')).toBeNull();
    }
  );

  it('회원 정보를 아직 못 받았어도 서버가 403이면 회원 전용 안내를 본다', () => {
    mockState.auth.clubMember = null;
    mockCategories = { data: undefined, isLoading: false, error: forbidden };

    renderPage();

    expect(screen.getByText(MEMBERS_ONLY)).toBeTruthy();
    expect(screen.queryByText(CATEGORY_MESSAGE)).toBeNull();
  });

  it('카테고리를 불러오지 못하면(403 아님) 카테고리가 없다고 하지 않는다', () => {
    mockCategories = {
      data: undefined,
      isLoading: false,
      error: { response: { status: 500 } },
    };

    renderPage();

    expect(screen.getByText('게시판을 불러올 수 없습니다')).toBeTruthy();
    expect(screen.queryByText(CATEGORY_MESSAGE)).toBeNull();
  });

  it('회원인데 카테고리가 정말 없으면 기존 안내를 그대로 보여 준다', () => {
    mockCategories = { data: [], isLoading: false, error: null };

    renderPage();

    expect(screen.getByText(CATEGORY_MESSAGE)).toBeTruthy();
  });
});
