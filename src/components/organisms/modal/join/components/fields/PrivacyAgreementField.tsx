import { Button } from '@/components/atoms/buttons/Button';
import { Checkbox } from '@/components/atoms/inputs/Checkbox';

import { useJoinModalContext } from '../../JoinModalContext';

function PrivacyAgreementField() {
  const { formData, onChangeInput, setIsPrivacyModalOpen } =
    useJoinModalContext();

  return (
    <div className="flex items-center justify-between gap-2">
      {/* 줄 전체가 label이라 글자를 눌러도 체크된다. */}
      <label className="flex min-h-11 items-center text-body text-primary">
        <Checkbox
          name="privacyAgreement"
          checked={formData.privacyAgreement || false}
          onChange={onChangeInput}
          required
        />
        <span>
          개인정보 수집 및 이용에 동의합니다.
          <span className="text-negative">*</span>
        </span>
      </label>
      <Button
        type="button"
        variant="plain"
        size="sm"
        className="shrink-0 underline"
        onClick={() => setIsPrivacyModalOpen(true)}
      >
        내용 보기
      </Button>
    </div>
  );
}

export default PrivacyAgreementField;
