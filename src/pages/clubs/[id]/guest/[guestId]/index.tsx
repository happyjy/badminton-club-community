import { useEffect, useState } from 'react';

import { useRouter } from 'next/router';

import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { toast } from 'react-hot-toast';

import InfoItem from '@/components/molecules/InfoItem';
import CommentInput from '@/components/organisms/comment/CommentInput';
import CommentItem from '@/components/organisms/comment/CommentItem';
import InfoSection from '@/components/organisms/InfoSection';
import { formatDateSimple } from '@/lib/utils';
import { AuthProps, withAuth } from '@/lib/withAuth';

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: number;
    name: string;
  };
  isDeleted: boolean;
}

interface GuestDetailPageProps extends AuthProps {
  guestPost: {
    id: string;
    name: string;
    birthDate: string;
    phoneNumber: string;
    localTournamentLevel: string;
    nationalTournamentLevel: string;
    lessonPeriod: string;
    playingPeriod: string;
    status: string;
    intendToJoin: boolean;
    visitDate: string;
    message: string;
    createdAt: string;
  };
}

function GuestDetailPage({ user, guestPost }: GuestDetailPageProps) {
  const router = useRouter();
  // router.query값, id, guestId는 폴더 이름으로 결정됩니다. (guestId는 게스트 신청 게시글의 id)
  const { id: clubId, guestId } = router.query;
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  // 게스트 상태를 로컬 상태로 관리하여 optimistic update 구현
  const [status, setStatus] = useState(guestPost.status);
  // 상태 업데이트 중인지 여부를 관리
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!clubId || !guestId) return;
    fetchComments();
  }, [clubId, guestId]);

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

  // 게스트 상태 변경 함수 (승인)
  const handleApprove = async () => {
    if (!clubId || !guestId || isUpdating) return;

    // Optimistic 업데이트
    const previousStatus = status;
    setStatus('APPROVED');
    setIsUpdating(true);

    try {
      await axios.put(`/api/clubs/${clubId}/guests/${guestId}/status`, {
        status: 'APPROVED',
      });
      toast.success('게스트 신청이 승인되었습니다');
    } catch (error) {
      // 에러 발생 시 이전 상태로 복원
      setStatus(previousStatus);
      console.error('승인 처리 실패:', error);
      toast.error('승인 처리 중 오류가 발생했습니다');
    } finally {
      setIsUpdating(false);
    }
  };

  // 게스트 상태 변경 함수 (거절)
  const handleReject = async () => {
    if (!clubId || !guestId || isUpdating) return;

    // Optimistic 업데이트
    const previousStatus = status;
    setStatus('REJECTED');
    setIsUpdating(true);

    try {
      await axios.put(`/api/clubs/${clubId}/guests/${guestId}/status`, {
        status: 'REJECTED',
      });
      toast.success('게스트 신청이 거절되었습니다');
    } catch (error) {
      // 에러 발생 시 이전 상태로 복원
      setStatus(previousStatus);
      console.error('거절 처리 실패:', error);
      toast.error('거절 처리 중 오류가 발생했습니다');
    } finally {
      setIsUpdating(false);
    }
  };

  // 댓글 작성
  const handleCommentSubmit = async (content: string) => {
    if (!clubId || !guestId) return;

    try {
      await axios.post(`/api/clubs/${clubId}/guests/${guestId}/comments`, {
        content,
      });
      toast.success('댓글이 작성되었습니다');
      fetchComments();
    } catch (error) {
      console.error('댓글 작성 실패:', error);
      toast.error('댓글 작성에 실패했습니다');
    }
  };

  // 댓글 수정
  const handleCommentUpdate = async (commentId: string, content: string) => {
    if (!clubId || !guestId) return;

    try {
      await axios.put(
        `/api/clubs/${clubId}/guests/${guestId}/comments/${commentId}`,
        {
          content,
        }
      );
      toast.success('댓글이 수정되었습니다');
      fetchComments();
    } catch (error) {
      console.error('댓글 수정 실패:', error);
      toast.error('댓글 수정에 실패했습니다');
    }
  };

  // 댓글 삭제 (soft delete)
  const handleCommentDelete = async (commentId: string) => {
    if (!clubId || !guestId) return;

    try {
      await axios.delete(
        `/api/clubs/${clubId}/guests/${guestId}/comments/${commentId}`
      );
      toast.success('댓글이 삭제되었습니다');
      fetchComments();
    } catch (error) {
      console.error('댓글 삭제 실패:', error);
      toast.error('댓글 삭제에 실패했습니다');
    }
  };

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

  return (
    <div className="bg-white rounded-lg shadow p-4 sm:p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4 pb-2 border-b-2 border-gray-200">
          <h1 className="text-xl sm:text-2xl font-bold">게스트 신청 상세</h1>
          {
            <div className="space-x-2">
              <button
                onClick={handleApprove}
                disabled={isUpdating}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {isUpdating ? '처리중...' : '승인'}
              </button>
              <button
                onClick={handleReject}
                disabled={isUpdating}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {isUpdating ? '처리중...' : '거절'}
              </button>
            </div>
          }
        </div>
        <div className="space-y-4">
          {/* 기본 정보 섹션 */}
          <InfoSection title="기본 정보">
            <InfoItem label="이름">{guestPost.name}</InfoItem>
            <InfoItem label="생년월일">
              {formatDateSimple(guestPost.birthDate)}
            </InfoItem>
            <InfoItem label="전화번호">{guestPost.phoneNumber}</InfoItem>
            <InfoItem label="신청일">
              {formatDateSimple(guestPost.createdAt)}
            </InfoItem>
          </InfoSection>

          {/* 방문 정보 섹션 */}
          <InfoSection title="방문 정보">
            <InfoItem label="방문희망일">
              {formatDateSimple(guestPost.visitDate)}
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
                className={`px-2 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${getStatusBadgeColor(status)}`}
              >
                {getStatusText(status)}
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
            <div className="space-y-4">
              {isLoading ? (
                <p className="text-gray-500">댓글을 불러오는 중...</p>
              ) : (
                <div className="space-y-3">
                  {comments
                    .filter((comment) => !comment.isDeleted)
                    .sort(
                      (a, b) =>
                        new Date(b.createdAt).getTime() -
                        new Date(a.createdAt).getTime()
                    )
                    .map((comment) => (
                      <CommentItem
                        key={comment.id}
                        id={comment.id}
                        content={comment.content}
                        author={comment.author}
                        createdAt={comment.createdAt}
                        isEditable={user?.id === comment.author.id}
                        onUpdate={handleCommentUpdate}
                        onDelete={handleCommentDelete}
                      />
                    ))}
                </div>
              )}
              <CommentInput onSubmit={handleCommentSubmit} />{' '}
            </div>
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
