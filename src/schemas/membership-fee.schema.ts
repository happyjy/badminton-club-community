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

/**
 * 부부 관계 이력 등록·수정 스키마.
 *
 * - 시점은 연·월 단위로만 입력 (UI 단순화). 서버에서 startedAt=해당월 1일,
 *   endedAt=해당월 마지막 일 23:59:59.999 로 변환해 저장.
 * - 종료 연·월이 비어 있으면 active(endedAt=null) 이력으로 저장.
 * - 두 회원 ID는 서로 달라야 하며, partner는 self보다 작은 값일 수도 있어 정렬 강제 안 함.
 */
const yearMonthSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
});

export const coupleHistoryUpsertSchema = z
  .object({
    clubMemberId: z.number().int().positive(),
    partnerClubMemberId: z.number().int().positive(),
    started: yearMonthSchema,
    ended: yearMonthSchema.nullable().optional(),
  })
  .refine((d) => d.clubMemberId !== d.partnerClubMemberId, {
    message: '같은 회원을 두 번 선택할 수 없습니다',
    path: ['partnerClubMemberId'],
  })
  .refine(
    (d) => {
      if (!d.ended) return true;
      const s = d.started.year * 100 + d.started.month;
      const e = d.ended.year * 100 + d.ended.month;
      return s <= e;
    },
    {
      message: '종료 연·월은 시작 연·월 이상이어야 합니다',
      path: ['ended'],
    }
  );

export type CoupleHistoryUpsertSchema = z.infer<
  typeof coupleHistoryUpsertSchema
>;

// 회비 면제 등록 스키마
export const feeExemptionSchema = z.object({
  clubMemberId: z.number().int().positive(),
  year: z.number().int().min(2020).max(2100),
  reason: z.string().min(1, '면제 사유를 입력해주세요').max(100),
});

export type FeeExemptionSchema = z.infer<typeof feeExemptionSchema>;

// 휴회/병가 기간 등록·수정 스키마
export const memberLeaveSchema = z
  .object({
    startYear: z.number().int().min(2020).max(2100),
    startMonth: z.number().int().min(1).max(12),
    endYear: z.number().int().min(2020).max(2100).nullable().optional(),
    endMonth: z.number().int().min(1).max(12).nullable().optional(),
    reason: z.string().max(200).optional(),
  })
  .refine(
    (data) => {
      if (data.endYear == null && data.endMonth == null) return true;
      if (data.endYear == null || data.endMonth == null) return false;
      if (data.endYear > data.startYear) return true;
      if (data.endYear === data.startYear)
        return (data.endMonth ?? 0) >= data.startMonth;
      return false;
    },
    { message: '종료 연월은 시작 연월 이후여야 합니다' }
  );

export type MemberLeaveSchema = z.infer<typeof memberLeaveSchema>;

// 입금 내역 수정 스키마
export const paymentRecordKindSchema = z.enum([
  'FEE',
  'JOINING_FEE',
  'EVENT',
  'OTHER',
  'INTEREST',
]);

export const paymentRecordUpdateSchema = z
  .object({
    matchedMemberId: z.number().int().positive().nullable().optional(),
    matchedMemberIds: z.array(z.number().int().positive()).optional(),
    // 상태는 받지 않는다. 확정·건너뛰기는 각자의 API가 납부 내역과 함께 바꾼다.
    /** 거래 분류. 회비가 아닌 분류로 바꾸면 건너뜀이 된다 */
    kind: paymentRecordKindSchema.optional(),
    /** 한 입금에서 회비가 아닌 금액 (가입비·콕 값·초과분) */
    nonFeeAmount: z
      .number()
      .int()
      .min(0, '회비가 아닌 금액은 0 이상이어야 합니다')
      .optional(),
    nonFeeKind: z
      .enum(['JOINING_FEE', 'EVENT', 'OTHER', 'OVERPAY'])
      .nullable()
      .optional(),
    note: z
      .string()
      .max(500, '메모는 500자 이하로 적어주세요')
      .nullable()
      .optional(),
  })
  .refine(
    (data) =>
      data.nonFeeAmount === undefined ||
      data.nonFeeAmount === 0 ||
      data.nonFeeKind != null,
    {
      message: '회비가 아닌 금액의 성격을 골라주세요',
      path: ['nonFeeKind'],
    }
  );

export type PaymentRecordUpdateSchema = z.infer<
  typeof paymentRecordUpdateSchema
>;

// 연도·월 한 묶음 (다중 연도 확정용)
const yearMonthSelectionSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  months: z
    .array(z.number().int().min(1).max(12))
    .min(1, '최소 1개월을 선택해야 합니다'),
});

// 입금 확정 스키마 (단일 year+months | 다중 selections 호환)
export const paymentConfirmSchema = z.union([
  z
    .object({
      year: z.number().int().min(2020).max(2100),
      months: z
        .array(z.number().int().min(1).max(12))
        .min(1, '최소 1개월을 선택해야 합니다'),
      period: feePeriodSchema.optional().default('MONTHLY'),
    })
    .strict(),
  z
    .object({
      selections: z
        .array(yearMonthSelectionSchema)
        .min(1, '최소 1개의 연도·월을 선택해야 합니다'),
      period: feePeriodSchema.optional().default('MONTHLY'),
    })
    .strict(),
]);

export type PaymentConfirmSchema = z.infer<typeof paymentConfirmSchema>;
export type YearMonthSelection = z.infer<typeof yearMonthSelectionSchema>;

// 일괄 확정 스키마
export const bulkConfirmSchema = z.object({
  recordIds: z.array(z.string()).min(1, '최소 1개의 레코드를 선택해야 합니다'),
  year: z.number().int().min(2020).max(2100),
  /**
   * 사용자가 지정한 연도·월. 있으면 record별 자동 추천(suggestMonths) 대신
   * 이 selections를 모든 record에 동일하게 적용한다.
   */
  selections: z.array(yearMonthSelectionSchema).optional(),
});

export type BulkConfirmSchema = z.infer<typeof bulkConfirmSchema>;

// 일괄 확정 취소 스키마
export const bulkUnconfirmSchema = z.object({
  recordIds: z.array(z.string()).min(1, '최소 1개의 레코드를 선택해야 합니다'),
});

export type BulkUnconfirmSchema = z.infer<typeof bulkUnconfirmSchema>;

// 일괄 건너뛰기 스키마
export const bulkSkipSchema = z.object({
  recordIds: z.array(z.string()).min(1, '최소 1개의 레코드를 선택해야 합니다'),
});

export type BulkSkipSchema = z.infer<typeof bulkSkipSchema>;

// 일괄 건너뜀 해제 스키마
export const bulkUnskipSchema = z.object({
  recordIds: z.array(z.string()).min(1, '최소 1개의 레코드를 선택해야 합니다'),
});

export type BulkUnskipSchema = z.infer<typeof bulkUnskipSchema>;

// 선택 항목 분류 변경 스키마
export const bulkSetKindSchema = z.object({
  recordIds: z.array(z.string()).min(1, '최소 1개의 레코드를 선택해야 합니다'),
  kind: paymentRecordKindSchema,
});

export type BulkSetKindSchema = z.infer<typeof bulkSetKindSchema>;

// 연도 쿼리 스키마
export const yearQuerySchema = z.object({
  year: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : new Date().getFullYear())),
});

export type YearQuerySchema = z.infer<typeof yearQuerySchema>;

// 납부월 이월 스키마 (의무가 없어진 달의 납부를 다음 의무월로 옮긴다)
export const paymentShiftSchema = z.object({
  paymentIds: z
    .array(z.string())
    .min(1, '최소 1개의 납부 내역을 선택해야 합니다'),
});

export type PaymentShiftSchema = z.infer<typeof paymentShiftSchema>;
