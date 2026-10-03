import { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import * as z from 'zod';

import { Button } from '@/components/atoms/buttons/Button';
import { Textarea } from '@/components/atoms/Textarea';
import { FormField } from '@/components/molecules/form/FormField';

const emailSettingsSchema = z.object({
  emailRecipients: z.string().min(1, '이메일 수신자를 입력해주세요'),
});

type EmailSettingsFormData = z.infer<typeof emailSettingsSchema>;

interface EmailSettingsFormProps {
  clubId: string;
  initialData?: {
    emailRecipients: string;
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
      reset({
        emailRecipients: initialData.emailRecipients || '',
      });
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
      <FormField label="이메일 수신자" error={errors.emailRecipients?.message}>
        <Textarea
          id="emailRecipients"
          {...register('emailRecipients')}
          rows={4}
          placeholder="이메일 주소를 쉼표로 구분하여 입력하세요"
        />
      </FormField>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? '저장 중...' : '저장하기'}
        </Button>
      </div>
    </form>
  );
}

export default EmailSettingsForm;
