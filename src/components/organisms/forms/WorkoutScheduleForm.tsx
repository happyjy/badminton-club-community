import { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { z } from 'zod';

import { Button } from '@/components/atoms/buttons/Button';
import { Input } from '@/components/atoms/inputs/Input';
import { FormField } from '@/components/molecules/form/FormField';

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
  } | null;
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
          <FormField label="시작 날짜" error={errors.startDate?.message}>
            <Input id="startDate" type="date" {...register('startDate')} />
          </FormField>

          <FormField label="종료 날짜" error={errors.endDate?.message}>
            <Input id="endDate" type="date" {...register('endDate')} />
          </FormField>
        </div>

        {/* 평일 운동 시간 */}
        <div className="border-t border-border pt-4">
          <h3 className="mb-3 text-headline text-primary">평일 운동 시간</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="시작 시간"
              error={errors.weekdayStartTime?.message}
            >
              <Input
                id="weekdayStartTime"
                type="time"
                {...register('weekdayStartTime')}
              />
            </FormField>

            <FormField label="종료 시간" error={errors.weekdayEndTime?.message}>
              <Input
                id="weekdayEndTime"
                type="time"
                {...register('weekdayEndTime')}
              />
            </FormField>
          </div>
        </div>

        {/* 주말 운동 시간 */}
        <div className="border-t border-border pt-4">
          <h3 className="mb-3 text-headline text-primary">주말 운동 시간</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="시작 시간"
              error={errors.weekendStartTime?.message}
            >
              <Input
                id="weekendStartTime"
                type="time"
                {...register('weekendStartTime')}
              />
            </FormField>

            <FormField label="종료 시간" error={errors.weekendEndTime?.message}>
              <Input
                id="weekendEndTime"
                type="time"
                {...register('weekendEndTime')}
              />
            </FormField>
          </div>
        </div>

        {/* 장소 및 참여인원 */}
        <div className="border-t border-border pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="장소" error={errors.location?.message}>
              <Input
                id="location"
                {...register('location')}
                placeholder="예: 서울체육관 1코트"
              />
            </FormField>

            <FormField
              label="최대 참여 인원"
              error={errors.maxParticipants?.message}
            >
              <Input
                id="maxParticipants"
                type="number"
                min="1"
                {...register('maxParticipants', { valueAsNumber: true })}
              />
            </FormField>
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
