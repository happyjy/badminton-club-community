import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { toast } from 'react-hot-toast';

import { CoupleHistoryUpsertSheet } from '@/components/organisms/membership-fee/CoupleHistoryUpsertSheet';
import { ExemptionRegisterSheet } from '@/components/organisms/membership-fee/ExemptionRegisterSheet';
import { FeeTypeFormSheet } from '@/components/organisms/membership-fee/FeeTypeFormSheet';

import type { CoupleHistory, FeeType } from '@/types/membership-fee.types';

const mockCreate = jest.fn<(input: any) => Promise<{ id: number }>>();
const mockUpdate = jest.fn<(input: any) => Promise<unknown>>();
const mockBulkRates = jest.fn<(input: any) => Promise<unknown>>();

jest.mock('@/hooks/membership-fee/useFeeTypes', () => ({
  useCreateFeeType: () => ({ mutateAsync: mockCreate, isPending: false }),
  useUpdateFeeType: () => ({ mutateAsync: mockUpdate, isPending: false }),
  useBulkUpsertFeeRates: () => ({
    mutateAsync: mockBulkRates,
    isPending: false,
  }),
}));
jest.mock('react-hot-toast', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const MEMBERS = [
  { id: 1, name: '가온' },
  { id: 2, name: '나래' },
  { id: 3, name: '다람' },
];

const click = async (element: HTMLElement) => {
  await act(async () => {
    fireEvent.click(element);
  });
};

const sheet = () => within(screen.getByRole('dialog'));

/** 회원 선택 드롭다운을 펼쳐 그 회원을 고른다. */
const pickMember = async (trigger: string, name: string) => {
  await click(sheet().getByRole('button', { name: trigger }));
  await click(sheet().getByRole('option', { name }));
};

const isDisabled = (element: HTMLElement) =>
  (element as HTMLButtonElement).disabled;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ExemptionRegisterSheet', () => {
  const base = {
    isOpen: true,
    onClose: () => {},
    onSubmit: () => {},
    members: MEMBERS,
    exemptedMemberIds: [] as number[],
    year: 2026,
  };

  it('닫혀 있으면 그리지 않는다', () => {
    render(<ExemptionRegisterSheet {...base} isOpen={false} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('제목에 연도가 들어간다', () => {
    render(<ExemptionRegisterSheet {...base} />);
    expect(
      screen.getByRole('dialog', { name: '2026년 회비 면제 등록' })
    ).toBeTruthy();
  });

  it('회원과 사유를 모두 골라야 등록할 수 있다', async () => {
    render(<ExemptionRegisterSheet {...base} />);
    expect(isDisabled(sheet().getByRole('button', { name: '등록' }))).toBe(
      true
    );
    await pickMember('회원 선택', '나래');
    expect(isDisabled(sheet().getByRole('button', { name: '등록' }))).toBe(
      true
    );
    await click(sheet().getByRole('radio', { name: '임원' }));
    expect(isDisabled(sheet().getByRole('button', { name: '등록' }))).toBe(
      false
    );
  });

  it('등록하면 회원 id와 사유를 알린다', async () => {
    const onSubmit = jest.fn();
    render(<ExemptionRegisterSheet {...base} onSubmit={onSubmit} />);
    await pickMember('회원 선택', '나래');
    await click(sheet().getByRole('radio', { name: '명예회원' }));
    await click(sheet().getByRole('button', { name: '등록' }));
    expect(onSubmit).toHaveBeenCalledWith({
      clubMemberId: 2,
      reason: '명예회원',
    });
  });

  it('기타는 사유를 적어야 하고, 적은 글자가 사유가 된다', async () => {
    const onSubmit = jest.fn();
    render(<ExemptionRegisterSheet {...base} onSubmit={onSubmit} />);
    await pickMember('회원 선택', '가온');
    await click(sheet().getByRole('radio', { name: '기타' }));
    expect(isDisabled(sheet().getByRole('button', { name: '등록' }))).toBe(
      true
    );
    fireEvent.change(sheet().getByPlaceholderText('면제 사유 입력'), {
      target: { value: '코치' },
    });
    await click(sheet().getByRole('button', { name: '등록' }));
    expect(onSubmit).toHaveBeenCalledWith({ clubMemberId: 1, reason: '코치' });
  });

  it('이미 면제된 회원은 고를 수 없다', async () => {
    render(<ExemptionRegisterSheet {...base} exemptedMemberIds={[2]} />);
    await click(sheet().getByRole('button', { name: '회원 선택' }));
    expect(
      within(sheet().getByRole('listbox'))
        .getAllByRole('option')
        .map((option) => option.textContent)
    ).toEqual(['가온', '다람']);
  });
});

describe('CoupleHistoryUpsertSheet', () => {
  const base = {
    isOpen: true,
    onClose: () => {},
    onSubmit: () => {},
    members: MEMBERS,
    editing: null as CoupleHistory | null,
  };

  const EDITING = {
    id: 7,
    clubId: 1,
    clubMemberId: 1,
    partnerClubMemberId: 2,
    startedAt: new Date(2025, 2, 1).toISOString(),
    endedAt: null,
    createdAt: new Date(2025, 2, 1).toISOString(),
    clubMember: { id: 1, name: '가온' },
    partnerMember: { id: 2, name: '나래' },
  } as CoupleHistory;

  const year = new Date().getFullYear();

  it('두 회원을 고르지 않으면 오류를 보이고 알리지 않는다', async () => {
    const onSubmit = jest.fn();
    render(<CoupleHistoryUpsertSheet {...base} onSubmit={onSubmit} />);
    await click(sheet().getByRole('button', { name: '등록' }));
    expect(sheet().getByText('두 회원을 모두 선택해주세요')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('한쪽에서 고른 회원은 다른 쪽 목록에서 빠진다', async () => {
    render(<CoupleHistoryUpsertSheet {...base} />);
    await pickMember('회원 선택', '가온');
    await click(sheet().getByRole('button', { name: '배우자 선택' }));
    expect(
      within(sheet().getByRole('listbox'))
        .getAllByRole('option')
        .map((option) => option.textContent)
    ).toEqual(['나래', '다람']);
  });

  it('새로 등록하면 올해 1월 시작, 진행 중으로 알린다', async () => {
    const onSubmit = jest.fn();
    render(<CoupleHistoryUpsertSheet {...base} onSubmit={onSubmit} />);
    await pickMember('회원 선택', '가온');
    await pickMember('배우자 선택', '나래');
    await click(sheet().getByRole('button', { name: '등록' }));
    expect(onSubmit).toHaveBeenCalledWith({
      clubMemberId: 1,
      partnerClubMemberId: 2,
      started: { year, month: 1 },
      ended: null,
    });
  });

  it('종료가 시작보다 앞서면 오류를 보이고 알리지 않는다', async () => {
    const onSubmit = jest.fn();
    render(<CoupleHistoryUpsertSheet {...base} onSubmit={onSubmit} />);
    await pickMember('회원 선택', '가온');
    await pickMember('배우자 선택', '나래');
    fireEvent.change(sheet().getByRole('combobox', { name: '시작 월' }), {
      target: { value: '6' },
    });
    await click(sheet().getByRole('checkbox', { name: '종료된 관계' }));
    fireEvent.change(sheet().getByRole('combobox', { name: '종료 월' }), {
      target: { value: '3' },
    });
    await click(sheet().getByRole('button', { name: '등록' }));
    expect(
      sheet().getByText('종료 연·월은 시작 연·월 이상이어야 합니다')
    ).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('종료된 관계로 등록하면 종료 연·월을 함께 알린다', async () => {
    const onSubmit = jest.fn();
    render(<CoupleHistoryUpsertSheet {...base} onSubmit={onSubmit} />);
    await pickMember('회원 선택', '가온');
    await pickMember('배우자 선택', '나래');
    await click(sheet().getByRole('checkbox', { name: '종료된 관계' }));
    await click(sheet().getByRole('button', { name: '등록' }));
    expect(onSubmit).toHaveBeenCalledWith({
      clubMemberId: 1,
      partnerClubMemberId: 2,
      started: { year, month: 1 },
      ended: { year, month: 12 },
    });
  });

  it('수정으로 열면 기존 값이 채워져 있다', async () => {
    const onSubmit = jest.fn();
    render(
      <CoupleHistoryUpsertSheet
        {...base}
        editing={EDITING}
        onSubmit={onSubmit}
      />
    );
    expect(
      screen.getByRole('dialog', { name: '부부 관계 이력 수정' })
    ).toBeTruthy();
    await click(sheet().getByRole('button', { name: '수정' }));
    expect(onSubmit).toHaveBeenCalledWith({
      clubMemberId: 1,
      partnerClubMemberId: 2,
      started: { year: 2025, month: 3 },
      ended: null,
    });
  });

  it('수정으로 열면 삭제 버튼이 있고, 누르면 그 이력의 id로 알린다', async () => {
    const onDelete = jest.fn();
    render(
      <CoupleHistoryUpsertSheet
        {...base}
        editing={EDITING}
        onDelete={onDelete}
      />
    );
    await click(sheet().getByRole('button', { name: '삭제' }));
    expect(onDelete).toHaveBeenCalledWith(7);
  });

  it('새로 등록할 때는 삭제 버튼이 없다', () => {
    render(<CoupleHistoryUpsertSheet {...base} onDelete={() => {}} />);
    expect(sheet().queryByRole('button', { name: '삭제' })).toBeNull();
  });
});

describe('FeeTypeFormSheet', () => {
  const FEE_TYPE = {
    id: 3,
    clubId: 1,
    name: '일반',
    description: '기본 회비',
    isActive: true,
    sortOrder: 0,
    rates: [
      { period: 'MONTHLY', amount: 30000, monthCount: 1 },
      { period: 'ANNUAL', amount: 330000, monthCount: 12 },
    ],
  } as unknown as FeeType;

  const base = {
    open: true,
    clubId: '1',
    year: 2026,
    feeType: null as FeeType | null,
    onClose: () => {},
    onSuccess: () => {},
  };

  const nameInput = () =>
    sheet().getByPlaceholderText('예: 일반, 부부, 가입비');
  const amountInput = (label: string) => sheet().getByLabelText(label);

  it('이름이 비어 있으면 안내하고 저장하지 않는다', async () => {
    render(<FeeTypeFormSheet {...base} />);
    await click(sheet().getByRole('button', { name: '저장' }));
    expect(toast.error).toHaveBeenCalledWith('유형 이름을 입력해주세요.');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('추가: 유형을 만든 뒤 0보다 큰 금액만 그 유형의 id로 저장한다', async () => {
    mockCreate.mockResolvedValue({ id: 9 });
    mockBulkRates.mockResolvedValue({});
    const onSuccess = jest.fn();
    const onClose = jest.fn();
    render(
      <FeeTypeFormSheet {...base} onSuccess={onSuccess} onClose={onClose} />
    );
    fireEvent.change(nameInput(), { target: { value: ' 부부 ' } });
    fireEvent.change(amountInput('월납'), { target: { value: '50000' } });
    await click(sheet().getByRole('button', { name: '저장' }));

    expect(mockCreate).toHaveBeenCalledWith({
      name: '부부',
      description: undefined,
    });
    expect(mockBulkRates).toHaveBeenCalledWith({
      feeTypeId: 9,
      year: 2026,
      rates: [{ period: 'MONTHLY', amount: 50000, monthCount: 1 }],
    });
    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('추가: 금액을 적지 않으면 금액 저장을 부르지 않는다', async () => {
    mockCreate.mockResolvedValue({ id: 9 });
    render(<FeeTypeFormSheet {...base} />);
    fireEvent.change(nameInput(), { target: { value: '가입비' } });
    await click(sheet().getByRole('button', { name: '저장' }));
    expect(mockCreate).toHaveBeenCalled();
    expect(mockBulkRates).not.toHaveBeenCalled();
  });

  it('수정: 기존 값이 채워져 있고, 고친 값으로 저장한다', async () => {
    mockUpdate.mockResolvedValue({});
    mockBulkRates.mockResolvedValue({});
    render(<FeeTypeFormSheet {...base} feeType={FEE_TYPE} />);
    expect(screen.getByRole('dialog', { name: '회비 유형 수정' })).toBeTruthy();
    expect((nameInput() as HTMLInputElement).value).toBe('일반');
    expect((amountInput('연납') as HTMLInputElement).value).toBe('330000');

    fireEvent.change(amountInput('월납'), { target: { value: '35000' } });
    await click(sheet().getByRole('button', { name: '저장' }));

    expect(mockUpdate).toHaveBeenCalledWith({
      typeId: 3,
      data: { name: '일반', description: '기본 회비' },
    });
    expect(mockBulkRates).toHaveBeenCalledWith({
      feeTypeId: 3,
      year: 2026,
      rates: [
        { period: 'MONTHLY', amount: 35000, monthCount: 1 },
        { period: 'ANNUAL', amount: 330000, monthCount: 12 },
      ],
    });
  });

  it('저장에 실패하면 알리고 닫지 않는다', async () => {
    mockCreate.mockRejectedValue(new Error('이미 있는 이름입니다'));
    const onClose = jest.fn();
    render(<FeeTypeFormSheet {...base} onClose={onClose} />);
    fireEvent.change(nameInput(), { target: { value: '일반' } });
    await click(sheet().getByRole('button', { name: '저장' }));
    expect(toast.error).toHaveBeenCalledWith('이미 있는 이름입니다');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('다른 유형으로 다시 열면 그 유형의 값으로 바뀐다', () => {
    const { rerender } = render(
      <FeeTypeFormSheet {...base} feeType={FEE_TYPE} />
    );
    rerender(<FeeTypeFormSheet {...base} open={false} feeType={null} />);
    rerender(<FeeTypeFormSheet {...base} feeType={null} />);
    expect((nameInput() as HTMLInputElement).value).toBe('');
    expect((amountInput('월납') as HTMLInputElement).value).toBe('');
  });

  it('수정으로 열면 삭제 버튼이 있고, 누르면 그 유형으로 알린다', async () => {
    const onDelete = jest.fn();
    render(
      <FeeTypeFormSheet {...base} feeType={FEE_TYPE} onDelete={onDelete} />
    );
    await click(sheet().getByRole('button', { name: '삭제' }));
    expect(onDelete).toHaveBeenCalledWith(FEE_TYPE);
  });

  it('새로 추가할 때는 삭제 버튼이 없다', () => {
    render(<FeeTypeFormSheet {...base} onDelete={() => {}} />);
    expect(sheet().queryByRole('button', { name: '삭제' })).toBeNull();
  });
});
