import { useState } from 'react';

import { Button } from '@/components/atoms/buttons/Button';
import { Input } from '@/components/atoms/inputs/Input';
import MemberSelectDropdown from '@/components/molecules/membership-fee/MemberSelectDropdown';
import { Sheet } from '@/components/organisms/sheet/Sheet';

interface Member {
  id: number;
  name: string | null;
}

interface ExemptionRegisterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { clubMemberId: number; reason: string }) => void;
  members: Member[];
  exemptedMemberIds: number[];
  year: number;
  isSubmitting?: boolean;
}

const EXEMPTION_REASONS = ['임원', '명예회원', '기타'];
const FORM_ID = 'exemption-register-form';

export function ExemptionRegisterSheet({
  isOpen,
  onClose,
  onSubmit,
  members,
  exemptedMemberIds,
  year,
  isSubmitting = false,
}: ExemptionRegisterSheetProps) {
  const [memberId, setMemberId] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  const availableMembers = members.filter(
    (m) => !exemptedMemberIds.includes(m.id)
  );

  const reset = () => {
    setMemberId(null);
    setReason('');
    setCustomReason('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (memberId && (reason || customReason)) {
      onSubmit({
        clubMemberId: memberId,
        reason: reason === '기타' ? customReason : reason,
      });
      reset();
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Sheet
      open={isOpen}
      onClose={handleClose}
      title={`${year}년 회비 면제 등록`}
      footer={
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            취소
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            className="flex-1"
            disabled={
              !memberId ||
              (!reason && !customReason) ||
              (reason === '기타' && !customReason)
            }
            pending={isSubmitting}
            pendingText="등록 중..."
            pendingPosition="left"
          >
            등록
          </Button>
        </div>
      }
    >
      {/* 회원 목록이 아래로 펼쳐지므로 시트 안에 그만큼의 높이를 둔다. */}
      <form id={FORM_ID} onSubmit={handleSubmit} className="min-h-80 space-y-4">
        <div className="space-y-1">
          <span className="block text-footnote font-medium text-secondary">
            회원
          </span>
          <MemberSelectDropdown
            members={availableMembers}
            selectedMemberId={memberId}
            onSelect={setMemberId}
            placeholder="회원 선택"
            disabled={isSubmitting}
          />
        </div>

        <fieldset className="space-y-1">
          <legend className="text-footnote font-medium text-secondary">
            면제 사유
          </legend>
          {EXEMPTION_REASONS.map((r) => (
            <label
              key={r}
              className="flex min-h-11 items-center gap-2 text-body text-primary"
            >
              <input
                type="radio"
                name="reason"
                value={r}
                checked={reason === r}
                onChange={(e) => setReason(e.target.value)}
                disabled={isSubmitting}
                className="h-5 w-5 accent-accent"
              />
              <span>{r}</span>
            </label>
          ))}
          {reason === '기타' && (
            <Input
              type="text"
              aria-label="면제 사유"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="면제 사유 입력"
              disabled={isSubmitting}
            />
          )}
        </fieldset>
      </form>
    </Sheet>
  );
}

export default ExemptionRegisterSheet;
