import { useMemo, useEffect, useState } from 'react';

import { useRouter } from 'next/router';

import { ArrowLeft, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

import PaymentRecordFilters, {
  INITIAL_FILTERS,
  PaymentRecordFilterValues,
} from '@/components/molecules/membership-fee/PaymentRecordFilters';
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
      default:
        break;
    }
    return cmp * dir;
  });
}

function ProcessPage() {
  const router = useRouter();
  const { id: clubId, status: filterStatus } = router.query;
  const clubIdStr = typeof clubId === 'string' ? clubId : undefined;

  const [year, setYear] = useState(new Date().getFullYear());
  const [members, setMembers] = useState<Member[]>([]);
  const [filters, setFilters] =
    useState<PaymentRecordFilterValues>(INITIAL_FILTERS);
  const [sortBy, setSortBy] = useState<PaymentRecordSortBy>('transactionDate');
  const [sortOrder, setSortOrder] = useState<PaymentRecordSortOrder>('desc');

  const statusFilter =
    typeof filterStatus === 'string' ? filterStatus : undefined;

  /** API에서 받은 목록 (상태 필터만 적용) */
  const { data: records, isLoading: isRecordsLoading } = usePaymentRecords(
    clubIdStr,
    undefined,
    statusFilter
  );
  /** 버튼 카운트용: 항상 전체 목록(필터 없음) → "전체" 숫자가 필터와 무관하게 유지됨 */
  const { data: allRecords, isLoading: isAllRecordsLoading } =
    usePaymentRecords(clubIdStr, undefined, undefined);
  const isLoading = isRecordsLoading || isAllRecordsLoading;

  const filteredRecords = useMemo(
    () => applyFilters(records ?? [], filters),
    [records, filters]
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

  const statusCounts = {
    total: allRecords?.length || 0,
    pending: allRecords?.filter((r) => r.status === 'PENDING').length || 0,
    matched: allRecords?.filter((r) => r.status === 'MATCHED').length || 0,
    confirmed: allRecords?.filter((r) => r.status === 'CONFIRMED').length || 0,
    error: allRecords?.filter((r) => r.status === 'ERROR').length || 0,
    skipped: allRecords?.filter((r) => r.status === 'SKIPPED').length || 0,
  };

  const STATUS_LABELS: Record<string, string> = {
    PENDING: '대기',
    MATCHED: '매칭됨',
    CONFIRMED: '확정',
    ERROR: '에러',
    SKIPPED: '건너뜀',
  };
  const totalFromApi = records?.length ?? 0;
  const displayCount = sortedRecords.length;
  const hasActiveFilters =
    filters.transactionDateFrom !== '' ||
    filters.transactionDateTo !== '' ||
    filters.depositorNameKeyword.trim() !== '' ||
    filters.amountMin !== '' ||
    filters.amountMax !== '' ||
    filters.matchedMemberIds.length > 0;
  const statusLabel =
    filterStatus && STATUS_LABELS[filterStatus]
      ? STATUS_LABELS[filterStatus]
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
          onClick={() => router.push(`/clubs/${clubId}/membership-fee`)}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold">입금 내역 처리</h1>
      </div>

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

        <div className="grid grid-cols-6 gap-4 mb-6">
          <button
            onClick={() =>
              router.push(`/clubs/${clubId}/membership-fee/process`)
            }
            className={`p-3 rounded-lg text-center ${
              !filterStatus
                ? 'bg-blue-100 border-2 border-blue-500'
                : 'bg-gray-50'
            }`}
          >
            <p className="text-lg font-bold">{statusCounts.total}</p>
            <p className="text-xs text-gray-600">전체</p>
          </button>
          <button
            onClick={() =>
              router.push(
                `/clubs/${clubId}/membership-fee/process?status=PENDING`
              )
            }
            className={`p-3 rounded-lg text-center ${
              filterStatus === 'PENDING'
                ? 'bg-gray-200 border-2 border-gray-500'
                : 'bg-gray-50'
            }`}
          >
            <p className="text-lg font-bold">{statusCounts.pending}</p>
            <p className="text-xs text-gray-600">대기</p>
          </button>
          <button
            onClick={() =>
              router.push(
                `/clubs/${clubId}/membership-fee/process?status=MATCHED`
              )
            }
            className={`p-3 rounded-lg text-center ${
              filterStatus === 'MATCHED'
                ? 'bg-blue-200 border-2 border-blue-500'
                : 'bg-blue-50'
            }`}
          >
            <p className="text-lg font-bold text-blue-600">
              {statusCounts.matched}
            </p>
            <p className="text-xs text-gray-600">매칭됨</p>
          </button>
          <button
            onClick={() =>
              router.push(
                `/clubs/${clubId}/membership-fee/process?status=CONFIRMED`
              )
            }
            className={`p-3 rounded-lg text-center ${
              filterStatus === 'CONFIRMED'
                ? 'bg-green-200 border-2 border-green-500'
                : 'bg-green-50'
            }`}
          >
            <p className="text-lg font-bold text-green-600">
              {statusCounts.confirmed}
            </p>
            <p className="text-xs text-gray-600">확정</p>
          </button>
          <button
            onClick={() =>
              router.push(
                `/clubs/${clubId}/membership-fee/process?status=ERROR`
              )
            }
            className={`p-3 rounded-lg text-center ${
              filterStatus === 'ERROR'
                ? 'bg-red-200 border-2 border-red-500'
                : 'bg-red-50'
            }`}
          >
            <p className="text-lg font-bold text-red-600">
              {statusCounts.error}
            </p>
            <p className="text-xs text-gray-600">에러</p>
          </button>
          <button
            onClick={() =>
              router.push(
                `/clubs/${clubId}/membership-fee/process?status=SKIPPED`
              )
            }
            className={`p-3 rounded-lg text-center ${
              filterStatus === 'SKIPPED'
                ? 'bg-yellow-200 border-2 border-yellow-500'
                : 'bg-yellow-50'
            }`}
          >
            <p className="text-lg font-bold text-yellow-600">
              {statusCounts.skipped}
            </p>
            <p className="text-xs text-gray-600">건너뜀</p>
          </button>
        </div>

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
            ? `전체 ${totalFromApi}건 중 필터 결과 ${displayCount}건`
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
