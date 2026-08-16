import { useRouter } from 'next/router';

import toast from 'react-hot-toast';

import TournamentForm from '@/components/organisms/tournament/admin/TournamentForm';

import { useSaveTournament } from '@/hooks/useTournamentAdmin';
import { useTournamentDetail } from '@/hooks/useTournamentDetail';

import type { TournamentInput } from '@/types/tournament.types';

const EMPTY_TOURNAMENT: TournamentInput = {
  title: '',
  hostName: '',
  description: '',
  applyNotice: '',
  tournamentDate: '',
  location: '',
  applyStartAt: null,
  applyDeadline: '',
  status: 'DRAFT',
  useTeamName: false,
  tshirtSizes: [],
  bankAccount: '',
  ageGroups: [],
  levels: [],
  eventTypes: [{ name: '', playerCount: 2, fee: 0, order: 0 }],
};

function NewTournamentPage() {
  const router = useRouter();
  const clubId = router.query.id as string | undefined;
  const copyFrom = router.query.copyFrom as string | undefined;

  const saveTournament = useSaveTournament(clubId);
  // copyFrom이 없으면 enabled: false라 요청이 나가지 않는다
  const { data: source, isLoading } = useTournamentDetail(clubId, copyFrom);

  const onSubmitForm = async (input: TournamentInput) => {
    try {
      const created = await saveTournament.mutateAsync({
        input,
        tournamentId: null,
      });
      toast.success('대회를 생성했습니다.');
      router.push(`/clubs/${clubId}/tournaments/${created.id}`);
    } catch (error) {
      const message =
        (error as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? '대회 생성 중 오류가 발생했습니다.';
      toast.error(message);
    }
  };

  if (copyFrom && isLoading) {
    return <div className="p-6 text-center text-gray-500">불러오는 중...</div>;
  }

  // 복사: 종목 구성·티셔츠·폼 설정만 가져오고 날짜와 제목은 비운다.
  // id를 제거해야 새 대회의 신규 종목으로 생성된다.
  const defaultValues: TournamentInput = source
    ? {
        ...EMPTY_TOURNAMENT,
        hostName: source.tournament.hostName ?? '',
        location: source.tournament.location ?? '',
        description: source.tournament.description ?? '',
        applyNotice: source.tournament.applyNotice ?? '',
        bankAccount: source.tournament.bankAccount ?? '',
        useTeamName: source.tournament.useTeamName,
        tshirtSizes: source.tournament.tshirtSizes,
        ageGroups: source.tournament.ageGroups,
        levels: source.tournament.levels,
        eventTypes: source.tournament.eventTypes
          .filter((eventType) => eventType.isActive)
          .map((eventType, index) => ({
            name: eventType.name,
            playerCount: eventType.playerCount,
            fee: eventType.fee,
            order: index,
          })),
      }
    : EMPTY_TOURNAMENT;

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <h1 className="mb-2 text-xl font-bold">대회 만들기</h1>
      {source && (
        <p className="mb-6 rounded-md bg-blue-50 p-3 text-sm text-blue-700">
          &lsquo;{source.tournament.title}&rsquo;의 종목 구성을 가져왔습니다.
          대회명과 일정을 새로 입력해주세요.
        </p>
      )}
      <TournamentForm
        // 복사 데이터가 도착한 뒤 폼을 다시 초기화하기 위한 key
        key={source?.tournament.id ?? 'new'}
        defaultValues={defaultValues}
        submitLabel="대회 생성"
        isSubmitting={saveTournament.isPending}
        onSubmitForm={onSubmitForm}
      />
    </div>
  );
}

export default NewTournamentPage;
