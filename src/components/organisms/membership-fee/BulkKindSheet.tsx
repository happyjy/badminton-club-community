import { ListGroup } from '@/components/molecules/list/ListGroup';
import { ListRow } from '@/components/molecules/list/ListRow';
import { Sheet } from '@/components/organisms/sheet/Sheet';

import { PAYMENT_KIND_LABEL } from '@/lib/membership-fee/paymentKind';
import { PaymentRecordKind } from '@/types/membership-fee.types';

interface BulkKindSheetProps {
  open: boolean;
  onClose: () => void;
  /** 고른 건수 */
  count: number;
  /** 바꿀 분류를 고르면 부른다 */
  onPick: (kind: PaymentRecordKind) => void;
}

/** 자주 쓰는 순서: 표시 없이 들어온 행사 입금을 모아 정리하는 일이 가장 많다 */
const KINDS: PaymentRecordKind[] = [
  'EVENT',
  'OTHER',
  'JOINING_FEE',
  'INTEREST',
  'FEE',
];

/** "선택 항목 분류 변경". 고른 건들을 어떤 분류로 바꿀지 고른다. */
export function BulkKindSheet({
  open,
  onClose,
  count,
  onPick,
}: BulkKindSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title="선택 항목 분류 변경">
      <div className="space-y-3">
        <p className="text-callout text-primary">선택 {count}건</p>
        <ListGroup>
          {KINDS.map((kind) => (
            <ListRow
              key={kind}
              title={PAYMENT_KIND_LABEL[kind]}
              onClick={() => onPick(kind)}
            />
          ))}
        </ListGroup>
      </div>
    </Sheet>
  );
}

export default BulkKindSheet;
