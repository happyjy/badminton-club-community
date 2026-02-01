import { PhoneVerificationStatus } from '@/hooks/usePhoneVerification';
import { User } from '@/types';
import { ClubJoinFormData } from '@/types/club.types';

import JoinModal from '../JoinModal';

interface GuestApplicationModalProps {
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
 * 게스트 신청 모달 (클럽 멤버용)
 * - 사용처: 게스트 페이지 (클럽 멤버)
 * - 조건: isGuestApplication === true && isClubMember === true
 */
function GuestApplicationModal({
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
}: GuestApplicationModalProps) {
  const isEdit = !!initialValues;
  const title = isEdit ? '게스트 신청 수정' : '게스트 신청';
  const submitText = isEdit ? '수정하기' : '신청하기';

  return (
    <JoinModal
      user={user}
      clubId={clubId}
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
      initialValues={initialValues}
      isClubMember={true}
      phoneVerificationStatus={phoneVerificationStatus}
      phoneVerificationLoading={phoneVerificationLoading}
      phoneVerificationError={phoneVerificationError}
      checkPhoneVerificationStatus={checkPhoneVerificationStatus}
      sendPhoneVerificationCode={sendPhoneVerificationCode}
      verifyPhoneCode={verifyPhoneCode}
    >
      <JoinModal.Header
        title={title}
        description="게스트로 참여하고 싶으시면 아래 정보를 입력해주세요."
      />

      {/* 게스트 정보 섹션 */}
      <JoinModal.Section
        title="게스트 정보"
        description="게스트로 참여할 분의 정보를 입력해주세요"
      >
        <JoinModal.NameField />
        <JoinModal.IntendToJoinField />
        <JoinModal.VisitDateField />
        <JoinModal.BirthDateField />
        <JoinModal.GenderField />
        <JoinModal.TournamentFields />
      </JoinModal.Section>

      {/* 신청자 연락처 섹션 */}
      <JoinModal.Section
        title="신청자 연락처"
        description="게스트 관련 연락을 받을 번호입니다"
      >
        <JoinModal.PhoneField
          helpText="수락 여부 및 댓글 알림이 문자로 발송됩니다 (최초 1회)"
        />
      </JoinModal.Section>

      <JoinModal.MessageField
        label="가입 문의"
        placeholder="클럽에 전달할 메시지나 문의사항을 입력해주세요"
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

export default GuestApplicationModal;
