import { useRouter } from 'next/router';
import { withAuth } from '@/lib/withAuth';
import { AuthProps } from '@/lib/withAuth';
import { GuestPost } from '@prisma/client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { PrismaClient } from '@prisma/client';

interface GuestDetailPageProps extends AuthProps {
  guestPost: GuestPost;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    name: string;
  };
}

function GuestDetailPage({ guestPost }: GuestDetailPageProps) {
  console.log(`🚨 ~ GuestDetailPage ~ guestPost:`, guestPost);
  const router = useRouter();
  // router.query값, id, guestId는 폴더 이름으로 결정됩니다. (guestId는 게스트 신청 게시글의 id)
  const { id: clubId, guestId } = router.query;
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 댓글 목록 불러오기
  const fetchComments = async () => {
    if (!clubId || !guestId) return;

    setIsLoading(true);
    try {
      const response = await axios.get(
        `/api/clubs/${clubId}/guests/${guestId}/comments`
      );
      setComments(response.data.comments);
    } catch (error) {
      console.error('댓글 목록 불러오기 실패:', error);
      toast.error('댓글을 불러오는데 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!clubId || !guestId) return;

    // fetchComments();
  }, [clubId, guestId]);

  // 상태에 따른 배지 색상
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

  // 상태 텍스트
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
    <div className="bg-white rounded-lg shadow p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold mb-4 pb-2 border-b-2 border-gray-200">
          게스트 신청 상세
        </h1>
        <div className="space-y-4">
          {/* 기본 정보 섹션 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex flex-col sm:flex-row">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 border-l-4 border-blue-500 pl-3 mb-3 sm:mb-0 sm:w-36">
                기본 정보
              </h2>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded-md">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">이름</p>
                    <p className="font-medium">{guestPost.name}</p>
                  </div>
                </div>
                <div className="bg-white p-3 rounded-md">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">생년월일</p>
                    <p className="font-medium">
                      {formatDate(guestPost.birthDate)}
                    </p>
                  </div>
                </div>
                <div className="bg-white p-3 rounded-md">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">전화번호</p>
                    <p className="font-medium">{guestPost.phoneNumber}</p>
                  </div>
                </div>
                <div className="bg-white p-3 rounded-md">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">신청일</p>
                    <p className="font-medium">
                      {formatDate(guestPost.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 방문 정보 섹션 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex flex-col sm:flex-row">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 border-l-4 border-blue-500 pl-3 mb-3 sm:mb-0 sm:w-36">
                방문 정보
              </h2>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded-md">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">방문희망일</p>
                    <p className="font-medium">
                      {formatDate(guestPost.visitDate)}
                    </p>
                  </div>
                </div>
                <div className="bg-white p-3 rounded-md">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">클럽 가입 의향</p>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={guestPost.intendToJoin}
                        readOnly
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-not-allowed"
                      />
                      <span className="ml-2">
                        {guestPost.intendToJoin ? '있음' : '없음'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-3 rounded-md">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">처리 상태</p>
                    <span
                      className={`px-2 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${getStatusBadgeColor(guestPost.status)}`}
                    >
                      {getStatusText(guestPost.status)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 배드민턴 경력 섹션 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex flex-col sm:flex-row">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 border-l-4 border-blue-500 pl-3 mb-3 sm:mb-0 sm:w-36">
                배드민턴 경력
              </h2>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded-md">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      구대회 신청 가능 급수
                    </p>
                    <p className="font-medium">
                      {guestPost.localTournamentLevel}
                    </p>
                  </div>
                </div>
                <div className="bg-white p-3 rounded-md">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      전국대회 신청 가능 급수
                    </p>
                    <p className="font-medium">
                      {guestPost.nationalTournamentLevel}
                    </p>
                  </div>
                </div>
                <div className="bg-white p-3 rounded-md">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">레슨 받은 기간</p>
                    <p className="font-medium">{guestPost.lessonPeriod}</p>
                  </div>
                </div>
                <div className="bg-white p-3 rounded-md">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">구력</p>
                    <p className="font-medium">{guestPost.playingPeriod}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 신청 메시지 섹션 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex flex-col sm:flex-row">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 border-l-4 border-blue-500 pl-3 mb-3 sm:mb-0 sm:w-36">
                신청 메시지
              </h2>
              <div className="flex-1">
                <div className="bg-white p-3 rounded-md">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {guestPost.message || '작성된 메시지가 없습니다.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 댓글 섹션 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex flex-col sm:flex-row">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 border-l-4 border-blue-500 pl-3 mb-3 sm:mb-0 sm:w-36">
                댓글
              </h2>
              <div className="flex-1">
                {isLoading ? (
                  <p className="text-gray-500">댓글을 불러오는 중...</p>
                ) : comments.length > 0 ? (
                  <div className="space-y-3">
                    {comments.map((comment) => (
                      <div key={comment.id} className="bg-white p-3 rounded-md">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                          <p className="font-medium">{comment.author.name}</p>
                          <p className="text-sm text-gray-500 mt-1 sm:mt-0">
                            {formatDate(comment.createdAt)}
                          </p>
                        </div>
                        <p className="mt-2 text-gray-700">{comment.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">아직 댓글이 없습니다.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default withAuth(GuestDetailPage);

export const getServerSideProps = async (context: any) => {
  const { guestId } = context.params;

  try {
    const prisma = new PrismaClient();
    const guestPost = await prisma.guestPost.findUnique({
      where: {
        id: guestId,
      },
    });
    if (!guestPost) {
      return {
        notFound: true,
      };
    }

    return {
      props: {
        guestPost: JSON.parse(JSON.stringify(guestPost)),
      },
    };
  } catch (error) {
    console.error('Error fetching guest post:', error);
    return {
      notFound: true,
    };
  }
};
