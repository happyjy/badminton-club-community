import React from 'react';

import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';

import { type EntryFormValues } from '@/components/organisms/tournament/entry/entryFormTypes';
import EntrySummary from '@/components/organisms/tournament/entry/EntrySummary';

import type { TournamentEventType } from '@prisma/client';

/**
 * EntrySummary는 useFormContext에 의존하므로 FormProvider로 감싸 렌더링한다.
 * 개인정보 동의 체크박스를 비운 채 제출했을 때의 피드백을 검증한다.
 */
function renderEntrySummary(options?: {
  defaults?: Partial<EntryFormValues>;
  onSubmit?: (values: EntryFormValues) => void;
}) {
  function Wrapper() {
    const methods = useForm<EntryFormValues>({
      defaultValues: {
        depositorName: '',
        teamName: '',
        players: [],
        events: [],
        privacyAgreed: false,
        ...options?.defaults,
      },
    });

    return (
      <FormProvider {...methods}>
        <form
          onSubmit={methods.handleSubmit((values) =>
            options?.onSubmit?.(values)
          )}
        >
          <EntrySummary
            eventTypes={[] as unknown as TournamentEventType[]}
            useTeamName={false}
            bankAccount={null}
          />
          <button type="submit">제출</button>
        </form>
      </FormProvider>
    );
  }

  return render(<Wrapper />);
}

describe('EntrySummary - 개인정보 동의 검증', () => {
  it('체크박스를 비운 채 제출하면 안내 메시지를 보여주고 제출을 막는다', async () => {
    const onSubmit = jest.fn();
    renderEntrySummary({ defaults: { depositorName: '홍길동' }, onSubmit });

    fireEvent.click(screen.getByText('제출'));

    // required: true(boolean)였을 때는 메시지가 빈 문자열이라
    // 버튼을 눌러도 아무 반응이 없는 것처럼 보였다.
    expect(
      await screen.findByText('개인정보 수집·이용에 동의해주세요.')
    ).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('체크하면 메시지가 사라지고 제출된다', async () => {
    const onSubmit = jest.fn();
    renderEntrySummary({ defaults: { depositorName: '홍길동' }, onSubmit });

    fireEvent.click(screen.getByText('제출'));
    expect(
      await screen.findByText('개인정보 수집·이용에 동의해주세요.')
    ).toBeTruthy();

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByText('제출'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(
      screen.queryByText('개인정보 수집·이용에 동의해주세요.')
    ).toBeNull();
  });

  it('입금자명이 비어 있으면 안내 메시지를 보여준다', async () => {
    const onSubmit = jest.fn();
    renderEntrySummary({ defaults: { privacyAgreed: true }, onSubmit });

    fireEvent.click(screen.getByText('제출'));

    expect(await screen.findByText('입금자명을 입력해주세요.')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
