import { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { z } from 'zod';

import { Button } from '@/components/atoms/buttons/Button';
import { Textarea } from '@/components/atoms/Textarea';
import { FormField } from '@/components/molecules/form/FormField';

// 폼 데이터 스키마 정의
const guestPageSettingsSchema = z.object({
  inquiryDescription: z.string().min(1, '문의하기 설명을 입력해주세요'),
  guestDescription: z.string().min(1, '게스트 신청 설명을 입력해주세요'),
});

type GuestPageSettingsFormData = z.infer<typeof guestPageSettingsSchema>;

interface GuestPageSettingsFormProps {
  clubId: string;
  initialData?: {
    inquiryDescription: string;
    guestDescription: string;
  } | null;
}

function GuestPageSettingsForm({
  clubId,
  initialData,
}: GuestPageSettingsFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GuestPageSettingsFormData>({
    resolver: zodResolver(guestPageSettingsSchema),
    defaultValues: {
      inquiryDescription: '',
      guestDescription: '',
    },
  });

  useEffect(() => {
    if (!initialData) {
      return;
    }

    reset({
      inquiryDescription: initialData.inquiryDescription || '',
      guestDescription: initialData.guestDescription || '',
    });
  }, [initialData, reset]);

  const onSubmit = async (data: GuestPageSettingsFormData) => {
    try {
      await axios.patch(`/api/clubs/${clubId}/custom/guest-page`, {
        inquiryDescription: data.inquiryDescription,
        guestDescription: data.guestDescription,
      });

      toast.success('설정이 저장되었습니다');
    } catch (error) {
      console.error('설정 저장 실패:', error);
      toast.error('설정 저장에 실패했습니다');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <FormField
          label="문의하기 설명"
          error={errors.inquiryDescription?.message}
        >
          <Textarea
            id="inquiryDescription"
            {...register('inquiryDescription')}
            placeholder="클럽 문의하기 페이지에 표시될 설명을 입력해주세요"
            minRows={3}
            maxRows={10}
          />
        </FormField>

        <FormField
          label="게스트 신청 설명"
          error={errors.guestDescription?.message}
        >
          <Textarea
            id="guestDescription"
            {...register('guestDescription')}
            placeholder="게스트 신청 페이지에 표시될 설명을 입력해주세요"
            minRows={3}
            maxRows={10}
          />
        </FormField>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? '저장 중...' : '저장하기'}
        </Button>
      </div>
    </form>
  );
}

export default GuestPageSettingsForm;
