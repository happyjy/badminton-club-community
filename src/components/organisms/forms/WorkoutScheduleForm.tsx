import { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { z } from 'zod';

import { Button } from '@/components/atoms/buttons/Button';
import { Input } from '@/components/atoms/inputs/Input';

const schema = z
  .object({
    startDate: z.string().min(1, '시작 날짜를 선택해주세요'),
    endDate: z.string().min(1, '종료 날짜를 선택해주세요'),
    weekdayStartTime: z.string().min(1, '평일 시작 시간을 입력해주세요'),
    weekdayEndTime: z.string().min(1, '평일 종료 시간을 입력해주세요'),
    weekendStartTime: z.string().min(1, '주말 시작 시간을 입력해주세요'),
    weekendEndTime: z.string().min(1, '주말 종료 시간을 입력해주세요'),
    location: z.string().min(1, '장소를 입력해주세요'),
    maxParticipants: z.number().min(1, '참여 인원을 입력해주세요'),
  })
  .refine(
    (data) => {
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);
      return startDate <= endDate;
    },
    {
      message: '종료 날짜는 시작 날짜보다 이후여야 합니다',
      path: ['endDate'],
    }
  );

type FormData = z.infer<typeof schema>;

interface WorkoutScheduleFormProps {
  clubId: string;
  initialData?: {
    startDate: string;
    endDate: string;
    weekdayStartTime: string;
    weekdayEndTime: string;
    weekendStartTime: string;
    weekendEndTime: string;
    location: string;
    maxParticipants: number;
  };
}

function WorkoutScheduleForm({
  clubId,
  initialData,
}: WorkoutScheduleFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: initialData || {
      startDate: '',
      endDate: '',
      weekdayStartTime: '',
      weekdayEndTime: '',
      weekendStartTime: '',
      weekendEndTime: '',
      location: '',
      maxParticipants: 10,
    },
  });

  // 초기 데이터 설정
  useEffect(() => {
    if (initialData) {
      reset(initialData);
    }
  }, [initialData, reset]);

  // 운동 일정 생성
  const onSubmit = async (data: FormData) => {
    try {
      await axios.post(`/api/clubs/${clubId}/workouts/schedule`, data);
      toast.success('운동 일정이 생성되었습니다');
    } catch (error) {
      console.error('Error creating workout schedule:', error);
      toast.error('운동 일정 생성에 실패했습니다');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        {/* 날짜 범위 설정 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="startDate"
              className="block text-sm font-medium text-gray-700"
            >
              시작 날짜
            </label>
            <Input
              id="startDate"
              type="date"
              {...register('startDate')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            {errors.startDate && (
              <p className="mt-1 text-sm text-red-600">
                {errors.startDate.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="endDate"
              className="block text-sm font-medium text-gray-700"
            >
              종료 날짜
            </label>
            <Input
              id="endDate"
              type="date"
              {...register('endDate')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            {errors.endDate && (
              <p className="mt-1 text-sm text-red-600">
                {errors.endDate.message}
              </p>
            )}
          </div>
        </div>

        {/* 평일 운동 시간 */}
        <div className="border-t pt-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            평일 운동 시간
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="weekdayStartTime"
                className="block text-sm font-medium text-gray-700"
              >
                시작 시간
              </label>
              <Input
                id="weekdayStartTime"
                type="time"
                {...register('weekdayStartTime')}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              {errors.weekdayStartTime && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.weekdayStartTime.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="weekdayEndTime"
                className="block text-sm font-medium text-gray-700"
              >
                종료 시간
              </label>
              <Input
                id="weekdayEndTime"
                type="time"
                {...register('weekdayEndTime')}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              {errors.weekdayEndTime && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.weekdayEndTime.message}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 주말 운동 시간 */}
        <div className="border-t pt-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            주말 운동 시간
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="weekendStartTime"
                className="block text-sm font-medium text-gray-700"
              >
                시작 시간
              </label>
              <Input
                id="weekendStartTime"
                type="time"
                {...register('weekendStartTime')}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              {errors.weekendStartTime && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.weekendStartTime.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="weekendEndTime"
                className="block text-sm font-medium text-gray-700"
              >
                종료 시간
              </label>
              <Input
                id="weekendEndTime"
                type="time"
                {...register('weekendEndTime')}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              {errors.weekendEndTime && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.weekendEndTime.message}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 장소 및 참여인원 */}
        <div className="border-t pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="location"
                className="block text-sm font-medium text-gray-700"
              >
                장소
              </label>
              <Input
                id="location"
                {...register('location')}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="예: 서울체육관 1코트"
              />
              {errors.location && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.location.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="maxParticipants"
                className="block text-sm font-medium text-gray-700"
              >
                최대 참여 인원
              </label>
              <Input
                id="maxParticipants"
                type="number"
                min="1"
                {...register('maxParticipants', { valueAsNumber: true })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              {errors.maxParticipants && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.maxParticipants.message}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? '일정 생성 중...' : '운동 일정 생성'}
      </Button>
    </form>
  );
}

export default WorkoutScheduleForm;
