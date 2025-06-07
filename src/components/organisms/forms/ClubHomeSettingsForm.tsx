import { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';

import { Button } from '@/components/atoms/buttons/Button';
import { Input } from '@/components/atoms/inputs/Input';
import { Textarea } from '@/components/atoms/Textarea';

const schema = z.object({
  clubOperatingTime: z.string().min(1, '운영 시간을 입력해주세요'),
  clubLocation: z.string().min(1, '장소를 입력해주세요'),
  clubDescription: z.string().min(1, '설명을 입력해주세요'),
});

type FormData = z.infer<typeof schema>;

interface ClubHomeSettingsFormProps {
  clubId: string;
  initialData?: {
    clubOperatingTime?: string;
    clubLocation?: string;
    clubDescription?: string;
  };
}

export function ClubHomeSettingsForm({
  clubId,
  initialData,
}: ClubHomeSettingsFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: initialData,
  });

  useEffect(() => {
    if (initialData) {
      reset(initialData);
    }
  }, [initialData, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      const response = await fetch(`/api/clubs/${clubId}/custom/home`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('설정 저장에 실패했습니다');
      }

      toast.success('클럽 홈 설정이 저장되었습니다');
    } catch (error) {
      console.error('Error saving club home settings:', error);
      toast.error('설정 저장에 실패했습니다');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label
            htmlFor="clubOperatingTime"
            className="block text-sm font-medium text-gray-700"
          >
            운영 시간
          </label>
          <Input
            id="clubOperatingTime"
            {...register('clubOperatingTime')}
            className="mt-1"
          />
          {errors.clubOperatingTime && (
            <p className="mt-1 text-sm text-red-600">
              {errors.clubOperatingTime.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="clubLocation"
            className="block text-sm font-medium text-gray-700"
          >
            장소
          </label>
          <Input
            id="clubLocation"
            {...register('clubLocation')}
            className="mt-1"
          />
          {errors.clubLocation && (
            <p className="mt-1 text-sm text-red-600">
              {errors.clubLocation.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="clubDescription"
            className="block text-sm font-medium text-gray-700"
          >
            설명
          </label>
          <Textarea
            id="clubDescription"
            {...register('clubDescription')}
            className="mt-1"
            rows={4}
          />
          {errors.clubDescription && (
            <p className="mt-1 text-sm text-red-600">
              {errors.clubDescription.message}
            </p>
          )}
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? '저장 중...' : '저장'}
      </Button>
    </form>
  );
}
