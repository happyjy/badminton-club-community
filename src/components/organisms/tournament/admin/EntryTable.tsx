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
    <div className="overflow-x-auto">
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
            const activeEvents = entry.entryEvents.filter(
              (event) => event.status === 'ACTIVE'
            );

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
                      {formatEventLabel({
                        eventType: event.eventType.name,
                        ageGroup: event.ageGroup,
                        level: event.level,
                      })}
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
                  <select
                    value={entry.paymentStatus}
                    onChange={(e) =>
                      onChangePaymentStatus(
                        entry.id,
                        e.target.value as EntryPaymentStatus
                      )
                    }
                    className={`rounded border-none px-2 py-1 text-xs font-medium ${PAYMENT_CLASS[entry.paymentStatus]}`}
                  >
                    {(
                      [
                        'PENDING',
                        'CONFIRMED',
                        'CANCELED',
                      ] as EntryPaymentStatus[]
                    ).map((status) => (
                      <option key={status} value={status}>
                        {PAYMENT_LABEL[status]}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default EntryTable;
