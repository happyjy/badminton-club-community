import { useEffect, useState } from 'react';

import { ArrowLeft, Plus } from 'lucide-react';
import { useRouter } from 'next/router';

import CoupleManageList from '@/components/organisms/membership-fee/CoupleManageList';
import CoupleRegisterModal from '@/components/organisms/membership-fee/CoupleRegisterModal';

import {
  useCouples,
  useCreateCouple,
  useDeleteCouple,
} from '@/hooks/membership-fee/useCouples';
import { withAuth } from '@/lib/withAuth';
import { ClubResponse } from '@/types';
import { Role } from '@/types/enums';
import { checkClubAdminPermission } from '@/utils/permissions';

interface Member {
  id: number;
  name: string | null;
}

function CouplesSettingsPage() {
  const router = useRouter();
  const { id: clubId } = router.query;
  const clubIdStr = typeof clubId === 'string' ? clubId : undefined;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);

  const { data: couples, isLoading: isLoadingCouples } = useCouples(clubIdStr);
  const createCouple = useCreateCouple(clubIdStr);
  const deleteCouple = useDeleteCouple(clubIdStr);

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

  const existingCoupleMembers =
    couples?.flatMap((c) => c.members.map((m) => m.clubMemberId)) || [];

  const handleCreateCouple = async (memberIds: number[]) => {
    try {
      await createCouple.mutateAsync({ memberIds });
      setIsModalOpen(false);
    } catch (error) {
      console.error('부부 그룹 등록 실패:', error);
      alert('부부 그룹 등록에 실패했습니다.');
    }
  };

  const handleDeleteCouple = async (groupId: number) => {
    if (!confirm('정말 이 부부 그룹을 삭제하시겠습니까?')) return;

    try {
      await deleteCouple.mutateAsync(groupId);
    } catch (error) {
      console.error('부부 그룹 삭제 실패:', error);
      alert('부부 그룹 삭제에 실패했습니다.');
    }
  };

  if (isLoadingCouples || isLoadingMembers) {
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
        <h1 className="text-2xl font-bold">부부 회원 관리</h1>
      </div>

      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-gray-600">
            부부 회원은 두 회원분이 함께 회비를 납부합니다.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            <Plus size={18} />
            부부 등록
          </button>
        </div>

        <CoupleManageList
          couples={couples || []}
          onDelete={handleDeleteCouple}
          isDeleting={deleteCouple.isPending}
        />
      </div>

      <CoupleRegisterModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateCouple}
        members={members}
        existingCoupleMembers={existingCoupleMembers}
        isSubmitting={createCouple.isPending}
      />
    </div>
  );
}

export default withAuth(CouplesSettingsPage, {
  requireAuth: true,
  checkPermission: checkClubAdminPermission,
});
