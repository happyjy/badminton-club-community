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
  const { canVerifyPhone, isPhoneVerified } = useJoinModalContext();

  // 인증을 쓸 수 있는 화면에서는 인증을 마쳐야 제출할 수 있다.
  const isWaitingForVerification = !!canVerifyPhone && !isPhoneVerified;

  return (
    <div className="space-y-2 pt-4">
      {isWaitingForVerification && (
        <p className="text-right text-xs text-gray-500">
          전화번호 인증을 완료하면 신청할 수 있습니다
        </p>
      )}
      <div className="flex justify-end space-x-2">
        {onClose && (
          <Button type="button" variant="secondary" onClick={onClose}>
            {cancelText}
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          pending={isSubmitting}
          disabled={isSubmitting || isWaitingForVerification}
        >
          {submitText}
        </Button>
      </div>
    </div>
  );
}

export default Footer;
