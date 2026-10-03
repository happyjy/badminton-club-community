import { beforeEach, describe, expect, it, jest } from '@jest/globals';

type Row = { id: string; likeCount: number; isDeleted: boolean } & Record<
  string,
  unknown
>;

// 게시글·댓글을 메모리에 두고 where 조건(isDeleted, likeCount.gt)과
// increment/decrement를 실제로 적용하는 가짜 저장소.
// 조회 조건에서 isDeleted를 빠뜨리거나 좋아요 수를 0 아래로 내리면 드러난다.
const store: { post: Row | null; comment: Row | null } = {
  post: null,
  comment: null,
};

function matchesWhere(row: Row, where: Record<string, unknown>): boolean {
  return Object.entries(where).every(([key, condition]) => {
    if (key === 'clubId' || key === 'postId') return true;
    if (condition && typeof condition === 'object' && 'gt' in condition) {
      return (row[key] as number) > (condition as { gt: number }).gt;
    }
    return row[key] === condition;
  });
}

function applyData(row: Row, data: Record<string, unknown>) {
  Object.entries(data).forEach(([key, value]) => {
    if (value && typeof value === 'object' && 'increment' in value) {
      row[key] =
        (row[key] as number) + (value as { increment: number }).increment;
    } else if (value && typeof value === 'object' && 'decrement' in value) {
      row[key] =
        (row[key] as number) - (value as { decrement: number }).decrement;
    } else {
      row[key] = value;
    }
  });
}

function fakeModel(name: 'post' | 'comment') {
  return {
    findFirst: jest.fn(
      async ({ where }: { where: Record<string, unknown> }) => {
        const row = store[name];
        return row && matchesWhere(row, where) ? { ...row } : null;
      }
    ),
    findUnique: jest.fn(async () => (store[name] ? { ...store[name] } : null)),
    update: jest.fn(
      async ({
        where,
        data,
      }: {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
      }) => {
        const row = store[name];
        if (!row || !matchesWhere(row, where)) throw new Error('없는 행');
        applyData(row, data);
        return { ...row };
      }
    ),
    updateMany: jest.fn(
      async ({
        where,
        data,
      }: {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
      }) => {
        const row = store[name];
        if (!row || !matchesWhere(row, where)) return { count: 0 };
        applyData(row, data);
        return { count: 1 };
      }
    ),
  };
}

jest.mock('@/lib/prisma', () => ({
  prisma: {
    clubMember: {
      findFirst: jest.fn(async () => ({
        id: 1,
        role: 'MEMBER',
        status: 'APPROVED',
      })),
    },
    post: fakeModel('post'),
    postComment: fakeModel('comment'),
  },
}));

jest.mock('@/lib/session', () => ({
  withAuth:
    (handler: (req: unknown, res: unknown) => unknown) =>
    (req: { user?: unknown }, res: unknown) => {
      req.user = { id: 1 };
      return handler(req, res);
    },
}));

import { prisma } from '@/lib/prisma';
import commentLikeHandler from '@/pages/api/clubs/[id]/board/posts/[postId]/comments/[commentId]/like';
import postHandler from '@/pages/api/clubs/[id]/board/posts/[postId]/index';
import postLikeHandler from '@/pages/api/clubs/[id]/board/posts/[postId]/like';

import type { NextApiRequest, NextApiResponse } from 'next';

type Handler = (req: NextApiRequest, res: NextApiResponse) => unknown;

function createRes() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status: jest.fn((code: number) => {
      res.statusCode = code;
      return res;
    }),
    json: jest.fn((body: unknown) => {
      res.body = body;
      return res;
    }),
  };
  return res;
}

async function call(
  handler: Handler,
  method: string,
  query: object,
  body: object = {}
) {
  const res = createRes();
  await handler(
    { method, query, body, cookies: {} } as unknown as NextApiRequest,
    res as unknown as NextApiResponse
  );
  return res;
}

const POST_QUERY = { id: '1', postId: 'p1' };
const COMMENT_QUERY = { ...POST_QUERY, commentId: 'c1' };

function makePost(overrides: Partial<Row> = {}): Row {
  return {
    id: 'p1',
    clubId: 1,
    authorId: 2,
    viewCount: 0,
    likeCount: 0,
    isDeleted: false,
    author: { id: 2, name: '작성자', role: 'MEMBER', status: 'APPROVED' },
    ...overrides,
  };
}

describe('게시글 상세 — 삭제된 글', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    store.post = makePost();
  });

  it('삭제된 글은 id로 열어도 404이고 조회수를 올리지 않는다', async () => {
    store.post = makePost({ isDeleted: true });

    const res = await call(postHandler, 'GET', POST_QUERY);

    expect(res.statusCode).toBe(404);
    expect(store.post?.viewCount).toBe(0);
  });

  it('삭제된 글은 고칠 수 없다 (404)', async () => {
    store.post = makePost({ isDeleted: true, authorId: 1 });

    const res = await call(postHandler, 'PUT', POST_QUERY, {
      title: '새 제목',
    });

    expect(res.statusCode).toBe(404);
    expect(prisma.post.update).not.toHaveBeenCalled();
  });

  it('지워지지 않은 글은 그대로 볼 수 있다', async () => {
    const res = await call(postHandler, 'GET', POST_QUERY);

    expect(res.statusCode).toBe(200);
  });
});

describe('좋아요 수는 0 아래로 내려가지 않는다', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    store.post = makePost();
    store.comment = {
      id: 'c1',
      postId: 'p1',
      likeCount: 0,
      isDeleted: false,
    };
  });

  it('게시글: 좋아요가 0일 때 취소해도 0이다', async () => {
    const res = await call(postLikeHandler, 'POST', POST_QUERY, {
      action: 'unlike',
    });

    expect(res.statusCode).toBe(200);
    expect(store.post?.likeCount).toBe(0);
    expect((res.body as { data: Row }).data.likeCount).toBe(0);
  });

  it('게시글: 좋아요가 있으면 취소할 때 하나 줄어든다', async () => {
    store.post = makePost({ likeCount: 2 });

    const res = await call(postLikeHandler, 'POST', POST_QUERY, {
      action: 'unlike',
    });

    expect(res.statusCode).toBe(200);
    expect(store.post?.likeCount).toBe(1);
    expect((res.body as { data: Row }).data.likeCount).toBe(1);
  });

  it('게시글: 좋아요는 하나 늘어난다', async () => {
    const res = await call(postLikeHandler, 'POST', POST_QUERY, {
      action: 'like',
    });

    expect(res.statusCode).toBe(200);
    expect(store.post?.likeCount).toBe(1);
  });

  it('댓글: 좋아요가 0일 때 취소해도 0이다', async () => {
    const res = await call(commentLikeHandler, 'POST', COMMENT_QUERY, {
      action: 'unlike',
    });

    expect(res.statusCode).toBe(200);
    expect(store.comment?.likeCount).toBe(0);
    expect((res.body as { data: Row }).data.likeCount).toBe(0);
  });

  it('댓글: 좋아요가 있으면 취소할 때 하나 줄어든다', async () => {
    store.comment = { ...(store.comment as Row), likeCount: 3 };

    const res = await call(commentLikeHandler, 'POST', COMMENT_QUERY, {
      action: 'unlike',
    });

    expect(res.statusCode).toBe(200);
    expect(store.comment?.likeCount).toBe(2);
  });
});
