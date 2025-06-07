import { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import * as z from 'zod';

import { Textarea } from '@/components/atoms/Textarea';

const emailSettingsSchema = z.object({
  emailRecipients: z.string().min(1, '이메일 수신자를 입력해주세요'),
});

type EmailSettingsFormData = z.infer<typeof emailSettingsSchema>;

interface EmailSettingsFormProps {
  clubId: string;
  initialData?: {
    emailRecipients?: string | null;
  } | null;
}

function EmailSettingsForm({ clubId, initialData }: EmailSettingsFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EmailSettingsFormData>({
    resolver: zodResolver(emailSettingsSchema),
    defaultValues: {
      emailRecipients: initialData?.emailRecipients || '',
    },
  });

  // 초기 데이터 설정
  useEffect(() => {
    if (initialData) {
      reset(initialData);
    }
  }, [initialData, reset]);

  // 이메일 수신자 저장
  const onSubmit = async (data: EmailSettingsFormData) => {
    try {
      await axios.put(`/api/clubs/${clubId}/custom/email`, data);
      toast.success('설정이 저장되었습니다');
    } catch (error) {
      console.error('Error saving email settings:', error);
      toast.error('설정 저장에 실패했습니다');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label
          htmlFor="emailRecipients"
          className="block text-sm font-medium text-gray-700"
        >
          이메일 수신자
        </label>
        <Textarea
          id="emailRecipients"
          {...register('emailRecipients')}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          rows={4}
          placeholder="이메일 주소를 쉼표로 구분하여 입력하세요"
        />
        {errors.emailRecipients && (
          <p className="mt-1 text-sm text-red-600">
            {errors.emailRecipients.message}
          </p>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isSubmitting ? '저장 중...' : '저장하기'}
        </button>
      </div>
    </form>
  );
}

export default EmailSettingsForm;
