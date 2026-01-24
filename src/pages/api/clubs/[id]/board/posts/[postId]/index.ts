import { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import { ClubMember } from '@/types';
import { PostDetailResponse, UpdatePostRequest } from '@/types/board.types';
import { canEditPost, canCreatePostInCategory } from '@/utils/boardPermissions';

export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse<PostDetailResponse | { status: number; message: string }>
) {
  const { id: clubId, postId } = req.query;

  if (
    !clubId ||
    !postId ||
    typeof clubId !== 'string' ||
    typeof postId !== 'string'
  ) {
    return res.status(400).json({
      status: 400,
      message: '클럽 ID와 게시글 ID가 필요합니다.',
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

    const typedClubMember = clubMember as unknown as ClubMember;

    // 게시글 존재 확인
    const post = await prisma.post.findFirst({
      where: {
        id: postId,
        clubId: clubIdNumber,
      },
      include: {
        category: true,
        author: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });

    if (!post) {
      return res.status(404).json({
        status: 404,
        message: '게시글을 찾을 수 없습니다.',
      });
    }

    // GET: 게시글 상세 조회
    if (req.method === 'GET') {
      // 조회수 증가 (작성자가 아닌 경우에만)
      if (post.authorId !== clubMember.id) {
        await prisma.post.update({
          where: {
            id: postId,
          },
          data: {
            viewCount: {
              increment: 1,
            },
          },
        });

        // 조회수 증가된 값 반영
        post.viewCount += 1;
      }

      return res.status(200).json({
        data: post,
        status: 200,
        message: '게시글을 성공적으로 조회했습니다.',
      });
    }

    // PUT: 게시글 수정
    if (req.method === 'PUT') {
      // 수정 권한 체크
      if (!canEditPost(post.authorId, clubMember.id, typedClubMember)) {
        return res.status(403).json({
          status: 403,
          message: '게시글을 수정할 권한이 없습니다.',
        });
      }

      const { title, content, categoryId }: UpdatePostRequest = req.body;

      const updateData: any = {};

      if (title !== undefined) {
        updateData.title = title;
      }
      if (content !== undefined) {
        updateData.content = content;
      }
      if (categoryId !== undefined) {
        // 카테고리 존재 확인
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

        // 새 카테고리 작성 권한 체크
        if (!canCreatePostInCategory(category.allowedRoles, clubMember.role)) {
          return res.status(403).json({
            status: 403,
            message: '이 카테고리로 이동할 권한이 없습니다.',
          });
        }

        updateData.categoryId = categoryId;
      }

      const updatedPost = await prisma.post.update({
        where: {
          id: postId,
        },
        data: updateData,
        include: {
          category: true,
          author: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
          _count: {
            select: {
              comments: true,
            },
          },
        },
      });

      return res.status(200).json({
        data: updatedPost,
        status: 200,
        message: '게시글이 성공적으로 수정되었습니다.',
      });
    }

    // DELETE: 게시글 삭제 (soft delete)
    if (req.method === 'DELETE') {
      // 삭제 권한 체크
      if (!canEditPost(post.authorId, clubMember.id, typedClubMember)) {
        return res.status(403).json({
          status: 403,
          message: '게시글을 삭제할 권한이 없습니다.',
        });
      }

      await prisma.post.update({
        where: {
          id: postId,
        },
        data: {
          isDeleted: true,
        },
      });

      return res.status(200).json({
        data: post,
        status: 200,
        message: '게시글이 성공적으로 삭제되었습니다.',
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
