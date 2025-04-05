import { useState } from 'react';

import { useRouter } from 'next/router';

import JoinClubModal from '@/components/organisms/modal/JoinClubModal';
import { User, ClubJoinFormData, MembershipStatus } from '@/types';
import { redirectToLogin } from '@/utils/auth';

interface JoinClubButtonProps {
  user: User;
  isLoading: boolean;
  membershipStatus: MembershipStatus;
  canJoinClub: boolean;
  onJoin: (formData: ClubJoinFormData) => void;
}

export const JoinClubButton = ({
  user,
  isLoading,
  membershipStatus,
  canJoinClub,
  onJoin,
}: JoinClubButtonProps) => {
  const router = useRouter();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 이벤트 핸들러 함수들을 명시적으로 선언
  const onClickLogin = () => {
    redirectToLogin(router);
  };

  const onClickJoinButton = () => {
    setIsModalOpen(true);
  };

  const onCloseModal = () => {
    setIsModalOpen(false);
  };

  const onSubmitJoinForm = (formData: ClubJoinFormData) => {
    setIsSubmitting(true);
    onJoin(formData);
    setIsModalOpen(false);
    setIsSubmitting(false);
  };

  if (isLoading) return null;

  if (!user) {
    return (
      <button
        onClick={onClickLogin}
        className="text-blue-500 hover:text-blue-700 text-sm"
      >
        로그인이 필요합니다
      </button>
    );
  }

  if (membershipStatus.isPending) {
    return (
      <button
        disabled
        className="bg-gray-400 text-white px-4 py-2 rounded-lg cursor-not-allowed"
      >
        가입 승인 대기중
      </button>
    );
  }

  if (canJoinClub) {
    return (
      <>
        <button
          onClick={onClickJoinButton}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
        >
          모임 가입하기
        </button>
        <JoinClubModal
          user={user}
          isOpen={isModalOpen}
          onClose={onCloseModal}
          onSubmit={onSubmitJoinForm}
          isSubmitting={isSubmitting}
        />
      </>
    );
  }

  return null;
};
