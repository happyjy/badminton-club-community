import { Button } from '@/components/atoms/buttons/Button';

import { useJoinModalContext } from '../JoinModalContext';

interface FooterProps {
  submitText?: string;
  cancelText?: string;
  onClose?: () => void;
  isSubmitting?: boolean;
}

function Footer({
  submitText = '신청하기',
  cancelText = '취소',
  onClose,
  isSubmitting = false,
}: FooterProps) {
  const { canVerifyPhone, isPhoneVerified, submitError, formId } =
    useJoinModalContext();

  // 인증을 쓸 수 있는 화면에서는 인증을 마쳐야 제출할 수 있다.
  const isWaitingForVerification = !!canVerifyPhone && !isPhoneVerified;

  return (
    // JoinModal이 이 부분을 시트의 아래 고정 영역으로 옮겨 그린다.
    // 테두리와 홈 인디케이터 여백은 시트가 맡는다.
    <div className="space-y-2">
      {submitError && (
        <p role="alert" className="text-callout text-negative">
          {submitError}
        </p>
      )}
      {isWaitingForVerification && (
        <p className="text-footnote text-secondary">
          전화번호 인증을 완료하면 신청할 수 있습니다
        </p>
      )}
      <div className="flex gap-2">
        {onClose && (
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={onClose}
          >
            {cancelText}
          </Button>
        )}
        <Button
          type="submit"
          form={formId}
          className="flex-1"
          pending={isSubmitting}
          disabled={isWaitingForVerification}
        >
          {submitText}
        </Button>
      </div>
    </div>
  );
}

export default Footer;
