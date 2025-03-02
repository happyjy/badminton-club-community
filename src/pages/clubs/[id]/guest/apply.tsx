import { useState } from 'react';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Input } from '@/components/atoms/inputs/Input';
import { Label } from '@/components/atoms/labels/Label';
import { PhoneInputGroup } from '@/components/molecules/form/PhoneInputGroup';
import { FormField } from '@/components/molecules/form/FormField';

type FormValues = {
  name: string;
  phoneNumber: string;
  message: string;
};

export default function GuestApplyPage() {
  const router = useRouter();
  const { id: clubId } = router.query;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>();

  const onSubmit = async (data: FormValues) => {
    if (!clubId) return;

    setIsSubmitting(true);
    try {
      await axios.post(`/api/clubs/${clubId}/guests/apply`, data);
      toast.success('게스트 신청이 완료되었습니다');
      router.push(`/clubs/${clubId}/guest`);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || '신청 중 오류가 발생했습니다'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">게스트 신청</h1>

      <form onSubmit={handleSubmit(onSubmit)}>
        <FormField className="mb-4">
          <Label htmlFor="name">이름</Label>
          <Input
            id="name"
            {...register('name', { required: '이름은 필수입니다' })}
            placeholder="이름을 입력하세요"
            error={errors.name?.message}
          />
        </FormField>

        <FormField className="mb-4">
          <Label htmlFor="phoneNumber">연락처</Label>
          <PhoneInputGroup
            id="phoneNumber"
            {...register('phoneNumber', {
              required: '연락처는 필수입니다',
              pattern: {
                value: /^01([0|1|6|7|8|9])-?([0-9]{3,4})-?([0-9]{4})$/,
                message: '올바른 휴대폰 번호를 입력해주세요',
              },
            })}
            placeholder="010-0000-0000"
            error={errors.phoneNumber?.message}
          />
        </FormField>

        <FormField className="mb-6">
          <Label htmlFor="message">신청 메시지</Label>
          <textarea
            id="message"
            {...register('message')}
            className="w-full p-2 border rounded-md"
            rows={4}
            placeholder="신청 메시지를 입력하세요"
          />
        </FormField>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isSubmitting ? '신청 중...' : '게스트 신청하기'}
        </button>
      </form>
    </div>
  );
}
