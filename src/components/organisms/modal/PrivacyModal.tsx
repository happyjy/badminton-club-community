import { Button } from '@/components/atoms/buttons/Button';
import { Sheet } from '@/components/organisms/sheet/Sheet';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function PrivacyModal({ isOpen, onClose }: PrivacyModalProps) {
  return (
    <Sheet
      open={isOpen}
      onClose={onClose}
      title="개인정보 수집 및 이용에 동의"
      hideCloseButton
      footer={
        <Button type="button" className="w-full" onClick={onClose}>
          확인
        </Button>
      }
    >
      <div className="space-y-2 text-body text-primary">
        <p>1. 수집/이용 목적 : 배드민턴클럽 가입 및 문의</p>
        <p>2. 수집하는 항목 : 이름, 연락처, 생년월일, 성별</p>
        <p>3. 보유 / 이용 기간 : 서비스 이용 종료 시까지</p>
        <p>4. 동의를 거부할 수 있으며, 거부시 이용이 제한될 수 있습니다.</p>
      </div>
    </Sheet>
  );
}

export default PrivacyModal;
