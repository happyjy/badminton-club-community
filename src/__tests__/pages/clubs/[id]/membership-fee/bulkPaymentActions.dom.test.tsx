/**
 * 일괄 처리 핸들러(`useBulkPaymentActions`) 동작 명세.
 *
 * 검증하는 핸들러:
 *   1) handleBulkConfirmSelected   — MATCHED 탭, 선택 record + 연도·월
 *   2) handleBulkUnconfirmSelected — CONFIRMED 탭, 선택 record 확정 취소
 *   3) handleBulkSkipSelected      — PENDING/MATCHED/ERROR 탭, 선택 건너뛰기
 *   4) handleBulkUnskipSelected    — SKIPPED 탭, 선택 건너뛰기 해제
 *
 * 공통 패턴(반드시 잠가야 할 것):
 * - 빈 선택 시 안내 토스트 + mutation 호출 안 됨
 * - 확인창을 거절하면 mutation 호출 안 됨
 * - 실패가 있으면 확인창에 "depositorName: reason" 형태로 입금자명 prefix
 * - 성공한 recordId만 selection에서 제거 (실패는 유지 → 재시도 가능)
 * - mutation 자체가 throw하면 오류 토스트
 *
 * 추가:
 * - handleBulkConfirmSelected는 월 미선택 시 별도 안내 + mutation 호출 안 됨
 * - handleBulkConfirmSelected는 결과를 받았는지를 boolean으로 돌려준다
 */
import { useState } from 'react';

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react';
import { toast } from 'react-hot-toast';

import { useBulkPaymentActions } from '@/hooks/membership-fee/useBulkPaymentActions';

import type { PaymentRecord } from '@/types/membership-fee.types';

type BulkResult = {
  results: {
    success: string[];
    failed: { recordId: string; reason: string }[];
  };
  summary: {
    total: number;
    processed: number;
    success: number;
    failed: number;
  };
};

// @jest/globals의 jest.fn()은 인자 없이 쓰면 UnknownFunction 타입이라 훅 시그니처에 맞지 않는다.
type BulkMutation = (input: any) => Promise<BulkResult>;

const mockBulkConfirm = jest.fn<BulkMutation>();
const mockBulkUnconfirm = jest.fn<BulkMutation>();
const mockBulkSkip = jest.fn<BulkMutation>();
const mockBulkUnskip = jest.fn<BulkMutation>();
const mockBulkSetKind = jest.fn<BulkMutation>();
const mockConfirm = jest.fn<(options: any) => Promise<boolean>>();

jest.mock('@/hooks/membership-fee/usePaymentRecords', () => ({
  useBulkConfirmPayments: () => ({
    mutateAsync: mockBulkConfirm,
    isPending: false,
  }),
  useBulkUnconfirmPayments: () => ({
    mutateAsync: mockBulkUnconfirm,
    isPending: false,
  }),
  useBulkSkipPayments: () => ({ mutateAsync: mockBulkSkip, isPending: false }),
  useBulkUnskipPayments: () => ({
    mutateAsync: mockBulkUnskip,
    isPending: false,
  }),
  useBulkSetKind: () => ({ mutateAsync: mockBulkSetKind, isPending: false }),
}));
jest.mock('@/components/organisms/sheet/ConfirmProvider', () => ({
  useConfirm: () => mockConfirm,
}));
jest.mock('react-hot-toast', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

function makeRecord(id: string, depositorName: string): PaymentRecord {
  return {
    id,
    batchId: 'b1',
    clubId: 1,
    transactionDate: new Date('2025-05-01'),
    depositorName,
    amount: 30000,
    memo: null,
    matchedMemberId: null,
    status: 'PENDING',
    errorReason: null,
    kind: 'FEE',
    kindReason: null,
    nonFeeAmount: 0,
    nonFeeKind: null,
    monthHints: null,
    needsReview: false,
    note: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as PaymentRecord;
}

function makeBulkResult(
  success: string[],
  failed: { recordId: string; reason: string }[]
): BulkResult {
  return {
    results: { success, failed },
    summary: {
      total: success.length + failed.length,
      processed: success.length + failed.length,
      success: success.length,
      failed: failed.length,
    },
  };
}

const RECORDS = [
  makeRecord('r1', '홍길동'),
  makeRecord('r2', '김철수'),
  makeRecord('r3', '이영희'),
];

/** 회계 연도. 훅의 `year` 인자로 넘긴다. */
const FISCAL_YEAR = 2025;

/** 선택 상태를 함께 들고 있는 받침. 훅이 선택을 어떻게 고치는지 보려고 쓴다. */
function setup(initialSelected: string[]) {
  return renderHook(() => {
    const [selectedRecordIds, setSelectedRecordIds] = useState(initialSelected);
    const bulk = useBulkPaymentActions({
      clubIdStr: '1',
      records: RECORDS,
      selectedRecordIds,
      setSelectedRecordIds,
      year: FISCAL_YEAR,
    });
    return { bulk, selectedRecordIds };
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockConfirm.mockResolvedValue(true);
});

describe('빈 선택 — 모든 핸들러 공통', () => {
  it('confirmSelected — 빈 선택은 안내 + mutation 호출 안 됨', async () => {
    const { result } = setup([]);
    await act(async () => {
      await result.current.bulk.handleBulkConfirmSelected();
    });
    expect(toast.error).toHaveBeenCalledWith('선택된 항목이 없습니다.');
    expect(mockConfirm).not.toHaveBeenCalled();
    expect(mockBulkConfirm).not.toHaveBeenCalled();
  });

  it('unconfirmSelected — 빈 선택은 안내 + mutation 호출 안 됨', async () => {
    const { result } = setup([]);
    await act(async () => {
      await result.current.bulk.handleBulkUnconfirmSelected();
    });
    expect(toast.error).toHaveBeenCalledWith('선택된 항목이 없습니다.');
    expect(mockBulkUnconfirm).not.toHaveBeenCalled();
  });

  it('skipSelected — 빈 선택은 안내 + mutation 호출 안 됨', async () => {
    const { result } = setup([]);
    await act(async () => {
      await result.current.bulk.handleBulkSkipSelected();
    });
    expect(toast.error).toHaveBeenCalledWith('선택된 항목이 없습니다.');
    expect(mockBulkSkip).not.toHaveBeenCalled();
  });

  it('unskipSelected — 빈 선택은 안내 + mutation 호출 안 됨', async () => {
    const { result } = setup([]);
    await act(async () => {
      await result.current.bulk.handleBulkUnskipSelected();
    });
    expect(toast.error).toHaveBeenCalledWith('선택된 항목이 없습니다.');
    expect(mockBulkUnskip).not.toHaveBeenCalled();
  });
});

describe('확인창 거절 — mutation 호출 안 됨', () => {
  beforeEach(() => {
    mockConfirm.mockResolvedValue(false);
  });

  it('confirmSelected — 거절 시 호출 안 됨', async () => {
    const { result } = setup(['r1']);
    act(() => {
      result.current.bulk.setBulkSelectionMonths([5]);
    });
    await act(async () => {
      await result.current.bulk.handleBulkConfirmSelected();
    });
    expect(mockConfirm).toHaveBeenCalledTimes(1);
    expect(mockBulkConfirm).not.toHaveBeenCalled();
  });

  it('unconfirmSelected — 거절 시 호출 안 됨', async () => {
    const { result } = setup(['r1']);
    await act(async () => {
      await result.current.bulk.handleBulkUnconfirmSelected();
    });
    expect(mockConfirm).toHaveBeenCalledTimes(1);
    expect(mockBulkUnconfirm).not.toHaveBeenCalled();
  });

  it('skipSelected — 거절 시 호출 안 됨, 선택은 그대로', async () => {
    const { result } = setup(['r1', 'r2']);
    await act(async () => {
      await result.current.bulk.handleBulkSkipSelected();
    });
    expect(mockConfirm).toHaveBeenCalledTimes(1);
    expect(mockBulkSkip).not.toHaveBeenCalled();
    expect(result.current.selectedRecordIds).toEqual(['r1', 'r2']);
  });

  it('unskipSelected — 거절 시 호출 안 됨', async () => {
    const { result } = setup(['r1']);
    await act(async () => {
      await result.current.bulk.handleBulkUnskipSelected();
    });
    expect(mockConfirm).toHaveBeenCalledTimes(1);
    expect(mockBulkUnskip).not.toHaveBeenCalled();
  });

  it('confirmAllMatched — 거절 시 호출 안 됨', async () => {
    const { result } = setup([]);
    await act(async () => {
      await result.current.bulk.handleBulkConfirmAllMatched(['r1', 'r2']);
    });
    expect(mockConfirm).toHaveBeenCalledWith({
      title: '2건의 입금 내역을 일괄 확정하시겠습니까?',
    });
    expect(mockBulkConfirm).not.toHaveBeenCalled();
  });
});

describe('확인창 문구', () => {
  it('confirmSelected — 건수·연도·월을 묻는다', async () => {
    mockBulkConfirm.mockResolvedValue(makeBulkResult(['r1', 'r2'], []));
    const { result } = setup(['r1', 'r2']);
    act(() => {
      result.current.bulk.setBulkSelectionYear(2025);
      result.current.bulk.setBulkSelectionMonths([5, 6]);
    });
    await act(async () => {
      await result.current.bulk.handleBulkConfirmSelected();
    });
    expect(mockConfirm).toHaveBeenCalledWith({
      title: '2건을 2025년 5, 6월로 일괄 확정하시겠습니까?',
    });
  });

  it('unconfirmSelected — 되돌릴 일을 알리고 destructive로 묻는다', async () => {
    mockBulkUnconfirm.mockResolvedValue(makeBulkResult(['r1'], []));
    const { result } = setup(['r1']);
    await act(async () => {
      await result.current.bulk.handleBulkUnconfirmSelected();
    });
    expect(mockConfirm).toHaveBeenCalledWith({
      title: '1건의 확정을 취소하시겠습니까?',
      message: '회원·월 수정 후 다시 확정해야 합니다.',
      destructive: true,
    });
  });

  it('skipSelected — 정산에서 빠진다고 알린다', async () => {
    mockBulkSkip.mockResolvedValue(makeBulkResult(['r1'], []));
    const { result } = setup(['r1']);
    await act(async () => {
      await result.current.bulk.handleBulkSkipSelected();
    });
    expect(mockConfirm).toHaveBeenCalledWith({
      title: '1건을 건너뛰기 처리하시겠습니까?',
      message: '정산 대상에서 제외됩니다.',
    });
  });

  it('unskipSelected', async () => {
    mockBulkUnskip.mockResolvedValue(makeBulkResult(['r1'], []));
    const { result } = setup(['r1']);
    await act(async () => {
      await result.current.bulk.handleBulkUnskipSelected();
    });
    expect(mockConfirm).toHaveBeenCalledWith({
      title: '1건의 건너뛰기를 해제하시겠습니까?',
    });
  });
});

describe('handleBulkConfirmSelected 전용', () => {
  it('월 미선택 시 별도 안내 + mutation 호출 안 됨', async () => {
    const { result } = setup(['r1']);
    let done = true;
    await act(async () => {
      done = await result.current.bulk.handleBulkConfirmSelected();
    });
    expect(toast.error).toHaveBeenCalledWith('적용할 월을 선택해주세요.');
    expect(mockBulkConfirm).not.toHaveBeenCalled();
    expect(done).toBe(false);
  });

  it('성공 시 selection·bulkSelectionMonths 모두 비워짐', async () => {
    mockBulkConfirm.mockResolvedValue(makeBulkResult(['r1', 'r2'], []));
    const { result } = setup(['r1', 'r2']);
    act(() => {
      result.current.bulk.setBulkSelectionMonths([5, 6]);
    });
    await act(async () => {
      await result.current.bulk.handleBulkConfirmSelected();
    });
    expect(result.current.selectedRecordIds).toEqual([]);
    expect(result.current.bulk.bulkSelectionMonths).toEqual([]);
  });

  it('mutation에 recordIds + 회계 연도 + selections 전달', async () => {
    mockBulkConfirm.mockResolvedValue(makeBulkResult(['r1'], []));
    const { result } = setup(['r1']);
    act(() => {
      result.current.bulk.setBulkSelectionYear(2026);
      result.current.bulk.setBulkSelectionMonths([3]);
    });
    await act(async () => {
      await result.current.bulk.handleBulkConfirmSelected();
    });
    expect(mockBulkConfirm).toHaveBeenCalledWith({
      recordIds: ['r1'],
      year: FISCAL_YEAR,
      selections: [{ year: 2026, months: [3] }],
    });
  });

  it('결과를 받으면 true, 실패 건만 선택에 남긴다', async () => {
    mockBulkConfirm.mockResolvedValue(
      makeBulkResult(
        ['r1'],
        [{ recordId: 'r2', reason: '이미 납부된 월입니다' }]
      )
    );
    const { result } = setup(['r1', 'r2']);
    act(() => {
      result.current.bulk.setBulkSelectionMonths([5]);
    });
    let done = false;
    await act(async () => {
      done = await result.current.bulk.handleBulkConfirmSelected();
    });
    expect(done).toBe(true);
    expect(result.current.selectedRecordIds).toEqual(['r2']);
  });

  it('거절·오류면 false', async () => {
    mockConfirm.mockResolvedValue(false);
    const { result } = setup(['r1']);
    act(() => {
      result.current.bulk.setBulkSelectionMonths([5]);
    });
    let done = true;
    await act(async () => {
      done = await result.current.bulk.handleBulkConfirmSelected();
    });
    expect(done).toBe(false);

    mockConfirm.mockResolvedValue(true);
    mockBulkConfirm.mockRejectedValue(new Error('서버 오류'));
    done = true;
    await act(async () => {
      done = await result.current.bulk.handleBulkConfirmSelected();
    });
    expect(done).toBe(false);
    expect(toast.error).toHaveBeenCalledWith('서버 오류');
  });
});

describe('handleBulkConfirmAllMatched', () => {
  it('대상이 없으면 안내 + mutation 호출 안 됨', async () => {
    const { result } = setup([]);
    await act(async () => {
      await result.current.bulk.handleBulkConfirmAllMatched([]);
    });
    expect(toast.error).toHaveBeenCalledWith(
      '확정할 수 있는 레코드가 없습니다.'
    );
    expect(mockBulkConfirm).not.toHaveBeenCalled();
  });

  it('selections 없이 recordIds + 회계 연도만 보낸다', async () => {
    mockBulkConfirm.mockResolvedValue(makeBulkResult(['r1', 'r2'], []));
    const { result } = setup([]);
    await act(async () => {
      await result.current.bulk.handleBulkConfirmAllMatched(['r1', 'r2']);
    });
    expect(mockBulkConfirm).toHaveBeenCalledWith({
      recordIds: ['r1', 'r2'],
      year: FISCAL_YEAR,
    });
    expect(toast.success).toHaveBeenCalledWith('2건 확정, 0건 실패');
  });
});

describe('성공/실패 누적 + selection 분리 (대표 케이스: unconfirmSelected)', () => {
  it('실패가 있으면 확인창에 입금자명 prefix가 붙은 사유를 보인다', async () => {
    mockBulkUnconfirm.mockResolvedValue(
      makeBulkResult(
        ['r1'],
        [{ recordId: 'r2', reason: '확정 상태가 아닙니다' }]
      )
    );
    const { result } = setup(['r1', 'r2']);
    await act(async () => {
      await result.current.bulk.handleBulkUnconfirmSelected();
    });
    expect(mockConfirm).toHaveBeenLastCalledWith({
      title: '1건 확정 취소, 1건 실패',
      message: '실패 사유:\n• 김철수: 확정 상태가 아닙니다',
      hideCancel: true,
    });
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('성공한 id만 selection에서 제거 (실패는 유지)', async () => {
    mockBulkUnconfirm.mockResolvedValue(
      makeBulkResult(
        ['r1'],
        [{ recordId: 'r2', reason: '확정 상태가 아닙니다' }]
      )
    );
    const { result } = setup(['r1', 'r2', 'r3']);
    await act(async () => {
      await result.current.bulk.handleBulkUnconfirmSelected();
    });
    // r1 성공 → 제거. r2 실패 → 유지. r3는 응답에 없으므로 유지.
    expect(result.current.selectedRecordIds).toEqual(['r2', 'r3']);
  });

  it('실패가 0건이면 사유 확인창 없이 토스트만', async () => {
    mockBulkUnconfirm.mockResolvedValue(makeBulkResult(['r1', 'r2'], []));
    const { result } = setup(['r1', 'r2']);
    await act(async () => {
      await result.current.bulk.handleBulkUnconfirmSelected();
    });
    expect(toast.success).toHaveBeenCalledWith('2건 확정 취소, 0건 실패');
    // 처음의 "취소하시겠습니까?" 한 번뿐이다.
    expect(mockConfirm).toHaveBeenCalledTimes(1);
  });

  it('records에 없는 recordId는 (알 수 없음)으로 표시', async () => {
    mockBulkUnconfirm.mockResolvedValue(
      makeBulkResult([], [{ recordId: 'rX', reason: '레코드 없음' }])
    );
    const { result } = setup(['rX']);
    await act(async () => {
      await result.current.bulk.handleBulkUnconfirmSelected();
    });
    expect(mockConfirm).toHaveBeenLastCalledWith(
      expect.objectContaining({
        message: '실패 사유:\n• (알 수 없음): 레코드 없음',
      })
    );
  });

  it('사유 확인창이 닫히기를 기다리지 않고 선택을 정리한다', async () => {
    mockBulkUnconfirm.mockResolvedValue(
      makeBulkResult(['r1'], [{ recordId: 'r2', reason: '사유' }])
    );
    mockConfirm
      .mockResolvedValueOnce(true)
      // 사유 확인창은 끝나지 않는다 (사용자가 아직 읽는 중).
      .mockReturnValueOnce(new Promise<boolean>(() => {}));
    const { result } = setup(['r1', 'r2']);
    await act(async () => {
      await result.current.bulk.handleBulkUnconfirmSelected();
    });
    expect(result.current.selectedRecordIds).toEqual(['r2']);
  });
});

describe('mutation throw 시 오류 토스트', () => {
  it('confirmSelected — error.message', async () => {
    mockBulkConfirm.mockRejectedValue(new Error('서버 오류'));
    const { result } = setup(['r1']);
    act(() => {
      result.current.bulk.setBulkSelectionMonths([5]);
    });
    await act(async () => {
      await result.current.bulk.handleBulkConfirmSelected();
    });
    expect(toast.error).toHaveBeenLastCalledWith('서버 오류');
  });

  it('unconfirmSelected — error.message', async () => {
    mockBulkUnconfirm.mockRejectedValue(new Error('취소 실패'));
    const { result } = setup(['r1']);
    await act(async () => {
      await result.current.bulk.handleBulkUnconfirmSelected();
    });
    expect(toast.error).toHaveBeenLastCalledWith('취소 실패');
  });

  it('skipSelected — message 없으면 기본 메시지', async () => {
    mockBulkSkip.mockRejectedValue({});
    const { result } = setup(['r1']);
    await act(async () => {
      await result.current.bulk.handleBulkSkipSelected();
    });
    expect(toast.error).toHaveBeenLastCalledWith(
      '선택 항목 일괄 건너뛰기에 실패했습니다.'
    );
  });

  it('unskipSelected — message 없으면 기본 메시지', async () => {
    mockBulkUnskip.mockRejectedValue({});
    const { result } = setup(['r1']);
    await act(async () => {
      await result.current.bulk.handleBulkUnskipSelected();
    });
    expect(toast.error).toHaveBeenLastCalledWith(
      '선택 항목 일괄 건너뜀 해제에 실패했습니다.'
    );
  });
});

describe('각 핸들러 결과 문구의 라벨 (분기 정확성)', () => {
  it('confirmSelected → "확정"', async () => {
    mockBulkConfirm.mockResolvedValue(makeBulkResult(['r1'], []));
    const { result } = setup(['r1']);
    act(() => {
      result.current.bulk.setBulkSelectionMonths([5]);
    });
    await act(async () => {
      await result.current.bulk.handleBulkConfirmSelected();
    });
    expect(toast.success).toHaveBeenCalledWith('1건 확정, 0건 실패');
  });

  it('unconfirmSelected → "확정 취소"', async () => {
    mockBulkUnconfirm.mockResolvedValue(makeBulkResult(['r1'], []));
    const { result } = setup(['r1']);
    await act(async () => {
      await result.current.bulk.handleBulkUnconfirmSelected();
    });
    expect(toast.success).toHaveBeenCalledWith('1건 확정 취소, 0건 실패');
  });

  it('skipSelected → "건너뛰기"', async () => {
    mockBulkSkip.mockResolvedValue(makeBulkResult(['r1'], []));
    const { result } = setup(['r1']);
    await act(async () => {
      await result.current.bulk.handleBulkSkipSelected();
    });
    expect(toast.success).toHaveBeenCalledWith('1건 건너뛰기, 0건 실패');
  });

  it('unskipSelected → "건너뜀 해제"', async () => {
    mockBulkUnskip.mockResolvedValue(makeBulkResult(['r1'], []));
    const { result } = setup(['r1']);
    await act(async () => {
      await result.current.bulk.handleBulkUnskipSelected();
    });
    expect(toast.success).toHaveBeenCalledWith('1건 건너뜀 해제, 0건 실패');
  });
});

describe('handleBulkSetKindSelected — 선택 항목 분류 변경', () => {
  it('빈 선택은 안내 + mutation 호출 안 됨', async () => {
    const { result } = setup([]);
    await act(async () => {
      await result.current.bulk.handleBulkSetKindSelected('EVENT');
    });
    expect(toast.error).toHaveBeenCalledWith('선택된 항목이 없습니다.');
    expect(mockBulkSetKind).not.toHaveBeenCalled();
  });

  it('회비가 아닌 분류로 바꾸면 건너뜀으로 옮겨진다고 알리고 묻는다', async () => {
    mockBulkSetKind.mockResolvedValue(makeBulkResult(['r1', 'r2'], []));
    const { result } = setup(['r1', 'r2']);
    await act(async () => {
      await result.current.bulk.handleBulkSetKindSelected('EVENT');
    });
    expect(mockConfirm).toHaveBeenCalledWith({
      title: "2건을 '행사'로 바꾸시겠습니까?",
      message: '회비가 아닌 분류로 바꾸면 건너뜀으로 옮겨집니다.',
    });
    expect(mockBulkSetKind).toHaveBeenCalledWith({
      recordIds: ['r1', 'r2'],
      kind: 'EVENT',
    });
  });

  it('회비로 바꾸면 어디로 옮겨지는지 알리고 묻는다', async () => {
    mockBulkSetKind.mockResolvedValue(makeBulkResult(['r1'], []));
    const { result } = setup(['r1']);
    await act(async () => {
      await result.current.bulk.handleBulkSetKindSelected('FEE');
    });
    expect(mockConfirm).toHaveBeenCalledWith({
      title: "1건을 '회비'로 바꾸시겠습니까?",
      message: '매칭 회원이 있으면 매칭됨으로, 없으면 대기로 옮겨집니다.',
    });
  });

  it('거절 시 호출 안 됨, 선택은 그대로', async () => {
    mockConfirm.mockResolvedValue(false);
    const { result } = setup(['r1']);
    await act(async () => {
      await result.current.bulk.handleBulkSetKindSelected('EVENT');
    });
    expect(mockBulkSetKind).not.toHaveBeenCalled();
    expect(result.current.selectedRecordIds).toEqual(['r1']);
  });

  it('결과를 알리고 성공한 건만 선택에서 뺀다', async () => {
    mockBulkSetKind.mockResolvedValue(
      makeBulkResult(
        ['r1'],
        [
          {
            recordId: 'r2',
            reason: '확정된 입금 내역은 분류를 바꿀 수 없습니다',
          },
        ]
      )
    );
    const { result } = setup(['r1', 'r2']);
    await act(async () => {
      await result.current.bulk.handleBulkSetKindSelected('EVENT');
    });
    expect(mockConfirm).toHaveBeenLastCalledWith({
      title: '1건 분류 변경, 1건 실패',
      message:
        '실패 사유:\n• 김철수: 확정된 입금 내역은 분류를 바꿀 수 없습니다',
      hideCancel: true,
    });
    expect(result.current.selectedRecordIds).toEqual(['r2']);
  });

  it('mutation이 throw하면 오류 토스트', async () => {
    mockBulkSetKind.mockRejectedValue(new Error(''));
    const { result } = setup(['r1']);
    await act(async () => {
      await result.current.bulk.handleBulkSetKindSelected('EVENT');
    });
    expect(toast.error).toHaveBeenCalledWith(
      '선택 항목 분류 변경에 실패했습니다.'
    );
  });
});
