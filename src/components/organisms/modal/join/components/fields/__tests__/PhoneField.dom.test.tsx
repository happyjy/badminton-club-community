import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import PhoneField from '@/components/organisms/modal/join/components/fields/PhoneField';
import JoinModalContext, {
  JoinModalContextType,
} from '@/components/organisms/modal/join/JoinModalContext';

/**
 * PhoneField는 Context에서 값을 받으므로, 테스트에서는 전화번호 세 칸만
 * 실제 상태처럼 움직이게 하고 나머지는 최소한으로 채운다.
 */
function buildContext(
  overrides: Partial<JoinModalContextType> = {}
): JoinModalContextType {
  return {
    formData: {} as JoinModalContextType['formData'],
    phoneNumbers: { first: '', second: '', third: '' },
    onChangeInput: jest.fn(),
    onChangePhoneNumber: jest.fn(),
    getFullPhoneNumber: () => '',
    // 인증 함수가 있어야 인증 버튼이 그려지므로 기본값으로 채운다.
    sendPhoneVerificationCode: jest.fn(async () => ({})),
    verifyPhoneCode: jest.fn(async () => ({})),
    onPhoneVerifiedChange: jest.fn(),
    isPhoneVerified: false,
    minBirthDate: new Date(),
    maxBirthDate: new Date(),
    minVisitDate: new Date(),
    maxVisitDate: new Date(),
    tournamentLevelOptions: [],
    isPrivacyModalOpen: false,
    setIsPrivacyModalOpen: jest.fn(),
    ...overrides,
  } as unknown as JoinModalContextType;
}

function renderPhoneField(overrides: Partial<JoinModalContextType> = {}) {
  return render(
    <JoinModalContext.Provider value={buildContext(overrides)}>
      <PhoneField />
    </JoinModalContext.Provider>
  );
}

describe('PhoneField 인라인 인증', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('번호 형식이 어긋나면 인증하기 버튼을 누를 수 없다', () => {
    renderPhoneField({
      phoneNumbers: { first: '010', second: '123', third: '' },
      getFullPhoneNumber: () => '010-123-',
    });

    const button = screen.getByRole('button', { name: '인증하기' });
    expect(button.hasAttribute('disabled')).toBe(true);
  });

  it('번호 형식이 맞으면 인증하기 버튼을 누를 수 있다', () => {
    renderPhoneField({
      phoneNumbers: { first: '010', second: '1234', third: '5678' },
      getFullPhoneNumber: () => '010-1234-5678',
    });

    const button = screen.getByRole('button', { name: '인증하기' });
    expect(button.hasAttribute('disabled')).toBe(false);
  });

  it('인증하기를 누르면 인증번호를 발송하고 코드 입력칸을 펼친다', async () => {
    const sendPhoneVerificationCode = jest.fn<
      (phoneNumber: string, force?: boolean) => Promise<unknown>
    >(async () => ({}));

    renderPhoneField({
      phoneNumbers: { first: '010', second: '1234', third: '5678' },
      getFullPhoneNumber: () => '010-1234-5678',
      sendPhoneVerificationCode: sendPhoneVerificationCode as never,
    });

    fireEvent.click(screen.getByRole('button', { name: '인증하기' }));

    await waitFor(() => {
      expect(sendPhoneVerificationCode).toHaveBeenCalledWith('010-1234-5678');
    });

    expect(await screen.findByLabelText('인증번호 6자리')).toBeTruthy();
  });

  it('인증번호가 맞으면 완료 표시를 보여주고 상위에 알린다', async () => {
    const onPhoneVerifiedChange = jest.fn();
    const verifyPhoneCode = jest.fn<
      (phoneNumber: string, code: string) => Promise<unknown>
    >(async () => ({}));

    renderPhoneField({
      phoneNumbers: { first: '010', second: '1234', third: '5678' },
      getFullPhoneNumber: () => '010-1234-5678',
      sendPhoneVerificationCode: (async () => ({})) as never,
      verifyPhoneCode: verifyPhoneCode as never,
      onPhoneVerifiedChange,
    });

    fireEvent.click(screen.getByRole('button', { name: '인증하기' }));

    const codeInput = await screen.findByLabelText('인증번호 6자리');
    fireEvent.change(codeInput, { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: '인증 확인' }));

    await waitFor(() => {
      expect(verifyPhoneCode).toHaveBeenCalledWith('010-1234-5678', '123456');
    });

    expect(await screen.findByText('✓ 인증 완료')).toBeTruthy();
    expect(onPhoneVerifiedChange).toHaveBeenCalledWith(true);
  });

  it('이미 인증된 번호면 인증 버튼 없이 완료만 보여준다', () => {
    renderPhoneField({
      phoneNumbers: { first: '010', second: '1234', third: '5678' },
      getFullPhoneNumber: () => '010-1234-5678',
      phoneVerificationStatus: {
        isVerified: true,
        phoneNumber: '010-1234-5678',
        canSkipVerification: true,
        isPreviouslyVerified: true,
      },
    });

    expect(screen.queryByRole('button', { name: '인증하기' })).toBeNull();
    expect(screen.getByText('✓ 인증된 전화번호입니다')).toBeTruthy();
  });

  it('계정에 인증된 번호는 형식이 달라도 다시 인증하지 않는다', () => {
    renderPhoneField({
      phoneNumbers: { first: '010', second: '1234', third: '5678' },
      getFullPhoneNumber: () => '010-1234-5678',
      // 계정에는 하이픈 없이 저장돼 있어도 같은 번호로 봐야 한다.
      phoneVerificationStatus: {
        isVerified: true,
        phoneNumber: '01012345678',
        canSkipVerification: true,
        isPreviouslyVerified: true,
      },
    });

    expect(screen.queryByRole('button', { name: '인증하기' })).toBeNull();
    expect(screen.getByText('✓ 인증된 전화번호입니다')).toBeTruthy();
  });

  it('계정에 인증된 번호와 다른 번호는 인증을 요구한다', () => {
    const onPhoneVerifiedChange = jest.fn();

    renderPhoneField({
      // 남의 번호를 넣은 경우. 계정 인증 기록과 다르므로 인증돼서는 안 된다.
      phoneNumbers: { first: '010', second: '9999', third: '8888' },
      getFullPhoneNumber: () => '010-9999-8888',
      phoneVerificationStatus: {
        isVerified: true,
        phoneNumber: '010-1234-5678',
        canSkipVerification: true,
        isPreviouslyVerified: true,
      },
      onPhoneVerifiedChange,
    });

    expect(screen.getByRole('button', { name: '인증하기' })).toBeTruthy();
    expect(screen.queryByText('✓ 인증된 전화번호입니다')).toBeNull();
    expect(onPhoneVerifiedChange).toHaveBeenCalledWith(false);
  });

  it('인증한 뒤 번호를 고치면 인증이 풀린다', async () => {
    const onPhoneVerifiedChange = jest.fn();

    const { rerender } = renderPhoneField({
      phoneNumbers: { first: '010', second: '1234', third: '5678' },
      getFullPhoneNumber: () => '010-1234-5678',
      phoneVerificationStatus: {
        isVerified: true,
        phoneNumber: '010-1234-5678',
        canSkipVerification: true,
        isPreviouslyVerified: true,
      },
      onPhoneVerifiedChange,
    });

    expect(screen.queryByRole('button', { name: '인증하기' })).toBeNull();

    // 번호를 고친 상태로 다시 그린다.
    // 저장된 인증 번호는 그대로 두고 입력값만 바꿔, 둘이 어긋나게 만든다.
    rerender(
      <JoinModalContext.Provider
        value={buildContext({
          phoneNumbers: { first: '010', second: '1234', third: '9999' },
          getFullPhoneNumber: () => '010-1234-9999',
          phoneVerificationStatus: {
            isVerified: true,
            phoneNumber: '010-1234-5678',
            canSkipVerification: true,
            isPreviouslyVerified: true,
          },
          onPhoneVerifiedChange,
        })}
      >
        <PhoneField />
      </JoinModalContext.Provider>
    );

    expect(screen.getByRole('button', { name: '인증하기' })).toBeTruthy();
    expect(screen.queryByText('✓ 인증된 전화번호입니다')).toBeNull();
  });

  // 서버는 이미 인증된 번호면 문자를 보내지 않고 canSkipVerification으로 알려준다.
  // 응답을 보지 않고 코드 입력칸을 열면 오지 않는 문자를 기다리게 된다.
  it('서버가 발송을 건너뛰면 코드 입력칸을 열지 않고 인증 완료로 처리한다', async () => {
    const onPhoneVerifiedChange = jest.fn();
    const sendPhoneVerificationCode = jest.fn<
      (phoneNumber: string, force?: boolean) => Promise<unknown>
    >(async () => ({
      success: true,
      message: '이미 인증된 전화번호입니다',
      isPreviouslyVerified: true,
      canSkipVerification: true,
    }));

    renderPhoneField({
      phoneNumbers: { first: '010', second: '1234', third: '5678' },
      getFullPhoneNumber: () => '010-1234-5678',
      sendPhoneVerificationCode: sendPhoneVerificationCode as never,
      onPhoneVerifiedChange,
    });

    fireEvent.click(screen.getByRole('button', { name: '인증하기' }));

    await waitFor(() => {
      expect(sendPhoneVerificationCode).toHaveBeenCalledWith('010-1234-5678');
    });

    expect(await screen.findByText('✓ 인증 완료')).toBeTruthy();
    expect(screen.queryByLabelText('인증번호 6자리')).toBeNull();
    expect(onPhoneVerifiedChange).toHaveBeenCalledWith(true);
  });

  it('문자를 실제로 보냈으면 코드 입력칸을 연다', async () => {
    const sendPhoneVerificationCode = jest.fn<
      (phoneNumber: string, force?: boolean) => Promise<unknown>
    >(async () => ({
      success: true,
      message: '인증번호가 발송되었습니다',
      expiresIn: 180,
      isPreviouslyVerified: false,
    }));

    renderPhoneField({
      phoneNumbers: { first: '010', second: '1234', third: '5678' },
      getFullPhoneNumber: () => '010-1234-5678',
      sendPhoneVerificationCode: sendPhoneVerificationCode as never,
    });

    fireEvent.click(screen.getByRole('button', { name: '인증하기' }));

    expect(await screen.findByLabelText('인증번호 6자리')).toBeTruthy();
    expect(screen.queryByText('✓ 인증 완료')).toBeNull();
  });
});
