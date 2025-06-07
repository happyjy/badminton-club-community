import { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { z } from 'zod';

import { Button } from '@/components/atoms/buttons/Button';
import { Textarea } from '@/components/atoms/Textarea';

// 폼 데이터 스키마 정의
const guestPageSettingsSchema = z.object({
  inquiryDescription: z.string().min(1, '문의하기 설명을 입력해주세요'),
  guestDescription: z.string().min(1, '게스트 신청 설명을 입력해주세요'),
});

type GuestPageSettingsFormData = z.infer<typeof guestPageSettingsSchema>;

interface GuestPageSettingsFormProps {
  clubId: string;
  initialData?: {
    inquiryDescription?: string | null;
    guestDescription?: string | null;
  };
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
    reset({
      inquiryDescription: initialData?.inquiryDescription || '',
      guestDescription: initialData?.guestDescription || '',
    });
  }, [initialData, reset]);

  const onSubmit = async (data: GuestPageSettingsFormData) => {
    try {
      await axios.patch(`/api/clubs/${clubId}/custom-settings`, {
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
        <div>
          <label
            htmlFor="inquiryDescription"
            className="block text-sm font-medium text-gray-700"
          >
            문의하기 설명
          </label>
          <Textarea
            id="inquiryDescription"
            {...register('inquiryDescription')}
            placeholder="클럽 문의하기 페이지에 표시될 설명을 입력해주세요"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            minRows={3}
            maxRows={10}
          />
          {errors.inquiryDescription && (
            <p className="mt-1 text-sm text-red-600">
              {errors.inquiryDescription.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="guestDescription"
            className="block text-sm font-medium text-gray-700"
          >
            게스트 신청 설명
          </label>
          <Textarea
            id="guestDescription"
            {...register('guestDescription')}
            placeholder="게스트 신청 페이지에 표시될 설명을 입력해주세요"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            minRows={3}
            maxRows={10}
          />
          {errors.guestDescription && (
            <p className="mt-1 text-sm text-red-600">
              {errors.guestDescription.message}
            </p>
          )}
        </div>
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
