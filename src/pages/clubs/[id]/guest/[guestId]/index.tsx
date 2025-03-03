import { useRouter } from 'next/router';
import { withAuth } from '@/lib/withAuth';
import { AuthProps } from '@/lib/withAuth';
import { GuestPost } from '@prisma/client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { PrismaClient } from '@prisma/client';
import InfoSection from '@/components/organisms/InfoSection';
import InfoItem from '@/components/molecules/InfoItem';

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
          <InfoSection title="기본 정보">
            <InfoItem label="이름">{guestPost.name}</InfoItem>
            <InfoItem label="생년월일">
              {formatDate(guestPost.birthDate)}
            </InfoItem>
            <InfoItem label="전화번호">{guestPost.phoneNumber}</InfoItem>
            <InfoItem label="신청일">
              {formatDate(guestPost.createdAt)}
            </InfoItem>
          </InfoSection>

          {/* 방문 정보 섹션 */}
          <InfoSection title="방문 정보">
            <InfoItem label="방문희망일">
              {formatDate(guestPost.visitDate)}
            </InfoItem>
            <InfoItem label="클럽 가입 의향">
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
            </InfoItem>
            <InfoItem label="처리 상태">
              <span
                className={`px-2 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${getStatusBadgeColor(guestPost.status)}`}
              >
                {getStatusText(guestPost.status)}
              </span>
            </InfoItem>
          </InfoSection>

          {/* 배드민턴 경력 섹션 */}
          <InfoSection title="배드민턴 경력">
            <InfoItem label="구대회 신청 가능 급수">
              {guestPost.localTournamentLevel}
            </InfoItem>
            <InfoItem label="전국대회 신청 가능 급수">
              {guestPost.nationalTournamentLevel}
            </InfoItem>
            <InfoItem label="레슨 받은 기간">{guestPost.lessonPeriod}</InfoItem>
            <InfoItem label="구력">{guestPost.playingPeriod}</InfoItem>
          </InfoSection>

          {/* 신청 메시지 섹션 */}
          <InfoSection title="신청 메시지" fullWidth>
            <div className="bg-white p-3 rounded-md">
              <p className="text-gray-700 whitespace-pre-wrap">
                {guestPost.message || '작성된 메시지가 없습니다.'}
              </p>
            </div>
          </InfoSection>

          {/* 댓글 섹션 */}
          <InfoSection title="댓글" fullWidth>
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
          </InfoSection>
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
