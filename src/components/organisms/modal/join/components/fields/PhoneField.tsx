import { FormField } from '@/components/molecules/form/FormField';
import { PhoneInputGroup } from '@/components/molecules/form/PhoneInputGroup';

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
  } = useJoinModalContext();

  return (
    <FormField label={label} required>
      <PhoneInputGroup
        values={phoneNumbers}
        onChange={onChangePhoneNumber}
        required
      />
      {/* 안내 문구 */}
      {helpText && (
        <p className="mt-1 text-xs text-gray-500">{helpText}</p>
      )}
      {/* 인증 상태 표시 */}
      {showVerificationStatus &&
        phoneVerificationStatus?.isVerified &&
        phoneVerificationStatus.phoneNumber === getFullPhoneNumber() && (
          <div className="mt-1 text-sm text-green-600">
            ✓ 인증된 전화번호입니다
          </div>
        )}
    </FormField>
  );
}

export default PhoneField;
