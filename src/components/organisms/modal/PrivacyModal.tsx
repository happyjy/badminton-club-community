import { Button } from '@/components/atoms/buttons/Button';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function PrivacyModal({ isOpen, onClose }: PrivacyModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-bold mb-4">개인정보 수집 및 이용에 동의</h3>
        <div className="mb-4 text-sm">
          <p className="mb-2">
            1. 수집/이용 목적 : 당산배드민턴클럽 가입 및 문의
          </p>
          <p className="mb-2">
            2. 수집하는 항목 : 이름, 연락처, 생년월일, 성별
          </p>
          <p className="mb-2">3. 보유 / 이용 기간 : 서비스 이용 종료 시까지</p>
          <p>4. 동의를 거부할 수 있으며, 거부시 이용이 제한될 수 있습니다.</p>
        </div>
        <div className="flex justify-end">
          <Button type="button" variant="primary" onClick={onClose}>
            확인
          </Button>
        </div>
      </div>
    </div>
  );
}

export default PrivacyModal;
