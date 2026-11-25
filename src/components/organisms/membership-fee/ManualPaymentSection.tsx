import { useState } from 'react';

import { Plus } from 'lucide-react';

import { Button } from '@/components/atoms/buttons/Button';
import { Input } from '@/components/atoms/inputs/Input';
import { FormField } from '@/components/molecules/form/FormField';
import { ListGroup } from '@/components/molecules/list/ListGroup';
import { ListRow } from '@/components/molecules/list/ListRow';
import { Sheet } from '@/components/organisms/sheet/Sheet';

import { MANUAL_PAYMENT_REASONS } from '@/lib/membership-fee/manualPayment';
import type { ManualPaymentItem } from '@/types/membership-fee.types';

/** 시트에서 넣은 값. reason은 고른 사유 또는 기타에 쓴 글 */
export interface ManualPaymentFormValue {
  year: number;
  month: number;
  amount: number;
  reason: string;
}

interface ManualPaymentSectionProps {
  payments: ManualPaymentItem[];
  saving: boolean;
  /** 연월을 고르면 부른다. 금액 칸을 미리 채운다 (null이면 비워 둔다) */
  onSuggestAmount: (year: number, month: number) => Promise<number | null>;
  /** 저장에 성공하면 true. 그때 시트를 닫는다 */
  onAdd: (value: ManualPaymentFormValue) => Promise<boolean>;
  onDelete: (paymentId: string) => void;
}

const pad = (month: number) => String(month).padStart(2, '0');
const won = (amount: number) => `${amount.toLocaleString('ko-KR')}원`;

/** "2026.09 · 25,000원 · 다른 계좌로 보냄" */
const rowTitle = (payment: ManualPaymentItem) =>
  `${payment.year}.${pad(payment.month)} · ${won(payment.amount)} · ${payment.reason}`;

const labelClass = 'block text-footnote font-medium text-secondary';

/** 회원 상세의 "직접 추가한 납부": 통장 입금 없이 낸 것으로 칠 달의 목록과 추가·삭제 시트. */
export function ManualPaymentSection({
  payments,
  saving,
  onSuggestAmount,
  onAdd,
  onDelete,
}: ManualPaymentSectionProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [yearMonth, setYearMonth] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [selected, setSelected] = useState<ManualPaymentItem | null>(null);

  const openAdd = () => {
    setYearMonth('');
    setAmount('');
    setReason('');
    setCustomReason('');
    setIsAddOpen(true);
  };

  const changeYearMonth = async (value: string) => {
    setYearMonth(value);
    const [year, month] = value.split('-').map(Number);
    if (!year || !month) return;
    const suggested = await onSuggestAmount(year, month);
    setAmount(suggested == null ? '' : String(suggested));
  };

  const finalReason = reason === '기타' ? customReason.trim() : reason;
  const amountNumber = Number(amount);
  const canSave =
    /^\d{4}-\d{2}$/.test(yearMonth) &&
    Number.isInteger(amountNumber) &&
    amountNumber > 0 &&
    finalReason.length > 0;

  const submit = async () => {
    if (!canSave) return;
    const [year, month] = yearMonth.split('-').map(Number);
    if (await onAdd({ year, month, amount: amountNumber, reason: finalReason }))
      setIsAddOpen(false);
  };

  const deleteSelected = () => {
    if (!selected) return;
    onDelete(selected.id);
    setSelected(null);
  };

  return (
    <>
      <ListGroup
        label="직접 추가한 납부"
        footer="통장 입금 없이 낸 것으로 칠 달입니다. 납부 현황에는 완납으로 보이고, 총 수입에는 넣지 않습니다."
      >
        {payments.map((payment) => (
          <ListRow
            key={payment.id}
            title={rowTitle(payment)}
            onClick={() => setSelected(payment)}
          />
        ))}
        <div className="px-4 py-3">
          <Button type="button" size="sm" variant="secondary" onClick={openAdd}>
            <Plus aria-hidden className="mr-1 h-4 w-4" />
            납부 직접 추가
          </Button>
        </div>
      </ListGroup>

      <Sheet
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="납부 직접 추가"
        footer={
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="ml-auto"
              onClick={() => setIsAddOpen(false)}
              disabled={saving}
            >
              취소
            </Button>
            <Button
              type="button"
              onClick={submit}
              disabled={!canSave}
              pending={saving}
              pendingText="저장 중…"
              pendingPosition="left"
            >
              저장
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <FormField label="연월" required>
            <Input
              type="month"
              value={yearMonth}
              onChange={(e) => void changeYearMonth(e.target.value)}
            />
          </FormField>
          <FormField label="금액 (원)" required>
            <Input
              type="number"
              min={1}
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </FormField>
          <fieldset className="space-y-1">
            <legend className={labelClass}>사유</legend>
            {MANUAL_PAYMENT_REASONS.map((option) => (
              <label
                key={option}
                className="flex min-h-11 items-center gap-2 text-body text-primary"
              >
                <input
                  type="radio"
                  name="manual-payment-reason"
                  value={option}
                  checked={reason === option}
                  onChange={(e) => setReason(e.target.value)}
                  className="h-5 w-5 accent-accent"
                />
                <span>{option}</span>
              </label>
            ))}
            {reason === '기타' && (
              <Input
                type="text"
                aria-label="사유 직접 쓰기"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="예: 재무 표 기준"
                maxLength={100}
              />
            )}
          </fieldset>
        </div>
      </Sheet>

      <Sheet
        open={selected != null}
        onClose={() => setSelected(null)}
        title="직접 추가한 납부"
        footer={
          <div className="flex gap-2">
            <Button
              type="button"
              variant="destructive"
              onClick={deleteSelected}
              disabled={saving}
            >
              삭제
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="ml-auto"
              onClick={() => setSelected(null)}
            >
              닫기
            </Button>
          </div>
        }
      >
        {selected && (
          <dl className="space-y-2 text-body text-primary">
            <div className="flex justify-between gap-4">
              <dt className="text-secondary">연월</dt>
              <dd>
                {selected.year}년 {selected.month}월
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-secondary">금액</dt>
              <dd>{won(selected.amount)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-secondary">사유</dt>
              <dd>{selected.reason}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-secondary">넣은 날</dt>
              <dd>
                {new Date(selected.confirmedAt).toLocaleDateString('ko-KR')}
                {selected.confirmedByName
                  ? ` · ${selected.confirmedByName}`
                  : ''}
              </dd>
            </div>
          </dl>
        )}
      </Sheet>
    </>
  );
}
