import { useMemo, useEffect, useState } from 'react';

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
import YearSelector from '@/components/molecules/membership-fee/YearSelector';
import PaymentRecordTable, {
  PaymentRecordSortBy,
  YearMonthSelection,
} from '@/components/organisms/membership-fee/PaymentRecordTable';

import {
  usePaymentRecords,
  useUpdatePaymentRecord,
  useConfirmPayment,
  useUnconfirmPayment,
  useSkipPayment,
  useUnskipPayment,
  useBulkConfirmPayments,
} from '@/hooks/membership-fee/usePaymentRecords';

import { withAuth } from '@/lib/withAuth';
import { PaymentRecord } from '@/types/membership-fee.types';
import { checkClubAdminPermission } from '@/utils/permissions';

interface Member {
  id: number;
  name: string | null;
}

type PaymentRecordSortOrder = 'asc' | 'desc';

function getRecordMemberIds(record: PaymentRecord): number[] {
  if (record.matchedMembers && record.matchedMembers.length > 0) {
    return record.matchedMembers.map((m) => m.clubMemberId);
  }
  if (record.matchedMemberId) {
    return [record.matchedMemberId];
  }
  return [];
}

function formatMatchedMembersForSort(record: PaymentRecord): string {
  if (record.matchedMembers && record.matchedMembers.length > 0) {
    return record.matchedMembers
      .map((m) => m.clubMember?.name ?? '')
      .join(', ');
  }
  return record.matchedMember?.name ?? '';
}

function applyFilters(
  records: PaymentRecord[],
  filters: PaymentRecordFilterValues
): PaymentRecord[] {
  return records.filter((record) => {
    if (filters.transactionDateFrom) {
      const from = new Date(filters.transactionDateFrom);
      from.setHours(0, 0, 0, 0);
      const d = new Date(record.transactionDate);
      d.setHours(0, 0, 0, 0);
      if (d < from) return false;
    }
    if (filters.transactionDateTo) {
      const to = new Date(filters.transactionDateTo);
      to.setHours(23, 59, 59, 999);
      const d = new Date(record.transactionDate);
      if (d > to) return false;
    }
    const keyword = filters.depositorNameKeyword.trim();
    if (keyword) {
      if (!record.depositorName.toLowerCase().includes(keyword.toLowerCase())) {
        return false;
      }
    }
    const amountMin =
      filters.amountMin !== '' ? Number(filters.amountMin) : null;
    const amountMax =
      filters.amountMax !== '' ? Number(filters.amountMax) : null;
    if (
      amountMin != null &&
      !Number.isNaN(amountMin) &&
      record.amount < amountMin
    ) {
      return false;
    }
    if (
      amountMax != null &&
      !Number.isNaN(amountMax) &&
      record.amount > amountMax
    ) {
      return false;
    }
    if (
      filters.matchedMemberIds.length > 0 &&
      getRecordMemberIds(record).every(
        (id) => !filters.matchedMemberIds.includes(id)
      )
    ) {
      return false;
    }
    return true;
  });
}

function applySort(
  records: PaymentRecord[],
  sortBy: PaymentRecordSortBy,
  sortOrder: PaymentRecordSortOrder
): PaymentRecord[] {
  const dir = sortOrder === 'asc' ? 1 : -1;
  return [...records].sort((a, b) => {
    let cmp = 0;
    switch (sortBy) {
      case 'transactionDate': {
        const ta = new Date(a.transactionDate).getTime();
        const tb = new Date(b.transactionDate).getTime();
        cmp = ta - tb;
        break;
      }
      case 'depositorName':
        cmp = (a.depositorName ?? '').localeCompare(b.depositorName ?? '');
        break;
      case 'amount':
        cmp = a.amount - b.amount;
        break;
      case 'matchedMember':
        cmp = formatMatchedMembersForSort(a).localeCompare(
          formatMatchedMembersForSort(b)
        );
        break;
      case 'status':
        cmp = (a.status ?? '').localeCompare(b.status ?? '');
        break;
      default:
        break;
    }
    return cmp * dir;
  });
}

function ProcessPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    id: clubId,
    status: filterStatus,
    batchId: batchIdQuery,
  } = router.query;
  const clubIdStr = typeof clubId === 'string' ? clubId : undefined;
  const batchId = typeof batchIdQuery === 'string' ? batchIdQuery : undefined;

  const [year, setYear] = useState(new Date().getFullYear());
  const [members, setMembers] = useState<Member[]>([]);
  const [filters, setFilters] =
    useState<PaymentRecordFilterValues>(INITIAL_FILTERS);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortBy, setSortBy] = useState<PaymentRecordSortBy>('transactionDate');
  const [sortOrder, setSortOrder] = useState<PaymentRecordSortOrder>('desc');

  const statusFilter =
    typeof filterStatus === 'string' ? filterStatus : undefined;

  /**
   * batch 단위 전체 목록을 한 번만 받아 클라이언트에서 필드/상태 필터를 모두 적용한다.
   * status별로 API를 다시 호출하지 않으므로 statusFilter 변경 시 추가 fetch가 발생하지 않는다.
   */
  const { data: records, isLoading } = usePaymentRecords(clubIdStr, batchId);

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

  const updateMutation = useUpdatePaymentRecord(clubIdStr);
  const confirmMutation = useConfirmPayment(clubIdStr);
  const unconfirmMutation = useUnconfirmPayment(clubIdStr);
  const skipMutation = useSkipPayment(clubIdStr);
  const unskipMutation = useUnskipPayment(clubIdStr);
  const bulkConfirmMutation = useBulkConfirmPayments(clubIdStr);

  useEffect(() => {
    const fetchMembers = async () => {
      if (!clubId) return;

      try {
        const response = await fetch(`/api/clubs/members?clubId=${clubId}`);
        const result = await response.json();
        if (response.ok) {
          const memberList = result.data.users.map(
            (user: { clubMember: { id: number; name: string | null } }) => ({
              id: user.clubMember.id,
              name: user.clubMember.name,
            })
          );
          setMembers(memberList);
        }
      } catch (error) {
        console.error('회원 목록 조회 실패:', error);
      }
    };

    fetchMembers();
  }, [clubId]);

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
    const matchedRecords = filteredRecords.filter(
      (r) => r.status === 'MATCHED' && hasMatchedMembers(r)
    );

    if (matchedRecords.length === 0) {
      alert('확정할 수 있는 레코드가 없습니다.');
      return;
    }

    if (
      !confirm(
        `${matchedRecords.length}건의 입금 내역을 일괄 확정하시겠습니까?`
      )
    ) {
      return;
    }

    try {
      const result = await bulkConfirmMutation.mutateAsync({
        recordIds: matchedRecords.map((r) => r.id),
        year,
      });
      alert(
        `${result.summary.success}건 확정, ${result.summary.failed}건 실패`
      );
    } catch (error: any) {
      alert(error.message || '일괄 확정에 실패했습니다.');
    }
  };

  const confirmedInBatch = batchId
    ? (records ?? []).filter((r) => r.status === 'CONFIRMED').length
    : 0;

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

  const statusCounts = {
    total: filteredAllRecords.length,
    pending: filteredAllRecords.filter((r) => r.status === 'PENDING').length,
    matched: filteredAllRecords.filter((r) => r.status === 'MATCHED').length,
    confirmed: filteredAllRecords.filter((r) => r.status === 'CONFIRMED')
      .length,
    error: filteredAllRecords.filter((r) => r.status === 'ERROR').length,
    skipped: filteredAllRecords.filter((r) => r.status === 'SKIPPED').length,
  };

  const STATUS_LABELS: Record<string, string> = {
    PENDING: '대기',
    MATCHED: '매칭됨',
    CONFIRMED: '확정',
    ERROR: '에러',
    SKIPPED: '건너뜀',
  };
  /** 필드 필터 적용 전, 현재 선택된 상태 탭 기준의 전체 건수 */
  const totalBeforeFieldFilters = statusFilter
    ? (records ?? []).filter((r) => r.status === statusFilter).length
    : (records?.length ?? 0);
  const displayCount = sortedRecords.length;
  const hasActiveFilters =
    filters.transactionDateFrom !== '' ||
    filters.transactionDateTo !== '' ||
    filters.depositorNameKeyword.trim() !== '' ||
    filters.amountMin !== '' ||
    filters.amountMax !== '' ||
    filters.matchedMemberIds.length > 0;
  const statusLabel =
    statusFilter && STATUS_LABELS[statusFilter]
      ? STATUS_LABELS[statusFilter]
      : null;

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
                disabled={bulkConfirmMutation.isPending}
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
          isUpdating={
            updateMutation.isPending ||
            confirmMutation.isPending ||
            unconfirmMutation.isPending ||
            skipMutation.isPending ||
            unskipMutation.isPending ||
            bulkConfirmMutation.isPending
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
