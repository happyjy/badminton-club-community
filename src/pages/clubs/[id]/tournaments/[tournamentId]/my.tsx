import { useRouter } from 'next/router';

import toast from 'react-hot-toast';

import { useCancelEntryEvent, useMyEntry } from '@/hooks/useMyEntry';
import { useTournamentDetail } from '@/hooks/useTournamentDetail';

import {
  formatEventLabel,
  formatFee,
  PAYMENT_CLASS,
  PAYMENT_LABEL,
} from '@/lib/tournament/display';

function MyEntryPage() {
  const router = useRouter();
  const clubId = router.query.id as string | undefined;
  const tournamentId = router.query.tournamentId as string | undefined;

  const { data: detail } = useTournamentDetail(clubId, tournamentId);
  const { data: myEntry, isLoading } = useMyEntry(clubId, tournamentId);
  const cancelEvent = useCancelEntryEvent(clubId, tournamentId);

  const isOpen = detail?.effectiveStatus === 'OPEN';

  const onClickCancelEvent = async (entryEventId: string, label: string) => {
    if (!myEntry) return;
    if (!window.confirm(`'${label}' 종목 신청을 취소할까요?`)) return;

    try {
      const result = await cancelEvent.mutateAsync({
        entryId: myEntry.id,
        entryEventId,
      });
      toast.success(result.message);
    } catch (error) {
      const message =
        (error as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? '취소 처리 중 오류가 발생했습니다.';
      toast.error(message);
    }
  };

  if (isLoading) {
    return <div className="p-6 text-center text-gray-500">불러오는 중...</div>;
  }

  if (!myEntry) {
    return (
      <div className="mx-auto max-w-2xl p-6 text-center">
        <p className="mb-4 text-gray-500">아직 신청 내역이 없습니다.</p>
        {isOpen && (
          <button
            type="button"
            onClick={() =>
              router.push(`/clubs/${clubId}/tournaments/${tournamentId}/apply`)
            }
            className="rounded-md bg-blue-600 px-4 py-2 text-white"
          >
            신청하러 가기
          </button>
        )}
      </div>
    );
  }

  const activeEvents = myEntry.entryEvents.filter(
    (event) => event.status === 'ACTIVE'
  );
  const canceledEvents = myEntry.entryEvents.filter(
    (event) => event.status === 'CANCELED'
  );
  const playerNameById = new Map(
    myEntry.players.map((player) => [player.id, player.name])
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">내 신청 내역</h1>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${PAYMENT_CLASS[myEntry.paymentStatus]}`}
        >
          {PAYMENT_LABEL[myEntry.paymentStatus]}
        </span>
      </div>

      <div className="rounded-lg bg-blue-50 p-4">
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-700">납부하실 금액</span>
          <span className="text-xl font-bold text-blue-700">
            {formatFee(myEntry.totalFee)}
          </span>
        </div>
        <p className="mt-2 text-sm text-gray-600">
          입금자명: {myEntry.depositorName}
        </p>
        {detail?.tournament.bankAccount && (
          <p className="text-sm text-gray-600">
            입금 계좌: {detail.tournament.bankAccount}
          </p>
        )}
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold">신청 종목</h2>
        {activeEvents.map((event) => {
          const label = formatEventLabel(event.eventOption);
          const names = event.eventPlayers
            .map((ep) => playerNameById.get(ep.entryPlayerId))
            .filter(Boolean)
            .join(', ');

          return (
            <div
              key={event.id}
              className="flex items-start justify-between rounded-lg border border-gray-200 p-4"
            >
              <div>
                <p className="font-medium">{label}</p>
                <p className="mt-1 text-sm text-gray-600">{names}</p>
                <p className="mt-1 text-sm text-gray-500">
                  {formatFee(event.fee)}
                </p>
              </div>
              {isOpen && (
                <button
                  type="button"
                  onClick={() => onClickCancelEvent(event.id, label)}
                  disabled={cancelEvent.isPending}
                  className="text-sm text-red-500 disabled:text-gray-300"
                >
                  취소
                </button>
              )}
            </div>
          );
        })}

        {canceledEvents.length > 0 && (
          <div className="space-y-2 pt-2">
            <h3 className="text-sm font-medium text-gray-500">취소한 종목</h3>
            {canceledEvents.map((event) => (
              <div
                key={event.id}
                className="rounded-lg bg-gray-50 p-3 text-sm text-gray-400 line-through"
              >
                {formatEventLabel(event.eventOption)} · {formatFee(event.fee)}
              </div>
            ))}
          </div>
        )}
      </section>

      {isOpen ? (
        <button
          type="button"
          onClick={() =>
            router.push(`/clubs/${clubId}/tournaments/${tournamentId}/apply`)
          }
          className="w-full rounded-md border border-blue-600 py-3 font-medium text-blue-600"
        >
          신청 내용 수정
        </button>
      ) : (
        <p className="text-center text-sm text-gray-500">
          신청이 마감되어 수정·취소할 수 없습니다.
        </p>
      )}
    </div>
  );
}

export default MyEntryPage;
