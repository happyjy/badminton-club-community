import React from 'react';

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';

import {
  createEmptyPlayer,
  type EntryFormValues,
} from '@/components/organisms/tournament/entry/entryFormTypes';
import PlayerListField from '@/components/organisms/tournament/entry/PlayerListField';

/**
 * PlayerListField는 useFormContext에 의존하므로 FormProvider로 감싸 렌더링한다.
 * onSubmit을 넘기면 제출 시 최종 폼 값을 확인할 수 있다.
 */
function renderPlayerListField(options?: {
  players?: Partial<EntryFormValues['players'][number]>[];
  onSubmit?: (values: EntryFormValues) => void;
  memberLabel?: string | null;
  nonMemberSurcharge?: number;
}) {
  const players = (options?.players ?? [{}]).map((override, index) => ({
    ...createEmptyPlayer(index),
    ...override,
  }));

  function Wrapper() {
    const methods = useForm<EntryFormValues>({
      defaultValues: {
        depositorName: '',
        teamName: '',
        players,
        events: [],
        privacyAgreed: false,
      },
    });

    return (
      <FormProvider {...methods}>
        <form
          onSubmit={methods.handleSubmit((values) =>
            options?.onSubmit?.(values)
          )}
        >
          <PlayerListField
            tshirtSizes={[]}
            memberLabel={options?.memberLabel ?? null}
            nonMemberSurcharge={options?.nonMemberSurcharge ?? 0}
          />
          <button type="submit">제출</button>
        </form>
      </FormProvider>
    );
  }

  return render(<Wrapper />);
}

/** 라벨 문구로 n번째 선수의 체크박스를 찾는다. 체크박스가 여러 개라 필요하다. */
function getCheckboxByLabel(label: string, index = 0): HTMLInputElement {
  const labels = screen.getAllByText(label);
  return labels[index]
    .closest('label')
    ?.querySelector('input') as HTMLInputElement;
}

/** n번째 선수의 생년월일 입력창을 가져온다. */
function getBirthDateInput(index = 0): HTMLInputElement {
  return screen.getAllByPlaceholderText('예: 19900315')[
    index
  ] as HTMLInputElement;
}

/** n번째 선수의 전화번호 입력창을 가져온다. */
function getPhoneNumberInput(index = 0): HTMLInputElement {
  return screen.getAllByPlaceholderText('010-1234-5678')[
    index
  ] as HTMLInputElement;
}

describe('PlayerListField - 생년월일 입력', () => {
  it('달력 위젯 대신 숫자 키패드를 띄우는 텍스트 입력으로 렌더링한다', () => {
    renderPlayerListField();
    const input = getBirthDateInput();

    // type="date"였다면 OS 위젯이 떠서 기기별 UI가 달라진다.
    expect(input.getAttribute('type')).toBe('text');
    expect(input.getAttribute('inputmode')).toBe('numeric');
    expect(input.getAttribute('maxlength')).toBe('8');
  });

  it('자동 채움된 저장 포맷 값을 숫자 8자리로 표시한다', () => {
    // apply.tsx가 회원 정보나 기존 신청에서 '1990-03-15' 형태로 채워 넣는다.
    renderPlayerListField({ players: [{ birthDate: '1990-03-15' }] });

    expect(getBirthDateInput().value).toBe('19900315');
  });

  it('사용자가 하이픈을 섞어 입력해도 숫자만 남긴다', () => {
    renderPlayerListField();
    const input = getBirthDateInput();

    fireEvent.change(input, { target: { value: '1990-03-15' } });

    expect(input.value).toBe('19900315');
  });

  it('blur 시 저장 포맷으로 정규화한 값을 제출한다', async () => {
    const onSubmit = jest.fn();
    renderPlayerListField({
      players: [{ name: '홍길동', gender: '남', phoneNumber: '010-1111-2222' }],
      onSubmit,
    });
    const input = getBirthDateInput();

    fireEvent.change(input, { target: { value: '19900315' } });
    fireEvent.blur(input);
    fireEvent.click(screen.getByText('제출'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());

    // 화면에는 8자리로 보이지만 저장 값은 기존 소비처가 전제하는 포맷이어야 한다.
    const submitted = onSubmit.mock.calls[0][0] as EntryFormValues;
    expect(submitted.players[0].birthDate).toBe('1990-03-15');
  });
});

describe('PlayerListField - 전화번호 입력', () => {
  it('숫자 키패드를 띄우고 하이픈 포함 길이로 제한한다', () => {
    renderPlayerListField();
    const input = getPhoneNumberInput();

    expect(input.getAttribute('inputmode')).toBe('numeric');
    expect(input.getAttribute('maxlength')).toBe('13');
  });

  it('숫자만 입력해도 하이픈을 붙여 보여준다', () => {
    renderPlayerListField();
    const input = getPhoneNumberInput();

    fireEvent.change(input, { target: { value: '01012345678' } });

    expect(input.value).toBe('010-1234-5678');
  });

  it('입력 중에도 자리 수에 맞춰 하이픈을 붙인다', () => {
    renderPlayerListField();
    const input = getPhoneNumberInput();

    fireEvent.change(input, { target: { value: '0101' } });

    expect(input.value).toBe('010-1');
  });

  it('11자리를 넘겨 입력해도 잘라낸다', () => {
    renderPlayerListField();
    const input = getPhoneNumberInput();

    fireEvent.change(input, { target: { value: '010123456789999' } });

    expect(input.value).toBe('010-1234-5678');
  });

  it('자동 채움된 하이픈 값을 그대로 표시한다', () => {
    renderPlayerListField({ players: [{ phoneNumber: '010-1111-2222' }] });

    expect(getPhoneNumberInput().value).toBe('010-1111-2222');
  });

  it('저장 값은 숫자만 남긴 형태로 제출한다', async () => {
    const onSubmit = jest.fn();
    renderPlayerListField({
      players: [{ name: '홍길동', gender: '남', birthDate: '1990-03-15' }],
      onSubmit,
    });

    fireEvent.change(getPhoneNumberInput(), {
      target: { value: '010-1234-5678' },
    });
    fireEvent.click(screen.getByText('제출'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());

    const submitted = onSubmit.mock.calls[0][0] as EntryFormValues;
    expect(submitted.players[0].phoneNumber).toBe('01012345678');
  });
});

describe('PlayerListField - 검증 메시지', () => {
  let onSubmit: jest.Mock;

  beforeEach(() => {
    onSubmit = jest.fn();
  });

  it('실재하지 않는 날짜를 입력하면 메시지를 보여주고 제출을 막는다', async () => {
    renderPlayerListField({ onSubmit });

    fireEvent.change(getBirthDateInput(), { target: { value: '19900230' } });
    fireEvent.click(screen.getByText('제출'));

    expect(await screen.findByText('올바른 생년월일이 아닙니다.')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('자릿수가 모자라면 8자리 안내 메시지를 보여준다', async () => {
    renderPlayerListField({ onSubmit });

    fireEvent.change(getBirthDateInput(), { target: { value: '1990' } });
    fireEvent.click(screen.getByText('제출'));

    expect(
      await screen.findByText('생년월일 8자리를 입력해주세요. (예: 19900315)')
    ).toBeTruthy();
  });

  it('미래 날짜를 거부한다', async () => {
    renderPlayerListField({ onSubmit });
    const nextYear = new Date().getFullYear() + 1;

    fireEvent.change(getBirthDateInput(), {
      target: { value: `${nextYear}0101` },
    });
    fireEvent.click(screen.getByText('제출'));

    expect(await screen.findByText('올바른 생년월일이 아닙니다.')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('자릿수가 모자란 전화번호를 거부한다', async () => {
    renderPlayerListField({ onSubmit });

    fireEvent.change(getPhoneNumberInput(), { target: { value: '010-1234' } });
    fireEvent.click(screen.getByText('제출'));

    expect(
      await screen.findByText('올바른 전화번호가 아닙니다. (예: 010-1234-5678)')
    ).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('휴대폰 국번이 아닌 번호를 거부한다', async () => {
    renderPlayerListField({ onSubmit });

    fireEvent.change(getPhoneNumberInput(), {
      target: { value: '02-1234-5678' },
    });
    fireEvent.click(screen.getByText('제출'));

    expect(
      await screen.findByText('올바른 전화번호가 아닙니다. (예: 010-1234-5678)')
    ).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('비어 있는 필수 항목마다 한국어 메시지를 보여준다', async () => {
    renderPlayerListField({ onSubmit });

    fireEvent.click(screen.getByText('제출'));

    // required: true(boolean)였을 때는 메시지가 빈 문자열이라 아무것도 보이지 않았다.
    expect(await screen.findByText('선수 이름을 입력해주세요.')).toBeTruthy();
    expect(screen.getByText('성별을 선택해주세요.')).toBeTruthy();
    expect(screen.getByText('생년월일을 입력해주세요.')).toBeTruthy();
    expect(screen.getByText('전화번호를 입력해주세요.')).toBeTruthy();
  });

  it('유효한 값으로 고치면 메시지가 사라진다', async () => {
    renderPlayerListField({ onSubmit });
    const input = getBirthDateInput();

    fireEvent.change(input, { target: { value: '19900230' } });
    fireEvent.click(screen.getByText('제출'));
    expect(await screen.findByText('올바른 생년월일이 아닙니다.')).toBeTruthy();

    fireEvent.change(input, { target: { value: '19900315' } });

    await waitFor(() =>
      expect(screen.queryByText('올바른 생년월일이 아닙니다.')).toBeNull()
    );
  });
});

describe('PlayerListField - 선수가 여러 명일 때', () => {
  it('각 선수의 생년월일이 서로 간섭하지 않는다', () => {
    renderPlayerListField({
      players: [{ birthDate: '1990-03-15' }, { birthDate: '1988-05-05' }],
    });

    expect(getBirthDateInput(0).value).toBe('19900315');
    expect(getBirthDateInput(1).value).toBe('19880505');

    fireEvent.change(getBirthDateInput(1), { target: { value: '20000229' } });

    // 두 번째만 바뀌고 첫 번째는 유지되어야 한다.
    expect(getBirthDateInput(0).value).toBe('19900315');
    expect(getBirthDateInput(1).value).toBe('20000229');
  });

  it('오류가 난 선수의 메시지만 표시한다', async () => {
    renderPlayerListField({
      players: [
        {
          name: '홍길동',
          gender: '남',
          birthDate: '1990-03-15',
          phoneNumber: '010-1111-2222',
        },
        {
          name: '김철수',
          gender: '남',
          birthDate: '19900230',
          phoneNumber: '010-3333-4444',
        },
      ],
    });

    fireEvent.click(screen.getByText('제출'));

    const messages = await screen.findAllByText('올바른 생년월일이 아닙니다.');
    expect(messages).toHaveLength(1);
  });
});

describe('PlayerListField - 비회원 추가금', () => {
  const SURCHARGE = { memberLabel: '영등포구 회원', nonMemberSurcharge: 10000 };

  it('추가금을 쓰지 않는 대회면 회원 여부를 묻지 않는다', () => {
    renderPlayerListField();

    expect(screen.queryByText('영등포구 회원')).toBeNull();
  });

  it('라벨만 있고 추가금이 0이면 체크박스를 숨긴다', () => {
    renderPlayerListField({
      memberLabel: '영등포구 회원',
      nonMemberSurcharge: 0,
    });

    expect(screen.queryByText('영등포구 회원')).toBeNull();
  });

  it('추가금을 쓰면 대회가 정한 라벨과 금액을 보여준다', () => {
    renderPlayerListField(SURCHARGE);

    expect(screen.getByText('영등포구 회원')).toBeTruthy();
    expect(
      screen.getByText(/해제하면 참가 종목마다 10,000원이 추가됩니다./)
    ).toBeTruthy();
  });

  it('기본값은 회원(체크됨)이다', () => {
    renderPlayerListField(SURCHARGE);

    expect(getCheckboxByLabel('영등포구 회원').checked).toBe(true);
  });

  it('체크를 해제하면 isLocalMember=false로 제출한다', async () => {
    const onSubmit = jest.fn();
    renderPlayerListField({
      ...SURCHARGE,
      players: [
        {
          name: '김철수',
          gender: '남',
          birthDate: '1988-05-05',
          phoneNumber: '010-3333-4444',
        },
      ],
      onSubmit,
    });

    fireEvent.click(getCheckboxByLabel('영등포구 회원'));
    fireEvent.click(screen.getByText('제출'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());

    const submitted = onSubmit.mock.calls[0][0] as EntryFormValues;
    expect(submitted.players[0].isLocalMember).toBe(false);
  });

  it('선수마다 회원 여부를 따로 관리한다', () => {
    renderPlayerListField({
      ...SURCHARGE,
      players: [{ isLocalMember: true }, { isLocalMember: true }],
    });

    const first = getCheckboxByLabel('영등포구 회원', 0);
    const second = getCheckboxByLabel('영등포구 회원', 1);

    fireEvent.click(second);

    // 두 번째만 해제되고 첫 번째는 유지되어야 한다.
    expect(first.checked).toBe(true);
    expect(second.checked).toBe(false);
  });
});

describe('PlayerListField - 클럽 소속', () => {
  it('추가금과 무관하게 항상 클럽 회원 여부를 묻는다', () => {
    renderPlayerListField();

    expect(screen.getByText('우리 클럽 회원')).toBeTruthy();
  });

  it('기본값은 클럽 회원(체크됨)이다', () => {
    renderPlayerListField();

    expect(getCheckboxByLabel('우리 클럽 회원').checked).toBe(true);
  });

  it('체크를 해제하면 isClubMember=false로 제출한다', async () => {
    const onSubmit = jest.fn();
    renderPlayerListField({
      players: [
        {
          name: '김철수',
          gender: '남',
          birthDate: '1988-05-05',
          phoneNumber: '010-3333-4444',
        },
      ],
      onSubmit,
    });

    fireEvent.click(getCheckboxByLabel('우리 클럽 회원'));
    fireEvent.click(screen.getByText('제출'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());

    const submitted = onSubmit.mock.calls[0][0] as EntryFormValues;
    expect(submitted.players[0].isClubMember).toBe(false);
  });

  it('추가금을 쓰는 대회에서는 체크박스가 두 개다', () => {
    renderPlayerListField({
      memberLabel: '영등포구 회원',
      nonMemberSurcharge: 10000,
    });

    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
    expect(screen.getByText('우리 클럽 회원')).toBeTruthy();
    expect(screen.getByText('영등포구 회원')).toBeTruthy();
  });
});
