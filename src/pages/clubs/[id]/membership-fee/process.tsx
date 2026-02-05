import { useEffect, useState } from 'react';

import { ArrowLeft, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/router';

import PaymentRecordTable from '@/components/organisms/membership-fee/PaymentRecordTable';
import YearSelector from '@/components/molecules/membership-fee/YearSelector';

import {
  usePaymentRecords,
  useUpdatePaymentRecord,
  useConfirmPayment,
  useSkipPayment,
  useBulkConfirmPayments,
} from '@/hooks/membership-fee/usePaymentRecords';
import { withAuth } from '@/lib/withAuth';
import { checkClubAdminPermission } from '@/utils/permissions';

interface Member {
  id: number;
  name: string | null;
}

function ProcessPage() {
  const router = useRouter();
  const { id: clubId, status: filterStatus } = router.query;
  const clubIdStr = typeof clubId === 'string' ? clubId : undefined;

  const [year, setYear] = useState(new Date().getFullYear());
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);

  const statusFilter =
    typeof filterStatus === 'string' ? filterStatus : undefined;

  const { data: records, isLoading } = usePaymentRecords(
    clubIdStr,
    undefined,
    statusFilter
  );
  const updateMutation = useUpdatePaymentRecord(clubIdStr);
  const confirmMutation = useConfirmPayment(clubIdStr);
  const skipMutation = useSkipPayment(clubIdStr);
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

  const handleUpdateMember = async (
    recordId: string,
    memberId: number | null
  ) => {
    try {
      await updateMutation.mutateAsync({
        recordId,
        data: { matchedMemberId: memberId },
      });
    } catch (error: any) {
      alert(error.message || '회원 수정에 실패했습니다.');
    }
  };

  const handleConfirm = async (recordId: string, months: number[]) => {
    try {
      await confirmMutation.mutateAsync({
        recordId,
        data: { year, months },
      });
    } catch (error: any) {
      alert(error.message || '확정에 실패했습니다.');
    }
  };

  const handleSkip = async (recordId: string) => {
    try {
      await skipMutation.mutateAsync(recordId);
    } catch (error: any) {
      alert(error.message || '건너뛰기에 실패했습니다.');
    }
  };

  const handleBulkConfirm = async () => {
    const matchedRecords =
      records?.filter((r) => r.status === 'MATCHED' && r.matchedMemberId) || [];

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
    total: records?.length || 0,
    pending: records?.filter((r) => r.status === 'PENDING').length || 0,
    matched: records?.filter((r) => r.status === 'MATCHED').length || 0,
    confirmed: records?.filter((r) => r.status === 'CONFIRMED').length || 0,
    error: records?.filter((r) => r.status === 'ERROR').length || 0,
    skipped: records?.filter((r) => r.status === 'SKIPPED').length || 0,
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

        <PaymentRecordTable
          records={records || []}
          members={members}
          year={year}
          onUpdateMember={handleUpdateMember}
          onConfirm={handleConfirm}
          onSkip={handleSkip}
          isUpdating={
            updateMutation.isPending ||
            confirmMutation.isPending ||
            skipMutation.isPending ||
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
