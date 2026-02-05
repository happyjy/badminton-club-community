import { PhoneVerificationStatus } from '@/hooks/usePhoneVerification';

import { User } from '@/types';
import { ClubJoinFormData } from '@/types/club.types';

import JoinModal from '../JoinModal';

interface ClubJoinModalProps {
  user: User;
  clubId: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: ClubJoinFormData) => void;
  isSubmitting?: boolean;
  initialValues?: Partial<ClubJoinFormData>;
  // 전화번호 인증 관련 props
  phoneVerificationStatus?: PhoneVerificationStatus | null;
  phoneVerificationLoading?: boolean;
  phoneVerificationError?: string | null;
  checkPhoneVerificationStatus?: () => Promise<void>;
  sendPhoneVerificationCode?: (
    phoneNumber: string,
    forceNewVerification?: boolean
  ) => Promise<any>;
  verifyPhoneCode?: (phoneNumber: string, code: string) => Promise<any>;
}

/**
 * 모임 가입 신청 모달
 * - 사용처: JoinClubButton
 * - 조건: isGuestApplication === false
 */
function ClubJoinModal({
  user,
  clubId,
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
  initialValues,
  phoneVerificationStatus,
  phoneVerificationLoading,
  phoneVerificationError,
  checkPhoneVerificationStatus,
  sendPhoneVerificationCode,
  verifyPhoneCode,
}: ClubJoinModalProps) {
  const title = initialValues ? '모임 가입 수정' : '모임 가입 신청';
  const submitText = initialValues ? '수정하기' : '신청하기';

  return (
    <JoinModal
      user={user}
      clubId={clubId}
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
      initialValues={initialValues}
      isClubMember={false}
      phoneVerificationStatus={phoneVerificationStatus}
      phoneVerificationLoading={phoneVerificationLoading}
      phoneVerificationError={phoneVerificationError}
      checkPhoneVerificationStatus={checkPhoneVerificationStatus}
      sendPhoneVerificationCode={sendPhoneVerificationCode}
      verifyPhoneCode={verifyPhoneCode}
    >
      <JoinModal.Header title={title} />

      <JoinModal.NameField />
      <JoinModal.BirthDateField />
      <JoinModal.GenderField />
      <JoinModal.PhoneField />
      <JoinModal.TournamentFields />

      <JoinModal.Footer
        submitText={submitText}
        onClose={onClose}
        isSubmitting={isSubmitting}
      />
    </JoinModal>
  );
}

export default ClubJoinModal;
