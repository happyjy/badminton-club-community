import { PrismaClient } from '@prisma/client';

import { Workout, ApiResponse } from '@/types';

import type { NextApiRequest, NextApiResponse } from 'next';

// 운동 상세 정보 api
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<'workout', Workout>>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: '허용되지 않는 메소드입니다',
      status: 405,
    });
  }

  const { id } = req.query;
  const workoutId = Number(id);
  const prisma = new PrismaClient();

  try {
    const workout = await prisma.workout.findUnique({
      where: {
        id: workoutId,
      },
      include: {
        // helperStatuses: true, // WorkoutHelperStatus 전체가 조회 됨
        WorkoutParticipant: {
          include: {
            User: {
              select: {
                id: true,
                nickname: true,
                thumbnailImageUrl: true,
              },
            },
            clubMember: {
              include: {
                helperStatuses: {
                  where: {
                    workoutId,
                  },
                  orderBy: {
                    createdAt: 'asc',
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!workout) {
      return res.status(404).json({
        error: '운동을 찾을 수 없습니다',
        status: 404,
      });
    }

    // 운동 날짜 형식 변환 (YYYY-MM-DD 형식으로)
    const workoutDate = new Date(workout.date).toISOString().split('T')[0];

    // 방문 희망일이 운동 날짜와 일치하는 승인된 게스트 목록 가져오기
    const guests = await prisma.guestPost.findMany({
      where: {
        clubId: workout.clubId || undefined, // review: jyoon - 없어도 되지 않나?
        status: 'APPROVED',
        visitDate: workoutDate,
      },
      select: {
        id: true,
        name: true,
        userId: true,
        gender: true,
        birthDate: true,
        localTournamentLevel: true,
        nationalTournamentLevel: true,
        user: {
          select: {
            id: true,
            nickname: true,
            thumbnailImageUrl: true,
          },
        },
      },
    });

    const formattedWorkout = {
      ...workout,
      WorkoutParticipant: workout.WorkoutParticipant.map((participant) => ({
        ...participant,
        clubMember: participant.clubMember || undefined,
      })),
      guests,
      guestCount: guests.length,
    } as Workout;

    return res.status(200).json({
      data: { workout: formattedWorkout },
      status: 200,
      message: '운동 정보를 성공적으로 가져왔습니다',
    });
  } catch (error) {
    console.error('운동 상세 정보 조회 중 오류 발생:', error);
    return res.status(500).json({
      error: '운동 정보를 가져오는데 실패했습니다',
      status: 500,
    });
  } finally {
    await prisma.$disconnect();
  }
}
