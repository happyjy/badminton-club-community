import { useState } from 'react';

import { useRouter } from 'next/router';

import { ArrowLeft, Plus, Pencil, Trash2 } from 'lucide-react';

import YearSelector from '@/components/molecules/membership-fee/YearSelector';

import {
  useFeeTypes,
  useCreateFeeType,
  useUpdateFeeType,
  useDeleteFeeType,
  useBulkUpsertFeeRates,
} from '@/hooks/membership-fee/useFeeTypes';

import { withAuth } from '@/lib/withAuth';
import { checkClubAdminPermission } from '@/utils/permissions';
import { FeeType } from '@/types/membership-fee.types';
import { FeePeriod } from '@prisma/client';

const PERIOD_LABELS: Record<string, string> = {
  MONTHLY: '월납',
  QUARTERLY: '분기납',
  SEMI_ANNUAL: '반기납',
  ANNUAL: '연납',
};

interface FeeTypeFormModalProps {
  clubId: string;
  year: number;
  feeType: FeeType | null;
  onClose: () => void;
  onSuccess: () => void;
}

function FeeTypeFormModal({
  clubId,
  year,
  feeType,
  onClose,
  onSuccess,
}: FeeTypeFormModalProps) {
  const [name, setName] = useState(feeType?.name ?? '');
  const [description, setDescription] = useState(
    feeType?.description ?? ''
  );
  const [rates, setRates] = useState(() => {
    const defaults = {
      MONTHLY: { amount: 0, monthCount: 1 },
      QUARTERLY: { amount: 0, monthCount: 3 },
      SEMI_ANNUAL: { amount: 0, monthCount: 6 },
      ANNUAL: { amount: 0, monthCount: 12 },
    };
    if (!feeType?.rates?.length) return defaults;
    feeType.rates.forEach((r) => {
      const key = r.period as keyof typeof defaults;
      if (defaults[key]) {
        defaults[key] = { amount: r.amount, monthCount: r.monthCount };
      }
    });
    return defaults;
  });

  const createMutation = useCreateFeeType(clubId);
  const updateMutation = useUpdateFeeType(clubId);
  const bulkRatesMutation = useBulkUpsertFeeRates(clubId);
  const isEditing = !!feeType;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('유형 이름을 입력해주세요.');
      return;
    }

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          typeId: feeType.id,
          data: { name: name.trim(), description: description.trim() || undefined },
        });
        const ratesToSave = [
          { period: FeePeriod.MONTHLY as const, ...rates.MONTHLY },
          // { period: FeePeriod.QUARTERLY as const, ...rates.QUARTERLY },
          // { period: FeePeriod.SEMI_ANNUAL as const, ...rates.SEMI_ANNUAL },
          { period: FeePeriod.ANNUAL as const, ...rates.ANNUAL },
        ].filter((r) => r.amount > 0);
        if (ratesToSave.length > 0) {
          await bulkRatesMutation.mutateAsync({
            feeTypeId: feeType.id,
            year,
            rates: ratesToSave,
          });
        }
      } else {
        const created = await createMutation.mutateAsync({
          name: name.trim(),
          description: description.trim() || undefined,
        });
        const ratesToSave = [
          { period: FeePeriod.MONTHLY as const, ...rates.MONTHLY },
          // { period: FeePeriod.QUARTERLY as const, ...rates.QUARTERLY },
          // { period: FeePeriod.SEMI_ANNUAL as const, ...rates.SEMI_ANNUAL },
          { period: FeePeriod.ANNUAL as const, ...rates.ANNUAL },
        ].filter((r) => r.amount > 0);
        if (ratesToSave.length > 0) {
          await bulkRatesMutation.mutateAsync({
            feeTypeId: created.id,
            year,
            rates: ratesToSave,
          });
        }
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : '저장에 실패했습니다.';
      alert(message);
    }
  };

  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    bulkRatesMutation.isPending;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">
            {isEditing ? '회비 유형 수정' : '회비 유형 추가'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                유형 이름 *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="예: 일반, 부부, 가입비"
                maxLength={50}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                설명
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="선택 입력"
                maxLength={200}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {year}년 금액 (원)
              </label>
              <div className="space-y-2">
                {(
                  ['MONTHLY', /* 'QUARTERLY', 'SEMI_ANNUAL', */ 'ANNUAL'] as const
                ).map(
                  (period) => (
                    <div key={period} className="flex items-center gap-2">
                      <span className="w-16 text-sm text-gray-600">
                        {PERIOD_LABELS[period]}
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={rates[period].amount || ''}
                        onChange={(e) =>
                          setRates((prev) => ({
                            ...prev,
                            [period]: {
                              ...prev[period],
                              amount: parseInt(e.target.value, 10) || 0,
                            },
                          }))
                        }
                        className="flex-1 px-3 py-2 border rounded-lg"
                        placeholder="0"
                      />
                    </div>
                  )
                )}
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {isPending ? '저장 중...' : '저장'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function FeeTypesSettingsPage() {
  const router = useRouter();
  const { id: clubId } = router.query;
  const clubIdStr = typeof clubId === 'string' ? clubId : undefined;

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

  const handleDelete = async (feeType: FeeType) => {
    if (
      !confirm(`"${feeType.name}" 유형을 삭제하시겠습니까?\n(사용 중인 회원이 있으면 삭제할 수 없습니다)`)
    )
      return;

    try {
      await deleteMutation.mutateAsync(feeType.id);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : '삭제에 실패했습니다.';
      alert(message);
    }
  };

  const handleModalSuccess = () => {
    setModalOpen(false);
    setEditingFeeType(null);
  };

  if (isLoading) {
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
        <h1 className="text-2xl font-bold">회비 유형 관리</h1>
      </div>

      <div className="flex items-center justify-between mb-6">
        <YearSelector year={year} onYearChange={setYear} />
        <button
          onClick={handleAdd}
          className="flex items-center gap-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          <Plus size={18} />
          회비 유형 추가
        </button>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-4 py-3 text-left">유형</th>
              <th className="px-4 py-3 text-left">설명</th>
              <th className="px-4 py-3 text-left">{year}년 금액</th>
              <th className="px-4 py-3 text-right w-24">작업</th>
            </tr>
          </thead>
          <tbody>
            {feeTypes?.map((ft) => {
              const rateSummary =
                (ft.rates?.length ?? 0) > 0
                  ? ft.rates
                      ?.map(
                        (r) =>
                          `${PERIOD_LABELS[r.period] ?? r.period} ${r.amount.toLocaleString()}원`
                      )
                      .join(' / ')
                  : '-';
              return (
                <tr key={ft.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{ft.name}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {ft.description ?? '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{rateSummary}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(ft)}
                        className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
                        title="수정"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(ft)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                        title="삭제"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {(!feeTypes || feeTypes.length === 0) && (
          <div className="py-12 text-center text-gray-500">
            등록된 회비 유형이 없습니다. &quot;회비 유형 추가&quot;를 눌러
            등록해주세요.
          </div>
        )}
      </div>

      {modalOpen && clubIdStr && (
        <FeeTypeFormModal
          clubId={clubIdStr}
          year={year}
          feeType={editingFeeType}
          onClose={() => {
            setModalOpen(false);
            setEditingFeeType(null);
          }}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
}

export default withAuth(FeeTypesSettingsPage, {
  requireAuth: true,
  checkPermission: checkClubAdminPermission,
});
