import { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ClubMember } from '@/types';
import {
  PostListResponse,
  PostDetailResponse,
  CreatePostRequest,
  PostSortOption,
} from '@/types/board.types';
import { Role, Status } from '@/types/enums';
import { canCreatePostInCategory } from '@/utils/boardPermissions';

export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse<
    PostListResponse | PostDetailResponse | { status: number; message: string }
  >
) {
  const { id: clubId } = req.query;

  if (!clubId || typeof clubId !== 'string') {
    return res.status(400).json({
      status: 400,
      message: '클럽 ID가 필요합니다.',
    });
  }

  const clubIdNumber = Number(clubId);

  try {
    // 클럽 멤버 정보 가져오기
    const clubMember = await prisma.clubMember.findFirst({
      where: {
        userId: req.user.id,
        clubId: clubIdNumber,
      },
    });

    if (!clubMember) {
      return res.status(403).json({
        status: 403,
        message: '클럽 멤버가 아닙니다.',
      });
    }

    // GET: 게시글 목록 조회
    if (req.method === 'GET') {
      const categoryId = req.query.categoryId
        ? Number(req.query.categoryId)
        : undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const sort = (req.query.sort as PostSortOption) || 'latest';

      const skip = (page - 1) * limit;

      // 정렬 옵션 설정
      let orderBy: any = {};
      switch (sort) {
        case 'views':
          orderBy = { viewCount: 'desc' };
          break;
        case 'likes':
          orderBy = { likeCount: 'desc' };
          break;
        case 'comments':
          orderBy = { comments: { _count: 'desc' } };
          break;
        case 'latest':
        default:
          orderBy = { createdAt: 'desc' };
          break;
      }

      const where: any = {
        clubId: clubIdNumber,
        isDeleted: false,
      };

      if (categoryId) {
        where.categoryId = categoryId;
      }

      // 고정 게시글과 일반 게시글을 분리하여 조회
      const [pinnedPosts, regularPosts, total] = await Promise.all([
        // 고정 게시글 (항상 최신순)
        prisma.post.findMany({
          where: {
            ...where,
            isPinned: true,
          },
          include: {
            category: true,
            author: true,
            _count: {
              select: {
                comments: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        }),
        // 일반 게시글
        prisma.post.findMany({
          where: {
            ...where,
            isPinned: false,
          },
          include: {
            category: true,
            author: true,
            _count: {
              select: {
                comments: true,
              },
            },
          },
          orderBy,
          skip,
          take: limit,
        }),
        prisma.post.count({ where }),
      ]);

      // 고정 게시글 + 일반 게시글 합치기
      const items = [...pinnedPosts, ...regularPosts].map((post) => ({
        ...post,
        author: {
          ...post.author,
          role: post.author.role as Role,
          status: post.author.status as Status,
        },
      }));

      return res.status(200).json({
        data: {
          items,
          total,
          page,
          limit,
        },
        status: 200,
        message: '게시글 목록을 성공적으로 조회했습니다.',
      });
    }

    // POST: 게시글 작성
    if (req.method === 'POST') {
      const { categoryId, title, content }: CreatePostRequest = req.body;

      if (!categoryId || !title || !content) {
        return res.status(400).json({
          status: 400,
          message: '카테고리, 제목, 내용이 필요합니다.',
        });
      }

      // 카테고리 존재 및 권한 확인
      const category = await prisma.postCategory.findFirst({
        where: {
          id: categoryId,
          clubId: clubIdNumber,
          isActive: true,
        },
      });

      if (!category) {
        return res.status(404).json({
          status: 404,
          message: '카테고리를 찾을 수 없습니다.',
        });
      }

      // 작성 권한 체크
      if (!canCreatePostInCategory(category.allowedRoles, clubMember.role)) {
        return res.status(403).json({
          status: 403,
          message: '이 카테고리에 게시글을 작성할 권한이 없습니다.',
        });
      }

      const post = await prisma.post.create({
        data: {
          clubId: clubIdNumber,
          categoryId,
          title,
          content,
          authorId: clubMember.id,
        },
        include: {
          category: true,
          author: true,
          _count: {
            select: {
              comments: true,
            },
          },
        },
      });

      const postResponse = {
        ...post,
        author: {
          ...post.author,
          role: post.author.role as Role,
          status: post.author.status as Status,
        },
      };

      return res.status(201).json({
        data: postResponse,
        status: 201,
        message: '게시글이 성공적으로 작성되었습니다.',
      });
    }

    return res.status(405).json({
      status: 405,
      message: '허용되지 않는 메서드입니다.',
    });
  } catch (error) {
    console.error('게시글 API 오류:', error);
    return res.status(500).json({
      status: 500,
      message: '서버 오류가 발생했습니다.',
    });
  }
});
