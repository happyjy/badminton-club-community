import { PAYMENT_KIND_LABEL } from '@/components/organisms/membership-fee/paymentRecordDisplay';

import { cn } from '@/lib/utils';
import { PaymentRecord } from '@/types/membership-fee.types';

interface UploadResultSummaryProps {
  /** 방금 올린 배치의 입금 내역. 확정·분류 변경에 따라 숫자가 따라 바뀐다 */
  records: PaymentRecord[];
}

interface Stat {
  label: string;
  value: number;
  /** 숫자의 글자색 */
  tone?: string;
}

function StatRow({
  name,
  stats,
  className,
}: {
  name: string;
  stats: Stat[];
  className: string;
}) {
  return (
    <div role="group" aria-label={name}>
      <h3 className="mb-1 text-footnote font-medium text-secondary">{name}</h3>
      <dl className={cn('grid gap-2', className)}>
        {stats.map(({ label, value, tone = 'text-primary' }) => (
          <div
            key={label}
            className="flex flex-col-reverse rounded-md bg-surface-muted p-3 text-center"
          >
            <dt className="text-footnote text-secondary">{label}</dt>
            <dd className={cn('text-title', tone)}>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * 업로드 결과 요약. 올린 입금이 무엇으로 분류됐는지와, 회비가 어디까지 처리됐는지를 보인다.
 */
export function UploadResultSummary({ records }: UploadResultSummaryProps) {
  const count = (predicate: (record: PaymentRecord) => boolean) =>
    records.filter(predicate).length;
  const fees = records.filter((record) => record.kind === 'FEE');
  const feeCount = (predicate: (record: PaymentRecord) => boolean) =>
    fees.filter(predicate).length;

  return (
    <div className="space-y-3">
      <StatRow
        name="분류"
        className="grid-cols-3 sm:grid-cols-6"
        stats={[
          { label: '전체', value: records.length },
          { label: PAYMENT_KIND_LABEL.FEE, value: fees.length },
          {
            label: PAYMENT_KIND_LABEL.JOINING_FEE,
            value: count((r) => r.kind === 'JOINING_FEE'),
          },
          {
            label: PAYMENT_KIND_LABEL.EVENT,
            value: count((r) => r.kind === 'EVENT'),
          },
          {
            label: PAYMENT_KIND_LABEL.OTHER,
            value: count((r) => r.kind === 'OTHER'),
          },
          {
            label: PAYMENT_KIND_LABEL.INTEREST,
            value: count((r) => r.kind === 'INTEREST'),
          },
        ]}
      />
      <StatRow
        name="회비 처리"
        className="grid-cols-3 sm:grid-cols-5"
        stats={[
          {
            label: '확정',
            value: feeCount((r) => r.status === 'CONFIRMED'),
            tone: 'text-positive',
          },
          { label: '매칭됨', value: feeCount((r) => r.status === 'MATCHED') },
          { label: '대기', value: feeCount((r) => r.status === 'PENDING') },
          {
            label: '에러',
            value: feeCount((r) => r.status === 'ERROR'),
            tone: 'text-negative',
          },
          {
            label: '검토 필요',
            value: feeCount((r) => r.needsReview),
            tone: 'text-warning',
          },
        ]}
      />
    </div>
  );
}

export default UploadResultSummary;
