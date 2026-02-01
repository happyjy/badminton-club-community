import { Checkbox } from '@/components/atoms/inputs/Checkbox';

import { useJoinModalContext } from '../../JoinModalContext';

function PrivacyAgreementField() {
  const { formData, onChangeInput, setIsPrivacyModalOpen } =
    useJoinModalContext();

  return (
    <div className="mt-4">
      <div className="flex items-center">
        <Checkbox
          name="privacyAgreement"
          checked={formData.privacyAgreement || false}
          onChange={onChangeInput}
          required
        />
        <div className="ml-2">
          <span className="text-sm font-medium text-gray-700">
            개인정보 수집 및 이용에 동의합니다.
            <span className="text-red-500">*</span>
          </span>
          <button
            type="button"
            className="ml-2 text-sm text-blue-600 underline"
            onClick={() => setIsPrivacyModalOpen(true)}
          >
            내용 보기
          </button>
        </div>
      </div>
    </div>
  );
}

export default PrivacyAgreementField;
