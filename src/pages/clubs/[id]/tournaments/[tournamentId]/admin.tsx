import { useMemo, useState } from 'react';

import { useRouter } from 'next/router';

import toast from 'react-hot-toast';

import DeleteTournamentDialog from '@/components/organisms/tournament/admin/DeleteTournamentDialog';
import EntryTable from '@/components/organisms/tournament/admin/EntryTable';
import EventGroupList from '@/components/organisms/tournament/admin/EventGroupList';

import {
  useAdminEntries,
  useDeleteTournament,
  useUpdatePaymentStatus,
} from '@/hooks/useTournamentAdmin';
import { useTournamentDetail } from '@/hooks/useTournamentDetail';

import { formatFee } from '@/lib/tournament/display';
import { groupEntriesByEvent } from '@/lib/tournament/groupEntriesByEvent';
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

  // 종목별로 묶고, 종목 안에서는 다시 팀(파트너) 단위로 묶는다.
  const eventGroups = useMemo(() => groupEntriesByEvent(filtered), [filtered]);

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
        <div className="flex flex-wrap gap-2">
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
        <EventGroupList
          groups={eventGroups}
          useTeamName={detail?.tournament.useTeamName ?? false}
          memberLabel={
            (detail?.tournament.nonMemberSurcharge ?? 0) > 0
              ? detail?.tournament.memberLabel
              : null
          }
        />
      )}
    </div>
  );
}

export default TournamentAdminPage;
