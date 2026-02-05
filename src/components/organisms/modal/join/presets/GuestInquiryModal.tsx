import { PhoneVerificationStatus } from '@/hooks/usePhoneVerification';

import { User } from '@/types';
import { ClubJoinFormData } from '@/types/club.types';

import JoinModal from '../JoinModal';

interface GuestInquiryModalProps {
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
 * 클럽 가입 문의 모달 (비회원용)
 * - 사용처: 게스트 페이지 (비회원)
 * - 조건: isGuestApplication === true && isClubMember === false
 */
function GuestInquiryModal({
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
}: GuestInquiryModalProps) {
  const isEdit = !!initialValues;
  const title = isEdit ? '가입신청 내용 수정' : '클럽 가입신청';
  const submitText = isEdit ? '수정하기' : '가입신청';

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
      <JoinModal.Header
        title={title}
        description="클럽 가입에 대해 문의하고 싶으시면 아래 정보를 입력해주세요."
      />

      <JoinModal.NameField />
      <JoinModal.IntendToJoinField
        disabled={true}
        forceChecked={true}
        helpText="(비회원은 자동으로 체크됩니다)"
      />
      <JoinModal.VisitDateField />
      <JoinModal.BirthDateField />
      <JoinModal.GenderField />
      <JoinModal.PhoneField helpText="수락 여부 및 댓글 알림이 문자로 발송됩니다 (최초 1회)" />
      <JoinModal.TournamentFields />
      <JoinModal.MessageField
        label="문의 내용"
        placeholder="클럽에 대한 문의사항이나 방문 시 전달할 내용을 입력해주세요"
      />

      {!isEdit && <JoinModal.PrivacyAgreement />}

      <JoinModal.Footer
        submitText={submitText}
        onClose={onClose}
        isSubmitting={isSubmitting}
      />
    </JoinModal>
  );
}

export default GuestInquiryModal;
