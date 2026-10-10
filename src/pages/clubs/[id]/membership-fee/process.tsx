import { useEffect, useMemo, useState } from 'react';

import { useRouter } from 'next/router';

import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { CheckCircle, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

import { Button } from '@/components/atoms/buttons/Button';
import { Skeleton } from '@/components/atoms/Skeleton';
import PaymentRecordFilters from '@/components/molecules/membership-fee/PaymentRecordFilters';
import ProcessStatusFilterTabs from '@/components/molecules/membership-fee/ProcessStatusFilterTabs';
import TransactionDateRangeBanner from '@/components/molecules/membership-fee/TransactionDateRangeBanner';
import YearSelector from '@/components/molecules/membership-fee/YearSelector';
import { Notice } from '@/components/molecules/Notice';
import { BulkConfirmSheet } from '@/components/organisms/membership-fee/BulkConfirmSheet';
import { BulkKindSheet } from '@/components/organisms/membership-fee/BulkKindSheet';
import {
  FEE_RECORD_STATUS_LABEL,
  PAYMENT_KIND_LABEL,
} from '@/components/organisms/membership-fee/paymentRecordDisplay';
import { PaymentRecordsView } from '@/components/organisms/membership-fee/PaymentRecordsView';
import { PageHeader } from '@/components/organisms/PageHeader';
import { useConfirm } from '@/components/organisms/sheet/ConfirmProvider';
import { BulkActionBar } from '@/components/organisms/table/BulkActionBar';
import { Toolbar } from '@/components/organisms/table/Toolbar';

import { useBulkPaymentActions } from '@/hooks/membership-fee/useBulkPaymentActions';
import { useMatchableMembers } from '@/hooks/membership-fee/useMatchableMembers';
import { usePaymentRecordActions } from '@/hooks/membership-fee/usePaymentRecordActions';
import { usePaymentRecords } from '@/hooks/membership-fee/usePaymentRecords';
import { useTransactionDateRange } from '@/hooks/membership-fee/useTransactionDateRange';

import { isBulkConfirmable } from '@/lib/membership-fee/paymentKind';
import {
  applyFilters,
  applySort,
  filtersFromQuery,
  hasActiveFilters as isAnyFilterActive,
  INITIAL_FILTERS,
  PaymentRecordFilterValues,
} from '@/lib/membership-fee/processView';
import { withAuth } from '@/lib/withAuth';
import { checkClubAdminPermission } from '@/utils/permissions';

const STATUS_LABELS: Record<string, string> = FEE_RECORD_STATUS_LABEL;

/** 선택이 있을 때 일괄 동작 막대 위에 보이는 탭별 설명 */
const BULK_HINTS: Record<string, string> = {
  PENDING: '선택한 입금 내역을 건너뛰기 처리합니다. 정산 대상에서 제외됩니다.',
  ERROR:
    '선택한 입금 내역을 건너뛰기 처리합니다. 에러 사유와 무관하게 정산 대상에서 제외됩니다.',
  MATCHED: '정산에서 제외하려면 [선택 항목 건너뛰기]를 사용하세요.',
  CONFIRMED:
    '선택한 입금 내역의 확정을 취소합니다. 회원·월 수정 후 다시 확정해야 합니다.',
  SKIPPED:
    '선택한 입금 내역의 건너뛰기를 해제합니다. 매칭 회원이 있으면 매칭됨으로, 없으면 대기로 복원됩니다.',
};

function ProcessPage() {
  // ── 1) routing & query parse ────────────────────────────────────────────
  const router = useRouter();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
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
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBulkConfirmOpen, setIsBulkConfirmOpen] = useState(false);
  const [isBulkKindOpen, setIsBulkKindOpen] = useState(false);
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

  /** 한 건의 동작(회원·분류 고치기, 확정, 건너뛰기). 업로드 화면과 같은 훅을 쓴다. */
  const { actions: recordActions, isUpdating: isRecordUpdating } =
    usePaymentRecordActions(clubIdStr, members);

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
  /** 기본 순서: 거래일 내림차순. 머리글을 누르면 표가 그 위에서 다시 정렬한다. */
  const sortedRecords = useMemo(
    () => applySort(filteredRecords, 'transactionDate', 'desc'),
    [filteredRecords]
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
  const hasActiveFilters = isAnyFilterActive(filters);

  /**
   * [매칭된 항목 일괄 확정]의 대상과, 매칭됐지만 대상에서 빠지는 건.
   * 검토가 필요한 건(부족·초과 입금, 월 힌트 불일치, 불확실한 자동 매칭 등)은 빠진다.
   */
  const matchedInView = filteredRecords.filter((r) => r.status === 'MATCHED');
  const confirmableRecords = matchedInView.filter(isBulkConfirmable);
  const excludedFromBulk = matchedInView.filter((r) => !isBulkConfirmable(r));
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
    setIsBulkConfirmOpen(false);
  }, [statusFilter]);

  /**
   * 업로드 화면·대시보드에서 "검토 필요 N건"을 눌러 들어오면 그 필터가 걸린 채로 시작한다
   * (`?review=1`, `?kind=EVENT,OTHER`).
   */
  const { review: reviewQuery, kind: kindQuery } = router.query;
  useEffect(() => {
    const fromQuery = filtersFromQuery({
      review: reviewQuery,
      kind: kindQuery,
    });
    if (fromQuery) setFilters(fromQuery);
  }, [reviewQuery, kindQuery]);

  // ── 6) handlers ────────────────────────────────────────────────────────
  const handleBulkConfirm = async () => {
    await bulk.handleBulkConfirmAllMatched(confirmableRecords.map((r) => r.id));
  };

  /** 일괄 확정에서 빠지는 건이 왜 빠지는지 보여 준다 */
  const showExcludedFromBulk = () => {
    const lines = excludedFromBulk.map((r) => {
      const reason =
        r.kind !== 'FEE'
          ? `${PAYMENT_KIND_LABEL[r.kind]} 분류`
          : r.reviewReasons?.join(' · ') || '매칭된 회원 없음';
      return `• ${r.depositorName}: ${reason}`;
    });
    void confirm({
      title: `일괄 확정에서 빠지는 ${excludedFromBulk.length}건`,
      message: `${lines.join('\n')}\n\n행을 눌러 상세에서 확인한 뒤 확정하세요.`,
      hideCancel: true,
    });
  };

  const handleDeleteBatch = async () => {
    if (!clubIdStr || !batchId) return;

    const ok = await confirm({
      title: '배치 삭제',
      message:
        confirmedInBatch > 0
          ? `이 배치에 확정된 납부 ${confirmedInBatch}건이 포함되어 있습니다. 삭제하면 해당 납부 내역도 함께 삭제됩니다. 정말 삭제하시겠습니까?`
          : `이 배치(${records?.length ?? 0}건)를 삭제하시겠습니까?`,
      confirmLabel: '삭제',
      destructive: true,
    });
    if (!ok) return;

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
    }
  };

  const backHref = batchId
    ? `/clubs/${clubId}/membership-fee/batches`
    : `/clubs/${clubId}/membership-fee`;

  if (isLoading) {
    return (
      <>
        <PageHeader title="입금 내역 처리" backHref={backHref} />
        <Skeleton className="h-64 w-full" />
      </>
    );
  }

  const bulkHint = statusFilter ? BULK_HINTS[statusFilter] : undefined;

  return (
    <>
      <PageHeader title="입금 내역 처리" backHref={backHref} />

      {/* 거래일 범위 (batch 진입 시에는 batch 자체가 자연 상한이라 숨김) */}
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

      {batchId && (
        <Notice
          action={
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={handleDeleteBatch}
              pending={isDeleting}
              pendingText="삭제 중..."
              pendingPosition="left"
            >
              <Trash2 aria-hidden className="mr-1 h-4 w-4" />
              배치 삭제
            </Button>
          }
        >
          <span className="font-semibold">배치 필터 적용 중</span>
          {' · '}
          {records?.length ?? 0}건
        </Notice>
      )}

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

      <Toolbar
        summary={
          <>
            {statusLabel != null && (
              <span className="font-semibold">{statusLabel}</span>
            )}
            {statusLabel != null && ' · '}
            {hasActiveFilters
              ? `전체 ${totalBeforeFieldFilters}건 중 필터 결과 ${displayCount}건`
              : `${displayCount}건 표시 중`}
          </>
        }
        actions={
          matchedInView.length > 0 && (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {excludedFromBulk.length > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="plain"
                  onClick={showExcludedFromBulk}
                >
                  검토 필요 {excludedFromBulk.length}건 제외
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                onClick={handleBulkConfirm}
                disabled={
                  bulk.isBulkConfirmPending || confirmableRecords.length === 0
                }
              >
                <CheckCircle aria-hidden className="mr-1 h-4 w-4" />
                매칭된 항목 일괄 확정 ({confirmableRecords.length}건)
              </Button>
            </div>
          )
        }
      >
        <YearSelector year={year} onYearChange={setYear} />
      </Toolbar>

      <PaymentRecordFilters
        filters={filters}
        onFiltersChange={setFilters}
        members={members}
      />

      <PaymentRecordsView
        records={sortedRecords}
        members={members}
        year={year}
        {...recordActions}
        selection={
          isBulkSelectionTab
            ? { selected: selectedRecordIds, onChange: setSelectedRecordIds }
            : undefined
        }
        isUpdating={
          isRecordUpdating ||
          bulk.isBulkConfirmPending ||
          bulk.isBulkUnconfirmPending ||
          bulk.isBulkSkipPending ||
          bulk.isBulkUnskipPending ||
          bulk.isBulkSetKindPending
        }
      />

      {selectedRecordIds.length > 0 && bulkHint && (
        <p className="mt-2 text-caption text-secondary">{bulkHint}</p>
      )}

      <BulkActionBar
        count={selectedRecordIds.length}
        unit="건"
        onClear={() => setSelectedRecordIds([])}
      >
        {statusFilter === 'MATCHED' && (
          <Button
            type="button"
            size="sm"
            onClick={() => setIsBulkConfirmOpen(true)}
            disabled={bulk.isBulkConfirmPending}
          >
            선택 항목 확정
          </Button>
        )}
        {(statusFilter === 'PENDING' ||
          statusFilter === 'MATCHED' ||
          statusFilter === 'ERROR') && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={bulk.handleBulkSkipSelected}
            disabled={bulk.isBulkSkipPending}
          >
            선택 항목 건너뛰기
          </Button>
        )}
        {/* 확정된 건은 분류를 바꿀 수 없다 (확정 취소가 먼저다) */}
        {statusFilter !== 'CONFIRMED' && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setIsBulkKindOpen(true)}
            disabled={bulk.isBulkSetKindPending}
          >
            선택 항목 분류 변경
          </Button>
        )}
        {statusFilter === 'CONFIRMED' && (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={bulk.handleBulkUnconfirmSelected}
            disabled={bulk.isBulkUnconfirmPending}
          >
            선택 항목 확정 취소
          </Button>
        )}
        {statusFilter === 'SKIPPED' && (
          <Button
            type="button"
            size="sm"
            onClick={bulk.handleBulkUnskipSelected}
            disabled={bulk.isBulkUnskipPending}
          >
            선택 항목 건너뜀 해제
          </Button>
        )}
      </BulkActionBar>

      <BulkConfirmSheet
        open={isBulkConfirmOpen}
        onClose={() => setIsBulkConfirmOpen(false)}
        count={selectedRecordIds.length}
        year={year}
        bulk={bulk}
      />

      <BulkKindSheet
        open={isBulkKindOpen}
        onClose={() => setIsBulkKindOpen(false)}
        count={selectedRecordIds.length}
        onPick={(kind) => {
          setIsBulkKindOpen(false);
          void bulk.handleBulkSetKindSelected(kind);
        }}
      />
    </>
  );
}

export default withAuth(ProcessPage, {
  requireAuth: true,
  checkPermission: checkClubAdminPermission,
});
