import {
  AmountValidationResult,
  MemberType,
} from '@/types/membership-fee.types';

interface FeeSettings {
  regularAmount: number;
  coupleAmount: number;
}

export function validateAmount(
  amount: number,
  settings: FeeSettings,
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
    // 둘 다 배수인 경우 (예: 45000은 25000의 배수이기도 하지 않지만, 90000은 둘 다 배수)
    // 일반 회비를 기본으로 선택
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
  settings: FeeSettings
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
