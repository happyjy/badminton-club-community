import { useState } from 'react';

import { useRouter } from 'next/router';

import { Button } from '@/components/atoms/buttons/Button';
import { ClubJoinModal } from '@/components/organisms/modal/join';

import usePhoneVerification from '@/hooks/usePhoneVerification';

import { User, ClubJoinFormData, MembershipStatus } from '@/types';
import { KakaoAuth } from '@/utils/auth';

interface JoinClubButtonProps {
  user: User;
  clubId: string;
  isLoading: boolean;
  membershipStatus: MembershipStatus;
  canJoinClub: boolean;
  onJoin: (formData: ClubJoinFormData) => void;
}

export const JoinClubButton = ({
  user,
  clubId,
  isLoading,
  membershipStatus,
  canJoinClub,
  onJoin,
}: JoinClubButtonProps) => {
  const router = useRouter();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 전화번호 인증 훅
  // 이 값들을 넘겨야 JoinModal이 인증을 요구한다(canVerifyPhone).
  const {
    // local state
    phoneVerificationStatus,
    phoneVerificationLoading,
    phoneVerificationError,
    // functions
    checkPhoneVerificationStatus,
    sendPhoneVerificationCode,
    verifyPhoneCode,
  } = usePhoneVerification({ clubId });

  // 이벤트 핸들러 함수들을 명시적으로 선언
  const onClickLogin = () => {
    KakaoAuth.login(router);
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
      <Button type="button" variant="plain" size="sm" onClick={onClickLogin}>
        로그인이 필요합니다
      </Button>
    );
  }

  if (membershipStatus.isPending) {
    return (
      <Button type="button" variant="secondary" size="sm" disabled>
        가입 승인 대기중
      </Button>
    );
  }

  if (canJoinClub) {
    return (
      <>
        <Button type="button" size="sm" onClick={onClickJoinButton}>
          모임 가입하기
        </Button>
        <ClubJoinModal
          user={user}
          clubId={clubId}
          isOpen={isModalOpen}
          onClose={onCloseModal}
          onSubmit={onSubmitJoinForm}
          isSubmitting={isSubmitting}
          phoneVerificationStatus={phoneVerificationStatus}
          phoneVerificationLoading={phoneVerificationLoading}
          phoneVerificationError={phoneVerificationError}
          checkPhoneVerificationStatus={checkPhoneVerificationStatus}
          sendPhoneVerificationCode={sendPhoneVerificationCode}
          verifyPhoneCode={verifyPhoneCode}
        />
      </>
    );
  }

  return null;
};
