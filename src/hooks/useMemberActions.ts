import { useState } from 'react';

import { toast } from 'react-hot-toast';

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

  const changeStatus = async (
    userId: number,
    clubId: number,
    newStatus: Status
  ) => {
    const previousParticipants = [...participants];

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
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!response.ok) {
        throw new Error('상태 변경에 실패했습니다');
      }
    } catch (error) {
      console.error('상태 변경 중 오류가 발생했습니다:', error);
      // 실패하면 이전 상태로 되돌린다.
      applyParticipants(previousParticipants);
      toast.error('상태 변경에 실패했습니다');
    }
  };

  return { approve, changeStatus, approvingUserId };
}
