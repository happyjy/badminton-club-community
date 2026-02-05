import { PaymentRecordStatus } from '@prisma/client';

interface RecordStatusBadgeProps {
  status: PaymentRecordStatus;
}

const statusConfig: Record<
  PaymentRecordStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: '대기',
    className: 'bg-gray-100 text-gray-700',
  },
  MATCHED: {
    label: '매칭됨',
    className: 'bg-blue-100 text-blue-700',
  },
  ERROR: {
    label: '에러',
    className: 'bg-red-100 text-red-700',
  },
  CONFIRMED: {
    label: '확정',
    className: 'bg-green-100 text-green-700',
  },
  SKIPPED: {
    label: '건너뜀',
    className: 'bg-yellow-100 text-yellow-700',
  },
};

function RecordStatusBadge({ status }: RecordStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}

export default RecordStatusBadge;
