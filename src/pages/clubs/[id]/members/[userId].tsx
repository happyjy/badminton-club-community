import { useCallback, useEffect, useState } from 'react';

import { useRouter } from 'next/router';

import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-hot-toast';

import { Skeleton } from '@/components/atoms/Skeleton';
import { EmptyState } from '@/components/molecules/EmptyState';
import {
  ManualPaymentFormValue,
  ManualPaymentSection,
} from '@/components/organisms/membership-fee/ManualPaymentSection';
import {
  ClubMemberDetail,
  formatOrphanPayment,
  LeaveFormValue,
  MemberFeeDetailView,
  MemberLeaveItem,
  OrphanPayment,
} from '@/components/organisms/membership-fee/MemberFeeDetailView';
import { PageHeader } from '@/components/organisms/PageHeader';
import { useConfirm } from '@/components/organisms/sheet/ConfirmProvider';

import { withAuth } from '@/lib/withAuth';
import type { ManualPaymentItem } from '@/types/membership-fee.types';
import { checkClubAdminPermission } from '@/utils/permissions';

/** 서버가 알려 준 실패 사유. 없으면 null */
const serverError = (err: unknown) =>
  err && typeof err === 'object' && 'response' in err
    ? ((err as { response?: { data?: { error?: string } } }).response?.data
        ?.error ?? null)
    : null;

function MemberDetailPage() {
  const router = useRouter();
  const { id: clubId, userId, from } = router.query;

  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const defaultPath = `/clubs/${clubId}/members`;
  const backHref = typeof from === 'string' ? from : defaultPath;

  const [member, setMember] = useState<ClubMemberDetail | null>(null);
  const [leaves, setLeaves] = useState<MemberLeaveItem[]>([]);
  const [orphanPayments, setOrphanPayments] = useState<OrphanPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feeStartInput, setFeeStartInput] = useState('');
  const [leftAtInput, setLeftAtInput] = useState('');
  const [feeEndInput, setFeeEndInput] = useState('');
  const [positionInput, setPositionInput] = useState('');
  const [positionOrderInput, setPositionOrderInput] = useState('');
  const [manualPayments, setManualPayments] = useState<ManualPaymentItem[]>([]);

  const memberApi =
    typeof clubId === 'string' && typeof userId === 'string'
      ? `/api/clubs/${clubId}/members/${userId}`
      : null;

  const fetchManualPayments = useCallback(async () => {
    if (!memberApi) return;
    try {
      const res = await axios.get(`${memberApi}/manual-payments`);
      setManualPayments(res.data?.data?.payments ?? []);
    } catch {
      setManualPayments([]);
    }
  }, [memberApi]);

  const fetchLeaves = useCallback(async () => {
    if (
      !clubId ||
      !userId ||
      typeof clubId !== 'string' ||
      typeof userId !== 'string'
    )
      return;
    try {
      const res = await axios.get(
        `/api/clubs/${clubId}/members/${userId}/leaves`
      );
      const list = res.data?.data?.leaves ?? [];
      setLeaves(list);
      setOrphanPayments(res.data?.data?.orphanPayments ?? []);
    } catch {
      setLeaves([]);
      setOrphanPayments([]);
    }
  }, [clubId, userId]);

  useEffect(() => {
    if (
      !clubId ||
      !userId ||
      typeof clubId !== 'string' ||
      typeof userId !== 'string'
    )
      return;

    const fetchMember = async () => {
      try {
        const res = await axios.get(`/api/clubs/${clubId}/members/${userId}`);
        const data = res.data?.data?.clubMember;
        if (data) {
          setMember(data);
          setFeeStartInput(
            data.feeObligationStartAt
              ? new Date(data.feeObligationStartAt).toISOString().slice(0, 7)
              : ''
          );
          setLeftAtInput(
            data.leftAt ? new Date(data.leftAt).toISOString().slice(0, 10) : ''
          );
          setFeeEndInput(
            data.leftAt ? new Date(data.leftAt).toISOString().slice(0, 7) : ''
          );
          setPositionInput(data.position ?? '');
          setPositionOrderInput(
            data.positionOrder != null ? String(data.positionOrder) : ''
          );
        }
      } catch {
        setMember(null);
      } finally {
        setLoading(false);
      }
    };

    fetchMember();
  }, [clubId, userId]);

  useEffect(() => {
    if (!member) return;
    fetchLeaves();
  }, [member, fetchLeaves]);

  useEffect(() => {
    if (!member) return;
    fetchManualPayments();
  }, [member, fetchManualPayments]);

  /**
   * 납부를 옮기거나 넣고 지운 뒤에 부른다. 같은 납부가 이월 안내와 직접 추가 목록 두 곳에 나올 수 있어 둘 다 다시 읽는다.
   */
  const refreshPayments = () => {
    fetchLeaves();
    fetchManualPayments();
  };

  const onToggleFeeExcluded = async (next: boolean) => {
    if (!memberApi || !member) return;
    setSaving(true);
    try {
      await axios.patch(`${memberApi}/fee-obligation`, { feeExcluded: next });
      setMember({ ...member, feeExcluded: next });
      queryClient.invalidateQueries({ queryKey: ['paymentDashboard', clubId] });
      toast.success(
        next ? '회비 대상 아님으로 바꿨습니다.' : '회비 대상으로 바꿨습니다.'
      );
    } catch (err: unknown) {
      toast.error(serverError(err) ?? '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const onSuggestAmount = async (year: number, month: number) => {
    if (!memberApi) return null;
    try {
      const res = await axios.get(`${memberApi}/manual-payments/suggest`, {
        params: { year, month },
      });
      return (res.data?.data?.amount as number | null) ?? null;
    } catch {
      return null;
    }
  };

  const onAddManualPayment = async (value: ManualPaymentFormValue) => {
    if (!memberApi) return false;
    setSaving(true);
    try {
      await axios.post(`${memberApi}/manual-payments`, value);
      toast.success('납부를 직접 추가했습니다.');
      queryClient.invalidateQueries({ queryKey: ['paymentDashboard', clubId] });
      refreshPayments();
      return true;
    } catch (err: unknown) {
      toast.error(serverError(err) ?? '저장에 실패했습니다.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const onDeleteManualPayment = async (paymentId: string) => {
    if (!memberApi) return;
    const ok = await confirm({
      title: '이 납부를 지울까요?',
      confirmLabel: '삭제',
      destructive: true,
    });
    if (!ok) return;
    setSaving(true);
    try {
      await axios.delete(`${memberApi}/manual-payments/${paymentId}`);
      toast.success('직접 추가한 납부를 지웠습니다.');
      queryClient.invalidateQueries({ queryKey: ['paymentDashboard', clubId] });
      refreshPayments();
    } catch (err: unknown) {
      toast.error(serverError(err) ?? '삭제에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const onSaveFeeStart = async () => {
    if (
      !clubId ||
      !userId ||
      typeof clubId !== 'string' ||
      typeof userId !== 'string'
    )
      return;
    setSaving(true);
    try {
      await axios.patch(
        `/api/clubs/${clubId}/members/${userId}/fee-obligation`,
        {
          feeObligationStartAt: feeStartInput
            ? new Date(`${feeStartInput}-01`).toISOString()
            : null,
        }
      );
      queryClient.invalidateQueries({ queryKey: ['paymentDashboard', clubId] });
      toast.success('회비 입금 시작월이 저장되었습니다.');
      if (member) {
        setMember({
          ...member,
          feeObligationStartAt: feeStartInput
            ? new Date(`${feeStartInput}-01`).toISOString()
            : null,
        });
      }
    } catch {
      toast.error('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const onSaveLeftInfo = async () => {
    if (
      !clubId ||
      !userId ||
      typeof clubId !== 'string' ||
      typeof userId !== 'string'
    )
      return;
    setSaving(true);
    try {
      const leftAt = leftAtInput ? new Date(leftAtInput).toISOString() : null;
      // feeEndInput(회비 마지막 월)이 있으면 leftAt의 년·월을 덮어씀
      const effectiveLeftAt = feeEndInput
        ? new Date(`${feeEndInput}-01`).toISOString()
        : leftAt;

      await axios.patch(
        `/api/clubs/${clubId}/members/${userId}/fee-obligation`,
        {
          feeObligationStartAt: feeStartInput
            ? new Date(`${feeStartInput}-01`).toISOString()
            : null,
          leftAt: effectiveLeftAt,
        }
      );
      queryClient.invalidateQueries({ queryKey: ['paymentDashboard', clubId] });
      toast.success('탈퇴 정보가 저장되었습니다.');
      if (member) {
        setMember({
          ...member,
          leftAt: effectiveLeftAt,
        });
      }
    } catch {
      toast.error('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const onSavePosition = async () => {
    if (
      !clubId ||
      !userId ||
      typeof clubId !== 'string' ||
      typeof userId !== 'string'
    )
      return;
    setSaving(true);
    try {
      const position = positionInput.trim();
      await axios.patch(
        `/api/clubs/${clubId}/members/${userId}/fee-obligation`,
        {
          position: position || null,
          // 직책을 지우면 순서도 함께 지운다
          positionOrder: position ? positionOrderInput || null : null,
        }
      );
      queryClient.invalidateQueries({ queryKey: ['paymentDashboard', clubId] });
      toast.success('직책이 저장되었습니다.');
      if (!position) setPositionOrderInput('');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data
              ?.error
          : null;
      toast.error(msg ?? '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  /** 의무가 없는 달의 납부를 다음 미납 의무월로 옮기고 결과를 알린다 */
  const shiftPayments = async (payments: OrphanPayment[]) => {
    if (typeof clubId !== 'string' || payments.length === 0) return;
    setSaving(true);
    try {
      const res = await axios.post(
        `/api/clubs/${clubId}/membership-fee/payments/shift`,
        { paymentIds: payments.map((payment) => payment.id) }
      );
      const result: {
        results: { failed: { recordId: string; reason: string }[] };
        summary: { success: number; failed: number };
      } = res.data.data;
      const summary = `${result.summary.success}건 이월, ${result.summary.failed}건 실패`;
      const paymentById = new Map(payments.map((p) => [p.id, p]));
      const failedDetail = result.results.failed
        .map((failed) => {
          const payment = paymentById.get(failed.recordId);
          const label = payment
            ? `${payment.year}년 ${payment.month}월`
            : '(알 수 없음)';
          return `• ${label}: ${failed.reason}`;
        })
        .join('\n');

      if (failedDetail) {
        void confirm({
          title: summary,
          message: `실패 사유:\n${failedDetail}`,
          hideCancel: true,
        });
      } else {
        toast.success(summary);
      }
      queryClient.invalidateQueries({ queryKey: ['paymentDashboard', clubId] });
      refreshPayments();
    } catch {
      toast.error('이월에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  /** 방금 저장한 휴회 기간에 납부가 걸려 있으면 바로 옮길지 묻는다 */
  const offerShift = async (payments: OrphanPayment[]) => {
    const ok = await confirm({
      title: `휴회 기간에 납부 ${payments.length}건이 있습니다`,
      message: `${payments.map(formatOrphanPayment).join(', ')}\n다음 의무월로 이월할까요?`,
      confirmLabel: '이월',
    });
    if (ok) await shiftPayments(payments);
  };

  /** 저장에 성공하면 true. View가 그때 시트를 닫는다. */
  const onSubmitLeave = async (leaveForm: LeaveFormValue): Promise<boolean> => {
    if (
      !clubId ||
      !userId ||
      typeof clubId !== 'string' ||
      typeof userId !== 'string'
    )
      return false;
    if (!leaveForm.start) {
      toast.error('시작 연월을 입력해주세요.');
      return false;
    }
    const [startYear, startMonth] = leaveForm.start.split('-').map(Number);
    const body: {
      startYear: number;
      startMonth: number;
      endYear?: number | null;
      endMonth?: number | null;
      reason?: string;
    } = {
      startYear,
      startMonth,
      reason: leaveForm.reason.trim() || undefined,
    };
    if (leaveForm.end) {
      const [endYear, endMonth] = leaveForm.end.split('-').map(Number);
      body.endYear = endYear;
      body.endMonth = endMonth;
    }
    setSaving(true);
    try {
      const url = `/api/clubs/${clubId}/members/${userId}/leaves`;
      const res = leaveForm.editingId
        ? await axios.patch(`${url}/${leaveForm.editingId}`, body)
        : await axios.post(url, body);
      toast.success(
        leaveForm.editingId
          ? '휴회 기간을 수정했습니다.'
          : '휴회 기간을 등록했습니다.'
      );
      refreshPayments();
      const paymentsInRange: OrphanPayment[] =
        res.data?.data?.paymentsInRange ?? [];
      // 시트가 닫히는 것을 기다리게 하지 않는다
      if (paymentsInRange.length > 0) void offerShift(paymentsInRange);
      return true;
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data
              ?.error
          : null;
      toast.error(msg ?? '저장에 실패했습니다.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const onDeleteLeave = async (leaveId: number) => {
    if (
      !clubId ||
      !userId ||
      typeof clubId !== 'string' ||
      typeof userId !== 'string'
    )
      return;
    const ok = await confirm({
      title: '이 휴회 기간을 삭제할까요?',
      confirmLabel: '삭제',
      destructive: true,
    });
    if (!ok) return;
    setSaving(true);
    try {
      await axios.delete(
        `/api/clubs/${clubId}/members/${userId}/leaves/${leaveId}`
      );
      toast.success('휴회 기간을 삭제했습니다.');
      refreshPayments();
    } catch {
      toast.error('삭제에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <PageHeader title="회원 상세" backHref={backHref} />
        <Skeleton className="h-64 w-full" />
      </>
    );
  }

  if (!member) {
    return (
      <>
        <PageHeader title="회원 상세" backHref={backHref} />
        <EmptyState
          title="회원 정보를 불러올 수 없습니다."
          className="rounded-md bg-surface"
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`${member.name || '이름 없음'} 회원 상세`}
        backHref={backHref}
        wrapTitle
      />
      <div className="space-y-6">
        <MemberFeeDetailView
          member={member}
          leaves={leaves}
          saving={saving}
          feeStartInput={feeStartInput}
          onChangeFeeStart={setFeeStartInput}
          onSaveFeeStart={onSaveFeeStart}
          leftAtInput={leftAtInput}
          onChangeLeftAt={setLeftAtInput}
          feeEndInput={feeEndInput}
          onChangeFeeEnd={setFeeEndInput}
          onSaveLeftInfo={onSaveLeftInfo}
          onSubmitLeave={onSubmitLeave}
          onDeleteLeave={onDeleteLeave}
          positionInput={positionInput}
          onChangePosition={setPositionInput}
          positionOrderInput={positionOrderInput}
          onChangePositionOrder={setPositionOrderInput}
          onSavePosition={onSavePosition}
          orphanPayments={orphanPayments}
          onShiftPayments={() => shiftPayments(orphanPayments)}
          onToggleFeeExcluded={onToggleFeeExcluded}
        />
        <ManualPaymentSection
          payments={manualPayments}
          saving={saving}
          onSuggestAmount={onSuggestAmount}
          onAdd={onAddManualPayment}
          onDelete={onDeleteManualPayment}
        />
      </div>
    </>
  );
}

export default withAuth(MemberDetailPage, {
  requireAuth: true,
  checkPermission: checkClubAdminPermission,
});
