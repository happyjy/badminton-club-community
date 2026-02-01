import { Button } from '@/components/atoms/buttons/Button';

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
  return (
    <div className="flex justify-end space-x-2 pt-4">
      {onClose && (
        <Button type="button" variant="secondary" onClick={onClose}>
          {cancelText}
        </Button>
      )}
      <Button
        type="submit"
        variant="primary"
        pending={isSubmitting}
        disabled={isSubmitting}
      >
        {submitText}
      </Button>
    </div>
  );
}

export default Footer;
