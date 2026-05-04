/**
 * 일괄 처리 5종 핸들러 동작 명세.
 *
 * 리팩토링 3번(`useBulkPaymentActions` 훅 분리) 시 이 케이스들을
 * 그대로 훅 동작 검증으로 옮길 수 있도록 짠다.
 *
 * 검증하는 5종:
 *   1) handleBulkConfirmSelected   — MATCHED 탭, 선택 record + 연도·월
 *   2) handleBulkUnconfirmSelected — CONFIRMED 탭, 선택 record 확정 취소
 *   3) handleBulkSkipSelected      — PENDING/MATCHED/ERROR 탭, 선택 건너뛰기
 *   4) handleBulkUnskipSelected    — SKIPPED 탭, 선택 건너뛰기 해제
 *
 * 공통 패턴(반드시 잠가야 할 것):
 * - 빈 선택 시 alert + mutation 호출 안 됨
 * - window.confirm 거절 시 mutation 호출 안 됨
 * - 성공/실패 alert에 "depositorName: reason" 형태로 입금자명 prefix
 * - 성공한 recordId만 selection에서 제거 (실패는 유지 → 재시도 가능)
 * - mutation 자체가 throw하면 catch에서 alert
 *
 * 추가:
 * - handleBulkConfirmSelected는 월 미선택 시 별도 alert + mutation 호출 안 됨
 */
import { useState } from 'react';

import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from '@jest/globals';
import { act, renderHook } from '@testing-library/react';

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

/**
 * process.tsx의 5종 핸들러 패턴을 그대로 재현한 테스트용 훅.
 * 리팩토링 3번이 이 시그니처/동작을 갖도록 옮긴다는 가정.
 */
function useBulkPaymentActionsUnderTest(opts: {
  records: PaymentRecord[];
  initialSelected: string[];
  bulkConfirm: (input: any) => Promise<BulkResult>;
  bulkUnconfirm: (input: any) => Promise<BulkResult>;
  bulkSkip: (input: any) => Promise<BulkResult>;
  bulkUnskip: (input: any) => Promise<BulkResult>;
}) {
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>(
    opts.initialSelected
  );
  const [bulkSelectionMonths, setBulkSelectionMonths] = useState<number[]>([]);
  const [bulkSelectionYear, setBulkSelectionYear] = useState<number>(2025);

  const buildFailedDetail = (
    failed: { recordId: string; reason: string }[]
  ) => {
    const recordById = new Map(opts.records.map((r) => [r.id, r]));
    return failed
      .map((f) => {
        const depositor =
          recordById.get(f.recordId)?.depositorName ?? '(알 수 없음)';
        return `• ${depositor}: ${f.reason}`;
      })
      .join('\n');
  };

  const handleBulkConfirmSelected = async () => {
    if (selectedRecordIds.length === 0) {
      alert('선택된 항목이 없습니다.');
      return;
    }
    if (bulkSelectionMonths.length === 0) {
      alert('적용할 월을 선택해주세요.');
      return;
    }
    if (
      !confirm(
        `${selectedRecordIds.length}건을 ${bulkSelectionYear}년 ${bulkSelectionMonths.join(', ')}월로 일괄 확정하시겠습니까?`
      )
    ) {
      return;
    }
    try {
      const result = await opts.bulkConfirm({
        recordIds: selectedRecordIds,
        year: bulkSelectionYear,
        selections: [{ year: bulkSelectionYear, months: bulkSelectionMonths }],
      });
      const failedDetail = buildFailedDetail(result.results.failed);
      alert(
        `${result.summary.success}건 확정, ${result.summary.failed}건 실패` +
          (failedDetail ? `\n\n실패 사유:\n${failedDetail}` : '')
      );
      setSelectedRecordIds((prev) =>
        prev.filter((id) => !result.results.success.includes(id))
      );
      setBulkSelectionMonths([]);
    } catch (error: any) {
      alert(error.message || '선택 항목 일괄 확정에 실패했습니다.');
    }
  };

  const handleBulkUnconfirmSelected = async () => {
    if (selectedRecordIds.length === 0) {
      alert('선택된 항목이 없습니다.');
      return;
    }
    if (
      !confirm(
        `${selectedRecordIds.length}건의 확정을 취소하시겠습니까? 회원·월 수정 후 다시 확정해야 합니다.`
      )
    ) {
      return;
    }
    try {
      const result = await opts.bulkUnconfirm({
        recordIds: selectedRecordIds,
      });
      const failedDetail = buildFailedDetail(result.results.failed);
      alert(
        `${result.summary.success}건 확정 취소, ${result.summary.failed}건 실패` +
          (failedDetail ? `\n\n실패 사유:\n${failedDetail}` : '')
      );
      setSelectedRecordIds((prev) =>
        prev.filter((id) => !result.results.success.includes(id))
      );
    } catch (error: any) {
      alert(error.message || '선택 항목 일괄 확정 취소에 실패했습니다.');
    }
  };

  const handleBulkSkipSelected = async () => {
    if (selectedRecordIds.length === 0) {
      alert('선택된 항목이 없습니다.');
      return;
    }
    if (
      !confirm(
        `${selectedRecordIds.length}건을 건너뛰기 처리하시겠습니까? 정산 대상에서 제외됩니다.`
      )
    ) {
      return;
    }
    try {
      const result = await opts.bulkSkip({
        recordIds: selectedRecordIds,
      });
      const failedDetail = buildFailedDetail(result.results.failed);
      alert(
        `${result.summary.success}건 건너뛰기, ${result.summary.failed}건 실패` +
          (failedDetail ? `\n\n실패 사유:\n${failedDetail}` : '')
      );
      setSelectedRecordIds((prev) =>
        prev.filter((id) => !result.results.success.includes(id))
      );
    } catch (error: any) {
      alert(error.message || '선택 항목 일괄 건너뛰기에 실패했습니다.');
    }
  };

  const handleBulkUnskipSelected = async () => {
    if (selectedRecordIds.length === 0) {
      alert('선택된 항목이 없습니다.');
      return;
    }
    if (
      !confirm(`${selectedRecordIds.length}건의 건너뛰기를 해제하시겠습니까?`)
    ) {
      return;
    }
    try {
      const result = await opts.bulkUnskip({
        recordIds: selectedRecordIds,
      });
      const failedDetail = buildFailedDetail(result.results.failed);
      alert(
        `${result.summary.success}건 건너뜀 해제, ${result.summary.failed}건 실패` +
          (failedDetail ? `\n\n실패 사유:\n${failedDetail}` : '')
      );
      setSelectedRecordIds((prev) =>
        prev.filter((id) => !result.results.success.includes(id))
      );
    } catch (error: any) {
      alert(error.message || '선택 항목 일괄 건너뜀 해제에 실패했습니다.');
    }
  };

  return {
    selectedRecordIds,
    setSelectedRecordIds,
    bulkSelectionMonths,
    setBulkSelectionMonths,
    bulkSelectionYear,
    setBulkSelectionYear,
    handleBulkConfirmSelected,
    handleBulkUnconfirmSelected,
    handleBulkSkipSelected,
    handleBulkUnskipSelected,
  };
}

const RECORDS = [
  makeRecord('r1', '홍길동'),
  makeRecord('r2', '김철수'),
  makeRecord('r3', '이영희'),
];

let alertSpy: jest.SpiedFunction<typeof window.alert>;
let confirmSpy: jest.SpiedFunction<typeof window.confirm>;

beforeEach(() => {
  alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
  confirmSpy = jest.spyOn(window, 'confirm').mockImplementation(() => true);
});

afterEach(() => {
  alertSpy.mockRestore();
  confirmSpy.mockRestore();
});

describe('빈 선택 — 모든 5종 핸들러 공통', () => {
  function setup() {
    const bulkConfirm = jest.fn<(input: any) => Promise<BulkResult>>();
    const bulkUnconfirm = jest.fn<(input: any) => Promise<BulkResult>>();
    const bulkSkip = jest.fn<(input: any) => Promise<BulkResult>>();
    const bulkUnskip = jest.fn<(input: any) => Promise<BulkResult>>();
    const { result } = renderHook(() =>
      useBulkPaymentActionsUnderTest({
        records: RECORDS,
        initialSelected: [],
        bulkConfirm,
        bulkUnconfirm,
        bulkSkip,
        bulkUnskip,
      })
    );
    return { result, bulkConfirm, bulkUnconfirm, bulkSkip, bulkUnskip };
  }

  it('confirmSelected — 빈 선택은 alert + mutation 호출 안 됨', async () => {
    const { result, bulkConfirm } = setup();
    await act(async () => {
      await result.current.handleBulkConfirmSelected();
    });
    expect(alertSpy).toHaveBeenCalledWith('선택된 항목이 없습니다.');
    expect(bulkConfirm).not.toHaveBeenCalled();
  });

  it('unconfirmSelected — 빈 선택은 alert + mutation 호출 안 됨', async () => {
    const { result, bulkUnconfirm } = setup();
    await act(async () => {
      await result.current.handleBulkUnconfirmSelected();
    });
    expect(alertSpy).toHaveBeenCalledWith('선택된 항목이 없습니다.');
    expect(bulkUnconfirm).not.toHaveBeenCalled();
  });

  it('skipSelected — 빈 선택은 alert + mutation 호출 안 됨', async () => {
    const { result, bulkSkip } = setup();
    await act(async () => {
      await result.current.handleBulkSkipSelected();
    });
    expect(alertSpy).toHaveBeenCalledWith('선택된 항목이 없습니다.');
    expect(bulkSkip).not.toHaveBeenCalled();
  });

  it('unskipSelected — 빈 선택은 alert + mutation 호출 안 됨', async () => {
    const { result, bulkUnskip } = setup();
    await act(async () => {
      await result.current.handleBulkUnskipSelected();
    });
    expect(alertSpy).toHaveBeenCalledWith('선택된 항목이 없습니다.');
    expect(bulkUnskip).not.toHaveBeenCalled();
  });
});

describe('window.confirm 거절 — mutation 호출 안 됨', () => {
  it('confirmSelected — 거절 시 호출 안 됨', async () => {
    confirmSpy.mockReturnValue(false);
    const bulkConfirm = jest.fn<(input: any) => Promise<BulkResult>>();
    const { result } = renderHook(() =>
      useBulkPaymentActionsUnderTest({
        records: RECORDS,
        initialSelected: ['r1'],
        bulkConfirm,
        bulkUnconfirm: jest.fn(),
        bulkSkip: jest.fn(),
        bulkUnskip: jest.fn(),
      })
    );
    act(() => {
      result.current.setBulkSelectionMonths([5]);
    });
    await act(async () => {
      await result.current.handleBulkConfirmSelected();
    });
    expect(bulkConfirm).not.toHaveBeenCalled();
  });

  it('unconfirmSelected — 거절 시 호출 안 됨', async () => {
    confirmSpy.mockReturnValue(false);
    const bulkUnconfirm = jest.fn<(input: any) => Promise<BulkResult>>();
    const { result } = renderHook(() =>
      useBulkPaymentActionsUnderTest({
        records: RECORDS,
        initialSelected: ['r1'],
        bulkConfirm: jest.fn(),
        bulkUnconfirm,
        bulkSkip: jest.fn(),
        bulkUnskip: jest.fn(),
      })
    );
    await act(async () => {
      await result.current.handleBulkUnconfirmSelected();
    });
    expect(bulkUnconfirm).not.toHaveBeenCalled();
  });

  it('skipSelected — 거절 시 호출 안 됨', async () => {
    confirmSpy.mockReturnValue(false);
    const bulkSkip = jest.fn<(input: any) => Promise<BulkResult>>();
    const { result } = renderHook(() =>
      useBulkPaymentActionsUnderTest({
        records: RECORDS,
        initialSelected: ['r1'],
        bulkConfirm: jest.fn(),
        bulkUnconfirm: jest.fn(),
        bulkSkip,
        bulkUnskip: jest.fn(),
      })
    );
    await act(async () => {
      await result.current.handleBulkSkipSelected();
    });
    expect(bulkSkip).not.toHaveBeenCalled();
  });

  it('unskipSelected — 거절 시 호출 안 됨', async () => {
    confirmSpy.mockReturnValue(false);
    const bulkUnskip = jest.fn<(input: any) => Promise<BulkResult>>();
    const { result } = renderHook(() =>
      useBulkPaymentActionsUnderTest({
        records: RECORDS,
        initialSelected: ['r1'],
        bulkConfirm: jest.fn(),
        bulkUnconfirm: jest.fn(),
        bulkSkip: jest.fn(),
        bulkUnskip,
      })
    );
    await act(async () => {
      await result.current.handleBulkUnskipSelected();
    });
    expect(bulkUnskip).not.toHaveBeenCalled();
  });
});

describe('handleBulkConfirmSelected 전용', () => {
  it('월 미선택 시 별도 alert + mutation 호출 안 됨', async () => {
    const bulkConfirm = jest.fn<(input: any) => Promise<BulkResult>>();
    const { result } = renderHook(() =>
      useBulkPaymentActionsUnderTest({
        records: RECORDS,
        initialSelected: ['r1'],
        bulkConfirm,
        bulkUnconfirm: jest.fn(),
        bulkSkip: jest.fn(),
        bulkUnskip: jest.fn(),
      })
    );
    await act(async () => {
      await result.current.handleBulkConfirmSelected();
    });
    expect(alertSpy).toHaveBeenCalledWith('적용할 월을 선택해주세요.');
    expect(bulkConfirm).not.toHaveBeenCalled();
  });

  it('성공 시 selection·bulkSelectionMonths 모두 비워짐', async () => {
    const bulkConfirm = jest
      .fn<(input: any) => Promise<BulkResult>>()
      .mockResolvedValue(makeBulkResult(['r1', 'r2'], []));
    const { result } = renderHook(() =>
      useBulkPaymentActionsUnderTest({
        records: RECORDS,
        initialSelected: ['r1', 'r2'],
        bulkConfirm,
        bulkUnconfirm: jest.fn(),
        bulkSkip: jest.fn(),
        bulkUnskip: jest.fn(),
      })
    );
    act(() => {
      result.current.setBulkSelectionMonths([5, 6]);
    });
    await act(async () => {
      await result.current.handleBulkConfirmSelected();
    });
    expect(result.current.selectedRecordIds).toEqual([]);
    expect(result.current.bulkSelectionMonths).toEqual([]);
  });

  it('mutation에 recordIds + year + selections 전달', async () => {
    const bulkConfirm = jest
      .fn<(input: any) => Promise<BulkResult>>()
      .mockResolvedValue(makeBulkResult(['r1'], []));
    const { result } = renderHook(() =>
      useBulkPaymentActionsUnderTest({
        records: RECORDS,
        initialSelected: ['r1'],
        bulkConfirm,
        bulkUnconfirm: jest.fn(),
        bulkSkip: jest.fn(),
        bulkUnskip: jest.fn(),
      })
    );
    act(() => {
      result.current.setBulkSelectionYear(2026);
      result.current.setBulkSelectionMonths([3]);
    });
    await act(async () => {
      await result.current.handleBulkConfirmSelected();
    });
    expect(bulkConfirm).toHaveBeenCalledWith({
      recordIds: ['r1'],
      year: 2026,
      selections: [{ year: 2026, months: [3] }],
    });
  });
});

describe('성공/실패 누적 + selection 분리 (대표 케이스: unconfirmSelected)', () => {
  it('실패 사유 alert에 입금자명 prefix가 붙음', async () => {
    const bulkUnconfirm = jest
      .fn<(input: any) => Promise<BulkResult>>()
      .mockResolvedValue(
        makeBulkResult(
          ['r1'],
          [{ recordId: 'r2', reason: '확정 상태가 아닙니다' }]
        )
      );
    const { result } = renderHook(() =>
      useBulkPaymentActionsUnderTest({
        records: RECORDS,
        initialSelected: ['r1', 'r2'],
        bulkConfirm: jest.fn(),
        bulkUnconfirm,
        bulkSkip: jest.fn(),
        bulkUnskip: jest.fn(),
      })
    );
    await act(async () => {
      await result.current.handleBulkUnconfirmSelected();
    });
    const alertMsg = alertSpy.mock.calls.at(-1)?.[0] as string;
    expect(alertMsg).toContain('1건 확정 취소, 1건 실패');
    expect(alertMsg).toContain('• 김철수: 확정 상태가 아닙니다');
  });

  it('성공한 id만 selection에서 제거 (실패는 유지)', async () => {
    const bulkUnconfirm = jest
      .fn<(input: any) => Promise<BulkResult>>()
      .mockResolvedValue(
        makeBulkResult(
          ['r1'],
          [{ recordId: 'r2', reason: '확정 상태가 아닙니다' }]
        )
      );
    const { result } = renderHook(() =>
      useBulkPaymentActionsUnderTest({
        records: RECORDS,
        initialSelected: ['r1', 'r2', 'r3'],
        bulkConfirm: jest.fn(),
        bulkUnconfirm,
        bulkSkip: jest.fn(),
        bulkUnskip: jest.fn(),
      })
    );
    await act(async () => {
      await result.current.handleBulkUnconfirmSelected();
    });
    // r1 성공 → 제거. r2 실패 → 유지. r3는 응답에 없으므로 유지.
    expect(result.current.selectedRecordIds).toEqual(['r2', 'r3']);
  });

  it('실패가 0건이면 "실패 사유:" 블록 없음', async () => {
    const bulkUnconfirm = jest
      .fn<(input: any) => Promise<BulkResult>>()
      .mockResolvedValue(makeBulkResult(['r1', 'r2'], []));
    const { result } = renderHook(() =>
      useBulkPaymentActionsUnderTest({
        records: RECORDS,
        initialSelected: ['r1', 'r2'],
        bulkConfirm: jest.fn(),
        bulkUnconfirm,
        bulkSkip: jest.fn(),
        bulkUnskip: jest.fn(),
      })
    );
    await act(async () => {
      await result.current.handleBulkUnconfirmSelected();
    });
    const alertMsg = alertSpy.mock.calls.at(-1)?.[0] as string;
    expect(alertMsg).not.toContain('실패 사유');
  });

  it('records에 없는 recordId는 (알 수 없음)으로 표시', async () => {
    const bulkUnconfirm = jest
      .fn<(input: any) => Promise<BulkResult>>()
      .mockResolvedValue(
        makeBulkResult([], [{ recordId: 'rX', reason: '레코드 없음' }])
      );
    const { result } = renderHook(() =>
      useBulkPaymentActionsUnderTest({
        records: RECORDS,
        initialSelected: ['rX'],
        bulkConfirm: jest.fn(),
        bulkUnconfirm,
        bulkSkip: jest.fn(),
        bulkUnskip: jest.fn(),
      })
    );
    await act(async () => {
      await result.current.handleBulkUnconfirmSelected();
    });
    const alertMsg = alertSpy.mock.calls.at(-1)?.[0] as string;
    expect(alertMsg).toContain('• (알 수 없음): 레코드 없음');
  });
});

describe('mutation throw 시 catch alert', () => {
  it('confirmSelected — error.message로 alert', async () => {
    const bulkConfirm = jest
      .fn<(input: any) => Promise<BulkResult>>()
      .mockRejectedValue(new Error('서버 오류'));
    const { result } = renderHook(() =>
      useBulkPaymentActionsUnderTest({
        records: RECORDS,
        initialSelected: ['r1'],
        bulkConfirm,
        bulkUnconfirm: jest.fn(),
        bulkSkip: jest.fn(),
        bulkUnskip: jest.fn(),
      })
    );
    act(() => {
      result.current.setBulkSelectionMonths([5]);
    });
    await act(async () => {
      await result.current.handleBulkConfirmSelected();
    });
    expect(alertSpy).toHaveBeenLastCalledWith('서버 오류');
  });

  it('unconfirmSelected — error.message로 alert', async () => {
    const bulkUnconfirm = jest
      .fn<(input: any) => Promise<BulkResult>>()
      .mockRejectedValue(new Error('취소 실패'));
    const { result } = renderHook(() =>
      useBulkPaymentActionsUnderTest({
        records: RECORDS,
        initialSelected: ['r1'],
        bulkConfirm: jest.fn(),
        bulkUnconfirm,
        bulkSkip: jest.fn(),
        bulkUnskip: jest.fn(),
      })
    );
    await act(async () => {
      await result.current.handleBulkUnconfirmSelected();
    });
    expect(alertSpy).toHaveBeenLastCalledWith('취소 실패');
  });

  it('skipSelected — message 없으면 기본 메시지', async () => {
    const bulkSkip = jest
      .fn<(input: any) => Promise<BulkResult>>()
      .mockRejectedValue({});
    const { result } = renderHook(() =>
      useBulkPaymentActionsUnderTest({
        records: RECORDS,
        initialSelected: ['r1'],
        bulkConfirm: jest.fn(),
        bulkUnconfirm: jest.fn(),
        bulkSkip,
        bulkUnskip: jest.fn(),
      })
    );
    await act(async () => {
      await result.current.handleBulkSkipSelected();
    });
    expect(alertSpy).toHaveBeenLastCalledWith(
      '선택 항목 일괄 건너뛰기에 실패했습니다.'
    );
  });

  it('unskipSelected — message 없으면 기본 메시지', async () => {
    const bulkUnskip = jest
      .fn<(input: any) => Promise<BulkResult>>()
      .mockRejectedValue({});
    const { result } = renderHook(() =>
      useBulkPaymentActionsUnderTest({
        records: RECORDS,
        initialSelected: ['r1'],
        bulkConfirm: jest.fn(),
        bulkUnconfirm: jest.fn(),
        bulkSkip: jest.fn(),
        bulkUnskip,
      })
    );
    await act(async () => {
      await result.current.handleBulkUnskipSelected();
    });
    expect(alertSpy).toHaveBeenLastCalledWith(
      '선택 항목 일괄 건너뜀 해제에 실패했습니다.'
    );
  });
});

describe('각 핸들러 alert 메시지 라벨 검증 (5종 분기 정확성)', () => {
  it('confirmSelected → "확정"', async () => {
    const bulkConfirm = jest
      .fn<(input: any) => Promise<BulkResult>>()
      .mockResolvedValue(makeBulkResult(['r1'], []));
    const { result } = renderHook(() =>
      useBulkPaymentActionsUnderTest({
        records: RECORDS,
        initialSelected: ['r1'],
        bulkConfirm,
        bulkUnconfirm: jest.fn(),
        bulkSkip: jest.fn(),
        bulkUnskip: jest.fn(),
      })
    );
    act(() => {
      result.current.setBulkSelectionMonths([5]);
    });
    await act(async () => {
      await result.current.handleBulkConfirmSelected();
    });
    expect(alertSpy.mock.calls.at(-1)?.[0]).toContain('1건 확정, 0건 실패');
  });

  it('unconfirmSelected → "확정 취소"', async () => {
    const bulkUnconfirm = jest
      .fn<(input: any) => Promise<BulkResult>>()
      .mockResolvedValue(makeBulkResult(['r1'], []));
    const { result } = renderHook(() =>
      useBulkPaymentActionsUnderTest({
        records: RECORDS,
        initialSelected: ['r1'],
        bulkConfirm: jest.fn(),
        bulkUnconfirm,
        bulkSkip: jest.fn(),
        bulkUnskip: jest.fn(),
      })
    );
    await act(async () => {
      await result.current.handleBulkUnconfirmSelected();
    });
    expect(alertSpy.mock.calls.at(-1)?.[0]).toContain(
      '1건 확정 취소, 0건 실패'
    );
  });

  it('skipSelected → "건너뛰기"', async () => {
    const bulkSkip = jest
      .fn<(input: any) => Promise<BulkResult>>()
      .mockResolvedValue(makeBulkResult(['r1'], []));
    const { result } = renderHook(() =>
      useBulkPaymentActionsUnderTest({
        records: RECORDS,
        initialSelected: ['r1'],
        bulkConfirm: jest.fn(),
        bulkUnconfirm: jest.fn(),
        bulkSkip,
        bulkUnskip: jest.fn(),
      })
    );
    await act(async () => {
      await result.current.handleBulkSkipSelected();
    });
    expect(alertSpy.mock.calls.at(-1)?.[0]).toContain('1건 건너뛰기, 0건 실패');
  });

  it('unskipSelected → "건너뜀 해제"', async () => {
    const bulkUnskip = jest
      .fn<(input: any) => Promise<BulkResult>>()
      .mockResolvedValue(makeBulkResult(['r1'], []));
    const { result } = renderHook(() =>
      useBulkPaymentActionsUnderTest({
        records: RECORDS,
        initialSelected: ['r1'],
        bulkConfirm: jest.fn(),
        bulkUnconfirm: jest.fn(),
        bulkSkip: jest.fn(),
        bulkUnskip,
      })
    );
    await act(async () => {
      await result.current.handleBulkUnskipSelected();
    });
    expect(alertSpy.mock.calls.at(-1)?.[0]).toContain(
      '1건 건너뜀 해제, 0건 실패'
    );
  });
});
