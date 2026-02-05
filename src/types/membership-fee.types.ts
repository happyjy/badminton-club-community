import { FeePeriod, PaymentRecordStatus } from '@prisma/client';

// 납부 주기 타입 (FeePeriod enum과 동일)
export type FeePeriodType = 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL';

// 회비 유형
export interface FeeType {
  id: number;
  clubId: number;
  name: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  rates?: FeeRate[];
  members?: MemberFeeType[];
}

// 회비 금액 (유형 + 연도 + 납부주기별)
export interface FeeRate {
  id: number;
  feeTypeId: number;
  year: number;
  period: FeePeriod;
  amount: number;
  monthCount: number;
  createdAt: Date;
  updatedAt: Date;
  feeType?: FeeType;
}

// 회원별 회비 유형
export interface MemberFeeType {
  id: number;
  clubMemberId: number;
  feeTypeId: number;
  createdAt: Date;
  updatedAt: Date;
  clubMember?: {
    id: number;
    name: string | null;
  };
  feeType?: FeeType;
}

// 하위 호환성을 위한 회비 설정 인터페이스 (간단한 조회용)
export interface MembershipFeeSettings {
  year: number;
  regularAmount: number; // MONTHLY 기준
  coupleAmount: number; // MONTHLY 기준 (부부 유형)
  feeTypes?: FeeType[];
}

// 부부 그룹
export interface CoupleGroup {
  id: number;
  clubId: number;
  createdAt: Date;
  members: CoupleMember[];
}

// 부부 그룹 멤버
export interface CoupleMember {
  id: number;
  coupleGroupId: number;
  clubMemberId: number;
  createdAt: Date;
  clubMember?: {
    id: number;
    name: string | null;
  };
}

// 회비 면제
export interface FeeExemption {
  id: number;
  clubMemberId: number;
  year: number;
  reason: string;
  createdAt: Date;
  createdById: number;
  clubMember?: {
    id: number;
    name: string | null;
  };
  createdBy?: {
    id: number;
    name: string | null;
  };
}

// 입금 배치
export interface PaymentUploadBatch {
  id: string;
  clubId: number;
  uploadedAt: Date;
  uploadedById: number;
  fileName: string;
  recordCount: number;
}

// 입금 내역
export interface PaymentRecord {
  id: string;
  batchId: string;
  clubId: number;
  transactionDate: Date;
  depositorName: string;
  amount: number;
  memo: string | null;
  matchedMemberId: number | null;
  status: PaymentRecordStatus;
  errorReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  matchedMember?: {
    id: number;
    name: string | null;
  };
  suggestedMonths?: number[];
}

// 납부 내역
export interface MembershipPayment {
  id: string;
  clubMemberId: number;
  paymentRecordId: string;
  year: number;
  month: number;
  amount: number;
  period: FeePeriod;
  confirmedAt: Date;
  confirmedById: number;
}

// 회원 납부 현황
export type MemberType = 'regular' | 'couple' | 'exempt';

export interface MemberPaymentStatus {
  id: number;
  name: string;
  type: MemberType;
  couplePartnerName: string | null;
  payments: Record<number, boolean>; // month -> paid
  paidCount: number;
  totalMonths: number;
}

// 월별 통계
export interface MonthlyStats {
  month: number;
  paidCount: number;
  totalCount: number;
  amount: number;
}

// 대시보드 요약
export interface DashboardSummary {
  totalMembers: number;
  exemptMembers: number;
  coupleGroups: number;
  monthlyStats: MonthlyStats[];
  yearTotal: number;
}

// 대시보드 응답
export interface PaymentDashboardData {
  year: number;
  members: MemberPaymentStatus[];
  summary: DashboardSummary;
}

// API 요청/응답 타입

// 회비 유형 생성/수정
export interface FeeTypeInput {
  name: string;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
}

// 회비 금액 생성/수정
export interface FeeRateInput {
  feeTypeId: number;
  year: number;
  period: FeePeriodType;
  amount: number;
  monthCount: number;
}

// 회원 회비 유형 지정
export interface MemberFeeTypeInput {
  clubMemberId: number;
  feeTypeId: number;
}

// 하위 호환성을 위한 간단한 설정 입력 (일반/부부 월납만)
export interface MembershipFeeSettingsInput {
  year: number;
  regularAmount: number;
  coupleAmount: number;
}

export interface CoupleGroupInput {
  memberIds: number[];
}

export interface FeeExemptionInput {
  clubMemberId: number;
  year: number;
  reason: string;
}

export interface PaymentRecordUpdateInput {
  matchedMemberId?: number | null;
  status?: PaymentRecordStatus;
}

export interface PaymentConfirmInput {
  year: number;
  months: number[];
}

export interface BulkConfirmInput {
  recordIds: string[];
  year: number;
}

// 매칭 결과 타입
export interface MatchResult {
  memberId: number | null;
  memberName: string | null;
  matchType: 'exact' | 'partial' | 'couple' | 'similar' | 'none';
  confidence: number;
}

// 금액 검증 결과
export interface AmountValidationResult {
  isValid: boolean;
  memberType: MemberType | null;
  feeTypeId?: number;
  feeTypeName?: string;
  period?: FeePeriodType;
  monthCount: number;
  error?: string;
}

// 엑셀 파싱 결과
export interface ParsedPaymentRow {
  transactionDate: Date;
  depositorName: string;
  amount: number;
  memo: string | null;
}
