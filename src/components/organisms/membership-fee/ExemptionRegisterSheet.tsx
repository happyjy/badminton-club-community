import { useEffect, useState } from 'react';

import { Button } from '@/components/atoms/buttons/Button';
import { Input } from '@/components/atoms/inputs/Input';
import { Select } from '@/components/atoms/inputs/Select';
import MemberSelectDropdown from '@/components/molecules/membership-fee/MemberSelectDropdown';
import { Sheet } from '@/components/organisms/sheet/Sheet';

import type { FeeExemption } from '@/types/membership-fee.types';

interface Member {
  id: number;
  name: string | null;
}

export interface ExemptionSheetValues {
  clubMemberId: number;
  reason: string;
  /** 그 해 안의 면제 기간 (양 끝 포함) */
  startMonth: number;
  endMonth: number;
}

interface ExemptionRegisterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ExemptionSheetValues) => void;
  members: Member[];
  exemptedMemberIds: number[];
  year: number;
  /** 수정 모드면 채워서 전달, 등록이면 비워 둔다 */
  editing?: FeeExemption | null;
  /** 있으면 수정 모드에서 삭제 버튼을 보인다 */
  onDelete?: (exemption: FeeExemption) => void;
  isSubmitting?: boolean;
}

const EXEMPTION_REASONS = ['임원', '명예회원', '기타'];
const FORM_ID = 'exemption-register-form';
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1}월`,
}));

const labelClass = 'block text-footnote font-medium text-secondary';

/** 고를 수 있는 사유가 아니면 기타에 적은 글자로 둔다 */
function splitReason(reason: string) {
  return EXEMPTION_REASONS.includes(reason) && reason !== '기타'
    ? { reason, customReason: '' }
    : { reason: '기타', customReason: reason };
}

/** 회비 면제 등록·수정 시트. 수정에서는 회원을 바꾸지 않는다. */
export function ExemptionRegisterSheet({
  isOpen,
  onClose,
  onSubmit,
  members,
  exemptedMemberIds,
  year,
  editing = null,
  onDelete,
  isSubmitting = false,
}: ExemptionRegisterSheetProps) {
  const [memberId, setMemberId] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [startMonth, setStartMonth] = useState(1);
  const [endMonth, setEndMonth] = useState(12);
  const [error, setError] = useState<string | null>(null);
  // 닫히는 애니메이션 동안 제목·버튼 글자가 "등록"으로 바뀌지 않게 열 때의 모드를 들고 있는다.
  const [isEditMode, setIsEditMode] = useState(editing !== null);

  // 열 때마다 폼을 채운다. 수정이면 기존 값, 등록이면 기본값(1년 전체).
  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setIsEditMode(editing !== null);
    if (editing) {
      const split = splitReason(editing.reason);
      setMemberId(editing.clubMemberId);
      setReason(split.reason);
      setCustomReason(split.customReason);
      setStartMonth(editing.startMonth);
      setEndMonth(editing.endMonth);
    } else {
      setMemberId(null);
      setReason('');
      setCustomReason('');
      setStartMonth(1);
      setEndMonth(12);
    }
  }, [isOpen, editing]);

  const availableMembers = members.filter(
    (m) => !exemptedMemberIds.includes(m.id)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!memberId || (!reason && !customReason)) return;
    if (startMonth > endMonth) {
      setError('종료 월은 시작 월보다 앞설 수 없습니다');
      return;
    }
    onSubmit({
      clubMemberId: memberId,
      reason: reason === '기타' ? customReason : reason,
      startMonth,
      endMonth,
    });
  };

  return (
    <Sheet
      open={isOpen}
      onClose={onClose}
      title={`${year}년 회비 면제 ${isEditMode ? '수정' : '등록'}`}
      footer={
        <div className="flex gap-2">
          {editing && onDelete && (
            <Button
              type="button"
              variant="destructive"
              onClick={() => onDelete(editing)}
              disabled={isSubmitting}
            >
              삭제
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={onClose}
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
            pendingText={isEditMode ? '수정 중...' : '등록 중...'}
            pendingPosition="left"
          >
            {isEditMode ? '수정' : '등록'}
          </Button>
        </div>
      }
    >
      {/* 회원 목록이 아래로 펼쳐지므로 시트 안에 그만큼의 높이를 둔다. */}
      <form id={FORM_ID} onSubmit={handleSubmit} className="min-h-80 space-y-4">
        <div className="space-y-1">
          <span className={labelClass}>회원</span>
          {editing ? (
            <p className="flex min-h-11 items-center text-body text-primary">
              {editing.clubMember?.name || '(이름 없음)'}
            </p>
          ) : (
            <MemberSelectDropdown
              members={availableMembers}
              selectedMemberId={memberId}
              onSelect={setMemberId}
              placeholder="회원 선택"
              disabled={isSubmitting}
            />
          )}
        </div>

        <fieldset className="space-y-1">
          <legend className={labelClass}>면제 기간</legend>
          <div className="flex items-center gap-2">
            <Select
              aria-label="시작 월"
              placeholder={null}
              options={MONTH_OPTIONS}
              value={String(startMonth)}
              onChange={(e) => setStartMonth(Number(e.target.value))}
              disabled={isSubmitting}
            />
            <span aria-hidden className="text-secondary">
              ~
            </span>
            <Select
              aria-label="종료 월"
              placeholder={null}
              options={MONTH_OPTIONS}
              value={String(endMonth)}
              onChange={(e) => setEndMonth(Number(e.target.value))}
              disabled={isSubmitting}
            />
          </div>
          <p className="text-caption text-secondary">
            연중에 면제가 된 회원은 시작 월을 고르세요. 그 전 달은 일반 회원처럼
            냅니다.
          </p>
        </fieldset>

        <fieldset className="space-y-1">
          <legend className={labelClass}>면제 사유</legend>
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

        {error && (
          <p role="alert" className="text-footnote text-negative">
            {error}
          </p>
        )}
      </form>
    </Sheet>
  );
}

export default ExemptionRegisterSheet;
