import { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import { ClubMember } from '@/types';
import { UpdatePostCommentRequest } from '@/types/board.types';
import { canEditPost } from '@/utils/boardPermissions';

export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse<{ status: number; message: string; data?: any }>
) {
  const { id: clubId, postId, commentId } = req.query;

  if (
    !clubId ||
    !postId ||
    !commentId ||
    typeof clubId !== 'string' ||
    typeof postId !== 'string' ||
    typeof commentId !== 'string'
  ) {
    return res.status(400).json({
      status: 400,
      message: '클럽 ID, 게시글 ID, 댓글 ID가 필요합니다.',
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

    // 댓글 존재 확인
    const comment = await prisma.postComment.findFirst({
      where: {
        id: commentId,
        postId,
      },
    });

    if (!comment) {
      return res.status(404).json({
        status: 404,
        message: '댓글을 찾을 수 없습니다.',
      });
    }

    // PUT: 댓글 수정
    if (req.method === 'PUT') {
      // 수정 권한 체크 (본인 또는 관리자)
      if (!comment.authorId) {
        return res.status(403).json({
          status: 403,
          message: '댓글 작성자 정보가 없습니다.',
        });
      }

      if (!canEditPost(comment.authorId, clubMember.id, typedClubMember)) {
        return res.status(403).json({
          status: 403,
          message: '댓글을 수정할 권한이 없습니다.',
        });
      }

      const { content }: UpdatePostCommentRequest = req.body;

      if (!content || content.trim() === '') {
        return res.status(400).json({
          status: 400,
          message: '댓글 내용이 필요합니다.',
        });
      }

      const updatedComment = await prisma.postComment.update({
        where: {
          id: commentId,
        },
        data: {
          content: content.trim(),
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

      return res.status(200).json({
        status: 200,
        message: '댓글이 성공적으로 수정되었습니다.',
        data: updatedComment,
      });
    }

    // DELETE: 댓글 삭제 (soft delete)
    if (req.method === 'DELETE') {
      // 삭제 권한 체크 (본인 또는 관리자)
      if (!comment.authorId) {
        return res.status(403).json({
          status: 403,
          message: '댓글 작성자 정보가 없습니다.',
        });
      }

      if (!canEditPost(comment.authorId, clubMember.id, typedClubMember)) {
        return res.status(403).json({
          status: 403,
          message: '댓글을 삭제할 권한이 없습니다.',
        });
      }

      // 대댓글이 있는 경우 soft delete만 수행
      const childCount = await prisma.postComment.count({
        where: {
          parentId: commentId,
          isDeleted: false,
        },
      });

      if (childCount > 0) {
        // 대댓글이 있으면 soft delete만
        await prisma.postComment.update({
          where: {
            id: commentId,
          },
          data: {
            isDeleted: true,
            content: '삭제된 댓글입니다.',
          },
        });
      } else {
        // 대댓글이 없으면 완전 삭제
        await prisma.postComment.delete({
          where: {
            id: commentId,
          },
        });
      }

      return res.status(200).json({
        status: 200,
        message: '댓글이 성공적으로 삭제되었습니다.',
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
