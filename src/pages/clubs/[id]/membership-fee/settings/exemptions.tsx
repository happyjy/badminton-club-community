import { useEffect, useState } from 'react';

import { ArrowLeft, Plus } from 'lucide-react';
import { useRouter } from 'next/router';

import ExemptionManageList from '@/components/organisms/membership-fee/ExemptionManageList';
import ExemptionRegisterModal from '@/components/organisms/membership-fee/ExemptionRegisterModal';
import YearSelector from '@/components/molecules/membership-fee/YearSelector';

import {
  useExemptions,
  useCreateExemption,
  useDeleteExemption,
} from '@/hooks/membership-fee/useExemptions';
import { withAuth } from '@/lib/withAuth';
import { checkClubAdminPermission } from '@/utils/permissions';

interface Member {
  id: number;
  name: string | null;
}

function ExemptionsSettingsPage() {
  const router = useRouter();
  const { id: clubId } = router.query;
  const clubIdStr = typeof clubId === 'string' ? clubId : undefined;

  const [year, setYear] = useState(new Date().getFullYear());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);

  const { data: exemptions, isLoading: isLoadingExemptions } = useExemptions(
    clubIdStr,
    year
  );
  const createExemption = useCreateExemption(clubIdStr);
  const deleteExemption = useDeleteExemption(clubIdStr);

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
      } finally {
        setIsLoadingMembers(false);
      }
    };

    fetchMembers();
  }, [clubId]);

  const exemptedMemberIds = exemptions?.map((e) => e.clubMemberId) || [];

  const handleCreateExemption = async (data: {
    clubMemberId: number;
    reason: string;
  }) => {
    try {
      await createExemption.mutateAsync({
        ...data,
        year,
      });
      setIsModalOpen(false);
    } catch (error) {
      console.error('면제 등록 실패:', error);
      alert('면제 등록에 실패했습니다.');
    }
  };

  const handleDeleteExemption = async (exemptionId: number) => {
    if (!confirm('정말 이 면제를 삭제하시겠습니까?')) return;

    try {
      await deleteExemption.mutateAsync({ exemptionId, year });
    } catch (error) {
      console.error('면제 삭제 실패:', error);
      alert('면제 삭제에 실패했습니다.');
    }
  };

  if (isLoadingExemptions || isLoadingMembers) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.push(`/clubs/${clubId}/membership-fee`)}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold">회비 면제 관리</h1>
      </div>

      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <YearSelector year={year} onYearChange={setYear} />
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            <Plus size={18} />
            면제 등록
          </button>
        </div>

        <p className="text-gray-600 mb-4">
          임원, 명예회원 등 회비가 면제되는 회원을 관리합니다.
        </p>

        <ExemptionManageList
          exemptions={exemptions || []}
          onDelete={handleDeleteExemption}
          isDeleting={deleteExemption.isPending}
        />
      </div>

      <ExemptionRegisterModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateExemption}
        members={members}
        exemptedMemberIds={exemptedMemberIds}
        year={year}
        isSubmitting={createExemption.isPending}
      />
    </div>
  );
}

export default withAuth(ExemptionsSettingsPage, {
  requireAuth: true,
  checkPermission: checkClubAdminPermission,
});
