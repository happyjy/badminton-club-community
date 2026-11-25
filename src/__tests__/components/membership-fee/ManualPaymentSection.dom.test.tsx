import { ComponentProps } from 'react';

import { describe, expect, it, jest } from '@jest/globals';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';

import { ManualPaymentSection } from '@/components/organisms/membership-fee/ManualPaymentSection';

type Props = ComponentProps<typeof ManualPaymentSection>;

const base: Props = {
  payments: [
    {
      id: 'pay-2',
      year: 2026,
      month: 10,
      amount: 25000,
      reason: '재무 표 기준',
      confirmedAt: '2026-11-23T01:00:00.000Z',
      confirmedByName: '관리자',
    },
    {
      id: 'pay-1',
      year: 2026,
      month: 9,
      amount: 25000,
      reason: '다른 계좌로 보냄',
      confirmedAt: '2026-11-23T01:00:00.000Z',
      confirmedByName: '관리자',
    },
  ],
  saving: false,
  onSuggestAmount: async () => null,
  onAdd: async () => true,
  onDelete: () => {},
};

const click = async (element: HTMLElement) => {
  await act(async () => {
    fireEvent.click(element);
  });
};

const sheet = () => within(screen.getByRole('dialog'));

describe('ManualPaymentSection', () => {
  it('직접 추가한 납부를 한 줄씩 보인다', () => {
    render(<ManualPaymentSection {...base} />);
    expect(screen.getByText('직접 추가한 납부')).toBeTruthy();
    expect(screen.getByText('2026.10 · 25,000원 · 재무 표 기준')).toBeTruthy();
    expect(
      screen.getByText('2026.09 · 25,000원 · 다른 계좌로 보냄')
    ).toBeTruthy();
  });

  it('없으면 목록 없이 추가 버튼만 보인다', () => {
    render(<ManualPaymentSection {...base} payments={[]} />);
    expect(screen.queryByText(/원 · /)).toBeNull();
    expect(screen.getByRole('button', { name: '납부 직접 추가' })).toBeTruthy();
  });

  it('연월을 고르면 기본 금액을 채운다', async () => {
    const onSuggestAmount = jest
      .fn<Props['onSuggestAmount']>()
      .mockResolvedValue(25000);
    render(
      <ManualPaymentSection {...base} onSuggestAmount={onSuggestAmount} />
    );
    await click(screen.getByRole('button', { name: '납부 직접 추가' }));
    await act(async () => {
      fireEvent.change(sheet().getByLabelText(/연월/), {
        target: { value: '2026-09' },
      });
    });

    expect(onSuggestAmount).toHaveBeenCalledWith(2026, 9);
    await waitFor(() =>
      expect((sheet().getByLabelText(/금액/) as HTMLInputElement).value).toBe(
        '25000'
      )
    );
  });

  it('사유를 고르기 전에는 저장할 수 없다', async () => {
    render(
      <ManualPaymentSection {...base} onSuggestAmount={async () => 25000} />
    );
    await click(screen.getByRole('button', { name: '납부 직접 추가' }));
    await act(async () => {
      fireEvent.change(sheet().getByLabelText(/연월/), {
        target: { value: '2026-09' },
      });
    });

    expect(
      (sheet().getByRole('button', { name: '저장' }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
  });

  it('고른 사유를 그대로 보낸다', async () => {
    const onAdd = jest.fn<Props['onAdd']>().mockResolvedValue(true);
    render(
      <ManualPaymentSection
        {...base}
        onSuggestAmount={async () => 25000}
        onAdd={onAdd}
      />
    );
    await click(screen.getByRole('button', { name: '납부 직접 추가' }));
    await act(async () => {
      fireEvent.change(sheet().getByLabelText(/연월/), {
        target: { value: '2026-09' },
      });
    });
    await click(sheet().getByLabelText('다른 계좌로 보냄'));
    await click(sheet().getByRole('button', { name: '저장' }));

    expect(onAdd).toHaveBeenCalledWith({
      year: 2026,
      month: 9,
      amount: 25000,
      reason: '다른 계좌로 보냄',
    });
  });

  it('기타를 고르면 쓴 글을 사유로 보내고, 성공하면 시트를 닫는다', async () => {
    const onAdd = jest.fn<Props['onAdd']>().mockResolvedValue(true);
    render(
      <ManualPaymentSection
        {...base}
        onSuggestAmount={async () => 25000}
        onAdd={onAdd}
      />
    );
    await click(screen.getByRole('button', { name: '납부 직접 추가' }));
    await act(async () => {
      fireEvent.change(sheet().getByLabelText(/연월/), {
        target: { value: '2026-10' },
      });
    });
    await click(sheet().getByLabelText('기타'));
    fireEvent.change(sheet().getByLabelText(/사유 직접 쓰기/), {
      target: { value: '재무 표 기준' },
    });
    await click(sheet().getByRole('button', { name: '저장' }));

    expect(onAdd).toHaveBeenCalledWith({
      year: 2026,
      month: 10,
      amount: 25000,
      reason: '재무 표 기준',
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('저장에 실패하면 시트를 열어 둔다', async () => {
    render(
      <ManualPaymentSection
        {...base}
        onSuggestAmount={async () => 25000}
        onAdd={async () => false}
      />
    );
    await click(screen.getByRole('button', { name: '납부 직접 추가' }));
    await act(async () => {
      fireEvent.change(sheet().getByLabelText(/연월/), {
        target: { value: '2026-09' },
      });
    });
    await click(sheet().getByLabelText('현금으로 받음'));
    await click(sheet().getByRole('button', { name: '저장' }));

    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('행을 눌러 삭제하면 그 id로 onDelete를 부른다', async () => {
    const onDelete = jest.fn<Props['onDelete']>();
    render(<ManualPaymentSection {...base} onDelete={onDelete} />);
    await click(screen.getByText('2026.09 · 25,000원 · 다른 계좌로 보냄'));
    expect(sheet().getByText(/관리자/)).toBeTruthy();
    await click(sheet().getByRole('button', { name: '삭제' }));

    expect(onDelete).toHaveBeenCalledWith('pay-1');
  });
});
