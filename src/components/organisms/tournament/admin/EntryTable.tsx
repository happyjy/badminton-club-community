import {
  formatEventLabel,
  formatFee,
  PAYMENT_CLASS,
  PAYMENT_LABEL,
} from '@/lib/tournament/display';
import type {
  EntryForAdmin,
  EntryPaymentStatus,
} from '@/types/tournament.types';

interface EntryTableProps {
  entries: EntryForAdmin[];
  onChangePaymentStatus: (
    entryId: string,
    paymentStatus: EntryPaymentStatus
  ) => void;
}

const PAYMENT_STATUSES: EntryPaymentStatus[] = [
  'PENDING',
  'CONFIRMED',
  'CANCELED',
];

function getActiveEvents(
  entry: EntryForAdmin
): Array<{ id: string; label: string }> {
  return entry.entryEvents
    .filter((event) => event.status === 'ACTIVE')
    .map((event) => ({
      id: event.id,
      label: formatEventLabel({
        eventType: event.eventType.name,
        ageGroup: event.ageGroup,
        level: event.level,
      }),
    }));
}

function PaymentStatusSelect({
  entry,
  onChangePaymentStatus,
}: {
  entry: EntryForAdmin;
  onChangePaymentStatus: EntryTableProps['onChangePaymentStatus'];
}) {
  return (
    <select
      value={entry.paymentStatus}
      onChange={(e) =>
        onChangePaymentStatus(entry.id, e.target.value as EntryPaymentStatus)
      }
      className={`rounded border-none px-2 py-1 text-xs font-medium ${PAYMENT_CLASS[entry.paymentStatus]}`}
    >
      {PAYMENT_STATUSES.map((status) => (
        <option key={status} value={status}>
          {PAYMENT_LABEL[status]}
        </option>
      ))}
    </select>
  );
}

/** 신청서 단위 뷰 — 통장 대조용 */
function EntryTable({ entries, onChangePaymentStatus }: EntryTableProps) {
  if (entries.length === 0) {
    return (
      <p className="rounded-md bg-gray-50 p-6 text-center text-sm text-gray-500">
        신청 내역이 없습니다.
      </p>
    );
  }

  return (
    <>
      {/* 모바일: 카드 목록 */}
      <ul className="space-y-3 sm:hidden">
        {entries.map((entry) => {
          const activeEvents = getActiveEvents(entry);

          return (
            <li
              key={entry.id}
              className="rounded-lg border border-gray-200 p-3 text-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium">{entry.clubMember?.name ?? '-'}</p>
                  {entry.teamName && (
                    <p className="text-xs text-gray-400">{entry.teamName}</p>
                  )}
                </div>
                <PaymentStatusSelect
                  entry={entry}
                  onChangePaymentStatus={onChangePaymentStatus}
                />
              </div>

              <dl className="mt-2 space-y-1 text-xs text-gray-600">
                <div className="flex gap-2">
                  <dt className="w-14 shrink-0 text-gray-400">입금자명</dt>
                  <dd className="min-w-0 break-words">{entry.depositorName}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-14 shrink-0 text-gray-400">종목</dt>
                  <dd className="min-w-0">
                    {activeEvents.length > 0 ? (
                      activeEvents.map((event) => (
                        <p key={event.id}>{event.label}</p>
                      ))
                    ) : (
                      <span className="text-gray-400">전체 취소됨</span>
                    )}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-14 shrink-0 text-gray-400">청구액</dt>
                  <dd className="font-medium text-gray-900">
                    {formatFee(entry.totalFee)}
                  </dd>
                </div>
              </dl>
            </li>
          );
        })}
      </ul>

      {/* PC: 표 */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2">신청자</th>
              <th className="py-2">입금자명</th>
              <th className="py-2">종목</th>
              <th className="py-2 text-right">청구액</th>
              <th className="py-2">입금 상태</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const activeEvents = getActiveEvents(entry);

              return (
                <tr key={entry.id} className="border-b align-top last:border-0">
                  <td className="py-3">
                    {entry.clubMember?.name ?? '-'}
                    {entry.teamName && (
                      <p className="text-xs text-gray-400">{entry.teamName}</p>
                    )}
                  </td>
                  <td className="py-3">{entry.depositorName}</td>
                  <td className="py-3">
                    {activeEvents.map((event) => (
                      <p key={event.id} className="text-xs">
                        {event.label}
                      </p>
                    ))}
                    {activeEvents.length === 0 && (
                      <span className="text-xs text-gray-400">전체 취소됨</span>
                    )}
                  </td>
                  <td className="py-3 text-right font-medium">
                    {formatFee(entry.totalFee)}
                  </td>
                  <td className="py-3">
                    <PaymentStatusSelect
                      entry={entry}
                      onChangePaymentStatus={onChangePaymentStatus}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default EntryTable;
