import { useState, useEffect, useCallback } from 'react';

import { useRouter } from 'next/router';

import { GuestPost } from '@prisma/client';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useSelector } from 'react-redux';

import JoinClubModal from '@/components/organisms/modal/JoinClubModal';
import { useGuestPageSettings } from '@/hooks/useCustomSettings';
import { formatDateSimple } from '@/lib/utils';
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

  // 게스트 상세 페이지로 이동
  const onClickGuestDetail = (guestId: string) => {
    router.push(`/clubs/${clubId}/guest/${guestId}`);
  };

  //
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

  // 임시 데이터
  // const initialValues: Partial<ClubJoinFormData> = {
  //   name: '테스트유저',
  //   birthDate: '1990-01-01',
  //   gender: '남성',
  //   phoneNumber: '010-1234-5678',
  //   localTournamentLevel: 'C',
  //   nationalTournamentLevel: 'D',
  //   lessonPeriod: '6개월',
  //   playingPeriod: '2년',
  //   message: '테스트 메시지입니다.',
  //   privacyAgreement: true,
  //   intendToJoin: true,
  // };

  return (
    <>
      <div className="bg-white rounded-lg shadow p-3 sm:p-6">
        <h1 className="text-2xl font-bold mb-4">{strategy.getPageTitle()}</h1>

        <p className="text-gray-600 mb-6 whitespace-pre-wrap">
          {strategy.getDescription()}
        </p>

        <button
          onClick={onClickOpenModal}
          className="px-4 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
        >
          {strategy.getButtonText()}
        </button>

        {/* 내 게스트 신청 목록 */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">
            {strategy.getHistoryTitle()}
          </h2>

          {isLoading ? (
            <p className="text-gray-500">로딩 중...</p>
          ) : myApplications.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 table-fixed">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-1 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[22%]">
                      신청일
                    </th>
                    <th className="px-1 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[22%]">
                      방문희망일
                    </th>
                    <th className="px-2 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[16%] whitespace-nowrap">
                      가입의향
                    </th>
                    <th className="px-2 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[20%] whitespace-nowrap">
                      게스트 <br /> 이름
                    </th>
                    <th className="px-2 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[20%]">
                      상태
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {myApplications.map((application) => (
                    <tr
                      key={application.id}
                      onClick={() => onClickGuestDetail(application.id)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-1 py-1 sm:px-4 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-500 truncate">
                        {formatDateSimple(application.createdAt)}
                      </td>
                      <td className="px-1 py-1 sm:px-4 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-500 truncate">
                        {application.visitDate
                          ? formatDateSimple(application.visitDate)
                          : '-'}
                      </td>
                      <td className="px-1 py-1 sm:px-4 sm:py-3 text-xs sm:text-sm text-gray-500 truncate">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={application.intendToJoin === true}
                            readOnly
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-not-allowed"
                          />
                        </div>
                      </td>
                      <td className="px-1 py-1 sm:px-4 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-500 truncate">
                        {application.name || '-'}
                      </td>
                      <td className="px-1 py-1 sm:px-4 sm:py-3 whitespace-nowrap">
                        <span
                          className={`px-1 py-0.5 sm:px-1 sm:py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(application.status)}`}
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

      {/* 게스트 신규 신청 모달 */}
      {user && (
        <JoinClubModal
          user={user}
          isOpen={isModalOpen}
          onClose={onCloseModal}
          onSubmit={onSubmitGuestApplication}
          isGuestApplication={true}
          isSubmitting={isSubmitting}
          // initialValues={initialValues}
        />
      )}
    </>
  );
}

export default withAuth(GuestPage);
