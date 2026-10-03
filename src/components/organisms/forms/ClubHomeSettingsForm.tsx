import { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { z } from 'zod';

import { Button } from '@/components/atoms/buttons/Button';
import { Input } from '@/components/atoms/inputs/Input';
import { Textarea } from '@/components/atoms/Textarea';
import { FormField } from '@/components/molecules/form/FormField';

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

function ClubHomeSettingsForm({
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

  // 초기 데이터 설정
  useEffect(() => {
    if (initialData) {
      reset(initialData);
    }
  }, [initialData, reset]);

  // 클럽 홈 설정 저장
  const onSubmit = async (data: FormData) => {
    try {
      await axios.put(`/api/clubs/${clubId}/custom/home`, data);
      toast.success('클럽 홈 설정이 저장되었습니다');
    } catch (error) {
      console.error('Error saving club home settings:', error);
      toast.error('설정 저장에 실패했습니다');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <FormField label="운영 시간" error={errors.clubOperatingTime?.message}>
          <Textarea
            id="clubOperatingTime"
            {...register('clubOperatingTime')}
            rows={3}
            placeholder="예시:&#10;평일: 18:00 - 22:00&#10;주말: 10:00 - 18:00"
          />
        </FormField>

        <FormField label="장소" error={errors.clubLocation?.message}>
          <Input id="clubLocation" {...register('clubLocation')} />
        </FormField>

        <FormField label="설명" error={errors.clubDescription?.message}>
          <Textarea
            id="clubDescription"
            {...register('clubDescription')}
            rows={4}
          />
        </FormField>
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? '저장 중...' : '저장'}
      </Button>
    </form>
  );
}

export default ClubHomeSettingsForm;
