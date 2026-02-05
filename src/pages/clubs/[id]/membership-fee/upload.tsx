import { useEffect, useState } from 'react';

import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/router';

import FileUploadZone from '@/components/organisms/membership-fee/FileUploadZone';
import PaymentRecordTable from '@/components/organisms/membership-fee/PaymentRecordTable';

import { useMembershipFeeSettings } from '@/hooks/membership-fee/useMembershipFeeSettings';
import {
  useUploadPaymentExcel,
  useUpdatePaymentRecord,
  useConfirmPayment,
  useSkipPayment,
} from '@/hooks/membership-fee/usePaymentRecords';
import { withAuth } from '@/lib/withAuth';
import { PaymentRecord } from '@/types/membership-fee.types';
import { checkClubAdminPermission } from '@/utils/permissions';

interface Member {
  id: number;
  name: string | null;
}

function UploadPage() {
  const router = useRouter();
  const { id: clubId } = router.query;
  const clubIdStr = typeof clubId === 'string' ? clubId : undefined;

  const [members, setMembers] = useState<Member[]>([]);
  const [uploadedRecords, setUploadedRecords] = useState<PaymentRecord[]>([]);
  const [uploadSummary, setUploadSummary] = useState<{
    total: number;
    matched: number;
    error: number;
    pending: number;
  } | null>(null);

  const currentYear = new Date().getFullYear();
  const { data: feeSettings, isLoading: isLoadingSettings } =
    useMembershipFeeSettings(clubIdStr, currentYear);

  const uploadMutation = useUploadPaymentExcel(clubIdStr);
  const updateMutation = useUpdatePaymentRecord(clubIdStr);
  const confirmMutation = useConfirmPayment(clubIdStr);
  const skipMutation = useSkipPayment(clubIdStr);

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

  const handleFileUpload = async (file: File) => {
    try {
      const result = await uploadMutation.mutateAsync(file);
      setUploadedRecords(result.records);
      setUploadSummary(result.summary);
    } catch (error: any) {
      alert(error.message || '파일 업로드에 실패했습니다.');
    }
  };

  const handleUpdateMember = async (
    recordId: string,
    memberId: number | null
  ) => {
    try {
      const updatedRecord = await updateMutation.mutateAsync({
        recordId,
        data: { matchedMemberId: memberId },
      });
      setUploadedRecords((prev) =>
        prev.map((r) => (r.id === recordId ? updatedRecord : r))
      );
    } catch (error: any) {
      alert(error.message || '회원 수정에 실패했습니다.');
    }
  };

  const handleConfirm = async (recordId: string, months: number[]) => {
    try {
      await confirmMutation.mutateAsync({
        recordId,
        data: { year: currentYear, months },
      });
      setUploadedRecords((prev) =>
        prev.map((r) =>
          r.id === recordId ? { ...r, status: 'CONFIRMED' as const } : r
        )
      );
    } catch (error: any) {
      alert(error.message || '확정에 실패했습니다.');
    }
  };

  const handleSkip = async (recordId: string) => {
    try {
      await skipMutation.mutateAsync(recordId);
      setUploadedRecords((prev) =>
        prev.map((r) =>
          r.id === recordId ? { ...r, status: 'SKIPPED' as const } : r
        )
      );
    } catch (error: any) {
      alert(error.message || '건너뛰기에 실패했습니다.');
    }
  };

  if (isLoadingSettings) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (!feeSettings) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.push(`/clubs/${clubId}/membership-fee`)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold">입금 내역 업로드</h1>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            {currentYear}년 회비 설정이 필요합니다. 회비 설정을 먼저
            완료해주세요.
          </p>
          <button
            onClick={() =>
              router.push(`/clubs/${clubId}/membership-fee/settings`)
            }
            className="mt-2 text-blue-600 hover:underline"
          >
            회비 설정으로 이동
          </button>
        </div>
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
        <h1 className="text-2xl font-bold">입금 내역 업로드</h1>
      </div>

      <div className="bg-white rounded-lg border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">엑셀 파일 업로드</h2>
        <p className="text-gray-600 mb-4">
          카카오뱅크에서 다운로드한 거래내역 엑셀 파일을 업로드하세요.
        </p>
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            <strong>{currentYear}년 회비 설정:</strong> 일반{' '}
            {feeSettings.regularAmount.toLocaleString()}원 / 부부{' '}
            {feeSettings.coupleAmount.toLocaleString()}원
          </p>
        </div>
        <FileUploadZone
          onFileSelect={handleFileUpload}
          isUploading={uploadMutation.isPending}
        />
      </div>

      {uploadSummary && (
        <div className="bg-white rounded-lg border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">업로드 결과</h2>
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg text-center">
              <p className="text-2xl font-bold">{uploadSummary.total}</p>
              <p className="text-sm text-gray-600">전체</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-blue-600">
                {uploadSummary.matched}
              </p>
              <p className="text-sm text-gray-600">매칭됨</p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-red-600">
                {uploadSummary.error}
              </p>
              <p className="text-sm text-gray-600">에러</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-gray-600">
                {uploadSummary.pending}
              </p>
              <p className="text-sm text-gray-600">대기</p>
            </div>
          </div>
        </div>
      )}

      {uploadedRecords.length > 0 && (
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">입금 내역 검토</h2>
            <button
              onClick={() =>
                router.push(`/clubs/${clubId}/membership-fee/process`)
              }
              className="flex items-center gap-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              전체 내역 보기
              <ArrowRight size={18} />
            </button>
          </div>
          <PaymentRecordTable
            records={uploadedRecords}
            members={members}
            year={currentYear}
            onUpdateMember={handleUpdateMember}
            onConfirm={handleConfirm}
            onSkip={handleSkip}
            isUpdating={
              updateMutation.isPending ||
              confirmMutation.isPending ||
              skipMutation.isPending
            }
          />
        </div>
      )}
    </div>
  );
}

export default withAuth(UploadPage, {
  requireAuth: true,
  checkPermission: checkClubAdminPermission,
});
