import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/atoms/buttons/Button';
import { FormField } from '@/components/molecules/form/FormField';
import { PhoneInputGroup } from '@/components/molecules/form/PhoneInputGroup';
import VerificationCodeInput from '@/components/molecules/form/VerificationCodeInput';

import { getPhoneNumberError, toPhoneDigits } from '@/utils/phoneNumber';

import { useJoinModalContext } from '../../JoinModalContext';

interface PhoneFieldProps {
  label?: string;
  helpText?: string;
  showVerificationStatus?: boolean;
}

function PhoneField({
  label = '전화번호',
  helpText,
  showVerificationStatus = true,
}: PhoneFieldProps) {
  const {
    phoneNumbers,
    onChangePhoneNumber,
    getFullPhoneNumber,
    phoneVerificationStatus,
    phoneVerificationLoading,
    checkPhoneVerificationStatus,
    sendPhoneVerificationCode,
    verifyPhoneCode,
    onPhoneVerifiedChange,
  } = useJoinModalContext();

  // 인증번호를 발송한 번호. 발송 후 번호를 고치면 코드 입력을 닫는 기준이 된다.
  const [sentTo, setSentTo] = useState<string | null>(null);
  // 이번 세션에서 인증을 마친 번호.
  const [verifiedNumber, setVerifiedNumber] = useState<string | null>(null);
  const [isTouched, setIsTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fullPhoneNumber = getFullPhoneNumber();
  const formatError = getPhoneNumberError(fullPhoneNumber);

  // 인증 여부는 '이 계정에 인증된 번호'와 입력값이 같을 때만 참이다.
  // 저장된 번호의 형식이 제각각일 수 있어 양쪽을 정규화해 비교한다.
  // 서버(guests/apply)도 같은 방식으로 판정하므로 기준을 맞춘다.
  const inputDigits = toPhoneDigits(fullPhoneNumber);
  const isAccountVerifiedNumber =
    !!phoneVerificationStatus?.isVerified &&
    !!phoneVerificationStatus.phoneNumber &&
    toPhoneDigits(phoneVerificationStatus.phoneNumber) === inputDigits;

  // 방금 이 화면에서 인증을 마친 번호. 상태를 다시 받아오기 전까지의 임시 표시다.
  const isJustVerified =
    !!verifiedNumber && toPhoneDigits(verifiedNumber) === inputDigits;

  // 빈 값이 서로 같다고 판정되지 않도록 형식이 맞을 때만 인증으로 본다.
  const isVerified =
    !formatError && (isAccountVerifiedNumber || isJustVerified);

  // 번호가 바뀌면 인증이 풀리므로 상위(제출 버튼)에도 알린다.
  const notifyVerified = useRef(onPhoneVerifiedChange);
  notifyVerified.current = onPhoneVerifiedChange;
  useEffect(() => {
    notifyVerified.current?.(!!isVerified);
  }, [isVerified]);

  // 발송한 번호에서 벗어나면 코드 입력칸을 닫는다.
  useEffect(() => {
    if (sentTo && toPhoneDigits(sentTo) !== inputDigits) {
      setSentTo(null);
      setError(null);
    }
  }, [sentTo, inputDigits]);

  // 세 칸 사이를 오갈 때는 아직 입력 중이므로 검증하지 않는다.
  const onBlurPhoneNumber = (e: React.FocusEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsTouched(true);
  };

  const handleSendCode = async () => {
    if (!sendPhoneVerificationCode) return;

    setError(null);
    try {
      await sendPhoneVerificationCode(fullPhoneNumber);
      setSentTo(fullPhoneNumber);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '인증번호 발송에 실패했습니다'
      );
    }
  };

  const handleResendCode = async () => {
    if (!sendPhoneVerificationCode) return;

    setError(null);
    try {
      await sendPhoneVerificationCode(fullPhoneNumber, true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '인증번호 발송에 실패했습니다'
      );
    }
  };

  const handleVerifyCode = async (code: string) => {
    if (!verifyPhoneCode) return;

    setError(null);
    try {
      await verifyPhoneCode(fullPhoneNumber, code);
      setVerifiedNumber(fullPhoneNumber);
      setSentTo(null);
      // 계정에 저장된 인증 번호가 방금 것으로 바뀌었으므로 상태를 다시 받아온다.
      await checkPhoneVerificationStatus?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '인증번호 확인에 실패했습니다'
      );
    }
  };

  // 형식이 맞아야 인증을 시작할 수 있다.
  // 입력 도중에 빨간 글씨가 뜨면 거슬리므로 메시지는 세 칸을 벗어난 뒤에만 띄운다.
  const canSendCode = !formatError && !!sendPhoneVerificationCode;
  const fieldError = isTouched ? formatError : undefined;

  return (
    <FormField label={label} required error={fieldError}>
      {/* min-w-0이 없으면 flex 항목이 내용 폭 아래로 줄지 않아 버튼이 밀려난다. */}
      <div className="flex min-w-0 items-start gap-2">
        <div onBlur={onBlurPhoneNumber} className="min-w-0 flex-1">
          <PhoneInputGroup
            values={phoneNumbers}
            onChange={onChangePhoneNumber}
            required
          />
        </div>
        {!isVerified && sendPhoneVerificationCode && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-1 shrink-0"
            onClick={handleSendCode}
            disabled={!canSendCode || phoneVerificationLoading}
          >
            인증하기
          </Button>
        )}
      </div>

      {/* 안내 문구 */}
      {helpText && <p className="mt-1 text-xs text-gray-500">{helpText}</p>}

      {/* 인증번호 입력 */}
      {sentTo && !isVerified && (
        <div className="mt-3 rounded-md border border-gray-200 p-3">
          <VerificationCodeInput
            phoneNumber={sentTo}
            onVerify={handleVerifyCode}
            onResend={handleResendCode}
            loading={phoneVerificationLoading}
            error={error ?? undefined}
          />
        </div>
      )}

      {/* 발송 전 단계에서 생긴 오류 */}
      {error && !sentTo && <p className="mt-1 text-sm text-red-600">{error}</p>}

      {/* 인증 상태 표시 */}
      {showVerificationStatus && isVerified && (
        <div className="mt-1 text-sm text-green-600">
          {isJustVerified ? '✓ 인증 완료' : '✓ 인증된 전화번호입니다'}
        </div>
      )}
    </FormField>
  );
}

export default PhoneField;
