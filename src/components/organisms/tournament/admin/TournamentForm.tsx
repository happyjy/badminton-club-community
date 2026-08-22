import { useState } from 'react';

import { FormProvider, useForm } from 'react-hook-form';

import { Input } from '@/components/atoms/inputs/Input';
import { FormField } from '@/components/molecules/form/FormField';

import { parseTagInput } from '@/lib/tournament/parseTagInput';
import type { TournamentInput } from '@/types/tournament.types';

import { AGE_GROUP_PRESETS, LEVEL_PRESETS } from './eventOptionPresets';
import TournamentFileField from './TournamentFileField';
import EventTypeEditor from './EventTypeEditor';
import TagListField from './TagListField';

interface TournamentFormProps {
  defaultValues: TournamentInput;
  submitLabel: string;
  isSubmitting: boolean;
  onSubmitForm: (input: TournamentInput) => void;
  clubId?: string;
  /** 신규 생성 화면에서는 아직 대회가 없어 첨부 영역이 안내 문구로 바뀐다. */
  tournamentId?: string;
}

function TournamentForm({
  defaultValues,
  submitLabel,
  isSubmitting,
  onSubmitForm,
  clubId,
  tournamentId,
}: TournamentFormProps) {
  const methods = useForm<TournamentInput>({ defaultValues });
  const [sizeInput, setSizeInput] = useState('');

  const tshirtSizes = methods.watch('tshirtSizes') ?? [];
  const ageGroups = methods.watch('ageGroups') ?? [];
  const levels = methods.watch('levels') ?? [];
  const eventTypeCount = (methods.watch('eventTypes') ?? []).length;

  // "S, M, L"처럼 쉼표로 구분해 한 번에 여러 개를 등록할 수 있다
  const onClickAddSize = () => {
    const sizes = parseTagInput(sizeInput, tshirtSizes);
    if (sizes.length === 0) {
      setSizeInput('');
      return;
    }
    methods.setValue('tshirtSizes', [...tshirtSizes, ...sizes]);
    setSizeInput('');
  };

  const onClickRemoveSize = (size: string) => {
    methods.setValue(
      'tshirtSizes',
      tshirtSizes.filter((item) => item !== size)
    );
  };

  const handleSubmitForm = methods.handleSubmit((values) => {
    onSubmitForm({
      ...values,
      // datetime-local 값을 ISO로 변환한다 (zod가 datetime을 요구)
      applyStartAt: values.applyStartAt
        ? new Date(values.applyStartAt).toISOString()
        : null,
      applyDeadline: new Date(values.applyDeadline).toISOString(),
      eventTypes: values.eventTypes.map((eventType, index) => ({
        ...eventType,
        order: index,
      })),
    });
  });

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmitForm} className="space-y-8">
        <section className="space-y-4">
          <h2 className="font-semibold">① 대회 기본 정보</h2>
          <FormField label="대회명" required>
            <Input
              type="text"
              {...methods.register('title', { required: true })}
            />
          </FormField>
          <FormField label="주최">
            <Input type="text" {...methods.register('hostName')} />
          </FormField>
          <FormField label="대회 일자">
            <Input type="date" {...methods.register('tournamentDate')} />
          </FormField>
          <FormField label="장소">
            <Input type="text" {...methods.register('location')} />
          </FormField>
          <FormField label="모집 요강">
            <textarea
              rows={5}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              {...methods.register('description')}
            />
          </FormField>
          <FormField label="모집 요강 첨부파일">
            <TournamentFileField clubId={clubId} tournamentId={tournamentId} />
          </FormField>
          <FormField label="신청 주의사항">
            <textarea
              rows={4}
              placeholder={
                '신청 페이지 상단에 안내됩니다.\n예) 티셔츠는 넉넉한 편이니 한 치수 작게 신청해주세요.'
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              {...methods.register('applyNotice')}
            />
          </FormField>
          <FormField label="입금 계좌">
            <Input
              type="text"
              placeholder="○○은행 123-456 (클럽명)"
              {...methods.register('bankAccount')}
            />
          </FormField>

          {/*
            주최측 규칙이 "특정 지역 회원이 아니면 1인당 추가금"인 대회를 위한 설정.
            추가금을 0으로 두면 신청 화면에서 회원 여부를 아예 묻지 않는다.
          */}
          <FormField
            label="비회원 1인당 추가금"
            error={methods.formState.errors.memberLabel?.message}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                type="text"
                placeholder="회원 기준 (예: 영등포구 회원)"
                {...methods.register('memberLabel')}
              />
              <Input
                type="number"
                min={0}
                step={1000}
                placeholder="추가금 (0이면 미사용)"
                {...methods.register('nonMemberSurcharge', {
                  valueAsNumber: true,
                })}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              추가금은 신청 종목마다 비회원 인원수만큼 붙습니다. (예: 팀당
              60,000원 + 비회원 1명 → 70,000원)
            </p>
          </FormField>
        </section>

        <section className="space-y-4">
          <h2 className="font-semibold">② 신청 기간 · 상태</h2>
          <FormField label="신청 시작">
            <Input
              type="datetime-local"
              {...methods.register('applyStartAt')}
            />
          </FormField>
          <FormField label="신청 마감" required>
            <Input
              type="datetime-local"
              {...methods.register('applyDeadline', { required: true })}
            />
          </FormField>
          <FormField label="상태" required>
            <select
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              {...methods.register('status')}
            >
              <option value="DRAFT">임시저장 (회원에게 안 보임)</option>
              <option value="OPEN">모집 열기</option>
              <option value="CLOSED">마감</option>
            </select>
          </FormField>
        </section>

        <section className="space-y-4">
          <h2 className="font-semibold">③ 신청 양식 설정</h2>

          <EventTypeEditor />

          <TagListField
            label="연령"
            values={ageGroups}
            presets={AGE_GROUP_PRESETS}
            placeholder="예: 시니어 (쉼표로 여러 개)"
            emptyHint="연령을 1개 이상 선택해야 합니다."
            onChangeValues={(values) => methods.setValue('ageGroups', values)}
          />

          <TagListField
            label="급수"
            values={levels}
            presets={LEVEL_PRESETS}
            placeholder="예: 1부, 2부 (쉼표로 여러 개)"
            emptyHint="비워두면 급수 구분 없이 신청받습니다."
            onChangeValues={(values) => methods.setValue('levels', values)}
          />

          <p className="rounded-md bg-gray-50 p-3 text-sm text-gray-600">
            신청자는 <b>종목 {eventTypeCount}개</b> ×{' '}
            <b>연령 {ageGroups.length}개</b>
            {levels.length > 0 && (
              <>
                {' '}
                × <b>급수 {levels.length}개</b>
              </>
            )}{' '}
            중에서 각각 선택합니다.
          </p>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...methods.register('useTeamName')} />
            팀명 입력받기
          </label>

          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">
              티셔츠 사이즈 옵션
            </p>
            <div className="mb-2 flex flex-wrap gap-2">
              {tshirtSizes.map((size) => (
                <span
                  key={size}
                  className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm"
                >
                  {size}
                  <button
                    type="button"
                    onClick={() => onClickRemoveSize(size)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    ✕
                  </button>
                </span>
              ))}
              {tshirtSizes.length === 0 && (
                <span className="text-sm text-gray-400">
                  사이즈를 추가하지 않으면 티셔츠 항목을 받지 않습니다.
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={sizeInput}
                onChange={(e) => setSizeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    // 폼 전체가 제출되지 않도록 막는다
                    e.preventDefault();
                    onClickAddSize();
                  }
                }}
                placeholder="S, M, L (쉼표로 여러 개 입력)"
                className="flex-1 rounded-md border-gray-300 text-sm"
              />
              <button
                type="button"
                onClick={onClickAddSize}
                className="rounded-md bg-gray-100 px-3 py-1.5 text-sm"
              >
                추가
              </button>
            </div>
          </div>
        </section>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-blue-600 py-3 font-medium text-white disabled:bg-gray-300"
        >
          {isSubmitting ? '저장 중...' : submitLabel}
        </button>
      </form>
    </FormProvider>
  );
}

export default TournamentForm;
