import {
  FeePeriod,
  NonFeeKind,
  PaymentRecordKind,
  PaymentRecordStatus,
} from '@prisma/client';

export type { NonFeeKind, PaymentRecordKind };

/** 입금자명·메모에서 읽은 월 힌트 */
export interface MonthHints {
  source: 'depositorName' | 'memo';
  months: { year: number; month: number }[];
}

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

// 입금 내역 - 매칭 회원 (다중 선택 시 사용)
export interface PaymentRecordMatchedMemberItem {
  id: string;
  clubMemberId: number;
  clubMember?: { id: number; name: string | null };
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
  /** 거래 분류. FEE만 회비 흐름에 들어간다 */
  kind: PaymentRecordKind;
  kindReason: string | null;
  /** 회비가 아닌 금액. 회비 = amount - nonFeeAmount */
  nonFeeAmount: number;
  nonFeeKind: NonFeeKind | null;
  monthHints: MonthHints | null;
  /** 검토 필요. 조회 응답에서는 백엔드가 조회 시점 기준으로 다시 계산한 값 */
  needsReview: boolean;
  /** 저장해 둔 검토 사유 (동명이인 등). 사람이 확인하면 지워진다 */
  reviewReason?: string | null;
  /** 재무의 처리 메모 */
  note: string | null;
  /** 업로드·조회 시 백엔드가 붙이는 배정 결과. 상세 시트의 기본 선택 */
  suggestedSelections?: { year: number; month: number }[];
  /** 검토가 필요한 사유 (조회 시점 계산) */
  reviewReasons?: string[];
  /** 월 힌트가 의무 시작 전일 때, 앞당기면 되는 시작월 */
  suggestedStartMonth?: { year: number; month: number } | null;
  /** 거래 연도 단가가 없어 빌려 쓴 직전 연도 */
  ratesFallbackYear?: number | null;
  /** 매칭 회원이 단가보다 적게 낸 가장 최근 달 (부족분 충당 대상) */
  partialPaidMonth?: { year: number; month: number } | null;
  createdAt: Date;
  updatedAt: Date;
  matchedMember?: {
    id: number;
    name: string | null;
  };
  /** 다중 매칭 회원 (한 건 입금에 여러 명 납부 시) */
  matchedMembers?: PaymentRecordMatchedMemberItem[];
  suggestedMonths?: number[];
  /** 확정된 납부 내역 (CONFIRMED 시 연도·월 표시용) */
  payments?: { id: string; year: number; month: number }[];
  /** 매칭 회원 기준 최종 납부월 (차기월 자동 추천용) */
  lastPaidYearMonth?: { year: number; month: number } | null;
  /** 휴회/병가·탈퇴를 반영한 차기 의무월 (백엔드 계산) */
  nextSuggestedYearMonth?: { year: number; month: number } | null;
  /**
   * 차기월이 단순 `lastPaid + 1`이 아닐 때의 사유 라벨.
   * 빈 배열이면 사유 라인을 숨김. 차기월이 null인 탈퇴 케이스에서도 사유 메시지 노출에 사용.
   */
  nextSuggestedReasons?: string[];
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
  /** 회원 상세(회비 시작일 수정) 링크용 */
  userId?: number;
  name: string;
  type: MemberType;
  couplePartnerName: string | null;
  payments: Record<number, boolean>; // month -> paid
  paidCount: number;
  totalMonths: number;
  /** 해당 연도 회비 의무 시작월 (1~12). 미전달 시 1 (전 구간 의무) */
  firstObligationMonth?: number;
  /** 해당 연도 의무 월 목록 (휴회 제외). 있으면 이 목록으로 의무 여부 판단 */
  obligationMonths?: number[];
  /** 해당 연도 휴회/병가 월 목록 */
  leaveMonths?: number[];
  /** 의무가 없는데(휴회·가입 전·탈퇴 후) 납부가 걸려 있는 달. 이월이 필요하다 */
  orphanPaidMonths?: number[];
  /** 회비 입금 시작월 (YYYY.MM 형식, 예: "2025.04") */
  feeObligationStartMonth?: string | null;
  /** 탈퇴 여부 */
  isLeft?: boolean;
  /** 탈퇴월 (해당 연도 내 탈퇴 시 1~12) */
  leftMonth?: number;
  /** 탈퇴일 (YYYY.MM 형식) */
  leftAtFormatted?: string | null;
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

// 최근 업로드 정보
export interface LatestUploadInfo {
  lastBatch: {
    id: string;
    uploadedAt: string;
    fileName: string;
    recordCount: number;
    uploadedByName: string | null;
  } | null;
  latestTransactionDate: string | null;
  /** 아직 처리하지 않은 회비 입금 (클럽 전체, 연도 무관) */
  pendingWork?: PendingWork;
}

export interface PendingWork {
  /** 회원은 매칭됐지만 아직 확정하지 않은 건 */
  unconfirmed: number;
  /** 회원을 찾지 못한 건 */
  unmatched: number;
  /** 사람이 봐야 확정할 수 있는 건 (금액·월·회원 확인) */
  needsReview: number;
}

// 대시보드 응답
export interface PaymentDashboardData {
  year: number;
  members: MemberPaymentStatus[];
  summary: DashboardSummary;
  latestUpload: LatestUploadInfo;
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

// 부부 관계 이력 (관리 화면용 — 멤버 이름 조인 포함)
export interface CoupleHistory {
  id: number;
  clubId: number;
  clubMemberId: number;
  partnerClubMemberId: number;
  startedAt: string; // ISO
  endedAt: string | null; // ISO (null이면 active)
  createdAt: string;
  clubMember: { id: number; name: string | null };
  partnerMember: { id: number; name: string | null };
}

export interface CoupleHistoryUpsertInput {
  clubMemberId: number;
  partnerClubMemberId: number;
  started: { year: number; month: number };
  ended: { year: number; month: number } | null;
}

export interface FeeExemptionInput {
  clubMemberId: number;
  year: number;
  reason: string;
}

export interface PaymentRecordUpdateInput {
  matchedMemberId?: number | null;
  /** 다중 매칭 시 사용 (있으면 matchedMemberId 무시) */
  matchedMemberIds?: number[];
  kind?: PaymentRecordKind;
  nonFeeAmount?: number;
  nonFeeKind?: NonFeeKind | null;
  note?: string | null;
}

/** 단일 연도·월 또는 다중 연도·월(예: 2025년 12월 + 2026년 1월) */
export interface PaymentConfirmInput {
  year?: number;
  months?: number[];
  /** 다중 연도·월 선택 시 사용 (있으면 year/months 무시) */
  selections?: { year: number; months: number[] }[];
}

export interface BulkConfirmInput {
  recordIds: string[];
  year: number;
  /** 지정 시 자동 추천(suggestMonths) 대신 모든 record에 동일 적용 */
  selections?: { year: number; months: number[] }[];
}

export interface BulkUnconfirmInput {
  recordIds: string[];
}

export interface BulkSkipInput {
  recordIds: string[];
}

export interface BulkUnskipInput {
  recordIds: string[];
}

export interface BulkSetKindInput {
  recordIds: string[];
  kind: PaymentRecordKind;
}

// 매칭 결과 타입
export interface MatchResult {
  memberId: number | null;
  memberName: string | null;
  matchType: 'exact' | 'partial' | 'couple' | 'similar' | 'none';
  confidence: number;
  /** 부부 등 한 건 입금에 두 명 매칭 시 회원 ID 배열 (있으면 matchedMemberId는 첫 번째와 동일) */
  memberIds?: number[];
  /** 입금자명에는 한 사람만 있었고 배우자를 자동으로 붙였는지 */
  spouseAutoAttached?: boolean;
  /** 똑같이 맞는 회원이 여럿일 때 그 수 (동명이인). 그중 첫 회원에 붙였다 */
  ambiguousCount?: number;
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
  /** 카카오뱅크 '거래구분' 원문 (일반입금·예금이자·오픈뱅킹 등) */
  transactionType: string;
}
