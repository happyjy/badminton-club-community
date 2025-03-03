import { useState } from 'react';
import { useRouter } from 'next/router';
import { withAuth } from '@/lib/withAuth';
import { ClubJoinFormData } from '@/types/club.types';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import JoinClubModal from '@/components/organisms/modal/JoinClubModal';
import { AuthProps } from '@/lib/withAuth';

function GuestPage({ user }: AuthProps) {
  const router = useRouter();
  const { id: clubId } = router.query;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onClickOpenModal = () => {
    if (!user) {
      toast.error('로그인이 필요한 기능입니다');
      return;
    }
    setIsModalOpen(true);
  };

  const onCloseModal = () => {
    setIsModalOpen(false);
  };

  const onSubmitJoinForm = async (formData: ClubJoinFormData) => {
    if (!clubId) return;

    setIsSubmitting(true);
    try {
      // API 연동 - 게스트 신청 요청
      console.log(`🚨 ~ onSubmitJoinForm ~ formData:`, formData);
      // await axios.post(`/api/clubs/${clubId}/guests/apply`, {
      //   name: formData.name,
      //   phoneNumber: formData.phoneNumber,
      //   localTournamentLevel: formData.localTournamentLevel,
      //   nationalTournamentLevel: formData.nationalTournamentLevel,
      //   lessonPeriod: formData.lessonPeriod,
      //   playingPeriod: formData.playingPeriod,
      //   // 게스트 관련 필드
      //   intendToJoin: formData.intendToJoin,
      //   visitDate: formData.visitDate,
      //   message: formData.message || '',
      // });
      await axios.post(`/api/clubs/${clubId}/guests/apply`, {
        ...formData,
      });

      toast.success('게스트 신청이 완료되었습니다');
      onCloseModal();
      // 필요하다면 페이지 새로고침 또는 상태 업데이트
    } catch (error: unknown) {
      toast.error('게스트 신청 중 오류가 발생했습니다');
      console.error('게스트 신청 중 오류 발생:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-4">게스트 신청</h1>
        <p className="text-gray-600 mb-6">
          이 클럽에 게스트로 참여하고 싶으시면 아래 버튼을 클릭하여 신청서를
          작성해주세요.
          <br />
          <br />
          평일: 오후 7시 30분 ~ 오후 10시
          <br />
          주말, 공휴일: 오후 3시 30분 ~ 오후 6시
        </p>

        <button
          onClick={onClickOpenModal}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
        >
          게스트 신청하기
        </button>
      </div>

      {user && (
        <JoinClubModal
          user={user}
          isOpen={isModalOpen}
          onClose={onCloseModal}
          onSubmit={onSubmitJoinForm}
          isGuestApplication={true}
          isSubmitting={isSubmitting}
        />
      )}
    </>
  );
}

export default withAuth(GuestPage);
