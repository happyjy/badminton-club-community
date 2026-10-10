import { useEffect, useState } from 'react';

import { useRouter } from 'next/router';

import { Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';

import { Button } from '@/components/atoms/buttons/Button';
import { Skeleton } from '@/components/atoms/Skeleton';
import { StatusChip } from '@/components/atoms/StatusChip';
import YearSelector from '@/components/molecules/membership-fee/YearSelector';
import { ExemptionRegisterSheet } from '@/components/organisms/membership-fee/ExemptionRegisterSheet';
import { PageHeader } from '@/components/organisms/PageHeader';
import { useConfirm } from '@/components/organisms/sheet/ConfirmProvider';
import { DataTable } from '@/components/organisms/table/DataTable';
import { Toolbar } from '@/components/organisms/table/Toolbar';

import {
  useExemptions,
  useCreateExemption,
  useDeleteExemption,
} from '@/hooks/membership-fee/useExemptions';

import { withAuth } from '@/lib/withAuth';
import { FeeExemption } from '@/types/membership-fee.types';
import { checkClubAdminPermission } from '@/utils/permissions';

interface Member {
  id: number;
  name: string | null;
}

const exemptionName = (exemption: FeeExemption) =>
  exemption.clubMember?.name || '(이름 없음)';

const reasonChip = (exemption: FeeExemption) => (
  <StatusChip tone="neutral">{exemption.reason}</StatusChip>
);

function ExemptionsSettingsPage() {
  const router = useRouter();
  const { id: clubId } = router.query;
  const clubIdStr = typeof clubId === 'string' ? clubId : undefined;
  const confirm = useConfirm();

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
      toast.error('면제 등록에 실패했습니다.');
    }
  };

  // 면제는 수정이 없다. 행을 누르면 바로 삭제할지 묻는다.
  const handleDeleteExemption = async (exemption: FeeExemption) => {
    // 삭제 요청이 끝나기 전에 다른 행을 눌러 삭제가 겹치지 않게 한다.
    if (deleteExemption.isPending) return;
    const ok = await confirm({
      title: '정말 이 면제를 삭제하시겠습니까?',
      message: `${exemptionName(exemption)} · ${exemption.reason}`,
      confirmLabel: '삭제',
      destructive: true,
    });
    if (!ok) return;

    try {
      await deleteExemption.mutateAsync({ exemptionId: exemption.id, year });
    } catch (error) {
      console.error('면제 삭제 실패:', error);
      toast.error('면제 삭제에 실패했습니다.');
    }
  };

  const backHref = `/clubs/${clubId}/membership-fee`;

  if (isLoadingExemptions || isLoadingMembers) {
    return (
      <>
        <PageHeader title="회비 면제 관리" backHref={backHref} />
        <Skeleton className="h-48 w-full" />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="회비 면제 관리"
        backHref={backHref}
        action={
          <Button type="button" size="sm" onClick={() => setIsModalOpen(true)}>
            <Plus aria-hidden className="mr-1 h-4 w-4" />
            면제 등록
          </Button>
        }
      />

      <Toolbar>
        <YearSelector year={year} onYearChange={setYear} />
      </Toolbar>

      <p className="mb-3 px-1 text-footnote text-secondary">
        임원, 명예회원 등 회비가 면제되는 회원을 관리합니다.
      </p>

      <DataTable
        aria-label="면제 회원"
        rows={exemptions || []}
        rowKey={(exemption) => exemption.id}
        columns={[
          {
            key: 'name',
            header: '회원',
            cell: (exemption) => (
              <span className="font-semibold">{exemptionName(exemption)}</span>
            ),
            sortValue: exemptionName,
          },
          { key: 'reason', header: '사유', cell: reasonChip },
          {
            key: 'createdBy',
            header: '등록',
            cell: (exemption) => (
              <span className="text-secondary">
                (등록: {exemption.createdBy?.name || '알 수 없음'})
              </span>
            ),
          },
        ]}
        list={{
          title: exemptionName,
          subtitle: (exemption) =>
            `(등록: ${exemption.createdBy?.name || '알 수 없음'})`,
          trailing: reasonChip,
        }}
        onRowClick={handleDeleteExemption}
        empty="등록된 면제 회원이 없습니다."
      />

      <ExemptionRegisterSheet
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateExemption}
        members={members}
        exemptedMemberIds={exemptedMemberIds}
        year={year}
        isSubmitting={createExemption.isPending}
      />
    </>
  );
}

export default withAuth(ExemptionsSettingsPage, {
  requireAuth: true,
  checkPermission: checkClubAdminPermission,
});
