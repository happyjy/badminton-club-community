import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-hot-toast';

import {
  getRecordMemberIds,
  PaymentRecordMember,
  YearMonthSelection,
} from '@/components/organisms/membership-fee/paymentRecordDisplay';
import type { PaymentRecordActions } from '@/components/organisms/membership-fee/PaymentRecordSheet';
import { useConfirm } from '@/components/organisms/sheet/ConfirmProvider';

import {
  useConfirmPayment,
  useSkipPayment,
  useUnconfirmPayment,
  useUnskipPayment,
  useUpdatePaymentRecord,
} from '@/hooks/membership-fee/usePaymentRecords';

import {
  PaymentRecord,
  PaymentRecordUpdateInput,
} from '@/types/membership-fee.types';

type RecordHandlers = Omit<
  PaymentRecordActions,
  'members' | 'year' | 'isUpdating'
>;

/**
 * 입금 내역 한 건의 동작(회원·분류 고치기, 확정, 건너뛰기 등)을 한 곳에 모은 훅.
 * 입금 내역 처리 화면과 업로드 화면이 같은 동작·같은 문구를 쓴다.
 *
 * 결과는 목록 쿼리가 새로 읽히며 보인다 (mutation이 `paymentRecords`를 무효화한다).
 */
export function usePaymentRecordActions(
  clubIdStr: string | undefined,
  /** 매칭 후보 회원. 의무 시작월을 고칠 때 회원의 userId를 찾는 데 쓴다 */
  members: PaymentRecordMember[]
): { actions: RecordHandlers; isUpdating: boolean } {
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const updateMutation = useUpdatePaymentRecord(clubIdStr);
  const confirmMutation = useConfirmPayment(clubIdStr);
  const unconfirmMutation = useUnconfirmPayment(clubIdStr);
  const skipMutation = useSkipPayment(clubIdStr);
  const unskipMutation = useUnskipPayment(clubIdStr);

  const messageOf = (error: unknown, fallback: string) =>
    (error instanceof Error && error.message) || fallback;

  const onUpdateMember = async (recordId: string, memberIds: number[]) => {
    try {
      await updateMutation.mutateAsync({
        recordId,
        data: { matchedMemberIds: memberIds },
      });
    } catch (error) {
      toast.error(messageOf(error, '회원 수정에 실패했습니다.'));
    }
  };

  const onUpdateRecord = async (
    recordId: string,
    data: PaymentRecordUpdateInput
  ) => {
    try {
      await updateMutation.mutateAsync({ recordId, data });
    } catch (error) {
      toast.error(messageOf(error, '수정에 실패했습니다.'));
    }
  };

  const onConfirm = async (
    recordId: string,
    selections: YearMonthSelection[]
  ) => {
    try {
      await confirmMutation.mutateAsync({
        recordId,
        data:
          selections.length === 1
            ? { year: selections[0].year, months: selections[0].months }
            : { selections },
      });
    } catch (error) {
      toast.error(messageOf(error, '확정에 실패했습니다.'));
    }
  };

  const onUnconfirm = async (recordId: string) => {
    try {
      await unconfirmMutation.mutateAsync(recordId);
      toast.success(
        '확정이 취소되었습니다. 회원·월을 수정한 뒤 다시 확정해주세요.'
      );
    } catch (error) {
      toast.error(messageOf(error, '확정 취소에 실패했습니다.'));
    }
  };

  const onSkip = async (recordId: string) => {
    try {
      await skipMutation.mutateAsync(recordId);
    } catch (error) {
      toast.error(messageOf(error, '건너뛰기에 실패했습니다.'));
    }
  };

  const onUnskip = async (recordId: string) => {
    try {
      await unskipMutation.mutateAsync(recordId);
      toast.success(
        '건너뛰기가 해제되었습니다. 확정 또는 다시 건너뛸 수 있습니다.'
      );
    } catch (error) {
      toast.error(messageOf(error, '건너뛰기 해제에 실패했습니다.'));
    }
  };

  /**
   * 입금자가 적은 달이 회원의 의무 시작 전일 때, 시작월을 그 달로 앞당긴다.
   * 회원 정보를 고치는 일이라 한 번 묻는다. 바꾸면 이 회원의 다른 입금 내역 배정에도 반영된다.
   */
  const onAdvanceStartMonth = async (
    record: PaymentRecord,
    startMonth: { year: number; month: number }
  ) => {
    const memberId = getRecordMemberIds(record)[0];
    const member = members.find((candidate) => candidate.id === memberId);
    if (!clubIdStr || !member?.userId) {
      toast.error('회원 정보를 찾을 수 없습니다.');
      return;
    }

    const label = `${startMonth.year}년 ${startMonth.month}월`;
    const ok = await confirm({
      title: `${member.name ?? '이'} 회원의 회비 의무 시작월을 ${label}로 앞당길까요?`,
      message: '이 회원의 납부 현황과 다른 입금 내역의 배정에도 반영됩니다.',
    });
    if (!ok) return;

    try {
      await axios.patch(
        `/api/clubs/${clubIdStr}/members/${member.userId}/fee-obligation`,
        {
          // 다른 화면과 같은 방식(그 달 1일, UTC 자정)으로 저장한다
          feeObligationStartAt: new Date(
            Date.UTC(startMonth.year, startMonth.month - 1, 1)
          ).toISOString(),
        }
      );
    } catch {
      toast.error('의무 시작월을 바꾸지 못했습니다.');
      return;
    }
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['paymentRecords', clubIdStr],
      }),
      queryClient.invalidateQueries({
        queryKey: ['paymentDashboard', clubIdStr],
      }),
    ]);
    toast.success(`의무 시작월을 ${label}로 바꿨습니다.`);
  };

  return {
    actions: {
      onUpdateMember,
      onUpdateRecord,
      onAdvanceStartMonth,
      onConfirm,
      onUnconfirm,
      onSkip,
      onUnskip,
    },
    isUpdating:
      updateMutation.isPending ||
      confirmMutation.isPending ||
      unconfirmMutation.isPending ||
      skipMutation.isPending ||
      unskipMutation.isPending,
  };
}
