/**
 * 입금 내역 한 건의 동작(`usePaymentRecordActions`) 명세.
 * 입금 내역 처리 화면과 업로드 화면이 함께 쓴다.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

import { usePaymentRecordActions } from '@/hooks/membership-fee/usePaymentRecordActions';

import type { PaymentRecord } from '@/types/membership-fee.types';

type Mutation = (input: any) => Promise<unknown>;

const mockUpdate = jest.fn<Mutation>();
const mockConfirmPayment = jest.fn<Mutation>();
const mockUnconfirm = jest.fn<Mutation>();
const mockSkip = jest.fn<Mutation>();
const mockUnskip = jest.fn<Mutation>();
const mockAsk = jest.fn<(options: any) => Promise<boolean>>();
const mockInvalidate = jest.fn<(filter: any) => Promise<void>>();

jest.mock('@/hooks/membership-fee/usePaymentRecords', () => ({
  useUpdatePaymentRecord: () => ({ mutateAsync: mockUpdate, isPending: false }),
  useConfirmPayment: () => ({
    mutateAsync: mockConfirmPayment,
    isPending: false,
  }),
  useUnconfirmPayment: () => ({ mutateAsync: mockUnconfirm, isPending: false }),
  useSkipPayment: () => ({ mutateAsync: mockSkip, isPending: false }),
  useUnskipPayment: () => ({ mutateAsync: mockUnskip, isPending: true }),
}));
jest.mock('@/components/organisms/sheet/ConfirmProvider', () => ({
  useConfirm: () => mockAsk,
}));
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidate }),
}));
jest.mock('react-hot-toast', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));
jest.mock('axios');

const mockPatch = axios.patch as jest.MockedFunction<typeof axios.patch>;

const MEMBERS = [
  { id: 10, userId: 110, name: '가온' },
  { id: 20, name: '나래' },
];
const RECORD = {
  id: 'r1',
  matchedMemberId: 10,
  matchedMembers: [{ id: 'm1', clubMemberId: 10 }],
} as PaymentRecord;

const setup = () =>
  renderHook(() => usePaymentRecordActions('1', MEMBERS)).result;

beforeEach(() => {
  jest.clearAllMocks();
  mockUpdate.mockResolvedValue({});
  mockConfirmPayment.mockResolvedValue({});
  mockUnconfirm.mockResolvedValue({});
  mockSkip.mockResolvedValue({});
  mockUnskip.mockResolvedValue({});
  mockAsk.mockResolvedValue(true);
  mockInvalidate.mockResolvedValue(undefined);
  mockPatch.mockResolvedValue({ data: {} });
});

describe('usePaymentRecordActions — 고치기', () => {
  it('회원을 고르면 그 회원들로 고친다', async () => {
    const result = setup();

    await act(() => result.current.actions.onUpdateMember('r1', [10, 20]));

    expect(mockUpdate).toHaveBeenCalledWith({
      recordId: 'r1',
      data: { matchedMemberIds: [10, 20] },
    });
  });

  it('분류·금액·메모를 고친다', async () => {
    const result = setup();

    await act(() =>
      result.current.actions.onUpdateRecord('r1', { kind: 'EVENT' })
    );

    expect(mockUpdate).toHaveBeenCalledWith({
      recordId: 'r1',
      data: { kind: 'EVENT' },
    });
  });

  it('고치지 못하면 서버가 알려 준 사유를 보인다', async () => {
    mockUpdate.mockRejectedValue(
      new Error('회비가 아닌 금액은 입금액보다 적어야 합니다')
    );
    const result = setup();

    await act(() =>
      result.current.actions.onUpdateRecord('r1', {
        nonFeeAmount: 99999,
        nonFeeKind: 'OTHER',
      })
    );

    expect(toast.error).toHaveBeenCalledWith(
      '회비가 아닌 금액은 입금액보다 적어야 합니다'
    );
  });
});

describe('usePaymentRecordActions — 확정·건너뛰기', () => {
  it('한 해의 달만 고르면 year·months로 보낸다', async () => {
    const result = setup();

    await act(() =>
      result.current.actions.onConfirm('r1', [{ year: 2026, months: [5, 6] }])
    );

    expect(mockConfirmPayment).toHaveBeenCalledWith({
      recordId: 'r1',
      data: { year: 2026, months: [5, 6] },
    });
  });

  it('여러 해에 걸치면 selections로 보낸다', async () => {
    const selections = [
      { year: 2025, months: [12] },
      { year: 2026, months: [1] },
    ];
    const result = setup();

    await act(() => result.current.actions.onConfirm('r1', selections));

    expect(mockConfirmPayment).toHaveBeenCalledWith({
      recordId: 'r1',
      data: { selections },
    });
  });

  it('확정하지 못하면 사유를 보인다', async () => {
    mockConfirmPayment.mockRejectedValue(
      new Error('이미 납부된 월이 있습니다: 2026년 5월')
    );
    const result = setup();

    await act(() =>
      result.current.actions.onConfirm('r1', [{ year: 2026, months: [5] }])
    );

    expect(toast.error).toHaveBeenCalledWith(
      '이미 납부된 월이 있습니다: 2026년 5월'
    );
  });

  it('확정 취소와 건너뛰기 해제는 다음에 할 일을 알린다', async () => {
    const result = setup();

    await act(() => result.current.actions.onUnconfirm('r1'));
    await act(() => result.current.actions.onUnskip('r1'));

    expect(mockUnconfirm).toHaveBeenCalledWith('r1');
    expect(toast.success).toHaveBeenCalledWith(
      '확정이 취소되었습니다. 회원·월을 수정한 뒤 다시 확정해주세요.'
    );
    expect(mockUnskip).toHaveBeenCalledWith('r1');
    expect(toast.success).toHaveBeenCalledWith(
      '건너뛰기가 해제되었습니다. 확정 또는 다시 건너뛸 수 있습니다.'
    );
  });

  it('건너뛰지 못하면 알린다', async () => {
    mockSkip.mockRejectedValue(new Error(''));
    const result = setup();

    await act(() => result.current.actions.onSkip('r1'));

    expect(toast.error).toHaveBeenCalledWith('건너뛰기에 실패했습니다.');
  });

  it('하나라도 처리 중이면 처리 중이라고 알린다', () => {
    expect(setup().current.isUpdating).toBe(true);
  });
});

describe('usePaymentRecordActions — 의무 시작월 앞당기기', () => {
  const march = { year: 2026, month: 3 };

  it('누구의 시작월을 언제로 바꾸는지 물은 뒤 바꾸고, 목록과 현황을 새로 읽는다', async () => {
    const result = setup();

    await act(() => result.current.actions.onAdvanceStartMonth(RECORD, march));

    expect(mockAsk).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '가온 회원의 회비 의무 시작월을 2026년 3월로 앞당길까요?',
      })
    );
    expect(mockPatch).toHaveBeenCalledWith(
      '/api/clubs/1/members/110/fee-obligation',
      { feeObligationStartAt: '2026-03-01T00:00:00.000Z' }
    );
    expect(mockInvalidate).toHaveBeenCalledWith({
      queryKey: ['paymentRecords', '1'],
    });
    expect(mockInvalidate).toHaveBeenCalledWith({
      queryKey: ['paymentDashboard', '1'],
    });
    expect(toast.success).toHaveBeenCalledWith(
      '의무 시작월을 2026년 3월로 바꿨습니다.'
    );
  });

  it('묻는 창에서 취소하면 바꾸지 않는다', async () => {
    mockAsk.mockResolvedValue(false);
    const result = setup();

    await act(() => result.current.actions.onAdvanceStartMonth(RECORD, march));

    expect(mockPatch).not.toHaveBeenCalled();
  });

  it('회원을 찾을 수 없으면 바꾸지 않고 알린다', async () => {
    const result = setup();
    const unknown = {
      ...RECORD,
      matchedMembers: [{ id: 'm', clubMemberId: 20 }],
    };

    await act(() =>
      result.current.actions.onAdvanceStartMonth(
        unknown as PaymentRecord,
        march
      )
    );

    expect(mockPatch).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('회원 정보를 찾을 수 없습니다.');
  });

  it('바꾸지 못하면 알린다', async () => {
    mockPatch.mockRejectedValue(new Error('network'));
    const result = setup();

    await act(() => result.current.actions.onAdvanceStartMonth(RECORD, march));

    expect(toast.error).toHaveBeenCalledWith(
      '의무 시작월을 바꾸지 못했습니다.'
    );
    expect(mockInvalidate).not.toHaveBeenCalled();
  });
});
