import { NextApiRequest, NextApiResponse } from 'next';

import { PrismaClient } from '@prisma/client';
import { withAuth } from '@/lib/session';
import {
  PostCommentListResponse,
  CreatePostCommentRequest,
} from '@/types/board.types';
import { canEditPost } from '@/utils/boardPermissions';
import { ClubMember } from '@/types';

const prisma = new PrismaClient();

export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse<PostCommentListResponse | { status: number; message: string; data?: any }>
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
        isDeleted: false,
      },
    });

    if (!post) {
      return res.status(404).json({
        status: 404,
        message: '게시글을 찾을 수 없습니다.',
      });
    }

    // GET: 댓글 목록 조회
    if (req.method === 'GET') {
      // 부모 댓글만 먼저 조회 (parentId가 null인 댓글)
      const parentComments = await prisma.postComment.findMany({
        where: {
          postId,
          parentId: null,
          isDeleted: false,
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      // 각 부모 댓글의 대댓글 조회
      const commentsWithChildren = await Promise.all(
        parentComments.map(async (parent) => {
          const children = await prisma.postComment.findMany({
            where: {
              parentId: parent.id,
              isDeleted: false,
            },
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  role: true,
                },
              },
            },
            orderBy: {
              createdAt: 'asc',
            },
          });

          return {
            ...parent,
            children,
          };
        })
      );

      return res.status(200).json({
        data: commentsWithChildren,
        status: 200,
        message: '댓글 목록을 성공적으로 조회했습니다.',
      });
    }

    // POST: 댓글 작성
    if (req.method === 'POST') {
      const { content, parentId }: CreatePostCommentRequest = req.body;

      if (!content || content.trim() === '') {
        return res.status(400).json({
          status: 400,
          message: '댓글 내용이 필요합니다.',
        });
      }

      // 대댓글인 경우 부모 댓글 확인
      if (parentId) {
        const parentComment = await prisma.postComment.findFirst({
          where: {
            id: parentId,
            postId,
            isDeleted: false,
          },
        });

        if (!parentComment) {
          return res.status(404).json({
            status: 404,
            message: '부모 댓글을 찾을 수 없습니다.',
          });
        }
      }

      const comment = await prisma.postComment.create({
        data: {
          postId,
          authorId: clubMember.id,
          content: content.trim(),
          parentId: parentId || null,
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
      });

      return res.status(201).json({
        data: [comment],
        status: 201,
        message: '댓글이 성공적으로 작성되었습니다.',
      });
    }

    return res.status(405).json({
      status: 405,
      message: '허용되지 않는 메서드입니다.',
    });
  } catch (error) {
    console.error('댓글 API 오류:', error);
    return res.status(500).json({
      status: 500,
      message: '서버 오류가 발생했습니다.',
    });
  }
});
