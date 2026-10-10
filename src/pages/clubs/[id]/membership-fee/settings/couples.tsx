import { useEffect, useState } from 'react';

import { useRouter } from 'next/router';

import { Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';

import { Button } from '@/components/atoms/buttons/Button';
import { Skeleton } from '@/components/atoms/Skeleton';
import { StatusChip } from '@/components/atoms/StatusChip';
import { CoupleHistoryUpsertSheet } from '@/components/organisms/membership-fee/CoupleHistoryUpsertSheet';
import { PageHeader } from '@/components/organisms/PageHeader';
import { useConfirm } from '@/components/organisms/sheet/ConfirmProvider';
import { DataTable } from '@/components/organisms/table/DataTable';

import {
  useCoupleHistories,
  useCreateCoupleHistory,
  useDeleteCoupleHistory,
  useUpdateCoupleHistory,
} from '@/hooks/membership-fee/useCoupleHistories';

import { withAuth } from '@/lib/withAuth';
import {
  CoupleHistory,
  CoupleHistoryUpsertInput,
} from '@/types/membership-fee.types';
import { checkClubAdminPermission } from '@/utils/permissions';

interface Member {
  id: number;
  name: string | null;
}

function formatYearMonth(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
}

const coupleNames = (h: CoupleHistory) =>
  `${h.clubMember?.name || '(이름 없음)'} → ${h.partnerMember?.name || '(이름 없음)'}`;

const couplePeriod = (h: CoupleHistory) =>
  `${formatYearMonth(h.startedAt)} ~ ${
    h.endedAt ? formatYearMonth(h.endedAt) : '진행 중'
  }`;

// 진행 중인 관계에만 붙는다. 글자는 옛 화면의 "active" 그대로다.
const activeChip = (h: CoupleHistory) =>
  h.endedAt == null ? <StatusChip tone="positive">active</StatusChip> : null;

/**
 * 부부 회원 관리 화면.
 *
 * 부부 관계는 시점 단위로 누적되는 CoupleHistory가 정본이며, active(endedAt=null)
 * row가 곧 "현재 부부"이다. CoupleGroup은 등록·수정·삭제 시 서버 트랜잭션 안에서
 * 자동 동기화되므로, 이 화면은 CoupleHistory만 다룬다.
 */
function CouplesSettingsPage() {
  const router = useRouter();
  const { id: clubId } = router.query;
  const clubIdStr = typeof clubId === 'string' ? clubId : undefined;
  const confirm = useConfirm();

  const [members, setMembers] = useState<Member[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);

  const { data: histories, isLoading: isLoadingHistories } =
    useCoupleHistories(clubIdStr);
  const createHistory = useCreateCoupleHistory(clubIdStr);
  const updateHistory = useUpdateCoupleHistory(clubIdStr);
  const deleteHistory = useDeleteCoupleHistory(clubIdStr);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<CoupleHistory | null>(null);

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

  const handleOpenCreate = () => {
    setEditing(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (history: CoupleHistory) => {
    setEditing(history);
    setIsModalOpen(true);
  };

  const closeSheet = () => {
    setIsModalOpen(false);
    setEditing(null);
  };

  const handleSubmit = async (input: CoupleHistoryUpsertInput) => {
    try {
      if (editing) {
        await updateHistory.mutateAsync({
          historyId: editing.id,
          input,
        });
      } else {
        await createHistory.mutateAsync(input);
      }
      setIsModalOpen(false);
      setEditing(null);
    } catch (error) {
      console.error('부부 관계 저장 실패:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : '부부 관계 저장에 실패했습니다.'
      );
    }
  };

  const handleDelete = async (historyId: number) => {
    const ok = await confirm({
      title: '정말 이 부부 관계를 삭제하시겠습니까?',
      confirmLabel: '삭제',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteHistory.mutateAsync(historyId);
      closeSheet();
    } catch (error) {
      console.error('부부 관계 삭제 실패:', error);
      toast.error('부부 관계 삭제에 실패했습니다.');
    }
  };

  const backHref = `/clubs/${clubId}/membership-fee`;

  if (isLoadingMembers || isLoadingHistories) {
    return (
      <>
        <PageHeader title="부부 회원 관리" backHref={backHref} />
        <Skeleton className="h-48 w-full" />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="부부 회원 관리"
        backHref={backHref}
        action={
          <Button type="button" size="sm" onClick={handleOpenCreate}>
            <Plus aria-hidden className="mr-1 h-4 w-4" />
            등록
          </Button>
        }
      />

      <p className="mb-3 px-1 text-footnote text-secondary">
        두 회원의 시작·종료를 시점 단위로 관리합니다. 진행 중인 관계가 현재
        부부로 인정되며, 거래일 기준 부부 단가 판정에 사용됩니다.
      </p>

      <DataTable
        aria-label="부부 관계 이력"
        rows={histories || []}
        rowKey={(history) => history.id}
        columns={[
          {
            key: 'names',
            header: '회원 → 배우자',
            cell: (history) => (
              <span className="font-semibold">{coupleNames(history)}</span>
            ),
            sortValue: (history) => history.clubMember?.name ?? '',
          },
          {
            key: 'period',
            header: '기간',
            cell: couplePeriod,
            sortValue: (history) => new Date(history.startedAt).getTime(),
          },
          { key: 'active', header: '상태', cell: activeChip },
        ]}
        list={{
          title: coupleNames,
          subtitle: couplePeriod,
          trailing: activeChip,
        }}
        onRowClick={handleOpenEdit}
        empty="등록된 부부 관계 이력이 없습니다."
      />

      <CoupleHistoryUpsertSheet
        isOpen={isModalOpen}
        onClose={closeSheet}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
        members={members}
        editing={editing}
        isSubmitting={
          createHistory.isPending ||
          updateHistory.isPending ||
          deleteHistory.isPending
        }
      />
    </>
  );
}

export default withAuth(CouplesSettingsPage, {
  requireAuth: true,
  checkPermission: checkClubAdminPermission,
});
