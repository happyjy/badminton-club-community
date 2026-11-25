import { useEffect, useState } from 'react';

import { StatusChip } from '@/components/atoms/StatusChip';
import {
  confirmedLabel,
  FEE_RECORD_STATUS_LABEL,
  formatFeeAmount,
  formatMatchedMembers,
  formatTransactionDate,
  getRecordMemberIds,
  PAYMENT_KIND_LABEL,
} from '@/components/organisms/membership-fee/paymentRecordDisplay';
import {
  PaymentRecordActions,
  PaymentRecordSheet,
} from '@/components/organisms/membership-fee/PaymentRecordSheet';
import {
  Column,
  DataTable,
  RowKey,
} from '@/components/organisms/table/DataTable';

import { PaymentRecord } from '@/types/membership-fee.types';

interface PaymentRecordsViewProps extends PaymentRecordActions {
  records: PaymentRecord[];
  /** 있으면 표에 체크박스 열이 생긴다. 일괄 동작이 정의된 탭에서만 준다 */
  selection?: { selected: string[]; onChange: (ids: string[]) => void };
}

const statusChip = (record: PaymentRecord) => (
  <StatusChip domain="feeRecord" status={record.status}>
    {FEE_RECORD_STATUS_LABEL[record.status]}
  </StatusChip>
);

const COLUMNS: Column<PaymentRecord>[] = [
  {
    key: 'transactionDate',
    header: '거래일',
    cell: (record) => formatTransactionDate(record.transactionDate),
    sortValue: (record) => new Date(record.transactionDate).getTime(),
    className: 'whitespace-nowrap',
  },
  {
    key: 'depositorName',
    header: '입금자명',
    cell: (record) => record.depositorName,
    sortValue: (record) => record.depositorName,
  },
  {
    key: 'amount',
    header: '금액',
    cell: (record) => (
      <div className="flex flex-col items-end gap-0.5">
        <span>{`${record.amount.toLocaleString()}원`}</span>
        {record.nonFeeAmount > 0 && (
          <span className="text-caption text-secondary">
            {formatFeeAmount(record)}
          </span>
        )}
      </div>
    ),
    sortValue: (record) => record.amount,
    align: 'right',
    className: 'whitespace-nowrap',
  },
  {
    key: 'matchedMember',
    header: '매칭 회원',
    cell: (record) => {
      const names = formatMatchedMembers(record);
      return (
        <div className="flex flex-col gap-0.5">
          {names ? (
            <span>{names}</span>
          ) : record.kind !== 'FEE' ? (
            // 회비가 아닌 건은 회원을 매칭하지 않는다. 빨간 "미매칭"으로 할 일처럼 보이지 않게 한다.
            <span className="text-secondary">-</span>
          ) : (
            <span className="whitespace-nowrap text-negative">미매칭</span>
          )}
          {getRecordMemberIds(record).length > 0 && (
            <span className="whitespace-nowrap text-caption text-secondary">
              {record.lastPaidYearMonth
                ? `최종 납부: ${record.lastPaidYearMonth.year}년 ${record.lastPaidYearMonth.month}월`
                : '최종 납부: 없음'}
            </span>
          )}
        </div>
      );
    },
    sortValue: (record) => formatMatchedMembers(record),
  },
  {
    key: 'status',
    header: '상태',
    cell: (record) => (
      <div className="flex flex-col items-start gap-1">
        <div className="flex flex-wrap gap-1">
          {statusChip(record)}
          {record.kind !== 'FEE' && (
            <StatusChip domain="paymentKind" status={record.kind}>
              {PAYMENT_KIND_LABEL[record.kind]}
            </StatusChip>
          )}
          {record.needsReview && (
            <StatusChip tone="warning">검토 필요</StatusChip>
          )}
        </div>
        {record.errorReason && (
          <span className="text-caption text-negative">
            {record.errorReason}
          </span>
        )}
        {record.kind !== 'FEE' && record.kindReason && (
          <span className="text-caption text-secondary">
            {record.kindReason}
          </span>
        )}
        {record.reviewReasons && record.reviewReasons.length > 0 && (
          <span className="text-caption text-warning">
            {record.reviewReasons.join(' · ')}
          </span>
        )}
      </div>
    ),
    sortValue: (record) => record.status,
  },
  {
    key: 'months',
    header: '작업',
    cell: (record) =>
      record.status === 'CONFIRMED' ? (
        <span className="text-footnote text-positive">
          {confirmedLabel(record)}
        </span>
      ) : record.status === 'SKIPPED' ? (
        <span className="whitespace-nowrap text-footnote text-secondary">
          건너뜀
        </span>
      ) : null,
  },
];

/** 리스트의 둘째 줄. 표의 열이 없으므로 에러 사유와 확정된 월도 여기에 싣는다. */
const listSubtitle = (record: PaymentRecord) =>
  [
    formatTransactionDate(record.transactionDate),
    `${record.amount.toLocaleString()}원`,
    record.kind !== 'FEE'
      ? PAYMENT_KIND_LABEL[record.kind]
      : formatMatchedMembers(record) || '미매칭',
    record.needsReview ? '검토 필요' : null,
    record.errorReason,
    record.status === 'CONFIRMED' ? confirmedLabel(record) : null,
  ]
    .filter(Boolean)
    .join(' · ');

/**
 * 입금 내역 표와 한 건의 상세 시트. 입금 내역 처리와 업로드 화면이 함께 쓴다.
 * 행에는 동작 버튼을 두지 않는다. 행을 눌러 시트에서 한다 (휴대폰 리스트에서도 같다).
 */
export function PaymentRecordsView({
  records,
  selection,
  ...actions
}: PaymentRecordsViewProps) {
  // 행 객체가 아니라 id를 들고 있는다. 회원을 고치면 records가 새로 오는데,
  // 그때 시트가 옛 추천월을 보여 주면 안 된다.
  const [openId, setOpenId] = useState<string | null>(null);
  const openRecord = records.find((record) => record.id === openId) ?? null;

  // 열어 둔 건이 목록에서 빠지면(상태가 바뀌어 이 탭에 없거나 필터에 걸림) 연 것도 잊는다.
  // 잊지 않으면 그 건이 다시 목록에 나타날 때 시트가 저절로 열린다.
  useEffect(() => {
    if (openId !== null && openRecord === null) setOpenId(null);
  }, [openId, openRecord]);

  return (
    <>
      <DataTable
        aria-label="입금 내역"
        rows={records}
        rowKey={(record) => record.id}
        columns={COLUMNS}
        list={{
          title: (record) => record.depositorName,
          subtitle: listSubtitle,
          trailing: statusChip,
        }}
        onRowClick={(record) => setOpenId(record.id)}
        empty="입금 내역이 없습니다."
        selection={
          selection && {
            selected: new Set<RowKey>(selection.selected),
            onChange: (next) => selection.onChange(Array.from(next, String)),
            label: (record) => record.depositorName,
          }
        }
      />
      <PaymentRecordSheet
        record={openRecord}
        onClose={() => setOpenId(null)}
        {...actions}
      />
    </>
  );
}

export default PaymentRecordsView;
