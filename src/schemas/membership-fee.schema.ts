import { z } from 'zod';

// 납부 주기 enum
export const feePeriodSchema = z.enum([
  'MONTHLY',
  'QUARTERLY',
  'SEMI_ANNUAL',
  'ANNUAL',
]);

export type FeePeriodSchema = z.infer<typeof feePeriodSchema>;

// 회비 유형 생성/수정 스키마
export const feeTypeSchema = z.object({
  name: z.string().min(1, '유형 이름을 입력해주세요').max(50),
  description: z.string().max(200).optional(),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().min(0).optional().default(0),
});

export type FeeTypeSchema = z.infer<typeof feeTypeSchema>;

// 회비 금액 생성/수정 스키마
export const feeRateSchema = z.object({
  feeTypeId: z.number().int().positive(),
  year: z.number().int().min(2020).max(2100),
  period: feePeriodSchema,
  amount: z.number().int().min(0),
  monthCount: z.number().int().min(1).max(12),
});

export type FeeRateSchema = z.infer<typeof feeRateSchema>;

// 회비 금액 일괄 설정 스키마 (하나의 유형에 모든 주기 설정)
export const feeRateBulkSchema = z.object({
  feeTypeId: z.number().int().positive(),
  year: z.number().int().min(2020).max(2100),
  rates: z.array(
    z.object({
      period: feePeriodSchema,
      amount: z.number().int().min(0),
      monthCount: z.number().int().min(1).max(12),
    })
  ),
});

export type FeeRateBulkSchema = z.infer<typeof feeRateBulkSchema>;

// 회원 회비 유형 지정 스키마
export const memberFeeTypeSchema = z.object({
  clubMemberId: z.number().int().positive(),
  feeTypeId: z.number().int().positive(),
});

export type MemberFeeTypeSchema = z.infer<typeof memberFeeTypeSchema>;

// 하위 호환성을 위한 간단한 회비 설정 스키마 (일반/부부 월납만)
export const membershipFeeSettingsSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  regularAmount: z.number().int().min(0),
  coupleAmount: z.number().int().min(0),
});

export type MembershipFeeSettingsSchema = z.infer<
  typeof membershipFeeSettingsSchema
>;

// 부부 그룹 등록 스키마
export const coupleGroupSchema = z.object({
  memberIds: z
    .array(z.number().int().positive())
    .min(2, '부부 그룹은 최소 2명이 필요합니다')
    .max(2, '부부 그룹은 최대 2명까지 가능합니다'),
});

export type CoupleGroupSchema = z.infer<typeof coupleGroupSchema>;

// 회비 면제 등록 스키마
export const feeExemptionSchema = z.object({
  clubMemberId: z.number().int().positive(),
  year: z.number().int().min(2020).max(2100),
  reason: z.string().min(1, '면제 사유를 입력해주세요').max(100),
});

export type FeeExemptionSchema = z.infer<typeof feeExemptionSchema>;

// 입금 내역 수정 스키마
export const paymentRecordUpdateSchema = z.object({
  matchedMemberId: z.number().int().positive().nullable().optional(),
  status: z
    .enum(['PENDING', 'MATCHED', 'ERROR', 'CONFIRMED', 'SKIPPED'])
    .optional(),
});

export type PaymentRecordUpdateSchema = z.infer<
  typeof paymentRecordUpdateSchema
>;

// 입금 확정 스키마
export const paymentConfirmSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  months: z
    .array(z.number().int().min(1).max(12))
    .min(1, '최소 1개월을 선택해야 합니다'),
  period: feePeriodSchema.optional().default('MONTHLY'),
});

export type PaymentConfirmSchema = z.infer<typeof paymentConfirmSchema>;

// 일괄 확정 스키마
export const bulkConfirmSchema = z.object({
  recordIds: z.array(z.string()).min(1, '최소 1개의 레코드를 선택해야 합니다'),
  year: z.number().int().min(2020).max(2100),
});

export type BulkConfirmSchema = z.infer<typeof bulkConfirmSchema>;

// 연도 쿼리 스키마
export const yearQuerySchema = z.object({
  year: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : new Date().getFullYear())),
});

export type YearQuerySchema = z.infer<typeof yearQuerySchema>;
