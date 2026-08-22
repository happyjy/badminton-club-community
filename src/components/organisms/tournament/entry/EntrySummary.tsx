import { useFormContext } from 'react-hook-form';

import { Input } from '@/components/atoms/inputs/Input';
import { FormField } from '@/components/molecules/form/FormField';

import { formatFee } from '@/lib/tournament/display';
import { calculateEventFee } from '@/lib/tournament/fee';

import type { EntryFormValues } from './entryFormTypes';
import type { TournamentEventType } from '@prisma/client';

interface EntrySummaryProps {
  eventTypes: TournamentEventType[];
  useTeamName: boolean;
  bankAccount: string | null;
  /** 외부 선수 1인당 추가금. 0이면 추가금 미사용 */
  nonMemberSurcharge: number;
}

function EntrySummary({
  eventTypes,
  useTeamName,
  bankAccount,
  nonMemberSurcharge,
}: EntrySummaryProps) {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<EntryFormValues>();

  const events = watch('events') ?? [];
  const players = watch('players') ?? [];
  const feeById = new Map(
    eventTypes.map((eventType) => [eventType.id, eventType.fee])
  );

  // 화면 표시용 금액이다. 실제 청구액은 서버가 다시 계산한다.
  const eventFees = events.map((event) => {
    const baseFee = feeById.get(event.eventTypeId) ?? 0;
    const fee = calculateEventFee({
      baseFee,
      surcharge: nonMemberSurcharge,
      playerKeys: event.playerKeys ?? [],
      players,
    });
    return { baseFee, fee, surcharge: fee - baseFee };
  });
  const totalFee = eventFees.reduce((sum, item) => sum + item.fee, 0);
  const totalSurcharge = eventFees.reduce(
    (sum, item) => sum + item.surcharge,
    0
  );

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">③ 입금 정보</h2>

      <div className="rounded-lg bg-blue-50 p-4">
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-700">납부하실 금액</span>
          <span className="text-xl font-bold text-blue-700">
            {formatFee(totalFee)}
          </span>
        </div>
        {totalSurcharge > 0 && (
          <p className="mt-1 text-right text-sm text-gray-600">
            기본 {formatFee(totalFee - totalSurcharge)} + 외부 선수 추가금{' '}
            {formatFee(totalSurcharge)}
          </p>
        )}
        {bankAccount && (
          <p className="mt-2 text-sm text-gray-600">입금 계좌: {bankAccount}</p>
        )}
      </div>

      <FormField
        label="입금자명"
        required
        error={errors.depositorName?.message}
      >
        <Input
          type="text"
          placeholder="통장에 찍히는 이름을 적어주세요"
          {...register('depositorName', {
            required: '입금자명을 입력해주세요.',
          })}
        />
      </FormField>

      {useTeamName && (
        <FormField label="팀명">
          <Input type="text" {...register('teamName')} />
        </FormField>
      )}

      <div className="space-y-1">
        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            className="mt-1"
            {...register('privacyAgreed', {
              required: '개인정보 수집·이용에 동의해주세요.',
            })}
          />
          <span>
            개인정보 수집·이용에 동의합니다. 수집한 정보(이름, 생년월일,
            전화번호)는 대회 참가 신청 목적으로만 사용되며 주최측에 제출됩니다.
            본인 외 선수의 정보를 입력한 경우 해당 선수의 동의를 받았음을
            확인합니다.
          </span>
        </label>
        {errors.privacyAgreed && (
          <p role="alert" className="text-sm text-red-500">
            {errors.privacyAgreed.message}
          </p>
        )}
      </div>
    </section>
  );
}

export default EntrySummary;
