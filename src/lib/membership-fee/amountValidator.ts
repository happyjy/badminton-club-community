import { FeePeriod } from '@prisma/client';

import {
  AmountValidationResult,
  FeeRate,
  FeePeriodType,
  MemberType,
} from '@/types/membership-fee.types';

// 하위 호환성을 위한 간단한 설정
interface SimpleFeeSettings {
  regularAmount: number;
  coupleAmount: number;
}

// 새로운 FeeRate 기반 설정
interface FeeRateSettings {
  feeRates: FeeRate[];
}

/**
 * FeeRate 목록에서 금액 일치 여부 확인
 */
export function validateAmountWithRates(
  amount: number,
  settings: FeeRateSettings
): AmountValidationResult {
  if (amount <= 0) {
    return {
      isValid: false,
      memberType: null,
      monthCount: 0,
      error: '입금액이 0 이하입니다',
    };
  }

  const { feeRates } = settings;

  if (feeRates.length === 0) {
    return {
      isValid: false,
      memberType: null,
      monthCount: 0,
      error: '회비 설정이 없습니다',
    };
  }

  // 정확히 일치하는 금액 찾기
  for (const rate of feeRates) {
    if (rate.amount === amount) {
      return {
        isValid: true,
        memberType: null,
        feeTypeId: rate.feeTypeId,
        feeTypeName: rate.feeType?.name,
        period: rate.period as FeePeriodType,
        monthCount: rate.monthCount,
      };
    }
  }

  // 배수 검사 (MONTHLY 기준)
  const monthlyRates = feeRates.filter((r) => r.period === FeePeriod.MONTHLY);
  for (const rate of monthlyRates) {
    if (amount % rate.amount === 0) {
      return {
        isValid: true,
        memberType: null,
        feeTypeId: rate.feeTypeId,
        feeTypeName: rate.feeType?.name,
        period: 'MONTHLY',
        monthCount: amount / rate.amount,
      };
    }
  }

  // 일치하지 않는 경우
  const rateDescriptions = feeRates
    .filter((r) => r.period === FeePeriod.MONTHLY)
    .map((r) => `${r.feeType?.name || '유형'}: ${r.amount.toLocaleString()}원`)
    .join(', ');

  return {
    isValid: false,
    memberType: null,
    monthCount: 0,
    error: `회비 금액(${rateDescriptions})의 배수가 아닙니다`,
  };
}

/**
 * 금액으로 가능한 FeeType/Period 조합 감지
 */
export function detectFeeType(
  amount: number,
  feeRates: FeeRate[]
): { feeTypeId: number; feeTypeName: string; period: FeePeriodType } | null {
  // 정확히 일치하는 금액 찾기 (더 긴 주기부터)
  const periodOrder: FeePeriod[] = [
    FeePeriod.ANNUAL,
    FeePeriod.SEMI_ANNUAL,
    FeePeriod.QUARTERLY,
    FeePeriod.MONTHLY,
  ];

  for (const period of periodOrder) {
    const rate = feeRates.find(
      (r) => r.period === period && r.amount === amount
    );
    if (rate) {
      return {
        feeTypeId: rate.feeTypeId,
        feeTypeName: rate.feeType?.name || '',
        period: period as FeePeriodType,
      };
    }
  }

  // 월납 배수 검사
  const monthlyRates = feeRates.filter((r) => r.period === FeePeriod.MONTHLY);
  for (const rate of monthlyRates) {
    if (amount % rate.amount === 0) {
      return {
        feeTypeId: rate.feeTypeId,
        feeTypeName: rate.feeType?.name || '',
        period: 'MONTHLY',
      };
    }
  }

  return null;
}

// ========================================
// 하위 호환성 함수들 (기존 일반/부부 방식)
// ========================================

export function validateAmount(
  amount: number,
  settings: SimpleFeeSettings,
  memberType?: MemberType
): AmountValidationResult {
  if (amount <= 0) {
    return {
      isValid: false,
      memberType: null,
      monthCount: 0,
      error: '입금액이 0 이하입니다',
    };
  }

  const { regularAmount, coupleAmount } = settings;

  // 특정 회원 타입이 지정된 경우
  if (memberType) {
    const expectedAmount =
      memberType === 'couple' ? coupleAmount : regularAmount;

    if (amount % expectedAmount !== 0) {
      return {
        isValid: false,
        memberType,
        monthCount: 0,
        error: `${memberType === 'couple' ? '부부' : '일반'} 회비 금액(${expectedAmount.toLocaleString()}원)의 배수가 아닙니다`,
      };
    }

    return {
      isValid: true,
      memberType,
      monthCount: amount / expectedAmount,
    };
  }

  // 회원 타입이 지정되지 않은 경우, 양쪽 모두 확인
  const isRegularMultiple = amount % regularAmount === 0;
  const isCoupleMultiple = amount % coupleAmount === 0;

  if (isRegularMultiple && isCoupleMultiple) {
    // 둘 다 배수인 경우 일반 회비를 기본으로 선택
    return {
      isValid: true,
      memberType: 'regular',
      monthCount: amount / regularAmount,
    };
  }

  if (isRegularMultiple) {
    return {
      isValid: true,
      memberType: 'regular',
      monthCount: amount / regularAmount,
    };
  }

  if (isCoupleMultiple) {
    return {
      isValid: true,
      memberType: 'couple',
      monthCount: amount / coupleAmount,
    };
  }

  return {
    isValid: false,
    memberType: null,
    monthCount: 0,
    error: `회비 금액(일반: ${regularAmount.toLocaleString()}원, 부부: ${coupleAmount.toLocaleString()}원)의 배수가 아닙니다`,
  };
}

export function detectMemberType(
  amount: number,
  settings: SimpleFeeSettings
): MemberType | null {
  const { regularAmount, coupleAmount } = settings;

  // 정확히 부부 회비인 경우
  if (amount === coupleAmount) {
    return 'couple';
  }

  // 정확히 일반 회비인 경우
  if (amount === regularAmount) {
    return 'regular';
  }

  // 부부 회비의 배수인 경우
  if (amount % coupleAmount === 0) {
    return 'couple';
  }

  // 일반 회비의 배수인 경우
  if (amount % regularAmount === 0) {
    return 'regular';
  }

  return null;
}
