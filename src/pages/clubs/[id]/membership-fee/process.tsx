import { useEffect, useMemo, useState } from 'react';

import { useRouter } from 'next/router';

import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { ArrowLeft, CheckCircle, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

import PaymentRecordFilters, {
  INITIAL_FILTERS,
  PaymentRecordFilterValues,
} from '@/components/molecules/membership-fee/PaymentRecordFilters';
import ProcessStatusFilterTabs from '@/components/molecules/membership-fee/ProcessStatusFilterTabs';
import TransactionDateRangeBanner from '@/components/molecules/membership-fee/TransactionDateRangeBanner';
import YearSelector from '@/components/molecules/membership-fee/YearSelector';
import BulkActionBar from '@/components/organisms/membership-fee/BulkActionBar';
import PaymentRecordTable, {
  PaymentRecordSortBy,
  YearMonthSelection,
} from '@/components/organisms/membership-fee/PaymentRecordTable';

import { useBulkPaymentActions } from '@/hooks/membership-fee/useBulkPaymentActions';
import { useMatchableMembers } from '@/hooks/membership-fee/useMatchableMembers';
import {
  usePaymentRecords,
  useUpdatePaymentRecord,
  useConfirmPayment,
  useUnconfirmPayment,
  useSkipPayment,
  useUnskipPayment,
} from '@/hooks/membership-fee/usePaymentRecords';
import { useTransactionDateRange } from '@/hooks/membership-fee/useTransactionDateRange';

import {
  applyFilters,
  applySort,
  PaymentRecordSortOrder,
} from '@/lib/membership-fee/processView';
import { withAuth } from '@/lib/withAuth';
import { checkClubAdminPermission } from '@/utils/permissions';

const STATUS_LABELS: Record<string, string> = {
  PENDING: '대기',
  MATCHED: '매칭됨',
  CONFIRMED: '확정',
  ERROR: '에러',
  SKIPPED: '건너뜀',
};

function ProcessPage() {
  // ── 1) routing & query parse ────────────────────────────────────────────
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    id: clubId,
    status: filterStatus,
    batchId: batchIdQuery,
  } = router.query;
  const clubIdStr = typeof clubId === 'string' ? clubId : undefined;
  const batchId = typeof batchIdQuery === 'string' ? batchIdQuery : undefined;
  const statusFilter =
    typeof filterStatus === 'string' ? filterStatus : undefined;

  // ── 2) state ────────────────────────────────────────────────────────────
  const [year, setYear] = useState(new Date().getFullYear());
  const [filters, setFilters] =
    useState<PaymentRecordFilterValues>(INITIAL_FILTERS);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortBy, setSortBy] = useState<PaymentRecordSortBy>('transactionDate');
  const [sortOrder, setSortOrder] = useState<PaymentRecordSortOrder>('desc');
  /** 다중 선택된 record id. 사용자가 "선택 항목 일괄 확정"으로 한 번에 처리할 대상. */
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);

  // ── 3) custom hooks (data flow 순) ─────────────────────────────────────
  /**
   * 거래일 기준 fetch 범위. 한 번에 최대 1년치만 조회 가능.
   * batchId 진입 시에는 batch 자체가 자연 상한이라 정책 비활성화.
   */
  const isRangeActive = !batchId;
  const {
    appliedRange,
    draftRange,
    setDraftRange,
    applyDraft,
    setDraftToPreset,
    isDraftRangeTooLong,
    draftPresetMonths,
    apiRange: recentRange,
  } = useTransactionDateRange(isRangeActive);

  /**
   * batch 단위 전체 목록을 한 번만 받아 클라이언트에서 필드/상태 필터를 모두 적용한다.
   * status별로 API를 다시 호출하지 않으므로 statusFilter 변경 시 추가 fetch가 발생하지 않는다.
   */
  const { data: records, isLoading } = usePaymentRecords(
    clubIdStr,
    batchId,
    recentRange
  );

  const updateMutation = useUpdatePaymentRecord(clubIdStr);
  const confirmMutation = useConfirmPayment(clubIdStr);
  const unconfirmMutation = useUnconfirmPayment(clubIdStr);
  const skipMutation = useSkipPayment(clubIdStr);
  const unskipMutation = useUnskipPayment(clubIdStr);

  const bulk = useBulkPaymentActions({
    clubIdStr,
    records,
    selectedRecordIds,
    setSelectedRecordIds,
    year,
  });

  /**
   * 매칭 후보 회원 조회 범위.
   * - 거래일 범위 모드: appliedRange 사용
   * - batch 모드: 해당 batch records의 거래일 min/max 사용 (records 도착 후 자동 적용)
   * 범위가 정해지면 거래일 시점 기준으로 활동 중이던 회원만 후보로 받는다.
   */
  const matchableRange = useMemo(() => {
    if (isRangeActive) {
      return {
        from: new Date(`${appliedRange.from}T00:00:00.000`).toISOString(),
        to: new Date(`${appliedRange.to}T23:59:59.999`).toISOString(),
      };
    }
    if (!records || records.length === 0) return undefined;
    let minTs = Infinity;
    let maxTs = -Infinity;
    for (const r of records) {
      const ts = new Date(r.transactionDate).getTime();
      if (ts < minTs) minTs = ts;
      if (ts > maxTs) maxTs = ts;
    }
    if (!Number.isFinite(minTs) || !Number.isFinite(maxTs)) return undefined;
    return {
      from: new Date(minTs).toISOString(),
      to: new Date(maxTs).toISOString(),
    };
  }, [isRangeActive, appliedRange, records]);

  const { data: members = [] } = useMatchableMembers(clubIdStr, matchableRange);

  // ── 4) derived values ──────────────────────────────────────────────────
  /** 필드 필터만 적용 → 상태별 탭 숫자가 필드 필터와 연동되도록 */
  const filteredAllRecords = useMemo(
    () => applyFilters(records ?? [], filters),
    [records, filters]
  );
  /** 필드 필터 + 상태 필터 → 표시 목록과 일괄 확정 대상의 기준 */
  const filteredRecords = useMemo(
    () =>
      statusFilter
        ? filteredAllRecords.filter((r) => r.status === statusFilter)
        : filteredAllRecords,
    [filteredAllRecords, statusFilter]
  );
  const sortedRecords = useMemo(
    () => applySort(filteredRecords, sortBy, sortOrder),
    [filteredRecords, sortBy, sortOrder]
  );

  const statusCounts = {
    total: filteredAllRecords.length,
    pending: filteredAllRecords.filter((r) => r.status === 'PENDING').length,
    matched: filteredAllRecords.filter((r) => r.status === 'MATCHED').length,
    confirmed: filteredAllRecords.filter((r) => r.status === 'CONFIRMED')
      .length,
    error: filteredAllRecords.filter((r) => r.status === 'ERROR').length,
    skipped: filteredAllRecords.filter((r) => r.status === 'SKIPPED').length,
  };

  /** 필드 필터 적용 전, 현재 선택된 상태 탭 기준의 전체 건수 */
  const totalBeforeFieldFilters = statusFilter
    ? (records ?? []).filter((r) => r.status === statusFilter).length
    : (records?.length ?? 0);
  const displayCount = sortedRecords.length;
  const hasActiveFilters =
    filters.depositorNameKeyword.trim() !== '' ||
    filters.amountMin !== '' ||
    filters.amountMax !== '' ||
    filters.matchedMemberIds.length > 0;
  const statusLabel =
    statusFilter && STATUS_LABELS[statusFilter]
      ? STATUS_LABELS[statusFilter]
      : null;

  /**
   * 체크박스 다중 선택은 일괄 동작이 정의된 탭에서만 활성화한다.
   * - PENDING 탭: 선택 항목 건너뛰기
   * - MATCHED 탭: 선택 항목 확정 / 선택 항목 건너뛰기
   * - CONFIRMED 탭: 선택 항목 확정 취소
   * - ERROR 탭: 선택 항목 건너뛰기
   * - SKIPPED 탭: 선택 항목 건너뜀 해제
   * 전체 탭은 상태 혼재로 단일 일괄 동작이 정의되지 않아 체크박스를 숨긴다.
   */
  const isBulkSelectionTab =
    statusFilter === 'PENDING' ||
    statusFilter === 'MATCHED' ||
    statusFilter === 'CONFIRMED' ||
    statusFilter === 'ERROR' ||
    statusFilter === 'SKIPPED';

  const confirmedInBatch = batchId
    ? (records ?? []).filter((r) => r.status === 'CONFIRMED').length
    : 0;

  // ── 5) effects ─────────────────────────────────────────────────────────
  /**
   * statusFilter가 바뀌면 선택을 초기화한다.
   * Why: MATCHED 탭과 CONFIRMED 탭의 선택은 의미가 다르다(확정 vs. 확정 취소).
   * 탭 전환 시 직전 선택이 따라오면 잘못된 일괄 작업으로 이어질 위험이 있다.
   */
  useEffect(() => {
    setSelectedRecordIds([]);
  }, [statusFilter]);

  // ── 6) handlers ────────────────────────────────────────────────────────
  const handleUpdateMember = async (recordId: string, memberIds: number[]) => {
    try {
      await updateMutation.mutateAsync({
        recordId,
        data: { matchedMemberIds: memberIds },
      });
    } catch (error: any) {
      alert(error.message || '회원 수정에 실패했습니다.');
    }
  };

  const handleConfirm = async (
    recordId: string,
    selections: YearMonthSelection[]
  ) => {
    try {
      const data =
        selections.length === 1
          ? {
              year: selections[0].year,
              months: selections[0].months,
            }
          : { selections };
      await confirmMutation.mutateAsync({
        recordId,
        data,
      });
    } catch (error: any) {
      alert(error.message || '확정에 실패했습니다.');
    }
  };

  const handleUnconfirm = async (recordId: string) => {
    try {
      await unconfirmMutation.mutateAsync(recordId);
      toast.success(
        '확정이 취소되었습니다. 회원·월을 수정한 뒤 다시 확정해주세요.'
      );
    } catch (error: any) {
      toast.error(error.message || '확정 취소에 실패했습니다.');
    }
  };

  const handleSkip = async (recordId: string) => {
    try {
      await skipMutation.mutateAsync(recordId);
    } catch (error: any) {
      alert(error.message || '건너뛰기에 실패했습니다.');
    }
  };

  const handleUnskip = async (recordId: string) => {
    try {
      await unskipMutation.mutateAsync(recordId);
      toast.success(
        '건너뛰기가 해제되었습니다. 확정 또는 다시 건너뛸 수 있습니다.'
      );
    } catch (error: any) {
      toast.error(error.message || '건너뛰기 해제에 실패했습니다.');
    }
  };

  const handleBulkConfirm = async () => {
    const hasMatchedMembers = (r: {
      matchedMemberId?: number | null;
      matchedMembers?: { clubMemberId: number }[];
    }) =>
      r.matchedMemberId != null ||
      (r.matchedMembers != null && r.matchedMembers.length > 0);
    const matchedRecordIds = filteredRecords
      .filter((r) => r.status === 'MATCHED' && hasMatchedMembers(r))
      .map((r) => r.id);
    await bulk.handleBulkConfirmAllMatched(matchedRecordIds);
  };

  const handleDeleteBatch = async () => {
    if (!clubIdStr || !batchId) return;

    setIsDeleting(true);
    try {
      await axios.delete(
        `/api/clubs/${clubIdStr}/membership-fee/batches/${batchId}`
      );
      await queryClient.invalidateQueries({ queryKey: ['uploadBatches'] });
      await queryClient.invalidateQueries({ queryKey: ['paymentDashboard'] });
      toast.success('배치가 삭제되었습니다.');
      router.push(`/clubs/${clubId}/membership-fee/batches`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || '배치 삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const onSortChange = (column: PaymentRecordSortBy) => {
    if (sortBy === column) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder(column === 'transactionDate' ? 'desc' : 'asc');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() =>
            router.push(
              batchId
                ? `/clubs/${clubId}/membership-fee/batches`
                : `/clubs/${clubId}/membership-fee`
            )
          }
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold">입금 내역 처리</h1>
      </div>

      {/* 거래일 범위 안내 배너 (batch 진입 시에는 batch 자체가 자연 상한이라 숨김) */}
      {!batchId && (
        <TransactionDateRangeBanner
          appliedRange={appliedRange}
          draftRange={draftRange}
          setDraftRange={setDraftRange}
          applyDraft={applyDraft}
          setDraftToPreset={setDraftToPreset}
          draftPresetMonths={draftPresetMonths}
          isDraftRangeTooLong={isDraftRangeTooLong}
        />
      )}

      {/* 배치 필터 중일 때 배치 정보 헤더 */}
      {batchId && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-6">
          <div className="text-sm text-blue-800">
            <span className="font-medium">배치 필터 적용 중</span>
            {' · '}
            {records?.length ?? 0}건
          </div>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50"
          >
            <Trash2 size={14} />
            배치 삭제
          </button>
        </div>
      )}

      {/* 배치 삭제 확인 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-2">배치 삭제</h3>
            {confirmedInBatch > 0 ? (
              <p className="text-sm text-red-600 mb-4">
                이 배치에{' '}
                <span className="font-bold">
                  확정된 납부 {confirmedInBatch}건
                </span>
                이 포함되어 있습니다. 삭제하면 해당 납부 내역도 함께 삭제됩니다.
                정말 삭제하시겠습니까?
              </p>
            ) : (
              <p className="text-sm text-gray-600 mb-4">
                이 배치({records?.length ?? 0}건)를 삭제하시겠습니까?
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleDeleteBatch}
                disabled={isDeleting}
                className="px-4 py-2 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50"
              >
                {isDeleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <YearSelector year={year} onYearChange={setYear} />
          <div className="flex items-center gap-2">
            {statusCounts.matched > 0 && (
              <button
                onClick={handleBulkConfirm}
                disabled={bulk.isBulkConfirmPending}
                className="flex items-center gap-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
              >
                <CheckCircle size={18} />
                매칭된 항목 일괄 확정 ({statusCounts.matched}건)
              </button>
            )}
          </div>
        </div>

        <ProcessStatusFilterTabs
          filterStatus={statusFilter}
          statusCounts={statusCounts}
          onStatusSelect={(status) => {
            const path = `/clubs/${clubId}/membership-fee/process`;
            const params = new URLSearchParams();
            if (batchId) params.set('batchId', batchId);
            if (status) params.set('status', status);
            const qs = params.toString();
            router.push(qs ? `${path}?${qs}` : path);
          }}
        />

        <PaymentRecordFilters
          filters={filters}
          onFiltersChange={setFilters}
          members={members}
        />

        <p className="mb-4 text-sm text-gray-600">
          {statusLabel != null && (
            <span className="font-medium">{statusLabel}</span>
          )}
          {statusLabel != null && ' · '}
          {hasActiveFilters
            ? `전체 ${totalBeforeFieldFilters}건 중 필터 결과 ${displayCount}건`
            : `${displayCount}건 표시 중`}
        </p>

        {selectedRecordIds.length > 0 && (
          <BulkActionBar
            statusFilter={statusFilter}
            selectedRecordIds={selectedRecordIds}
            setSelectedRecordIds={setSelectedRecordIds}
            year={year}
            bulk={bulk}
          />
        )}

        <PaymentRecordTable
          records={sortedRecords}
          members={members}
          year={year}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={onSortChange}
          onUpdateMember={handleUpdateMember}
          onConfirm={handleConfirm}
          onUnconfirm={handleUnconfirm}
          onSkip={handleSkip}
          onUnskip={handleUnskip}
          selectedRecordIds={isBulkSelectionTab ? selectedRecordIds : undefined}
          onSelectedRecordIdsChange={
            isBulkSelectionTab ? setSelectedRecordIds : undefined
          }
          isUpdating={
            updateMutation.isPending ||
            confirmMutation.isPending ||
            unconfirmMutation.isPending ||
            skipMutation.isPending ||
            unskipMutation.isPending ||
            bulk.isBulkConfirmPending ||
            bulk.isBulkUnconfirmPending ||
            bulk.isBulkSkipPending ||
            bulk.isBulkUnskipPending
          }
        />
      </div>
    </div>
  );
}

export default withAuth(ProcessPage, {
  requireAuth: true,
  checkPermission: checkClubAdminPermission,
});
