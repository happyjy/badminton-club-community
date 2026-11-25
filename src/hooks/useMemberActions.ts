import { useState } from 'react';

import { toast } from 'react-hot-toast';

import type {
  MemberStatusDefaults,
  StatusMonths,
} from '@/lib/membership-fee/memberStatusChange';
import type { ClubMemberWithUser } from '@/pages/clubs/[id]/members';
import { Status } from '@/types/enums';

interface UseMemberActionsOptions {
  participants: ClubMemberWithUser[];
  /** 바뀐 목록을 화면에 반영한다 (정렬을 다시 적용하는 쪽이 넘긴다) */
  applyParticipants: (participants: ClubMemberWithUser[]) => void;
}

const withStatus = (
  participants: ClubMemberWithUser[],
  userId: number,
  status: Status
) =>
  participants.map((user) =>
    user.id === userId
      ? { ...user, clubMember: { ...user.clubMember, status } }
      : user
  );

/** 실패 응답의 사유. 읽지 못하면 null */
async function readError(response: Response): Promise<string | null> {
  try {
    const body = (await response.json()) as { error?: unknown };
    return typeof body.error === 'string' ? body.error : null;
  } catch {
    return null;
  }
}

/** 회원 관리의 승인·상태 변경. 실패하면 토스트로 알린다. */
export function useMemberActions({
  participants,
  applyParticipants,
}: UseMemberActionsOptions) {
  const [approvingUserId, setApprovingUserId] = useState<number | null>(null);

  const approve = async (userId: number, clubId: number) => {
    setApprovingUserId(userId);
    try {
      const response = await fetch(
        `/api/clubs/${clubId}/members/${userId}/approve`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('승인 처리에 실패했습니다');
      }

      applyParticipants(withStatus(participants, userId, Status.APPROVED));
      toast.success('승인했어요');
    } catch (err) {
      console.error('승인 처리 중 오류가 발생했습니다', err);
      toast.error('승인 처리에 실패했습니다');
    } finally {
      setApprovingUserId(null);
    }
  };

  /** 상태를 바꾼다. 탈퇴·다시 가입이면 고른 달(months)을 함께 보낸다 */
  const changeStatus = async (
    userId: number,
    clubId: number,
    newStatus: Status,
    months?: StatusMonths
  ) => {
    const previousParticipants = [...participants];
    // 서버가 사유를 주면 그 사유를, 서버에 닿지 못했으면(네트워크 오류) 기본 문구를 보인다
    let failureMessage = '상태 변경에 실패했습니다';

    // 낙관적 업데이트: 화면을 먼저 바꾼다.
    applyParticipants(withStatus(participants, userId, newStatus));

    try {
      const response = await fetch(
        `/api/clubs/${clubId}/members/${userId}/status`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: newStatus, ...months }),
        }
      );

      if (!response.ok) {
        failureMessage = (await readError(response)) ?? failureMessage;
        throw new Error(failureMessage);
      }
    } catch (error) {
      console.error('상태 변경 중 오류가 발생했습니다:', error);
      // 실패하면 이전 상태로 되돌린다.
      applyParticipants(previousParticipants);
      toast.error(failureMessage);
    }
  };

  /** 달 시트의 기본값. 읽지 못하면 null (시트는 빈 칸으로 연다) */
  const loadStatusDefaults = async (
    userId: number,
    clubId: number
  ): Promise<MemberStatusDefaults | null> => {
    try {
      const response = await fetch(
        `/api/clubs/${clubId}/members/${userId}/status-defaults`
      );
      if (!response.ok) return null;
      const body = (await response.json()) as { data?: MemberStatusDefaults };
      return body.data ?? null;
    } catch (error) {
      console.error('기본값을 불러오지 못했습니다:', error);
      return null;
    }
  };

  return { approve, changeStatus, loadStatusDefaults, approvingUserId };
}
