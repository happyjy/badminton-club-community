import { useState } from 'react';

import { Button } from '@/components/atoms/buttons/Button';
import { Input } from '@/components/atoms/inputs/Input';
import { FormField } from '@/components/molecules/form/FormField';
import { Sheet } from '@/components/organisms/sheet/Sheet';

import type {
  MemberStatusDefaults,
  StatusMonthKind,
} from '@/lib/membership-fee/memberStatusChange';

interface MemberStatusMonthSheetProps {
  open: boolean;
  /** 탈퇴(탈퇴월) · 다시 가입(다시 시작하는 달) */
  kind: StatusMonthKind;
  /** 칸의 기본값. 불러오지 못했으면 null (빈 칸으로 연다) */
  defaults: MemberStatusDefaults | null;
  onCancel: () => void;
  /** 고른 달 (`YYYY-MM`) */
  onConfirm: (month: string) => void;
}

const COPY = {
  leave: { title: '탈퇴 처리', label: '탈퇴월' },
  rejoin: { title: '다시 가입 처리', label: '다시 시작하는 달' },
} as const;

const hintClass = 'text-caption text-secondary';

/**
 * 회원 관리에서 상태를 탈퇴로 바꾸거나 탈퇴에서 되돌릴 때 회비 기간의 달을 묻는다.
 * 열 때마다 기본값으로 다시 채우도록 부르는 쪽이 key를 바꿔 새로 그린다.
 */
export function MemberStatusMonthSheet({
  open,
  kind,
  defaults,
  onCancel,
  onConfirm,
}: MemberStatusMonthSheetProps) {
  const initial =
    (kind === 'leave' ? defaults?.lastPaidMonth : defaults?.rejoinStartMonth) ??
    '';
  const [month, setMonth] = useState(initial);
  const { title, label } = COPY[kind];

  const previousStart = defaults?.previousStartMonth ?? null;
  const showPreviousStart =
    previousStart !== null && previousStart !== defaults?.rejoinStartMonth;

  return (
    <Sheet
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            className="ml-auto"
            onClick={onCancel}
          >
            취소
          </Button>
          <Button
            type="button"
            disabled={!month}
            onClick={() => onConfirm(month)}
          >
            {title}
          </Button>
        </div>
      }
    >
      <div className="space-y-1">
        <FormField label={label}>
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </FormField>
        {kind === 'leave' ? (
          <>
            {defaults && defaults.lastPaidMonth === null && (
              <p className={hintClass}>낸 회비가 없습니다.</p>
            )}
            {defaults?.lastPaidMonth && month === defaults.lastPaidMonth && (
              <p className={hintClass}>마지막으로 회비를 낸 달입니다.</p>
            )}
            <p className={hintClass}>이 달까지 회비를 내야 하는 달로 봅니다.</p>
          </>
        ) : (
          <>
            <p className={hintClass}>이 달부터 회비를 냅니다.</p>
            {showPreviousStart && (
              <p className={hintClass}>
                실수로 탈퇴 처리했다면 예전 시작월({previousStart})을 고르세요.
              </p>
            )}
          </>
        )}
      </div>
    </Sheet>
  );
}
