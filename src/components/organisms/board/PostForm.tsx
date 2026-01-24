import { useEffect } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';

import { Button } from '@/components/atoms/buttons/Button';
import { Input } from '@/components/atoms/inputs/Input';
import { Select } from '@/components/atoms/inputs/Select';
import { Textarea } from '@/components/atoms/Textarea';

import {
  PostCategoryWithRelations,
  CreatePostRequest,
  UpdatePostRequest,
} from '@/types/board.types';

interface PostFormProps {
  clubId: string;
  categories: PostCategoryWithRelations[];
  initialData?: {
    title: string;
    content: string;
    categoryId: number;
  };
  postId?: string;
  onSuccess?: () => void;
}

interface PostFormData {
  title: string;
  content: string;
  categoryId: string;
}

function PostForm({
  clubId,
  categories,
  initialData,
  postId,
  onSuccess,
}: PostFormProps) {
  const queryClient = useQueryClient();
  const isEditMode = !!postId;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<PostFormData>({
    defaultValues: initialData
      ? {
          title: initialData.title,
          content: initialData.content,
          categoryId: initialData.categoryId.toString(),
        }
      : {
          title: '',
          content: '',
          categoryId: '',
        },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        title: initialData.title,
        content: initialData.content,
        categoryId: initialData.categoryId.toString(),
      });
    }
  }, [initialData, reset]);

  const createMutation = useMutation({
    mutationFn: async (data: CreatePostRequest) => {
      const response = await axios.post(
        `/api/clubs/${clubId}/board/posts`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boardPosts'] });
      toast.success('게시글이 작성되었습니다');
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: () => {
      toast.error('게시글 작성 중 오류가 발생했습니다');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: UpdatePostRequest) => {
      const response = await axios.put(
        `/api/clubs/${clubId}/board/posts/${postId}`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['boardPost', clubId, postId],
      });
      queryClient.invalidateQueries({ queryKey: ['boardPosts'] });
      toast.success('게시글이 수정되었습니다');
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: () => {
      toast.error('게시글 수정 중 오류가 발생했습니다');
    },
  });

  const onSubmit = async (data: PostFormData) => {
    if (!data.categoryId) {
      toast.error('카테고리를 선택해주세요');
      return;
    }

    const submitData = {
      title: data.title.trim(),
      content: data.content.trim(),
      categoryId: Number(data.categoryId),
    };

    if (isEditMode) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const categoryOptions = categories.map((category) => ({
    value: category.id.toString(),
    label: category.name,
  }));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label
          htmlFor="categoryId"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          카테고리 *
        </label>
        <Select
          id="categoryId"
          options={categoryOptions}
          {...register('categoryId', {
            required: '카테고리를 선택해주세요',
          })}
          className={errors.categoryId ? 'border-red-500' : ''}
        />
        {errors.categoryId && (
          <p className="mt-1 text-sm text-red-600">
            {errors.categoryId.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          제목 *
        </label>
        <Input
          id="title"
          type="text"
          {...register('title', {
            required: '제목을 입력해주세요',
            maxLength: {
              value: 200,
              message: '제목은 200자 이하여야 합니다',
            },
          })}
          className={errors.title ? 'border-red-500' : ''}
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="content"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          내용 *
        </label>
        <Textarea
          id="content"
          rows={10}
          {...register('content', {
            required: '내용을 입력해주세요',
            maxLength: {
              value: 10000,
              message: '내용은 10000자 이하여야 합니다',
            },
          })}
          className={errors.content ? 'border-red-500' : ''}
        />
        {errors.content && (
          <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={
            isSubmitting || createMutation.isPending || updateMutation.isPending
          }
          className="flex-1"
        >
          {isSubmitting || createMutation.isPending || updateMutation.isPending
            ? '처리 중...'
            : isEditMode
              ? '수정하기'
              : '작성하기'}
        </Button>
      </div>
    </form>
  );
}

export default PostForm;
