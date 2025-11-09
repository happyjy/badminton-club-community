// 대회 입상 기록 유효성 검사 스키마

import { z } from 'zod';

// EventType enum
const EventTypeSchema = z.enum(['SINGLES', 'MD', 'WD', 'XD'], {
  required_error: '종목을 선택해주세요.',
  invalid_type_error: '유효한 종목을 선택해주세요.',
});

// Grade enum
const GradeSchema = z.enum(['A', 'B', 'C', 'D', 'E', 'F'], {
  required_error: '급수를 선택해주세요.',
  invalid_type_error: '유효한 급수를 선택해주세요.',
});

// 대회 입상 기록 생성 스키마
export const createAwardSchema = z.object({
  clubId: z.number().optional().nullable(),
  tournamentName: z
    .string({
      required_error: '대회명을 입력해주세요.',
    })
    .min(1, '대회명을 입력해주세요.')
    .max(50, '대회명은 최대 50자까지 입력 가능합니다.')
    .trim(),
  eventDate: z
    .string({
      required_error: '대회 날짜를 선택해주세요.',
    })
    .regex(/^\d{4}-\d{2}-\d{2}$/, '올바른 날짜 형식이 아닙니다. (YYYY-MM-DD)')
    .refine((date) => {
      const selectedDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return selectedDate <= today;
    }, '미래 날짜는 선택할 수 없습니다.'),
  eventType: EventTypeSchema,
  grade: GradeSchema,
  images: z
    .array(z.string().url('올바른 이미지 URL이 아닙니다.'))
    .max(3, '이미지는 최대 3장까지 업로드 가능합니다.')
    .optional()
    .default([]),
  note: z
    .string()
    .max(100, '비고는 최대 100자까지 입력 가능합니다.')
    .optional()
    .nullable(),
});

// 대회 입상 기록 수정 스키마 (모든 필드 선택적)
export const updateAwardSchema = z.object({
  clubId: z.number().optional().nullable(),
  tournamentName: z
    .string()
    .min(1, '대회명을 입력해주세요.')
    .max(50, '대회명은 최대 50자까지 입력 가능합니다.')
    .trim()
    .optional(),
  eventDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '올바른 날짜 형식이 아닙니다. (YYYY-MM-DD)')
    .refine((date) => {
      const selectedDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return selectedDate <= today;
    }, '미래 날짜는 선택할 수 없습니다.')
    .optional(),
  eventType: EventTypeSchema.optional(),
  grade: GradeSchema.optional(),
  images: z
    .array(z.string().url('올바른 이미지 URL이 아닙니다.'))
    .max(3, '이미지는 최대 3장까지 업로드 가능합니다.')
    .optional(),
  note: z
    .string()
    .max(100, '비고는 최대 100자까지 입력 가능합니다.')
    .optional()
    .nullable(),
});

// 이미지 파일 검증 스키마 (클라이언트 측)
export const imageFileSchema = z
  .instanceof(File)
  .refine((file) => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    return validTypes.includes(file.type);
  }, '이미지 파일만 업로드 가능합니다. (jpg, png, webp)')
  .refine((file) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    return file.size <= maxSize;
  }, '이미지 크기는 10MB 이하여야 합니다.');

// 이미지 파일 배열 검증
export const imageFilesSchema = z
  .array(imageFileSchema)
  .max(3, '이미지는 최대 3장까지 업로드 가능합니다.');

// 타입 추출
export type CreateAwardInput = z.infer<typeof createAwardSchema>;
export type UpdateAwardInput = z.infer<typeof updateAwardSchema>;

