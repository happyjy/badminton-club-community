import {
  ClubAuthError,
  requireClubAdmin,
  requireClubMember,
} from '@/lib/clubAuth';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import { toWorkoutDateTime } from '@/lib/workout/datetime';
import { resolveParkingCapacity } from '@/lib/workout/parkingCapacity';
import { validateWorkoutUpdate } from '@/lib/workout/validation';
import { Workout, ApiResponse } from '@/types';
import { ParkingRequestListItem } from '@/types/parking.types';

import type { NextApiRequest, NextApiResponse } from 'next';

// 운동 상세 정보 api (GET) / 수정·삭제 api (PATCH, DELETE)
export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse<ApiResponse<'workout', Workout>>
) {
  const { workoutId } = req.query;
  const workoutIdNum = Number(workoutId);

  if (!Number.isInteger(workoutIdNum) || workoutIdNum <= 0) {
    return res.status(400).json({
      error: '잘못된 workout ID입니다',
      status: 400,
    });
  }

  if (req.method === 'PATCH') {
    return handleUpdate(req, res, workoutIdNum);
  }
  if (req.method === 'DELETE') {
    return handleDelete(req, res, workoutIdNum);
  }
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: '허용되지 않는 메소드입니다',
      status: 405,
    });
  }

  try {
    const workout = await prisma.workout.findUnique({
      where: {
        id: workoutIdNum,
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
                    workoutId: workoutIdNum,
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

    // 운동이 속한 클럽의 승인된 회원만 상세 정보를 볼 수 있다.
    // clubId는 요청자가 아니라 조회된 workout에서 가져와야 권한 검사가 의미가 있다.
    if (workout.clubId) {
      await requireClubMember(req.user.id, workout.clubId);
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
        intendToJoin: true,
        clubMember: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // 클럽이 주차 신청을 쓰는지, 쓴다면 명단과 현황을 함께 내려준다
    const parkingSettings = workout.clubId
      ? await prisma.clubCustomSettings.findUnique({
          where: { clubId: workout.clubId },
          select: {
            parkingEnabled: true,
            parkingWeekdayCapacity: true,
            parkingWeekendCapacity: true,
          },
        })
      : null;

    const parkingEnabled = Boolean(parkingSettings?.parkingEnabled);

    const parkingRequests = parkingEnabled
      ? await prisma.parkingRequest.findMany({
          where: { workoutId: workoutIdNum },
          select: {
            id: true,
            clubMemberId: true,
            status: true,
            position: true,
            clubMember: { select: { name: true } },
          },
          orderBy: [{ position: 'asc' }, { id: 'asc' }],
        })
      : [];

    const formattedParkingRequests: ParkingRequestListItem[] =
      parkingRequests.map((request) => ({
        id: request.id,
        clubMemberId: request.clubMemberId,
        name: request.clubMember?.name ?? '이름 없음',
        status: request.status as 'CONFIRMED' | 'WAITLIST',
        position: request.position,
      }));

    const confirmedCount = formattedParkingRequests.filter(
      (r) => r.status === 'CONFIRMED'
    ).length;
    const waitlistCount = formattedParkingRequests.filter(
      (r) => r.status === 'WAITLIST'
    ).length;

    const parking = {
      enabled: parkingEnabled,
      capacity: parkingSettings
        ? resolveParkingCapacity(workout, parkingSettings)
        : 0,
      confirmedCount,
      waitlistCount,
      overrideCapacity: workout.parkingCapacity,
      // 이 API는 관리자 명단용이라 로그인 본인 상태는 계산하지 않는다 (목록 API가 담당)
      myStatus: 'NONE' as const,
      myWaitlistOrder: null,
    };

    const formattedWorkout = {
      ...workout,
      WorkoutParticipant: workout.WorkoutParticipant.map((participant) => ({
        ...participant,
        clubMember: participant.clubMember || undefined,
      })),
      guests,
      guestCount: guests.length,
      parking,
      parkingRequests: formattedParkingRequests,
    } as Workout;

    return res.status(200).json({
      data: { workout: formattedWorkout },
      status: 200,
      message: '운동 정보를 성공적으로 가져왔습니다',
    });
  } catch (error) {
    if (error instanceof ClubAuthError) {
      return res.status(error.status).json({
        error: error.message,
        status: error.status,
      });
    }
    console.error('운동 상세 정보 조회 중 오류 발생:', error);
    return res.status(500).json({
      error: '운동 정보를 가져오는데 실패했습니다',
      status: 500,
    });
  } finally {
    // no-op
  }
});

/**
 * 운동 일정 수정. 클럽 임원(ADMIN)만 가능하다.
 * clubId는 요청 본문이 아니라 DB의 workout.clubId에서 읽어 권한을 검증한다.
 */
async function handleUpdate(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse<ApiResponse<'workout', Workout>>,
  workoutId: number
) {
  try {
    const workout = await prisma.workout.findUnique({
      where: { id: workoutId },
      select: {
        clubId: true,
        _count: { select: { WorkoutParticipant: true } },
      },
    });

    if (!workout) {
      return res.status(404).json({
        error: '운동을 찾을 수 없습니다',
        status: 404,
      });
    }
    if (!workout.clubId) {
      return res.status(400).json({
        error: '클럽에 속하지 않은 운동입니다',
        status: 400,
      });
    }

    await requireClubAdmin(req.user.id, workout.clubId);

    const input = {
      title: String(req.body?.title ?? ''),
      description: String(req.body?.description ?? ''),
      date: String(req.body?.date ?? ''),
      startTime: String(req.body?.startTime ?? ''),
      endTime: String(req.body?.endTime ?? ''),
      location: String(req.body?.location ?? ''),
      maxParticipants: Number(req.body?.maxParticipants),
    };

    const validation = validateWorkoutUpdate(
      input,
      workout._count.WorkoutParticipant
    );
    if (!validation.ok) {
      return res.status(400).json({
        error: validation.error,
        status: 400,
      });
    }

    const updated = await prisma.workout.update({
      where: { id: workoutId },
      data: {
        title: input.title.trim(),
        description: input.description.trim(),
        date: toWorkoutDateTime(input.date, '00:00'),
        startTime: toWorkoutDateTime(input.date, input.startTime),
        endTime: toWorkoutDateTime(input.date, input.endTime),
        location: input.location.trim(),
        maxParticipants: input.maxParticipants,
        updatedAt: new Date(),
      },
    });

    return res.status(200).json({
      data: { workout: updated as Workout },
      status: 200,
      message: '운동 일정을 수정했습니다',
    });
  } catch (error) {
    if (error instanceof ClubAuthError) {
      return res.status(error.status).json({
        error: error.message,
        status: error.status,
      });
    }
    console.error('운동 일정 수정 중 오류 발생:', error);
    return res.status(500).json({
      error: '운동 일정 수정에 실패했습니다',
      status: 500,
    });
  }
}

/**
 * 운동 일정 삭제. 클럽 임원(ADMIN)만 가능하다.
 * Workout에는 cascade 설정이 없으므로 참여·헬퍼 기록을 트랜잭션으로 함께 정리한다.
 */
async function handleDelete(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse<ApiResponse<'workout', Workout>>,
  workoutId: number
) {
  try {
    const workout = await prisma.workout.findUnique({
      where: { id: workoutId },
      select: { clubId: true },
    });

    if (!workout) {
      return res.status(404).json({
        error: '운동을 찾을 수 없습니다',
        status: 404,
      });
    }
    if (!workout.clubId) {
      return res.status(400).json({
        error: '클럽에 속하지 않은 운동입니다',
        status: 400,
      });
    }

    await requireClubAdmin(req.user.id, workout.clubId);

    await prisma.$transaction([
      prisma.workoutHelperStatus.deleteMany({ where: { workoutId } }),
      prisma.workoutParticipant.deleteMany({ where: { workoutId } }),
      prisma.workout.delete({ where: { id: workoutId } }),
    ]);

    return res.status(200).json({
      data: { workout: { id: workoutId } as Workout },
      status: 200,
      message: '운동 일정을 삭제했습니다',
    });
  } catch (error) {
    if (error instanceof ClubAuthError) {
      return res.status(error.status).json({
        error: error.message,
        status: error.status,
      });
    }
    console.error('운동 일정 삭제 중 오류 발생:', error);
    return res.status(500).json({
      error: '운동 일정 삭제에 실패했습니다',
      status: 500,
    });
  }
}
