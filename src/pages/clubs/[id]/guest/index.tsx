import { useState, useEffect, useCallback } from 'react';

import { useRouter } from 'next/router';

import { GuestPost } from '@prisma/client';
import axios from 'axios';
import { Inbox } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useSelector } from 'react-redux';

import { Button } from '@/components/atoms/buttons/Button';
import { Skeleton } from '@/components/atoms/Skeleton';
import { EmptyState } from '@/components/molecules/EmptyState';
import { GuestApplicationList } from '@/components/organisms/guest/GuestApplicationList';
import {
  GuestApplicationModal,
  GuestInquiryModal,
} from '@/components/organisms/modal/join';
import { PageHeader } from '@/components/organisms/PageHeader';

import { useGuestPageSettings } from '@/hooks/useCustomSettings';
import usePhoneVerification from '@/hooks/usePhoneVerification';

import { AuthProps, withAuth } from '@/lib/withAuth';
import { RootState } from '@/store';
import { getGuestPageStrategy } from '@/strategies/GuestPageStrategy';
import { ClubJoinFormData } from '@/types/club.types';

function GuestPage({ user }: AuthProps) {
  const router = useRouter();
  const { id: clubId } = router.query;
  const clubMember = useSelector((state: RootState) => state.auth.clubMember);

  // 커스텀 설정 불러오기
  const { data: customSettings } = useGuestPageSettings(clubId as string);

  // 사용자 유형에 따른 전략 가져오기
  const strategy = getGuestPageStrategy(
    !!clubMember,
    clubMember
      ? customSettings?.guestDescription
      : customSettings?.inquiryDescription
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [myApplications, setMyApplications] = useState<GuestPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 전화번호 인증 훅
  const {
    // local state
    phoneVerificationStatus,
    phoneVerificationLoading,
    phoneVerificationError,
    // functions
    checkPhoneVerificationStatus,
    sendPhoneVerificationCode,
    verifyPhoneCode,
  } = usePhoneVerification({
    clubId: clubId as string,
  });

  // 사용자의 게스트 신청 목록 불러오기
  const fetchMyApplications = useCallback(async () => {
    if (!clubId || !user) return;

    setIsLoading(true);
    try {
      const response = await axios.get(
        `/api/clubs/${clubId}/guests/my-applications`
      );
      setMyApplications(response.data.data.guestPost);
    } catch (error) {
      console.error('게스트 신청 목록 불러오기 실패:', error);
      toast.error('신청 목록을 불러오는데 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  }, [clubId, user]);

  // 컴포넌트 마운트 시 및 신청 완료 후 데이터 불러오기
  useEffect(() => {
    if (user && clubId) {
      fetchMyApplications();
    }
  }, [user, clubId, fetchMyApplications]);

  // 게스트 신청 모달 열기
  const onClickOpenModal = () => {
    if (!user) {
      toast.error('로그인이 필요한 기능입니다');
      return;
    }
    setIsModalOpen(true);
  };

  // 게스트 신청 모달 닫기
  const onCloseModal = () => {
    setIsModalOpen(false);
  };

  // 게스트 신청 요청
  const onSubmitGuestApplication = async (formData: ClubJoinFormData) => {
    if (!clubId) return;

    // 전화번호 인증은 신청 폼(JoinModal.PhoneField) 안에서 끝난다.
    // 인증 전에는 제출 버튼이 잠기고, 서버(guests/apply)가 계정 인증 번호와
    // 대조해 한 번 더 막는다. 여기서 다시 검사하면 인증을 마친 뒤에도
    // 별도 인증 모달이 열려 같은 과정을 두 번 요구하게 된다.
    setIsSubmitting(true);
    try {
      // API 연동 - 게스트 신청 요청
      await axios.post(`/api/clubs/${clubId}/guests/apply`, {
        ...formData,
      });

      toast.success(
        clubMember ? '게스트 신청이 완료되었습니다' : '문의가 완료되었습니다'
      );
      onCloseModal();
      // 신청 후 목록 다시 불러오기
      fetchMyApplications();
    } catch (error: unknown) {
      toast.error(
        clubMember
          ? '게스트 신청 중 오류가 발생했습니다'
          : '문의 중 오류가 발생했습니다'
      );
      console.error(
        clubMember ? '게스트 신청 중 오류 발생:' : '문의 중 오류 발생:',
        error
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader title={strategy.getPageTitle()} />

      <div className="space-y-6">
        <div className="space-y-4 rounded-md bg-surface p-4">
          <p className="whitespace-pre-wrap break-words text-body text-secondary">
            {strategy.getDescription().trim()}
          </p>
          <Button type="button" className="w-full" onClick={onClickOpenModal}>
            {strategy.getButtonText()}
          </Button>
        </div>

        {/* 내 게스트 신청 목록 */}
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-40 rounded-md" />
          </div>
        ) : myApplications.length > 0 ? (
          <GuestApplicationList
            label={strategy.getHistoryTitle()}
            applications={myApplications}
            hrefFor={(guestId) => `/clubs/${clubId}/guest/${guestId}`}
          />
        ) : (
          <section>
            <h2 className="px-4 pb-2 text-footnote text-secondary">
              {strategy.getHistoryTitle()}
            </h2>
            <div className="rounded-md bg-surface">
              <EmptyState icon={Inbox} title="신청 내역이 아직 없어요" />
            </div>
          </section>
        )}
      </div>

      {/* 게스트 신규 신청 모달 - 클럽 멤버 여부에 따라 다른 모달 사용 */}
      {user && clubMember && (
        <GuestApplicationModal
          user={user}
          clubId={clubId as string}
          isOpen={isModalOpen}
          onClose={onCloseModal}
          onSubmit={onSubmitGuestApplication}
          isSubmitting={isSubmitting}
          phoneVerificationStatus={phoneVerificationStatus}
          phoneVerificationLoading={phoneVerificationLoading}
          phoneVerificationError={phoneVerificationError}
          checkPhoneVerificationStatus={checkPhoneVerificationStatus}
          sendPhoneVerificationCode={sendPhoneVerificationCode}
          verifyPhoneCode={verifyPhoneCode}
        />
      )}
      {user && !clubMember && (
        <GuestInquiryModal
          user={user}
          clubId={clubId as string}
          isOpen={isModalOpen}
          onClose={onCloseModal}
          onSubmit={onSubmitGuestApplication}
          isSubmitting={isSubmitting}
          phoneVerificationStatus={phoneVerificationStatus}
          phoneVerificationLoading={phoneVerificationLoading}
          phoneVerificationError={phoneVerificationError}
          checkPhoneVerificationStatus={checkPhoneVerificationStatus}
          sendPhoneVerificationCode={sendPhoneVerificationCode}
          verifyPhoneCode={verifyPhoneCode}
        />
      )}
    </>
  );
}

export default withAuth(GuestPage);
