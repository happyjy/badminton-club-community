import { useState } from 'react';

import { toast } from 'react-hot-toast';

import { useConfirm } from '@/components/organisms/sheet/ConfirmProvider';

import {
  useBulkConfirmPayments,
  useBulkSetKind,
  useBulkUnconfirmPayments,
  useBulkSkipPayments,
  useBulkUnskipPayments,
} from '@/hooks/membership-fee/usePaymentRecords';

import { PAYMENT_KIND_LABEL } from '@/lib/membership-fee/paymentKind';
import { PaymentRecord, PaymentRecordKind } from '@/types/membership-fee.types';

interface BulkResultData {
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
}

interface UseBulkPaymentActionsArgs {
  clubIdStr: string | undefined;
  /** 현재 로드된 record 목록 (실패 시 입금자명 prefix용) */
  records: PaymentRecord[] | undefined;
  /** 현재 선택된 record id 목록 */
  selectedRecordIds: string[];
  /** 선택 목록을 변경하는 setter (성공한 항목만 제거하기 위해 사용) */
  setSelectedRecordIds: React.Dispatch<React.SetStateAction<string[]>>;
  /** 일괄 확정 시 사용할 회계 연도 */
  year: number;
}

export interface UseBulkPaymentActionsResult {
  /** "선택 항목 일괄 확정" 다이얼로그에서 사용할 연도 */
  bulkSelectionYear: number;
  setBulkSelectionYear: React.Dispatch<React.SetStateAction<number>>;
  /** "선택 항목 일괄 확정"에서 적용할 월 목록 */
  bulkSelectionMonths: number[];
  setBulkSelectionMonths: React.Dispatch<React.SetStateAction<number[]>>;

  /**
   * MATCHED 탭: 선택 항목을 사용자가 고른 연·월로 일괄 확정.
   * 요청을 보내 결과를 받았으면 true, 검증에 걸리거나 거절·오류면 false.
   */
  handleBulkConfirmSelected: () => Promise<boolean>;
  /** CONFIRMED 탭: 선택 항목 확정 취소 */
  handleBulkUnconfirmSelected: () => Promise<void>;
  /** PENDING/MATCHED/ERROR 탭: 선택 항목 건너뛰기 */
  handleBulkSkipSelected: () => Promise<void>;
  /** SKIPPED 탭: 선택 항목 건너뛰기 해제 */
  handleBulkUnskipSelected: () => Promise<void>;
  /** 확정 전의 모든 탭: 선택 항목의 분류를 한 번에 바꾼다 */
  handleBulkSetKindSelected: (kind: PaymentRecordKind) => Promise<void>;

  /** "매칭된 항목 일괄 확정" — 선택과 무관하게 MATCHED 전체 */
  handleBulkConfirmAllMatched: (matchedRecordIds: string[]) => Promise<void>;

  isBulkConfirmPending: boolean;
  isBulkUnconfirmPending: boolean;
  isBulkSkipPending: boolean;
  isBulkUnskipPending: boolean;
  isBulkSetKindPending: boolean;
}

/**
 * 입금 내역 처리 화면의 일괄 동작 핸들러를 한 곳에 모은 훅.
 *
 * 5종 핸들러는 모두
 *   1) 선택 검증 → 확인창(useConfirm)
 *   2) bulkXxxMutation.mutateAsync 호출
 *   3) 결과 알림 (실패 사유에 입금자명 prefix)
 *   4) 성공한 id만 selectedRecordIds에서 제거
 * 의 동일 패턴이라 페이지 컴포넌트에서 220줄을 차지했다.
 *
 * 이 훅은 그 패턴을 한 번에 표현하고, 페이지에서는 어느 핸들러를 어디 버튼에
 * 연결할지에만 집중하도록 한다.
 */
export function useBulkPaymentActions({
  clubIdStr,
  records,
  selectedRecordIds,
  setSelectedRecordIds,
  year,
}: UseBulkPaymentActionsArgs): UseBulkPaymentActionsResult {
  const confirm = useConfirm();
  const [bulkSelectionYear, setBulkSelectionYear] = useState<number>(
    new Date().getFullYear()
  );
  const [bulkSelectionMonths, setBulkSelectionMonths] = useState<number[]>([]);

  const bulkConfirmMutation = useBulkConfirmPayments(clubIdStr);
  const bulkUnconfirmMutation = useBulkUnconfirmPayments(clubIdStr);
  const bulkSkipMutation = useBulkSkipPayments(clubIdStr);
  const bulkUnskipMutation = useBulkUnskipPayments(clubIdStr);
  const bulkSetKindMutation = useBulkSetKind(clubIdStr);

  /**
   * 결과 알림 + 선택 목록 정리.
   * 실패가 없으면 토스트, 있으면 사유 목록을 읽을 수 있게 확인창으로 보여 준다.
   * 실패 사유 앞에 입금자명을 붙여 어느 건이 왜 실패했는지 식별 가능하게 한다.
   * 성공한 record만 선택에서 빼 실패 건은 재시도할 수 있도록 남긴다.
   */
  const reportResultAndPrune = (
    result: BulkResultData,
    actionLabel: string
  ) => {
    const recordById = new Map((records ?? []).map((r) => [r.id, r]));
    const failedDetail = result.results.failed
      .map((f) => {
        const depositor =
          recordById.get(f.recordId)?.depositorName ?? '(알 수 없음)';
        return `• ${depositor}: ${f.reason}`;
      })
      .join('\n');
    const summary = `${result.summary.success}건 ${actionLabel}, ${result.summary.failed}건 실패`;

    if (failedDetail) {
      // 기다리지 않는다. 선택 정리가 확인창을 닫을 때까지 미뤄지면 안 된다.
      void confirm({
        title: summary,
        message: `실패 사유:\n${failedDetail}`,
        hideCancel: true,
      });
    } else {
      toast.success(summary);
    }
    setSelectedRecordIds((prev) =>
      prev.filter((id) => !result.results.success.includes(id))
    );
  };

  /**
   * 사용자가 체크한 record들을 지정한 연도·월로 일괄 확정.
   * Why: 같은 월(예: 5월)을 여러 회원에게 동시 확정하는 운영 패턴이 잦은데,
   * 기존 일괄 확정 버튼은 record별로 자동 추천된 월(보통 차기월)을 사용하므로
   * 사용자가 원하는 월로 묶어 처리할 수 없었다.
   */
  const handleBulkConfirmSelected = async (): Promise<boolean> => {
    if (selectedRecordIds.length === 0) {
      toast.error('선택된 항목이 없습니다.');
      return false;
    }
    if (bulkSelectionMonths.length === 0) {
      toast.error('적용할 월을 선택해주세요.');
      return false;
    }
    const ok = await confirm({
      title: `${selectedRecordIds.length}건을 ${bulkSelectionYear}년 ${bulkSelectionMonths.join(', ')}월로 일괄 확정하시겠습니까?`,
    });
    if (!ok) return false;

    try {
      const result = await bulkConfirmMutation.mutateAsync({
        recordIds: selectedRecordIds,
        year,
        selections: [{ year: bulkSelectionYear, months: bulkSelectionMonths }],
      });
      reportResultAndPrune(result, '확정');
      setBulkSelectionMonths([]);
      return true;
    } catch (error: any) {
      toast.error(error.message || '선택 항목 일괄 확정에 실패했습니다.');
      return false;
    }
  };

  const handleBulkUnconfirmSelected = async () => {
    if (selectedRecordIds.length === 0) {
      toast.error('선택된 항목이 없습니다.');
      return;
    }
    const ok = await confirm({
      title: `${selectedRecordIds.length}건의 확정을 취소하시겠습니까?`,
      message: '회원·월 수정 후 다시 확정해야 합니다.',
      destructive: true,
    });
    if (!ok) return;

    try {
      const result = await bulkUnconfirmMutation.mutateAsync({
        recordIds: selectedRecordIds,
      });
      reportResultAndPrune(result, '확정 취소');
    } catch (error: any) {
      toast.error(error.message || '선택 항목 일괄 확정 취소에 실패했습니다.');
    }
  };

  /**
   * 사용자가 체크한 record들을 일괄 건너뛰기 처리.
   * PENDING / MATCHED / ERROR 탭에서 호출된다. CONFIRMED·SKIPPED는 백엔드에서 거부.
   */
  const handleBulkSkipSelected = async () => {
    if (selectedRecordIds.length === 0) {
      toast.error('선택된 항목이 없습니다.');
      return;
    }
    const ok = await confirm({
      title: `${selectedRecordIds.length}건을 건너뛰기 처리하시겠습니까?`,
      message: '정산 대상에서 제외됩니다.',
    });
    if (!ok) return;

    try {
      const result = await bulkSkipMutation.mutateAsync({
        recordIds: selectedRecordIds,
      });
      reportResultAndPrune(result, '건너뛰기');
    } catch (error: any) {
      toast.error(error.message || '선택 항목 일괄 건너뛰기에 실패했습니다.');
    }
  };

  /**
   * 사용자가 체크한 record들의 건너뛰기 해제.
   * 매칭 회원 유무에 따라 백엔드가 MATCHED / PENDING으로 분기 복원한다.
   */
  const handleBulkUnskipSelected = async () => {
    if (selectedRecordIds.length === 0) {
      toast.error('선택된 항목이 없습니다.');
      return;
    }
    const ok = await confirm({
      title: `${selectedRecordIds.length}건의 건너뛰기를 해제하시겠습니까?`,
    });
    if (!ok) return;

    try {
      const result = await bulkUnskipMutation.mutateAsync({
        recordIds: selectedRecordIds,
      });
      reportResultAndPrune(result, '건너뜀 해제');
    } catch (error: any) {
      toast.error(
        error.message || '선택 항목 일괄 건너뜀 해제에 실패했습니다.'
      );
    }
  };

  /**
   * 사용자가 체크한 record들의 분류를 한 번에 바꾼다.
   * 표시 없이 들어온 행사 입금을 금액 필터로 모아 한 번에 정리하는 용도다.
   * 확정된 건은 백엔드에서 거부한다.
   */
  const handleBulkSetKindSelected = async (kind: PaymentRecordKind) => {
    if (selectedRecordIds.length === 0) {
      toast.error('선택된 항목이 없습니다.');
      return;
    }
    const ok = await confirm({
      title: `${selectedRecordIds.length}건을 '${PAYMENT_KIND_LABEL[kind]}'로 바꾸시겠습니까?`,
      message:
        kind === 'FEE'
          ? '매칭 회원이 있으면 매칭됨으로, 없으면 대기로 옮겨집니다.'
          : '회비가 아닌 분류로 바꾸면 건너뜀으로 옮겨집니다.',
    });
    if (!ok) return;

    try {
      const result = await bulkSetKindMutation.mutateAsync({
        recordIds: selectedRecordIds,
        kind,
      });
      reportResultAndPrune(result, '분류 변경');
    } catch (error: any) {
      toast.error(error.message || '선택 항목 분류 변경에 실패했습니다.');
    }
  };

  /**
   * "매칭된 항목 일괄 확정" 버튼 — 선택과 무관하게 화면 상의 MATCHED 전체를 처리.
   * 호출부에서 matched id 목록을 만들어 넘긴다 (페이지의 필터/정렬 결과에 의존하므로).
   */
  const handleBulkConfirmAllMatched = async (matchedRecordIds: string[]) => {
    if (matchedRecordIds.length === 0) {
      toast.error('확정할 수 있는 레코드가 없습니다.');
      return;
    }
    const ok = await confirm({
      title: `${matchedRecordIds.length}건의 입금 내역을 일괄 확정하시겠습니까?`,
    });
    if (!ok) return;

    try {
      const result = await bulkConfirmMutation.mutateAsync({
        recordIds: matchedRecordIds,
        year,
      });
      reportResultAndPrune(result, '확정');
    } catch (error: any) {
      toast.error(error.message || '일괄 확정에 실패했습니다.');
    }
  };

  return {
    bulkSelectionYear,
    setBulkSelectionYear,
    bulkSelectionMonths,
    setBulkSelectionMonths,
    handleBulkConfirmSelected,
    handleBulkUnconfirmSelected,
    handleBulkSkipSelected,
    handleBulkUnskipSelected,
    handleBulkSetKindSelected,
    handleBulkConfirmAllMatched,
    isBulkConfirmPending: bulkConfirmMutation.isPending,
    isBulkUnconfirmPending: bulkUnconfirmMutation.isPending,
    isBulkSkipPending: bulkSkipMutation.isPending,
    isBulkUnskipPending: bulkUnskipMutation.isPending,
    isBulkSetKindPending: bulkSetKindMutation.isPending,
  };
}
