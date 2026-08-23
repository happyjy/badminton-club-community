import { useEffect, useState } from 'react';

import { useRouter } from 'next/router';

import { Controller, FormProvider, useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

import ApplyNotice from '@/components/organisms/tournament/entry/ApplyNotice';
import {
  createEmptyPlayer,
  type EntryFormValues,
} from '@/components/organisms/tournament/entry/entryFormTypes';
import EntrySummary from '@/components/organisms/tournament/entry/EntrySummary';
import EventListField from '@/components/organisms/tournament/entry/EventListField';
import PlayerListField from '@/components/organisms/tournament/entry/PlayerListField';

import { Input } from '@/components/atoms/inputs/Input';
import { FormField } from '@/components/molecules/form/FormField';

import { isAcceptingEntries } from '@/lib/tournament/status';
import { validateEntrySubmission } from '@/lib/tournament/validation';
import {
  formatPhoneNumber,
  getPhoneNumberError,
  toPhoneDigits,
} from '@/utils/phoneNumber';

import type { TournamentEventType } from '@prisma/client';

// 외부 신청 폼은 로그인 정보가 없으므로 조회에 쓸 신청자 이름·연락처를 더 받는다.
type ExternalEntryFormValues = EntryFormValues & {
  contactName: string;
  contactPhone: string;
};

/**
 * 외부(비로그인) 신청 페이지가 보는 대회 정보.
 * `/external/tournament`는 인증 없이 접근하므로 신청 현황 등 민감한 필드를
 * 내려주지 않는다. fetch로 받은 JSON은 Date가 문자열로 오므로 회원용
 * TournamentWithOptions와 별도로 최소한만 선언한다.
 */
interface ExternalTournament {
  id: string;
  title: string;
  hostName: string | null;
  description: string | null;
  applyNotice: string | null;
  tournamentDate: string;
  location: string | null;
  applyStartAt: string | null;
  applyDeadline: string;
  status: 'DRAFT' | 'OPEN' | 'CLOSED';
  useTeamName: boolean;
  tshirtSizes: string[];
  bankAccount: string | null;
  memberLabel: string | null;
  nonMemberSurcharge: number;
  surchargeUnit: 'PER_PLAYER' | 'PER_TEAM';
  minClubMembersPerTeam: number;
  ageGroups: string[];
  levels: string[];
  eventTypes: TournamentEventType[];
}

function ExternalTournamentApplyPage() {
  const router = useRouter();
  const clubId = router.query.id as string | undefined;
  const tournamentId = router.query.tournamentId as string | undefined;

  const [tournament, setTournament] = useState<ExternalTournament | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!clubId || !tournamentId) return;

    let cancelled = false;
    setIsLoading(true);
    setNotFound(false);

    fetch(
      `/api/clubs/${clubId}/tournaments/${tournamentId}/external/tournament`
    )
      .then(async (response) => {
        if (cancelled) return;
        if (!response.ok) {
          setNotFound(true);
          return;
        }
        const body = await response.json();
        setTournament(body.data.tournament);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [clubId, tournamentId]);

  const methods = useForm<ExternalEntryFormValues>({
    defaultValues: {
      depositorName: '',
      teamName: '',
      players: [{ ...createEmptyPlayer(0), isClubMember: false }],
      events: [],
      privacyAgreed: false,
      contactName: '',
      contactPhone: '',
    },
  });

  const onSubmitForm = methods.handleSubmit(async (values) => {
    if (!tournament || !clubId || !tournamentId) return;

    // 서버와 같은 규칙으로 미리 걸러 낸다. 규칙은 validation.ts 한 곳에만 둔다.
    const precheck = validateEntrySubmission(
      {
        depositorName: values.depositorName,
        teamName: values.teamName || null,
        privacyAgreed: values.privacyAgreed,
        players: values.players.map((player, index) => ({
          ...player,
          tshirtSize: player.tshirtSize || null,
          order: index,
        })),
        events: values.events.map((event) => ({
          ...event,
          playerKeys: event.playerKeys.filter(Boolean),
        })),
      },
      tournament,
      { isExternal: true }
    );
    if (!precheck.ok) {
      toast.error(precheck.error);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/clubs/${clubId}/tournaments/${tournamentId}/external/entries`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            depositorName: values.depositorName,
            teamName: values.teamName || null,
            privacyAgreed: values.privacyAgreed,
            contactName: values.contactName,
            contactPhone: values.contactPhone,
            players: values.players.map((player, index) => ({
              key: player.key,
              name: player.name,
              gender: player.gender,
              birthDate: player.birthDate,
              phoneNumber: player.phoneNumber,
              tshirtSize: player.tshirtSize || null,
              isClubMember: false,
              order: index,
            })),
            events: values.events.map((event) => ({
              eventTypeId: event.eventTypeId,
              ageGroup: event.ageGroup,
              level: event.level,
              playerKeys: event.playerKeys.filter(Boolean),
            })),
          }),
        }
      );
      const body = await response.json();
      if (!response.ok) {
        toast.error(body.error ?? '신청 처리 중 오류가 발생했습니다.');
        return;
      }
      toast.success(
        '신청이 완료되었습니다. 신청 조회 페이지에서 이름과 연락처 뒷 4자리로 신청 내용을 확인할 수 있습니다.'
      );
      router.push(
        `/clubs/${clubId}/tournaments/${tournamentId}/external-entry`
      );
    } finally {
      setIsSubmitting(false);
    }
  });

  if (isLoading) {
    return <div className="p-6 text-center text-gray-500">불러오는 중...</div>;
  }
  if (notFound || !tournament) {
    return (
      <div className="p-6 text-center text-gray-500">
        대회를 찾을 수 없습니다.
      </div>
    );
  }
  // 신청 가능 여부 규칙은 status.ts 한 곳에만 둔다. fetch로 받은 JSON은
  // 날짜가 ISO 문자열로 오므로 재사용 전에 Date로 변환한다.
  const isOpen = isAcceptingEntries(
    {
      status: tournament.status,
      applyStartAt: tournament.applyStartAt
        ? new Date(tournament.applyStartAt)
        : null,
      applyDeadline: new Date(tournament.applyDeadline),
    },
    new Date()
  );
  if (!isOpen) {
    return (
      <div className="p-6 text-center text-gray-500">
        현재 신청할 수 없는 대회입니다.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <h1 className="mb-1 text-xl font-bold">{tournament.title}</h1>
      <p className="mb-6 text-sm text-gray-500">참가 신청 (외부 신청)</p>

      <ApplyNotice notice={tournament.applyNotice} />

      <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-medium">신청 전 확인해주세요</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            협회 등록 여부는 &lsquo;배드민턴 대진표 BKPLAY&rsquo; 앱에서 조회할
            수 있습니다.
          </li>
          <li>
            타 지역 협회에 이미 등록된 선수끼리의 조합은 대회 규정상 출전이
            불가능합니다.
          </li>
          <li>
            신청 내용은 접수 후 담당자가 확인하며, 자격 미달 시 개별
            안내드립니다.
          </li>
        </ul>
      </div>

      <FormProvider {...methods}>
        <form onSubmit={onSubmitForm} className="space-y-8">
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">신청자 정보</h2>
            <p className="text-sm text-gray-500">
              신청 후 내용을 확인하려면 여기 입력한 이름과 연락처 뒷 4자리가
              필요합니다.
            </p>
            <FormField
              label="신청자 이름"
              error={methods.formState.errors.contactName?.message}
            >
              <Input
                {...methods.register('contactName', {
                  required: '신청자 이름을 입력해주세요.',
                })}
              />
            </FormField>
            <FormField
              label="연락처"
              error={methods.formState.errors.contactPhone?.message}
            >
              <Controller
                control={methods.control}
                name="contactPhone"
                rules={{ validate: getPhoneNumberError }}
                render={({ field }) => (
                  <Input
                    value={formatPhoneNumber(field.value)}
                    onChange={(event) =>
                      field.onChange(toPhoneDigits(event.target.value))
                    }
                    placeholder="010-1234-5678"
                  />
                )}
              />
            </FormField>
          </section>

          <PlayerListField
            tshirtSizes={tournament.tshirtSizes}
            memberLabel={tournament.memberLabel}
            nonMemberSurcharge={tournament.nonMemberSurcharge}
            surchargeUnit={tournament.surchargeUnit}
            isExternal
          />
          <EventListField
            eventTypes={tournament.eventTypes}
            ageGroups={tournament.ageGroups}
            levels={tournament.levels}
            memberLabel={tournament.memberLabel}
            minClubMembersPerTeam={tournament.minClubMembersPerTeam}
            isExternal
          />
          <EntrySummary
            eventTypes={tournament.eventTypes}
            useTeamName={tournament.useTeamName}
            bankAccount={tournament.bankAccount}
            nonMemberSurcharge={tournament.nonMemberSurcharge}
            surchargeUnit={tournament.surchargeUnit}
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
            disabled={isSubmitting}
            className="w-full rounded-md bg-blue-600 py-3 font-medium text-white hover:bg-blue-700 disabled:bg-gray-300"
          >
            {isSubmitting ? '처리 중...' : '신청하기'}
          </button>
        </form>
      </FormProvider>
    </div>
  );
}

export default ExternalTournamentApplyPage;
