import { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';

interface WorkoutScheduleRequest {
  startDate: string;
  endDate: string;
  weekdayStartTime: string;
  weekdayEndTime: string;
  weekendStartTime: string;
  weekendEndTime: string;
  location: string;
  maxParticipants: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { id: clubId } = req.query;
    const {
      startDate,
      endDate,
      weekdayStartTime,
      weekdayEndTime,
      weekendStartTime,
      weekendEndTime,
      location,
      maxParticipants,
    }: WorkoutScheduleRequest = req.body;

    // 입력값 검증
    if (!clubId || !startDate || !endDate || !location || !maxParticipants) {
      return res.status(400).json({ message: '필수 입력값이 누락되었습니다' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      return res
        .status(400)
        .json({ message: '종료 날짜는 시작 날짜보다 이후여야 합니다' });
    }

    // 운동 일정 생성 로직
    const workouts = [];
    const currentDate = new Date(start);

    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay(); // 0: 일요일, 1: 월요일, ..., 6: 토요일
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // 일요일 또는 토요일

      let startTime: string;
      let endTime: string;

      if (isWeekend) {
        startTime = weekendStartTime;
        endTime = weekendEndTime;
      } else {
        startTime = weekdayStartTime;
        endTime = weekdayEndTime;
      }

      // 해당 날짜의 시작 시간과 종료 시간을 결합
      const workoutDate = new Date(currentDate);
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);

      const workoutStartTime = new Date(workoutDate);
      workoutStartTime.setHours(startHour, startMinute, 0, 0);

      const workoutEndTime = new Date(workoutDate);
      workoutEndTime.setHours(endHour, endMinute, 0, 0);

      // 운동 일정 생성
      const workout = await prisma.workout.create({
        data: {
          title: `${workoutDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} 운동`,
          description: `${isWeekend ? '주말' : '평일'} 운동`,
          date: workoutDate,
          startTime: workoutStartTime,
          endTime: workoutEndTime,
          maxParticipants,
          location,
          updatedAt: new Date(),
          clubId: Number(clubId),
        },
      });

      workouts.push(workout);

      // 다음 날로 이동
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return res.status(201).json({
      message: '운동 일정이 성공적으로 생성되었습니다',
      count: workouts.length,
      workouts,
    });
  } catch (error) {
    console.error('Error creating workout schedule:', error);
    return res
      .status(500)
      .json({ message: '운동 일정 생성 중 오류가 발생했습니다' });
  }
}
