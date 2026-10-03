import { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import * as z from 'zod';

import { Button } from '@/components/atoms/buttons/Button';
import { Textarea } from '@/components/atoms/Textarea';
import { FormField } from '@/components/molecules/form/FormField';

const smsSettingsSchema = z.object({
  smsRecipients: z.string().min(1, '문자 수신자를 입력해주세요'),
});

type SmsSettingsFormData = z.infer<typeof smsSettingsSchema>;

interface SmsSettingsFormProps {
  clubId: string;
  initialData?: {
    smsRecipients: string;
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
      reset({
        smsRecipients: initialData.smsRecipients || '',
      });
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
        <FormField label="문자 수신자" error={errors.smsRecipients?.message}>
          <Textarea
            id="smsRecipients"
            {...register('smsRecipients')}
            minRows={4}
            placeholder="전화번호를 쉼표로 구분하여 입력하세요 (예: 010-1234-5678, 010-8765-4321)"
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

export default SmsSettingsForm;
