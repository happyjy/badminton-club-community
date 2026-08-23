import { useEffect, useMemo, useState } from 'react';

import { useRouter } from 'next/router';

import toast from 'react-hot-toast';

import DeleteTournamentDialog from '@/components/organisms/tournament/admin/DeleteTournamentDialog';
import EditPlayersDialog, {
  type EditablePlayer,
} from '@/components/organisms/tournament/admin/EditPlayersDialog';
import EntryTable from '@/components/organisms/tournament/admin/EntryTable';
import EventGroupList from '@/components/organisms/tournament/admin/EventGroupList';

import {
  useAdminEntries,
  useDeleteTournament,
  useUpdateEntryPlayers,
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
  // 선수 정보를 수정 중인 외부 신청서. null이면 창을 닫는다.
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | EntryPaymentStatus>(
    'ALL'
  );

  const { data: detail } = useTournamentDetail(clubId, tournamentId);
  const { data: entries, isLoading } = useAdminEntries(clubId, tournamentId);
  const updatePayment = useUpdatePaymentStatus(clubId, tournamentId);
  const updatePlayers = useUpdateEntryPlayers(clubId, tournamentId);
  const deleteTournament = useDeleteTournament(clubId);

  const [origin, setOrigin] = useState('');

  // window.location.origin은 서버에 없으므로, 마운트 이후에만 채운다.
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const externalApplyUrl = origin
    ? `${origin}/clubs/${clubId}/tournaments/${tournamentId}/external-apply`
    : '';
  const externalEntryUrl = origin
    ? `${origin}/clubs/${clubId}/tournaments/${tournamentId}/external-entry`
    : '';

  const onClickCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('링크를 복사했습니다.');
    } catch {
      toast.error('링크 복사에 실패했습니다. 주소를 직접 복사해 주세요.');
    }
  };

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

  // 목록이 갱신되면 창의 내용도 최신 값으로 따라온다
  const editingEntry =
    entries?.find((entry) => entry.id === editingEntryId) ?? null;

  const onSavePlayers = async (players: EditablePlayer[]) => {
    if (!editingEntryId) return;
    try {
      await updatePlayers.mutateAsync({ entryId: editingEntryId, players });
      toast.success('선수 정보를 수정했습니다.');
      setEditingEntryId(null);
    } catch (error) {
      const message =
        (error as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? '선수 정보 수정에 실패했습니다.';
      toast.error(message);
    }
  };

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

      {detail?.tournament.allowExternalEntry && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-medium text-blue-900">
            외부 신청 링크가 열려 있습니다
          </p>
          <p className="mt-1 text-xs text-blue-800">
            아래 주소를 아는 사람은 로그인 없이 신청할 수 있습니다.
          </p>

          <p className="mt-3 text-xs font-medium text-blue-900">신청 링크</p>
          <div className="mt-1 flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded bg-white px-2 py-1 text-xs">
              {externalApplyUrl}
            </code>
            <button
              type="button"
              onClick={() => onClickCopyLink(externalApplyUrl)}
              disabled={!externalApplyUrl}
              className="shrink-0 rounded-md bg-blue-600 px-3 py-1 text-xs text-white disabled:opacity-50"
            >
              복사
            </button>
          </div>

          <p className="mt-3 text-xs font-medium text-blue-900">
            신청 조회 링크
          </p>
          <div className="mt-1 flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded bg-white px-2 py-1 text-xs">
              {externalEntryUrl}
            </code>
            <button
              type="button"
              onClick={() => onClickCopyLink(externalEntryUrl)}
              disabled={!externalEntryUrl}
              className="shrink-0 rounded-md bg-blue-600 px-3 py-1 text-xs text-white disabled:opacity-50"
            >
              복사
            </button>
          </div>
        </div>
      )}

      {editingEntry && (
        <EditPlayersDialog
          applicantName={
            editingEntry.clubMember?.name ?? editingEntry.contactName ?? '-'
          }
          players={editingEntry.players.map((player) => ({
            id: player.id,
            name: player.name,
            gender: player.gender,
            birthDate: player.birthDate,
            phoneNumber: player.phoneNumber,
            tshirtSize: player.tshirtSize,
          }))}
          tshirtSizes={detail?.tournament.tshirtSizes ?? []}
          isSaving={updatePlayers.isPending}
          onSave={onSavePlayers}
          onCancel={() => setEditingEntryId(null)}
        />
      )}

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
          onEditPlayers={(entry) => setEditingEntryId(entry.id)}
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
