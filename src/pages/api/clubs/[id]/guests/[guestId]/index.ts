import { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';

// 게스트 신청 게시글 조회, 생성, 수정, 삭제 API
export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse
) {
  const { id: clubId, guestId } = req.query;

  if (
    !clubId ||
    !guestId ||
    typeof clubId !== 'string' ||
    typeof guestId !== 'string'
  ) {
    return res.status(400).json({ message: '올바르지 않은 요청입니다' });
  }

  // 먼저 요청한 게스트 신청 글이 존재하는지 확인
  const guestPost = await prisma.guestPost.findUnique({
    where: {
      id: guestId,
    },
  });

  if (!guestPost) {
    return res.status(404).json({ message: '게스트 신청을 찾을 수 없습니다' });
  }

  // HTTP 메서드에 따라 처리
  switch (req.method) {
    // 게스트 신청 게시글 조회
    case 'GET':
      try {
        // 게스트 신청과 댓글 목록을 함께 조회
        const [guestPostWithDetails, comments] = await Promise.all([
          prisma.guestPost.findUnique({
            where: { id: guestId },
            include: {
              user: {
                select: {
                  id: true,
                  nickname: true,
                  thumbnailImageUrl: true,
                },
              },
              clubMember: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          }),
          prisma.guestComment.findMany({
            where: {
              postId: guestId,
              isDeleted: false,
            },
            include: {
              user: {
                select: {
                  id: true,
                  nickname: true,
                },
              },
              clubMember: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: {
              createdAt: 'asc',
            },
          }),
        ]);

        // 댓글 데이터 포맷팅
        const formattedComments = comments.map((comment) => ({
          id: comment.id,
          content: comment.content,
          createdAt: comment.createdAt.toISOString(),
          author: comment.user
            ? {
                id: comment.user.id,
                name: comment.user.nickname,
              }
            : comment.clubMember
              ? {
                  id: comment.clubMember.id,
                  name: comment.clubMember.name,
                }
              : null,
          isDeleted: comment.isDeleted,
        }));

        return res.status(200).json({
          message: '게스트 신청 조회 성공',
          data: {
            guestPost: guestPostWithDetails,
            comments: formattedComments,
          },
        });
      } catch (error) {
        console.error('게스트 신청 조회 실패:', error);
        return res.status(500).json({ message: '서버 오류가 발생했습니다' });
      }

    // 수정된 게스트 신청 정보 업데이트
    case 'PUT':
      try {
        // 해당 게시물의 작성자인지 확인
        if (guestPost.userId !== req.user.id) {
          return res
            .status(403)
            .json({ message: '본인의 게시물만 수정할 수 있습니다' });
        }

        const {
          name,
          birthDate,
          phoneNumber,
          gender,
          localTournamentLevel,
          nationalTournamentLevel,
          lessonPeriod,
          playingPeriod,
          intendToJoin,
          message,
          visitDate,
          postType,
        } = req.body;

        const updatedGuestPost = await prisma.guestPost.update({
          where: {
            id: guestId,
          },
          data: {
            name: name || guestPost.name,
            birthDate: birthDate || guestPost.birthDate,
            phoneNumber: phoneNumber || guestPost.phoneNumber,
            gender: gender || guestPost.gender,
            localTournamentLevel:
              localTournamentLevel || guestPost.localTournamentLevel,
            nationalTournamentLevel:
              nationalTournamentLevel || guestPost.nationalTournamentLevel,
            lessonPeriod: lessonPeriod || guestPost.lessonPeriod,
            playingPeriod: playingPeriod || guestPost.playingPeriod,
            intendToJoin:
              intendToJoin !== undefined
                ? intendToJoin
                : guestPost.intendToJoin,
            message: message || guestPost.message,
            visitDate: visitDate || guestPost.visitDate,
            postType: postType || guestPost.postType,
            updatedBy: req.user.id,
            updatedAt: new Date(),
          },
        });

        return res.status(200).json({
          message: '게스트 신청이 수정되었습니다',
          data: { guestPost: updatedGuestPost },
        });
      } catch (error) {
        console.error('게스트 신청 수정 실패:', error);
        return res.status(500).json({ message: '서버 오류가 발생했습니다' });
      }

    // 게스트 신청 삭제
    case 'DELETE':
      try {
        // 해당 게시물의 작성자인지 확인
        if (guestPost.userId !== req.user.id) {
          return res
            .status(403)
            .json({ message: '본인의 게시물만 삭제할 수 있습니다' });
        }

        await prisma.guestPost.delete({
          where: {
            id: guestId,
          },
        });

        return res
          .status(200)
          .json({ message: '게스트 신청이 삭제되었습니다' });
      } catch (error) {
        console.error('게스트 신청 삭제 실패:', error);
        return res.status(500).json({ message: '서버 오류가 발생했습니다' });
      }

    default:
      return res
        .status(405)
        .json({ message: '허용되지 않는 요청 메서드입니다' });
  }
});
