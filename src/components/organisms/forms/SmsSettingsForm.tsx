import { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import * as z from 'zod';

import { Textarea } from '@/components/atoms/Textarea';

const smsSettingsSchema = z.object({
  smsRecipients: z.string().min(1, '문자 수신자를 입력해주세요'),
});

type SmsSettingsFormData = z.infer<typeof smsSettingsSchema>;

interface SmsSettingsFormProps {
  clubId: string;
  initialData?: {
    smsRecipients?: string | null;
  } | null;
}

function SmsSettingsForm({ clubId, initialData }: SmsSettingsFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SmsSettingsFormData>({
    resolver: zodResolver(smsSettingsSchema),
    defaultValues: {
      smsRecipients: initialData?.smsRecipients || '',
    },
  });

  // 초기 데이터 설정
  useEffect(() => {
    if (initialData) {
      reset(initialData);
    }
  }, [initialData, reset]);

  // 문자 발송 설정 저장
  const onSubmit = async (data: SmsSettingsFormData) => {
    try {
      await axios.put(`/api/clubs/${clubId}/custom/sms`, data);
      toast.success('설정이 저장되었습니다');
    } catch (error) {
      console.error('Error saving SMS settings:', error);
      toast.error('설정 저장에 실패했습니다');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label
            htmlFor="smsRecipients"
            className="block text-sm font-medium text-gray-700"
          >
            문자 수신자
          </label>
          <Textarea
            id="smsRecipients"
            {...register('smsRecipients')}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            rows={4}
            placeholder="전화번호를 쉼표로 구분하여 입력하세요 (예: 010-1234-5678, 010-8765-4321)"
          />
          {errors.smsRecipients && (
            <p className="mt-1 text-sm text-red-600">
              {errors.smsRecipients.message}
            </p>
          )}
        </div>
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

export default SmsSettingsForm;
