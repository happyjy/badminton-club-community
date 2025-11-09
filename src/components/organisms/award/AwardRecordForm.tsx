import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';

import { createAwardSchema, CreateAwardInput } from '@/schemas/award.schema';
import { useCreateAward, useUpdateAward, useUploadImage } from '@/hooks/useAwardRecords';
import { AwardResponse } from '@/types';
import { Input } from '@/components/atoms/inputs/Input';
import CustomDatePicker from '@/components/atoms/inputs/DatePicker';
import EventTypeSelect from '@/components/atoms/inputs/EventTypeSelect';
import GradeSelect from '@/components/atoms/inputs/GradeSelect';
import ImageUploader from '@/components/atoms/inputs/ImageUploader';

interface AwardRecordFormProps {
  clubId: number;
  existingAward?: AwardResponse;
  onSubmitSuccess?: () => void;
  onCancel?: () => void;
}

function AwardRecordForm({
  clubId,
  existingAward,
  onSubmitSuccess,
  onCancel,
}: AwardRecordFormProps) {
  const isEditMode = !!existingAward;
  const [uploadedImages, setUploadedImages] = useState<string[]>(
    existingAward?.images || []
  );

  const createMutation = useCreateAward(clubId);
  const updateMutation = useUpdateAward(clubId);
  const uploadImageMutation = useUploadImage();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateAwardInput>({
    resolver: zodResolver(createAwardSchema),
    defaultValues: existingAward
      ? {
          tournamentName: existingAward.tournamentName,
          eventDate: existingAward.eventDate,
          eventType: existingAward.eventType,
          grade: existingAward.grade,
          images: existingAward.images,
          note: existingAward.note || '',
        }
      : {
          tournamentName: '',
          eventDate: '',
          eventType: '',
          grade: '',
          images: [],
          note: '',
        },
  });

  const onSubmitForm = async (data: CreateAwardInput) => {
    try {
      const submitData = {
        ...data,
        clubId,
        images: uploadedImages,
      };

      if (isEditMode) {
        await updateMutation.mutateAsync({
          awardId: existingAward.id,
          data: submitData,
        });
        toast.success('입상 기록이 수정되었습니다.');
      } else {
        await createMutation.mutateAsync(submitData);
        toast.success('입상 기록이 등록되었습니다.');
      }

      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
    } catch (error: any) {
      const errorMessage = error?.message || '입상 기록 저장에 실패했습니다.';
      toast.error(errorMessage);
    }
  };

  const onUploadImage = async (file: File): Promise<string> => {
    try {
      const result = await uploadImageMutation.mutateAsync(file);
      return result.url;
    } catch (error: any) {
      throw new Error(error?.message || '이미지 업로드에 실패했습니다.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-6">
      {/* 대회명 */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          대회명 <span className="text-red-500">*</span>
        </label>
        <Input
          {...register('tournamentName')}
          placeholder="예: 제10회 전국 동호인 배드민턴 대회"
          disabled={isSubmitting}
        />
        {errors.tournamentName && (
          <p className="mt-1 text-sm text-red-600">
            {errors.tournamentName.message}
          </p>
        )}
      </div>

      {/* 대회 날짜 */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          대회 날짜 <span className="text-red-500">*</span>
        </label>
        <Controller
          name="eventDate"
          control={control}
          render={({ field }) => (
            <CustomDatePicker
              selected={field.value ? new Date(field.value) : null}
              onChange={(date) => {
                if (date) {
                  const formattedDate = date.toISOString().split('T')[0];
                  field.onChange(formattedDate);
                } else {
                  field.onChange('');
                }
              }}
              placeholderText="날짜를 선택하세요"
              maxDate={new Date()}
              disabled={isSubmitting}
            />
          )}
        />
        {errors.eventDate && (
          <p className="mt-1 text-sm text-red-600">{errors.eventDate.message}</p>
        )}
      </div>

      {/* 종목 & 급수 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            종목 <span className="text-red-500">*</span>
          </label>
          <EventTypeSelect
            {...register('eventType')}
            disabled={isSubmitting}
          />
          {errors.eventType && (
            <p className="mt-1 text-sm text-red-600">
              {errors.eventType.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            급수 <span className="text-red-500">*</span>
          </label>
          <GradeSelect {...register('grade')} disabled={isSubmitting} />
          {errors.grade && (
            <p className="mt-1 text-sm text-red-600">{errors.grade.message}</p>
          )}
        </div>
      </div>

      {/* 결과 사진 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          결과 사진 (선택, 최대 3장)
        </label>
        <ImageUploader
          images={uploadedImages}
          maxImages={3}
          onImagesChange={setUploadedImages}
          onUpload={onUploadImage}
          disabled={isSubmitting || uploadImageMutation.isPending}
        />
        {errors.images && (
          <p className="mt-1 text-sm text-red-600">{errors.images.message}</p>
        )}
      </div>

      {/* 비고 */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          비고 (선택)
        </label>
        <textarea
          {...register('note')}
          rows={3}
          placeholder="추가 내용을 입력하세요"
          disabled={isSubmitting}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
        {errors.note && (
          <p className="mt-1 text-sm text-red-600">{errors.note.message}</p>
        )}
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-3 pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 transition-colors"
          >
            취소
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting || uploadImageMutation.isPending}
          className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting
            ? '저장 중...'
            : isEditMode
              ? '수정하기'
              : '등록하기'}
        </button>
      </div>
    </form>
  );
}

export default AwardRecordForm;

