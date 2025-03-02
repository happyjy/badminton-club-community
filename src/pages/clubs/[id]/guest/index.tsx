import { useState } from 'react';
import { useRouter } from 'next/router';
import { withAuth } from '@/lib/withAuth';
import { JoinClubModal } from '@/components/organisms/modal/JoinClubModal';
import { ClubJoinFormData } from '@/types/club.types';

function GuestPage({ user }) {
  const router = useRouter();
  const { id: clubId } = router.query;

  const [isModalOpen, setIsModalOpen] = useState(false);

  const onClickOpenModal = () => {
    setIsModalOpen(true);
  };

  const onCloseModal = () => {
    setIsModalOpen(false);
  };

  const onSubmitJoinForm = async (formData: ClubJoinFormData) => {
    try {
      // TODO: API 연동 필요
      console.log('게스트 신청 데이터:', formData);
      console.log('클럽 ID:', clubId);

      // 임시로 성공 메시지 표시
      alert('게스트 신청이 완료되었습니다.');
      onCloseModal();
    } catch (error) {
      console.error('게스트 신청 중 오류 발생:', error);
      alert('게스트 신청 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-4">게스트 신청</h1>
        <p className="text-gray-600 mb-6">
          이 클럽에 게스트로 참여하고 싶으시면 아래 버튼을 클릭하여 신청서를
          작성해주세요.
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
        />
      )}
    </>
  );
}

export default withAuth(GuestPage);
