import { useState } from 'react';

import { useRouter } from 'next/router';

import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

import { Input } from '@/components/atoms/inputs/Input';
import { FormField } from '@/components/molecules/form/FormField';

import { formatFee } from '@/lib/tournament/display';

type LookupFormValues = {
  contactName: string;
  phoneTail: string;
};

type LookedUpEntry = {
  id: string;
  depositorName: string;
  teamName: string | null;
  totalFee: number;
  paymentStatus: string;
  players: Array<{ id: string; name: string; gender: string }>;
  entryEvents: Array<{
    id: string;
    ageGroup: string;
    level: string;
    fee: number;
    status: string;
    eventType: { name: string };
  }>;
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: '입금대기',
  CONFIRMED: '입금확인',
  CANCELED: '취소',
};

function ExternalEntryLookupPage() {
  const router = useRouter();
  const clubId = router.query.id as string | undefined;
  const tournamentId = router.query.tournamentId as string | undefined;

  const [entry, setEntry] = useState<LookedUpEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState } = useForm<LookupFormValues>({
    defaultValues: { contactName: '', phoneTail: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (!clubId || !tournamentId) return;
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/clubs/${clubId}/tournaments/${tournamentId}/external/lookup`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        }
      );
      const body = await response.json();
      if (!response.ok) {
        toast.error(body.error ?? '조회에 실패했습니다.');
        setEntry(null);
        return;
      }
      setEntry(body.data.entry);
    } finally {
      setIsLoading(false);
    }
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <h1 className="text-xl font-bold">신청 내역 조회</h1>

      <form onSubmit={onSubmit} className="space-y-4">
        <FormField
          label="신청자 이름"
          error={formState.errors.contactName?.message}
        >
          <Input
            {...register('contactName', {
              required: '신청자 이름을 입력해주세요.',
            })}
          />
        </FormField>
        <FormField
          label="휴대폰 뒷 4자리"
          error={formState.errors.phoneTail?.message}
        >
          <Input
            inputMode="numeric"
            maxLength={4}
            placeholder="5678"
            {...register('phoneTail', {
              required: '휴대폰 뒷 4자리를 입력해주세요.',
              pattern: {
                value: /^\d{4}$/,
                message: '숫자 4자리를 입력해주세요.',
              },
            })}
          />
        </FormField>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-md bg-blue-600 py-2 text-white disabled:bg-gray-300"
        >
          {isLoading ? '조회 중...' : '조회하기'}
        </button>
      </form>

      {entry && (
        <section className="space-y-4 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">신청 내역</h2>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-sm">
              {PAYMENT_STATUS_LABEL[entry.paymentStatus] ?? entry.paymentStatus}
            </span>
          </div>

          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">입금자명</dt>
              <dd>{entry.depositorName}</dd>
            </div>
            {entry.teamName && (
              <div className="flex justify-between">
                <dt className="text-gray-500">팀명</dt>
                <dd>{entry.teamName}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-500">총 참가비</dt>
              <dd className="font-medium">{formatFee(entry.totalFee)}</dd>
            </div>
          </dl>

          <div>
            <h3 className="mb-2 text-sm font-medium">신청 종목</h3>
            <ul className="space-y-1 text-sm">
              {entry.entryEvents
                .filter((event) => event.status === 'ACTIVE')
                .map((event) => (
                  <li key={event.id} className="flex justify-between">
                    <span>
                      {event.eventType.name} · {event.ageGroup}
                      {event.level ? ` · ${event.level}` : ''}
                    </span>
                    <span>{formatFee(event.fee)}</span>
                  </li>
                ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium">선수</h3>
            <ul className="space-y-1 text-sm">
              {entry.players.map((player) => (
                <li key={player.id}>
                  {player.name} ({player.gender})
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-gray-500">
            내용을 수정하려면 클럽 담당자에게 문의해주세요.
          </p>
        </section>
      )}
    </div>
  );
}

export default ExternalEntryLookupPage;
