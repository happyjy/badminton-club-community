import { useRouter } from 'next/router';

import toast from 'react-hot-toast';

import { useConfirm } from '@/components/organisms/sheet/ConfirmProvider';

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

  const confirm = useConfirm();
  const onClickCancelEvent = async (entryEventId: string, label: string) => {
    if (!myEntry) return;
    if (
      !(await confirm({
        title: `'${label}' 종목 신청을 취소할까요?`,
        confirmLabel: '신청 취소',
        cancelLabel: '닫기',
        destructive: true,
      }))
    ) {
      return;
    }

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
    return <div className="p-6 text-center text-secondary">불러오는 중...</div>;
  }

  if (!myEntry) {
    return (
      <div className="p-6 text-center">
        <p className="mb-4 text-secondary">아직 신청 내역이 없습니다.</p>
        {isOpen && (
          <button
            type="button"
            onClick={() =>
              router.push(`/clubs/${clubId}/tournaments/${tournamentId}/apply`)
            }
            className="rounded-md bg-accent px-4 py-2 text-on-accent"
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-large-title text-primary">내 신청 내역</h1>
        <span
          className={`rounded-full px-2 py-0.5 text-footnote font-medium ${PAYMENT_CLASS[myEntry.paymentStatus]}`}
        >
          {PAYMENT_LABEL[myEntry.paymentStatus]}
        </span>
      </div>

      <div className="rounded-md bg-fill p-4">
        <div className="flex items-center justify-between">
          <span className="font-medium text-primary">납부하실 금액</span>
          <span className="text-large-title text-primary">
            {formatFee(myEntry.totalFee)}
          </span>
        </div>
        <p className="mt-2 text-callout text-secondary">
          입금자명: {myEntry.depositorName}
        </p>
        {detail?.tournament.bankAccount && (
          <p className="text-callout text-secondary">
            입금 계좌: {detail.tournament.bankAccount}
          </p>
        )}
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold">신청 종목</h2>
        {activeEvents.map((event) => {
          const label = formatEventLabel({
            eventType: event.eventType.name,
            ageGroup: event.ageGroup,
            level: event.level,
          });
          const names = event.eventPlayers
            .map((ep) => playerNameById.get(ep.entryPlayerId))
            .filter(Boolean)
            .join(', ');

          return (
            <div
              key={event.id}
              className="flex items-start justify-between rounded-md p-4 bg-surface"
            >
              <div>
                <p className="font-medium">{label}</p>
                <p className="mt-1 text-callout text-secondary">{names}</p>
                <p className="mt-1 text-callout text-secondary">
                  {formatFee(event.fee)}
                </p>
              </div>
              {isOpen && (
                <button
                  type="button"
                  onClick={() => onClickCancelEvent(event.id, label)}
                  disabled={cancelEvent.isPending}
                  className="text-callout text-negative disabled:text-tertiary"
                >
                  취소
                </button>
              )}
            </div>
          );
        })}

        {canceledEvents.length > 0 && (
          <div className="space-y-2 pt-2">
            <h3 className="text-callout font-medium text-secondary">
              취소한 종목
            </h3>
            {canceledEvents.map((event) => (
              <div
                key={event.id}
                className="rounded-md bg-fill p-3 text-callout text-secondary line-through"
              >
                {formatEventLabel({
                  eventType: event.eventType.name,
                  ageGroup: event.ageGroup,
                  level: event.level,
                })}{' '}
                · {formatFee(event.fee)}
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
          className="w-full rounded-md border border-accent py-3 font-medium text-primary"
        >
          {myEntry.paymentStatus === 'CANCELED'
            ? '다시 신청하기'
            : '신청 내용 수정'}
        </button>
      ) : (
        <p className="text-center text-callout text-secondary">
          신청이 마감되어 수정·취소할 수 없습니다.
        </p>
      )}
    </div>
  );
}

export default MyEntryPage;
