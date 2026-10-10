import { useEffect, useState } from 'react';

import { Button } from '@/components/atoms/buttons/Button';
import { Checkbox } from '@/components/atoms/inputs/Checkbox';
import { Select } from '@/components/atoms/inputs/Select';
import MemberSelectDropdown from '@/components/molecules/membership-fee/MemberSelectDropdown';
import { Sheet } from '@/components/organisms/sheet/Sheet';

import {
  CoupleHistory,
  CoupleHistoryUpsertInput,
} from '@/types/membership-fee.types';

interface Member {
  id: number;
  name: string | null;
}

interface CoupleHistoryUpsertSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CoupleHistoryUpsertInput) => void;
  members: Member[];
  /** 수정 모드면 채워서 전달, 신규면 null */
  editing: CoupleHistory | null;
  /** 있으면 수정 모드에서 삭제 버튼을 보인다 */
  onDelete?: (historyId: number) => void;
  isSubmitting?: boolean;
}

const FORM_ID = 'couple-history-form';

const YEAR_OPTIONS = Array.from({ length: 11 }, (_, i) => ({
  value: String(2020 + i),
  label: `${2020 + i}년`,
}));
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1}월`,
}));

function getDefaultYear() {
  return new Date().getFullYear();
}

const labelClass = 'block text-footnote font-medium text-secondary';

export function CoupleHistoryUpsertSheet({
  isOpen,
  onClose,
  onSubmit,
  members,
  editing,
  onDelete,
  isSubmitting = false,
}: CoupleHistoryUpsertSheetProps) {
  const [memberId, setMemberId] = useState<number | null>(null);
  const [partnerId, setPartnerId] = useState<number | null>(null);
  const [startYear, setStartYear] = useState<number>(getDefaultYear());
  const [startMonth, setStartMonth] = useState<number>(1);
  const [hasEnd, setHasEnd] = useState<boolean>(false);
  const [endYear, setEndYear] = useState<number>(getDefaultYear());
  const [endMonth, setEndMonth] = useState<number>(12);
  const [error, setError] = useState<string | null>(null);
  // 닫히는 애니메이션 동안 제목·버튼 글자가 "등록"으로 바뀌지 않게 열 때의 모드를 들고 있는다.
  const [isEditMode, setIsEditMode] = useState(editing !== null);

  /**
   * 시트 open / editing 변경 시 폼 초기화.
   * 수정이면 기존 값을 그대로 채우고, 신규면 기본값으로 리셋.
   */
  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setIsEditMode(editing !== null);
    if (editing) {
      const s = new Date(editing.startedAt);
      setMemberId(editing.clubMemberId);
      setPartnerId(editing.partnerClubMemberId);
      setStartYear(s.getFullYear());
      setStartMonth(s.getMonth() + 1);
      if (editing.endedAt) {
        const e = new Date(editing.endedAt);
        setHasEnd(true);
        setEndYear(e.getFullYear());
        setEndMonth(e.getMonth() + 1);
      } else {
        setHasEnd(false);
        setEndYear(getDefaultYear());
        setEndMonth(12);
      }
    } else {
      setMemberId(null);
      setPartnerId(null);
      setStartYear(getDefaultYear());
      setStartMonth(1);
      setHasEnd(false);
      setEndYear(getDefaultYear());
      setEndMonth(12);
    }
  }, [isOpen, editing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!memberId || !partnerId) {
      setError('두 회원을 모두 선택해주세요');
      return;
    }
    if (memberId === partnerId) {
      setError('같은 회원을 두 번 선택할 수 없습니다');
      return;
    }
    if (hasEnd) {
      const s = startYear * 100 + startMonth;
      const en = endYear * 100 + endMonth;
      if (s > en) {
        setError('종료 연·월은 시작 연·월 이상이어야 합니다');
        return;
      }
    }
    onSubmit({
      clubMemberId: memberId,
      partnerClubMemberId: partnerId,
      started: { year: startYear, month: startMonth },
      ended: hasEnd ? { year: endYear, month: endMonth } : null,
    });
  };

  const availableForMember = members.filter((m) => m.id !== partnerId);
  const availableForPartner = members.filter((m) => m.id !== memberId);

  return (
    <Sheet
      open={isOpen}
      onClose={onClose}
      title={`부부 관계 이력 ${isEditMode ? '수정' : '등록'}`}
      footer={
        <div className="flex gap-2">
          {editing && onDelete && (
            <Button
              type="button"
              variant="destructive"
              onClick={() => onDelete(editing.id)}
              disabled={isSubmitting}
            >
              삭제
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            className="ml-auto"
            onClick={onClose}
            disabled={isSubmitting}
          >
            취소
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            pending={isSubmitting}
            pendingText="저장 중..."
            pendingPosition="left"
          >
            {isEditMode ? '수정' : '등록'}
          </Button>
        </div>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <span className={labelClass}>회원</span>
          <MemberSelectDropdown
            members={availableForMember}
            selectedMemberId={memberId}
            onSelect={setMemberId}
            placeholder="회원 선택"
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-1">
          <span className={labelClass}>배우자</span>
          <MemberSelectDropdown
            members={availableForPartner}
            selectedMemberId={partnerId}
            onSelect={setPartnerId}
            placeholder="배우자 선택"
            disabled={isSubmitting}
          />
        </div>

        <fieldset className="space-y-1">
          <legend className={labelClass}>시작 연·월</legend>
          <div className="flex gap-2">
            <Select
              aria-label="시작 연도"
              placeholder={null}
              options={YEAR_OPTIONS}
              value={String(startYear)}
              onChange={(e) => setStartYear(Number(e.target.value))}
              disabled={isSubmitting}
            />
            <Select
              aria-label="시작 월"
              placeholder={null}
              options={MONTH_OPTIONS}
              value={String(startMonth)}
              onChange={(e) => setStartMonth(Number(e.target.value))}
              disabled={isSubmitting}
            />
          </div>
        </fieldset>

        <div className="space-y-1">
          <label className="flex min-h-11 items-center text-body text-primary">
            <Checkbox
              checked={hasEnd}
              onChange={(e) => setHasEnd(e.target.checked)}
              disabled={isSubmitting}
            />
            종료된 관계
          </label>
          {hasEnd ? (
            <div className="flex gap-2">
              <Select
                aria-label="종료 연도"
                placeholder={null}
                options={YEAR_OPTIONS}
                value={String(endYear)}
                onChange={(e) => setEndYear(Number(e.target.value))}
                disabled={isSubmitting}
              />
              <Select
                aria-label="종료 월"
                placeholder={null}
                options={MONTH_OPTIONS}
                value={String(endMonth)}
                onChange={(e) => setEndMonth(Number(e.target.value))}
                disabled={isSubmitting}
              />
            </div>
          ) : (
            <p className="text-caption text-secondary">
              체크하지 않으면 현재 진행 중(active)으로 저장됩니다.
            </p>
          )}
        </div>

        {error && (
          <p role="alert" className="text-footnote text-negative">
            {error}
          </p>
        )}
      </form>
    </Sheet>
  );
}

export default CoupleHistoryUpsertSheet;
