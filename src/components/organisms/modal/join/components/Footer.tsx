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
  const { canVerifyPhone, isPhoneVerified, submitError } =
    useJoinModalContext();

  // 인증을 쓸 수 있는 화면에서는 인증을 마쳐야 제출할 수 있다.
  const isWaitingForVerification = !!canVerifyPhone && !isPhoneVerified;

  return (
    // 긴 폼을 스크롤해도 제출 버튼이 늘 보이도록 시트 아래에 붙인다.
    <div className="sticky bottom-0 -mx-4 space-y-2 border-t border-border bg-surface px-4 pb-1 pt-3">
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
