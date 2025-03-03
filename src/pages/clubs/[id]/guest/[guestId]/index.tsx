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
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">게스트 신청 상세</h1>
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-2">신청 정보</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600">신청일</p>
                <p className="font-medium">{formatDate(guestPost.createdAt)}</p>
              </div>
              <div>
                <p className="text-gray-600">방문희망일</p>
                <p className="font-medium">{guestPost.visitDate || '-'}</p>
              </div>
              <div>
                <p className="text-gray-600">가입의향</p>
                <div className="flex items-center mt-1">
                  <input
                    type="checkbox"
                    checked={guestPost.intendToJoin === true}
                    readOnly
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-not-allowed"
                  />
                </div>
              </div>
              <div>
                <p className="text-gray-600">상태</p>
                <span
                  className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(guestPost.status)}`}
                >
                  {getStatusText(guestPost.status)}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">신청 내용</h2>
            <p className="text-gray-700 whitespace-pre-wrap">
              {guestPost.purpose || '작성된 내용이 없습니다.'}
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">댓글</h2>
            {isLoading ? (
              <p className="text-gray-500">댓글을 불러오는 중...</p>
            ) : comments.length > 0 ? (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-start">
                      <p className="font-medium">{comment.author.name}</p>
                      <p className="text-sm text-gray-500">
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
