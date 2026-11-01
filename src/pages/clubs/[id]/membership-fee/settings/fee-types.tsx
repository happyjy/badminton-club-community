import { useState } from 'react';

import { useRouter } from 'next/router';

import { Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';

import { Button } from '@/components/atoms/buttons/Button';
import { Skeleton } from '@/components/atoms/Skeleton';
import YearSelector from '@/components/molecules/membership-fee/YearSelector';
import {
  FeeTypeFormSheet,
  PERIOD_LABELS,
} from '@/components/organisms/membership-fee/FeeTypeFormSheet';
import { PageHeader } from '@/components/organisms/PageHeader';
import { useConfirm } from '@/components/organisms/sheet/ConfirmProvider';
import { DataTable } from '@/components/organisms/table/DataTable';
import { Toolbar } from '@/components/organisms/table/Toolbar';

import {
  useFeeTypes,
  useDeleteFeeType,
} from '@/hooks/membership-fee/useFeeTypes';

import { withAuth } from '@/lib/withAuth';
import { FeeType } from '@/types/membership-fee.types';
import { checkClubAdminPermission } from '@/utils/permissions';

const rateSummary = (feeType: FeeType) =>
  (feeType.rates?.length ?? 0) > 0
    ? feeType.rates
        ?.map(
          (r) =>
            `${PERIOD_LABELS[r.period] ?? r.period} ${r.amount.toLocaleString()}원`
        )
        .join(' / ')
    : '-';

function FeeTypesSettingsPage() {
  const router = useRouter();
  const { id: clubId } = router.query;
  const clubIdStr = typeof clubId === 'string' ? clubId : undefined;
  const confirm = useConfirm();

  const [year, setYear] = useState(new Date().getFullYear());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFeeType, setEditingFeeType] = useState<FeeType | null>(null);

  const { data: feeTypes, isLoading } = useFeeTypes(clubIdStr, {
    year,
    includeRates: true,
  });
  const deleteMutation = useDeleteFeeType(clubIdStr);

  const handleAdd = () => {
    setEditingFeeType(null);
    setModalOpen(true);
  };

  const handleEdit = (feeType: FeeType) => {
    setEditingFeeType(feeType);
    setModalOpen(true);
  };

  const closeSheet = () => {
    setModalOpen(false);
    setEditingFeeType(null);
  };

  const handleDelete = async (feeType: FeeType) => {
    const ok = await confirm({
      title: `"${feeType.name}" 유형을 삭제하시겠습니까?`,
      message: '(사용 중인 회원이 있으면 삭제할 수 없습니다)',
      confirmLabel: '삭제',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteMutation.mutateAsync(feeType.id);
      closeSheet();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : '삭제에 실패했습니다.';
      toast.error(message);
    }
  };

  const backHref = `/clubs/${clubId}/membership-fee`;

  if (isLoading) {
    return (
      <>
        <PageHeader title="회비 유형 관리" backHref={backHref} />
        <Skeleton className="h-48 w-full" />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="회비 유형 관리"
        backHref={backHref}
        action={
          <Button type="button" size="sm" onClick={handleAdd}>
            <Plus aria-hidden className="mr-1 h-4 w-4" />
            회비 유형 추가
          </Button>
        }
      />

      <Toolbar>
        <YearSelector year={year} onYearChange={setYear} />
      </Toolbar>

      <DataTable
        aria-label="회비 유형"
        rows={feeTypes ?? []}
        rowKey={(feeType) => feeType.id}
        columns={[
          {
            key: 'name',
            header: '유형',
            cell: (feeType) => (
              <span className="font-semibold">{feeType.name}</span>
            ),
            sortValue: (feeType) => feeType.name,
          },
          {
            key: 'description',
            header: '설명',
            cell: (feeType) => (
              <span className="text-secondary">
                {feeType.description ?? '-'}
              </span>
            ),
          },
          {
            key: 'rates',
            header: `${year}년 금액`,
            cell: rateSummary,
          },
        ]}
        list={{
          title: (feeType) => feeType.name,
          subtitle: (feeType) =>
            [feeType.description, rateSummary(feeType)]
              .filter((text) => text && text !== '-')
              .join(' · ') || undefined,
        }}
        onRowClick={handleEdit}
        empty={
          '등록된 회비 유형이 없습니다. "회비 유형 추가"를 눌러 등록해주세요.'
        }
      />

      {clubIdStr && (
        <FeeTypeFormSheet
          open={modalOpen}
          clubId={clubIdStr}
          year={year}
          feeType={editingFeeType}
          onClose={closeSheet}
          onSuccess={closeSheet}
          onDelete={handleDelete}
        />
      )}
    </>
  );
}

export default withAuth(FeeTypesSettingsPage, {
  requireAuth: true,
  checkPermission: checkClubAdminPermission,
});
