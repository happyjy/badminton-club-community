import { useEffect } from 'react';

import { useRouter } from 'next/router';

import { FormProvider, useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';

import ApplyNotice from '@/components/organisms/tournament/entry/ApplyNotice';
import {
  createEmptyPlayer,
  type EntryFormValues,
} from '@/components/organisms/tournament/entry/entryFormTypes';
import EntrySummary from '@/components/organisms/tournament/entry/EntrySummary';
import EventListField from '@/components/organisms/tournament/entry/EventListField';
import PlayerListField from '@/components/organisms/tournament/entry/PlayerListField';

import { useMyEntry, useSubmitEntry } from '@/hooks/useMyEntry';
import { useTournamentDetail } from '@/hooks/useTournamentDetail';

import { RootState } from '@/store';

function TournamentApplyPage() {
  const router = useRouter();
  const clubId = router.query.id as string | undefined;
  const tournamentId = router.query.tournamentId as string | undefined;

  const clubMember = useSelector((state: RootState) => state.auth.clubMember);
  const { data: detail, isLoading: isDetailLoading } = useTournamentDetail(
    clubId,
    tournamentId
  );
  const { data: myEntry, isLoading: isEntryLoading } = useMyEntry(
    clubId,
    tournamentId
  );
  const submitEntry = useSubmitEntry(clubId, tournamentId);

  const methods = useForm<EntryFormValues>({
    defaultValues: {
      depositorName: '',
      teamName: '',
      players: [createEmptyPlayer(0)],
      events: [],
      privacyAgreed: false,
    },
  });

  // 기존 신청서가 있으면 폼을 채운다
  useEffect(() => {
    if (!myEntry) return;

    const playerKeyById = new Map(
      myEntry.players.map((player) => [player.id, `player-${player.id}`])
    );

    methods.reset({
      depositorName: myEntry.depositorName,
      teamName: myEntry.teamName ?? '',
      players: myEntry.players.map((player) => ({
        key: playerKeyById.get(player.id) as string,
        name: player.name,
        gender: player.gender,
        birthDate: player.birthDate,
        phoneNumber: player.phoneNumber,
        tshirtSize: player.tshirtSize ?? '',
      })),
      events: myEntry.entryEvents
        .filter((event) => event.status === 'ACTIVE')
        .map((event) => ({
          eventTypeId: event.eventType.id,
          ageGroup: event.ageGroup,
          level: event.level,
          playerKeys: event.eventPlayers
            .map((ep) => playerKeyById.get(ep.entryPlayerId))
            .filter(Boolean) as string[],
        })),
      privacyAgreed: true,
    });
  }, [myEntry, methods]);

  // 신규 신청이면 본인 정보를 선수 1로 자동 채운다.
  // 전화번호는 클라이언트 ClubMember 타입에 없어 사용자가 직접 입력한다.
  useEffect(() => {
    if (myEntry || !clubMember) return;
    methods.setValue('players.0.name', clubMember.name ?? '');
    methods.setValue('players.0.gender', clubMember.gender ?? '');
    methods.setValue('players.0.birthDate', clubMember.birthDate ?? '');
    methods.setValue('depositorName', clubMember.name ?? '');
  }, [myEntry, clubMember, methods]);

  const onSubmitForm = methods.handleSubmit(async (values) => {
    try {
      await submitEntry.mutateAsync({
        entryId: myEntry?.id ?? null,
        input: {
          depositorName: values.depositorName,
          teamName: values.teamName || null,
          privacyAgreed: values.privacyAgreed,
          players: values.players.map((player, index) => ({
            key: player.key,
            name: player.name,
            gender: player.gender,
            birthDate: player.birthDate,
            phoneNumber: player.phoneNumber,
            tshirtSize: player.tshirtSize || null,
            order: index,
          })),
          events: values.events.map((event) => ({
            eventTypeId: event.eventTypeId,
            ageGroup: event.ageGroup,
            level: event.level,
            playerKeys: event.playerKeys.filter(Boolean),
          })),
        },
      });
      toast.success(
        myEntry ? '신청 내역을 수정했습니다.' : '신청이 완료되었습니다.'
      );
      router.push(`/clubs/${clubId}/tournaments/${tournamentId}/my`);
    } catch (error) {
      const message =
        (error as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? '신청 처리 중 오류가 발생했습니다.';
      toast.error(message);
    }
  });

  if (isDetailLoading || isEntryLoading) {
    return <div className="p-6 text-center text-gray-500">불러오는 중...</div>;
  }
  if (!detail) {
    return (
      <div className="p-6 text-center text-gray-500">
        대회를 찾을 수 없습니다.
      </div>
    );
  }
  if (detail.effectiveStatus !== 'OPEN') {
    return (
      <div className="p-6 text-center text-gray-500">
        현재 신청할 수 없는 대회입니다.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <h1 className="mb-1 text-xl font-bold">{detail.tournament.title}</h1>
      <p className="mb-6 text-sm text-gray-500">
        {myEntry ? '신청 내역 수정' : '참가 신청'}
      </p>

      <ApplyNotice notice={detail.tournament.applyNotice} />

      <FormProvider {...methods}>
        <form onSubmit={onSubmitForm} className="space-y-8">
          <PlayerListField tshirtSizes={detail.tournament.tshirtSizes} />
          <EventListField
            eventTypes={detail.tournament.eventTypes}
            ageGroups={detail.tournament.ageGroups}
            levels={detail.tournament.levels}
          />
          <EntrySummary
            eventTypes={detail.tournament.eventTypes}
            useTeamName={detail.tournament.useTeamName}
            bankAccount={detail.tournament.bankAccount}
          />

          {/* 개별 필드 메시지가 화면 밖에 있으면 버튼이 먹통처럼 보인다.
              제출 실패 사실만이라도 버튼 옆에서 알린다. */}
          {methods.formState.submitCount > 0 && !methods.formState.isValid && (
            <p role="alert" className="text-sm text-red-500">
              입력하지 않은 필수 항목이 있습니다. 위 항목의 빨간 안내를
              확인해주세요.
            </p>
          )}

          <button
            type="submit"
            disabled={submitEntry.isPending}
            className="w-full rounded-md bg-blue-600 py-3 font-medium text-white hover:bg-blue-700 disabled:bg-gray-300"
          >
            {submitEntry.isPending
              ? '처리 중...'
              : myEntry
                ? '수정하기'
                : '신청하기'}
          </button>
        </form>
      </FormProvider>
    </div>
  );
}

export default TournamentApplyPage;
