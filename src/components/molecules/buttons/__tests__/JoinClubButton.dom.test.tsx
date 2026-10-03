import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';

import { JoinClubButton } from '@/components/molecules/buttons/JoinClubButton';
import { MembershipStatus, User } from '@/types';

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {} }),
}));

// 훅 자체는 별도로 검증된다. 여기서는 배선만 본다.
jest.mock('@/hooks/usePhoneVerification', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    phoneVerificationStatus: null,
    phoneVerificationLoading: false,
    phoneVerificationError: null,
    checkPhoneVerificationStatus: jest.fn(),
    sendPhoneVerificationCode: jest.fn(),
    verifyPhoneCode: jest.fn(),
    updatePhoneNumber: jest.fn(),
  })),
}));

/**
 * ClubJoinModal이 실제로 인증을 요구하는지는 JoinModal의
 * canVerifyPhone = !!sendPhoneVerificationCode && !!verifyPhoneCode 로 갈린다.
 * 인증 함수를 넘기지 않으면 인증 UI 없이 평범한 입력창만 뜨므로,
 * props가 모달까지 도달하는지를 모달을 가로채 확인한다.
 */
const receivedProps: Record<string, unknown>[] = [];

jest.mock('@/components/organisms/modal/join', () => ({
  ClubJoinModal: (props: Record<string, unknown>) => {
    receivedProps.push(props);
    return null;
  },
}));

const user = { id: 1, name: '홍길동' } as unknown as User;

function renderButton() {
  return render(
    <JoinClubButton
      user={user}
      clubId="3"
      isLoading={false}
      membershipStatus={{ isPending: false } as MembershipStatus}
      canJoinClub
      onJoin={jest.fn()}
    />
  );
}

describe('JoinClubButton 전화번호 인증 배선', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    receivedProps.length = 0;
  });

  it('가입 모달에 인증 함수를 넘긴다', () => {
    renderButton();

    const props = receivedProps[receivedProps.length - 1];
    // 이 두 개가 없으면 모달이 인증을 요구하지 않는다.
    expect(typeof props.sendPhoneVerificationCode).toBe('function');
    expect(typeof props.verifyPhoneCode).toBe('function');
  });

  it('가입 모달에 인증 상태 조회 함수를 넘긴다', () => {
    renderButton();

    // 모달을 열 때 계정에 인증된 번호가 있는지 받아오는 데 쓰인다.
    // 이미 인증한 사용자가 다시 인증하지 않고 신청할 수 있게 해준다.
    const props = receivedProps[receivedProps.length - 1];
    expect(typeof props.checkPhoneVerificationStatus).toBe('function');
  });

  it('가입 모달에 인증 상태 값을 넘긴다', () => {
    renderButton();

    const props = receivedProps[receivedProps.length - 1];
    expect(props).toHaveProperty('phoneVerificationStatus');
    expect(props).toHaveProperty('phoneVerificationLoading');
    expect(props).toHaveProperty('phoneVerificationError');
  });

  it('모임 가입하기 버튼을 누르면 모달이 열린다', () => {
    renderButton();

    fireEvent.click(screen.getByRole('button', { name: '모임 가입하기' }));

    const props = receivedProps[receivedProps.length - 1];
    expect(props.isOpen).toBe(true);
  });
});
