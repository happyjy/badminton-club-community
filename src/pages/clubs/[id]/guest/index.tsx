import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { withAuth } from '@/lib/withAuth';
import { ClubJoinFormData } from '@/types/club.types';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import JoinClubModal from '@/components/organisms/modal/JoinClubModal';
import { AuthProps } from '@/lib/withAuth';

// 게스트 신청 타입 정의
interface GuestApplication {
  id: string;
  createdAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  visitDate?: string;
  purpose?: string;
}

function GuestPage({ user }: AuthProps) {
  const router = useRouter();
  const { id: clubId } = router.query;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [myApplications, setMyApplications] = useState<GuestApplication[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 사용자의 게스트 신청 목록 불러오기
  const fetchMyApplications = async () => {
    if (!clubId || !user) return;

    setIsLoading(true);
    try {
      const response = await axios.get(
        `/api/clubs/${clubId}/guests/my-applications`
      );
      console.log(`🚨 ~ fetchMyApplications ~ response:`, response);
      setMyApplications(response.data.data.guestPost);
    } catch (error) {
      console.error('게스트 신청 목록 불러오기 실패:', error);
      toast.error('신청 목록을 불러오는데 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  // 컴포넌트 마운트 시 및 신청 완료 후 데이터 불러오기
  useEffect(() => {
    if (user && clubId) {
      fetchMyApplications();
    }
  }, [user, clubId]);

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

  const onSubmitGuestApplication = async (formData: ClubJoinFormData) => {
    if (!clubId) return;

    setIsSubmitting(true);
    try {
      // API 연동 - 게스트 신청 요청
      await axios.post(`/api/clubs/${clubId}/guests/apply`, {
        ...formData,
      });

      toast.success('게스트 신청이 완료되었습니다');
      onCloseModal();
      // 신청 후 목록 다시 불러오기
      fetchMyApplications();
    } catch (error: unknown) {
      toast.error('게스트 신청 중 오류가 발생했습니다');
      console.error('게스트 신청 중 오류 발생:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 신청 상태에 따른 배지 색상
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  // 신청 상태 한글 표시
  const getStatusText = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return '승인됨';
      case 'REJECTED':
        return '거절됨';
      default:
        return '검토중';
    }
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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

        {/* 내 게스트 신청 목록 */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">내 게스트 신청 내역</h2>

          {isLoading ? (
            <p className="text-gray-500">로딩 중...</p>
          ) : myApplications.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      신청일
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      방문희망일
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      목적
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상태
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {myApplications.map((application) => (
                    <tr key={application.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(application.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {application.visitDate || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {application.purpose || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(application.status)}`}
                        >
                          {getStatusText(application.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">신청 내역이 없습니다.</p>
          )}
        </div>
      </div>

      {user && (
        <JoinClubModal
          user={user}
          isOpen={isModalOpen}
          onClose={onCloseModal}
          onSubmit={onSubmitGuestApplication}
          isGuestApplication={true}
          isSubmitting={isSubmitting}
        />
      )}
    </>
  );
}

export default withAuth(GuestPage);
