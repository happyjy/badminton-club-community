import { useRouter } from 'next/router';

import toast from 'react-hot-toast';

import TournamentForm from '@/components/organisms/tournament/admin/TournamentForm';

import { useSaveTournament } from '@/hooks/useTournamentAdmin';
import { useTournamentDetail } from '@/hooks/useTournamentDetail';

import type { TournamentInput } from '@/types/tournament.types';

/** datetime-local 입력이 요구하는 'YYYY-MM-DDTHH:mm' 형식으로 변환한다. */
function toLocalInputValue(value: string | Date | null): string {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function EditTournamentPage() {
  const router = useRouter();
  const clubId = router.query.id as string | undefined;
  const tournamentId = router.query.tournamentId as string | undefined;

  const { data: detail, isLoading } = useTournamentDetail(clubId, tournamentId);
  const saveTournament = useSaveTournament(clubId);

  const onSubmitForm = async (input: TournamentInput) => {
    if (!tournamentId) return;
    try {
      await saveTournament.mutateAsync({ input, tournamentId });
      toast.success('대회를 수정했습니다.');
      router.push(`/clubs/${clubId}/tournaments/${tournamentId}`);
    } catch (error) {
      const message =
        (error as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? '대회 수정 중 오류가 발생했습니다.';
      toast.error(message);
    }
  };

  if (isLoading) {
    return <div className="p-6 text-center text-gray-500">불러오는 중...</div>;
  }
  if (!detail) {
    return (
      <div className="p-6 text-center text-gray-500">
        대회를 찾을 수 없습니다.
      </div>
    );
  }

  const { tournament } = detail;
  const defaultValues: TournamentInput = {
    title: tournament.title,
    hostName: tournament.hostName ?? '',
    description: tournament.description ?? '',
    tournamentDate: tournament.tournamentDate ?? '',
    location: tournament.location ?? '',
    applyStartAt: toLocalInputValue(tournament.applyStartAt),
    applyDeadline: toLocalInputValue(tournament.applyDeadline),
    status: tournament.status,
    useTeamName: tournament.useTeamName,
    tshirtSizes: tournament.tshirtSizes,
    bankAccount: tournament.bankAccount ?? '',
    ageGroups: tournament.ageGroups,
    levels: tournament.levels,
    // 비활성 종목은 편집 목록에서 제외한다.
    // 목록에 없으면 서버가 비활성 상태를 유지하므로 기존 신청은 안전하다.
    eventTypes: tournament.eventTypes
      .filter((eventType) => eventType.isActive)
      .map((eventType, index) => ({
        id: eventType.id,
        name: eventType.name,
        playerCount: eventType.playerCount,
        fee: eventType.fee,
        order: index,
      })),
  };

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <h1 className="mb-6 text-xl font-bold">대회 수정</h1>
      <TournamentForm
        defaultValues={defaultValues}
        submitLabel="수정 저장"
        isSubmitting={saveTournament.isPending}
        onSubmitForm={onSubmitForm}
      />
    </div>
  );
}

export default EditTournamentPage;
