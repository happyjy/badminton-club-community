import { useMemo, useState } from 'react';

import { useRouter } from 'next/router';

import toast from 'react-hot-toast';

import DeleteTournamentDialog from '@/components/organisms/tournament/admin/DeleteTournamentDialog';
import EntryTable from '@/components/organisms/tournament/admin/EntryTable';

import {
  useAdminEntries,
  useDeleteTournament,
  useUpdatePaymentStatus,
} from '@/hooks/useTournamentAdmin';
import { useTournamentDetail } from '@/hooks/useTournamentDetail';

import { formatEventLabel, formatFee } from '@/lib/tournament/display';
import type { EntryPaymentStatus } from '@/types/tournament.types';

type ViewMode = 'entry' | 'event';

function TournamentAdminPage() {
  const router = useRouter();
  const clubId = router.query.id as string | undefined;
  const tournamentId = router.query.tournamentId as string | undefined;

  const [viewMode, setViewMode] = useState<ViewMode>('entry');
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | EntryPaymentStatus>(
    'ALL'
  );

  const { data: detail } = useTournamentDetail(clubId, tournamentId);
  const { data: entries, isLoading } = useAdminEntries(clubId, tournamentId);
  const updatePayment = useUpdatePaymentStatus(clubId, tournamentId);
  const deleteTournament = useDeleteTournament(clubId);

  const filtered = useMemo(
    () =>
      (entries ?? []).filter((entry) =>
        statusFilter === 'ALL' ? true : entry.paymentStatus === statusFilter
      ),
    [entries, statusFilter]
  );

  // 종목별 신청 인원 집계
  const eventGroups = useMemo(() => {
    const groups = new Map<
      string,
      Array<{ name: string; phoneNumber: string; tshirtSize: string | null }>
    >();

    for (const entry of filtered) {
      for (const event of entry.entryEvents) {
        if (event.status !== 'ACTIVE') continue;
        const label = formatEventLabel({
          eventType: event.eventType.name,
          ageGroup: event.ageGroup,
          level: event.level,
        });
        const list = groups.get(label) ?? [];
        for (const eventPlayer of event.eventPlayers) {
          list.push({
            name: eventPlayer.entryPlayer.name,
            phoneNumber: eventPlayer.entryPlayer.phoneNumber,
            tshirtSize: eventPlayer.entryPlayer.tshirtSize,
          });
        }
        groups.set(label, list);
      }
    }
    return Array.from(groups.entries());
  }, [filtered]);

  const totalConfirmed = useMemo(
    () =>
      (entries ?? [])
        .filter((entry) => entry.paymentStatus === 'CONFIRMED')
        .reduce((sum, entry) => sum + entry.totalFee, 0),
    [entries]
  );

  const onChangePaymentStatus = async (
    entryId: string,
    paymentStatus: EntryPaymentStatus
  ) => {
    try {
      await updatePayment.mutateAsync({ entryId, paymentStatus });
      toast.success('입금 상태를 변경했습니다.');
    } catch {
      toast.error('입금 상태 변경에 실패했습니다.');
    }
  };

  const onClickDeleteTournament = async () => {
    if (!tournamentId) return;
    try {
      await deleteTournament.mutateAsync(tournamentId);
      toast.success('대회를 삭제했습니다.');
      router.push(`/clubs/${clubId}/tournaments`);
    } catch (error) {
      const message =
        (error as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? '대회 삭제 중 오류가 발생했습니다.';
      toast.error(message);
      setIsDeleteOpen(false);
    }
  };

  const onClickDownloadCsv = () => {
    window.location.href = `/api/clubs/${clubId}/tournaments/${tournamentId}/entries/export`;
  };

  if (isLoading) {
    return <div className="p-6 text-center text-gray-500">불러오는 중...</div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">신청 현황</h1>
          <p className="text-sm text-gray-500">{detail?.tournament.title}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() =>
              router.push(`/clubs/${clubId}/tournaments/${tournamentId}/edit`)
            }
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          >
            대회 수정
          </button>
          <button
            type="button"
            onClick={onClickDownloadCsv}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white"
          >
            CSV 다운로드
          </button>
          <button
            type="button"
            onClick={() => setIsDeleteOpen(true)}
            className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
          >
            대회 삭제
          </button>
        </div>
      </header>

      {isDeleteOpen && detail && (
        <DeleteTournamentDialog
          title={detail.tournament.title}
          entryCount={entries?.length ?? 0}
          isDeleting={deleteTournament.isPending}
          onConfirm={onClickDeleteTournament}
          onCancel={() => setIsDeleteOpen(false)}
        />
      )}

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">신청 건수</p>
          <p className="text-lg font-bold">{entries?.length ?? 0}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">입금 확인</p>
          <p className="text-lg font-bold">
            {
              (entries ?? []).filter((e) => e.paymentStatus === 'CONFIRMED')
                .length
            }
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">수납액</p>
          <p className="text-lg font-bold">{formatFee(totalConfirmed)}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-md border border-gray-200">
          <button
            type="button"
            onClick={() => setViewMode('entry')}
            className={`px-3 py-1.5 text-sm ${viewMode === 'entry' ? 'bg-blue-50 font-medium text-blue-700' : 'text-gray-500'}`}
          >
            신청서 단위
          </button>
          <button
            type="button"
            onClick={() => setViewMode('event')}
            className={`px-3 py-1.5 text-sm ${viewMode === 'event' ? 'bg-blue-50 font-medium text-blue-700' : 'text-gray-500'}`}
          >
            종목 단위
          </button>
        </div>

        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as 'ALL' | EntryPaymentStatus)
          }
          className="rounded-md border-gray-300 text-sm"
        >
          <option value="ALL">전체</option>
          <option value="PENDING">입금대기</option>
          <option value="CONFIRMED">입금확인</option>
          <option value="CANCELED">취소</option>
        </select>
      </div>

      {viewMode === 'entry' ? (
        <EntryTable
          entries={filtered}
          onChangePaymentStatus={onChangePaymentStatus}
        />
      ) : (
        <div className="space-y-4">
          {eventGroups.map(([label, players]) => (
            <section
              key={label}
              className="rounded-lg border border-gray-200 p-4"
            >
              <h3 className="mb-2 font-medium">
                {label}{' '}
                <span className="text-sm text-gray-400">
                  {players.length}명
                </span>
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[360px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="py-1">이름</th>
                      <th className="py-1">연락처</th>
                      <th className="py-1">티셔츠</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map((player, index) => (
                      <tr
                        key={`${player.name}-${index}`}
                        className="border-b last:border-0"
                      >
                        <td className="py-1">{player.name}</td>
                        <td className="py-1">{player.phoneNumber}</td>
                        <td className="py-1">{player.tshirtSize ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
          {eventGroups.length === 0 && (
            <p className="rounded-md bg-gray-50 p-6 text-center text-sm text-gray-500">
              신청 내역이 없습니다.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default TournamentAdminPage;
