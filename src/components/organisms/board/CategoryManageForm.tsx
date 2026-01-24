import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { z } from 'zod';

import { Button } from '@/components/atoms/buttons/Button';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { PostCategoryWithRelations } from '@/types/board.types';

const categorySchema = z.object({
  name: z.string().min(1, '카테고리 이름을 입력해주세요'),
  description: z.string().optional(),
  allowedRoles: z.array(z.string()).min(1, '최소 하나의 역할을 선택해주세요'),
  order: z.number().optional(),
  isActive: z.boolean().optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryManageFormProps {
  clubId: string;
  category?: PostCategoryWithRelations;
  onSuccess: () => void;
  onCancel: () => void;
}

function CategoryManageForm({
  clubId,
  category,
  onSuccess,
  onCancel,
}: CategoryManageFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name || '',
      description: category?.description || '',
      allowedRoles: category?.allowedRoles || ['MEMBER', 'ADMIN'],
      order: category?.order,
      isActive: category?.isActive ?? true,
    },
  });

  const allowedRoles = watch('allowedRoles') || [];

  const onToggleRole = (role: string) => {
    const currentRoles = allowedRoles;
    if (currentRoles.includes(role)) {
      setValue(
        'allowedRoles',
        currentRoles.filter((r) => r !== role)
      );
    } else {
      setValue('allowedRoles', [...currentRoles, role]);
    }
  };

  const onSubmit = async (data: CategoryFormData) => {
    setIsSubmitting(true);

    try {
      if (category) {
        // 수정
        await axios.put(
          `/api/clubs/${clubId}/board/categories/${category.id}`,
          data
        );
        toast.success('카테고리가 수정되었습니다');
      } else {
        // 생성
        await axios.post(`/api/clubs/${clubId}/board/categories`, data);
        toast.success('카테고리가 생성되었습니다');
      }

      onSuccess();
    } catch (error: any) {
      console.error('카테고리 저장 오류:', error);
      toast.error(
        error.response?.data?.message || '카테고리 저장에 실패했습니다'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          카테고리 이름 <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          type="text"
          {...register('name')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="예: 공지사항, 자유게시판"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          설명 (선택)
        </label>
        <textarea
          id="description"
          {...register('description')}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="카테고리에 대한 설명을 입력해주세요"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          작성 권한 <span className="text-red-500">*</span>
        </label>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={allowedRoles.includes('MEMBER')}
              onChange={() => onToggleRole('MEMBER')}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">일반 회원 (MEMBER)</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={allowedRoles.includes('ADMIN')}
              onChange={() => onToggleRole('ADMIN')}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">관리자 (ADMIN)</span>
          </label>
        </div>
        {errors.allowedRoles && (
          <p className="mt-1 text-sm text-red-600">
            {errors.allowedRoles.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="order"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          순서 (숫자가 작을수록 위에 표시)
        </label>
        <input
          id="order"
          type="number"
          {...register('order', { valueAsNumber: true })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="자동 설정"
        />
      </div>

      <div>
        <label className="flex items-center">
          <input type="checkbox" {...register('isActive')} className="mr-2" />
          <span className="text-sm text-gray-700">활성화</span>
        </label>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? '저장 중...' : category ? '수정' : '생성'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1"
        >
          취소
        </Button>
      </div>
    </form>
  );
}

export default CategoryManageForm;
