import { Button } from '@/components/atoms/buttons/Button';
import { Select } from '@/components/atoms/inputs/Select';
import { FormField } from '@/components/molecules/form/FormField';
import MonthSelector from '@/components/molecules/membership-fee/MonthSelector';
import { Sheet } from '@/components/organisms/sheet/Sheet';

import { UseBulkPaymentActionsResult } from '@/hooks/membership-fee/useBulkPaymentActions';

interface BulkConfirmSheetProps {
  open: boolean;
  onClose: () => void;
  /** 고른 건수 */
  count: number;
  /** 회계 연도. 연도 선택지(-1·0·+1)의 기준 */
  year: number;
  bulk: UseBulkPaymentActionsResult;
}

/** MATCHED 탭의 "선택 항목 확정". 고른 건들에 같은 연도·월을 적용한다. */
export function BulkConfirmSheet({
  open,
  onClose,
  count,
  year,
  bulk,
}: BulkConfirmSheetProps) {
  const onSubmit = async () => {
    // 결과를 받았을 때만 닫는다. 거절·오류면 고른 월을 지킨 채 남는다.
    if (await bulk.handleBulkConfirmSelected()) onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="선택 항목 확정"
      footer={
        <Button
          type="button"
          className="w-full"
          onClick={onSubmit}
          pending={bulk.isBulkConfirmPending}
          disabled={bulk.bulkSelectionMonths.length === 0}
        >
          선택 항목 확정
        </Button>
      }
    >
      <div className="space-y-3">
        <p className="text-callout text-primary">선택 {count}건</p>
        <FormField label="연도">
          <Select
            placeholder={null}
            value={String(bulk.bulkSelectionYear)}
            onChange={(e) => bulk.setBulkSelectionYear(Number(e.target.value))}
            options={[year - 1, year, year + 1].map((y) => ({
              value: String(y),
              label: `${y}년`,
            }))}
          />
        </FormField>
        <MonthSelector
          selectedMonths={bulk.bulkSelectionMonths}
          onMonthsChange={bulk.setBulkSelectionMonths}
        />
        <p className="text-caption text-secondary">
          선택한 회원들에게 위에서 고른 연도·월을 동일하게 적용합니다. (의무월
          외 / 이미 납부된 월은 자동으로 실패 처리됩니다)
        </p>
      </div>
    </Sheet>
  );
}

export default BulkConfirmSheet;
