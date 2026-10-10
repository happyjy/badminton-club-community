import { useEffect, useState } from 'react';

import { FeePeriod } from '@prisma/client';
import { toast } from 'react-hot-toast';

import { Button } from '@/components/atoms/buttons/Button';
import { Input } from '@/components/atoms/inputs/Input';
import { FormField } from '@/components/molecules/form/FormField';
import { Sheet } from '@/components/organisms/sheet/Sheet';

import {
  useBulkUpsertFeeRates,
  useCreateFeeType,
  useUpdateFeeType,
} from '@/hooks/membership-fee/useFeeTypes';

import { FeeType } from '@/types/membership-fee.types';

export const PERIOD_LABELS: Record<string, string> = {
  MONTHLY: '월납',
  QUARTERLY: '분기납',
  SEMI_ANNUAL: '반기납',
  ANNUAL: '연납',
};

interface FeeTypeFormSheetProps {
  open: boolean;
  clubId: string;
  year: number;
  /** 수정이면 그 유형, 추가면 null */
  feeType: FeeType | null;
  onClose: () => void;
  onSuccess: () => void;
  /** 있으면 수정 모드에서 삭제 버튼을 보인다 */
  onDelete?: (feeType: FeeType) => void;
}

const FORM_ID = 'fee-type-form';

/** 지금 입력받는 납부 주기. 분기납·반기납은 쓰지 않는다. */
const EDITABLE_PERIODS = ['MONTHLY', 'ANNUAL'] as const;

function ratesOf(feeType: FeeType | null) {
  const defaults = {
    MONTHLY: { amount: 0, monthCount: 1 },
    QUARTERLY: { amount: 0, monthCount: 3 },
    SEMI_ANNUAL: { amount: 0, monthCount: 6 },
    ANNUAL: { amount: 0, monthCount: 12 },
  };
  feeType?.rates?.forEach((r) => {
    const key = r.period as keyof typeof defaults;
    if (defaults[key]) {
      defaults[key] = { amount: r.amount, monthCount: r.monthCount };
    }
  });
  return defaults;
}

export function FeeTypeFormSheet({
  open,
  clubId,
  year,
  feeType,
  onClose,
  onSuccess,
  onDelete,
}: FeeTypeFormSheetProps) {
  const [name, setName] = useState(feeType?.name ?? '');
  const [description, setDescription] = useState(feeType?.description ?? '');
  const [rates, setRates] = useState(() => ratesOf(feeType));
  // 닫히는 애니메이션 동안 제목이 "추가"로 바뀌지 않게 열 때의 모드를 들고 있는다.
  const [isEditing, setIsEditing] = useState(feeType !== null);

  // 열 때마다 그 유형의 값으로 다시 채운다. 시트는 닫혀 있어도 떠 있기 때문이다.
  useEffect(() => {
    if (!open) return;
    setName(feeType?.name ?? '');
    setDescription(feeType?.description ?? '');
    setRates(ratesOf(feeType));
    setIsEditing(feeType !== null);
  }, [open, feeType]);

  const createMutation = useCreateFeeType(clubId);
  const updateMutation = useUpdateFeeType(clubId);
  const bulkRatesMutation = useBulkUpsertFeeRates(clubId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('유형 이름을 입력해주세요.');
      return;
    }

    const ratesToSave = [
      { period: FeePeriod.MONTHLY, ...rates.MONTHLY },
      { period: FeePeriod.ANNUAL, ...rates.ANNUAL },
    ].filter((r) => r.amount > 0);

    try {
      let feeTypeId: number;
      if (feeType) {
        await updateMutation.mutateAsync({
          typeId: feeType.id,
          data: {
            name: name.trim(),
            description: description.trim() || undefined,
          },
        });
        feeTypeId = feeType.id;
      } else {
        const created = await createMutation.mutateAsync({
          name: name.trim(),
          description: description.trim() || undefined,
        });
        feeTypeId = created.id;
      }
      if (ratesToSave.length > 0) {
        await bulkRatesMutation.mutateAsync({
          feeTypeId,
          year,
          rates: ratesToSave,
        });
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : '저장에 실패했습니다.';
      toast.error(message);
    }
  };

  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    bulkRatesMutation.isPending;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isEditing ? '회비 유형 수정' : '회비 유형 추가'}
      footer={
        <div className="flex gap-2">
          {feeType && onDelete && (
            <Button
              type="button"
              variant="destructive"
              onClick={() => onDelete(feeType)}
              disabled={isPending}
            >
              삭제
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            className="ml-auto"
            onClick={onClose}
            disabled={isPending}
          >
            취소
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            pending={isPending}
            pendingText="저장 중..."
            pendingPosition="left"
          >
            저장
          </Button>
        </div>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-4">
        <FormField label="유형 이름" required>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 일반, 부부, 가입비"
            maxLength={50}
          />
        </FormField>
        <FormField label="설명">
          <Input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="선택 입력"
            maxLength={200}
          />
        </FormField>
        <fieldset className="space-y-2">
          <legend className="mb-1 text-footnote font-medium text-secondary">
            {year}년 금액 (원)
          </legend>
          {EDITABLE_PERIODS.map((period) => (
            <FormField key={period} label={PERIOD_LABELS[period]}>
              <Input
                type="number"
                min={0}
                value={rates[period].amount || ''}
                onChange={(e) =>
                  setRates((prev) => ({
                    ...prev,
                    [period]: {
                      ...prev[period],
                      amount: parseInt(e.target.value, 10) || 0,
                    },
                  }))
                }
                placeholder="0"
              />
            </FormField>
          ))}
        </fieldset>
      </form>
    </Sheet>
  );
}

export default FeeTypeFormSheet;
