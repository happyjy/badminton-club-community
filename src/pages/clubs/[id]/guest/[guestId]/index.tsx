import { useEffect, useState, useCallback } from 'react';

import { useRouter } from 'next/router';

import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useSelector } from 'react-redux';

import { Button } from '@/components/atoms/buttons/Button';
import { StatusChip } from '@/components/atoms/StatusChip';
import PhoneNumberText from '@/components/molecules/form/PhoneNumberText';
import { InfoItem } from '@/components/molecules/InfoItem';
import { CommentInput } from '@/components/organisms/comment/CommentInput';
import { CommentItem } from '@/components/organisms/comment/CommentItem';
import { InfoSection } from '@/components/organisms/InfoSection';
import {
  GuestApplicationModal,
  GuestInquiryModal,
} from '@/components/organisms/modal/join';
import { PageHeader } from '@/components/organisms/PageHeader';
import { useConfirm } from '@/components/organisms/sheet/ConfirmProvider';

import { canViewGuestPost } from '@/lib/guestAccess';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/session';
import { formatDateSimple } from '@/lib/utils';
import { AuthProps, withAuth } from '@/lib/withAuth';
import { RootState } from '@/store';
import { getGuestPageStrategyByPostType } from '@/strategies/GuestPageStrategy';
import { ClubJoinFormData } from '@/types/club.types';
import { isVisitDatePassed } from '@/utils/date';

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: number;
    name: string;
  } | null;
  isDeleted: boolean;
}

interface GuestDetailPageProps extends AuthProps {
  guestPost: {
    id: string;
    name: string;
    birthDate: string;
    phoneNumber: string;
    postType: 'GUEST_REQUEST' | 'JOIN_INQUIRY_REQUEST';
    gender: string;
    localTournamentLevel: string;
    nationalTournamentLevel: string;
    lessonPeriod: string;
    playingPeriod: string;
    status: string;
    intendToJoin: boolean;
    visitDate: string;
    message: string;
    createdAt: string;
    userId: number;
    createdBy: number | null;
    author?: {
      name: string | null;
    } | null;
  };
}

// 게스트 신청 상세 페이지
function GuestDetailPage({ user, guestPost }: GuestDetailPageProps) {
  const router = useRouter();
  // router.query값, id, guestId는 폴더 이름으로 결정됩니다. (guestId는 게스트 신청 게시글의 id)
  const { id: clubId, guestId } = router.query;

  const clubMember = useSelector((state: RootState) => state.auth.clubMember); // 현재 사용자의 클럽 멤버 정보

  // 글의 종류에 따른 전략 적용.
  // 보는 사람(clubMember)이 아니라 글의 postType으로 골라야 한다.
  // 보는 사람 기준으로 고르면 관리자가 열 때 가입 문의 글도 게스트 신청으로 보인다.
  const strategy = getGuestPageStrategyByPostType(guestPost.postType);
  const isGuestRequest = guestPost.postType !== 'JOIN_INQUIRY_REQUEST';

  const isAdmin = clubMember?.role === 'ADMIN'; // 관리자 여부 확인
  const isMyPost = user?.id === guestPost.userId; // 본인 게시물인지 확인
  // 방문희망일이 지난(오늘 포함) 신청은 수정·삭제할 수 없음
  const isVisitDateOver = isVisitDatePassed(guestPost.visitDate);
  const isDeletable = !isVisitDateOver;
  const isEditable = !isVisitDateOver;

  const [comments, setComments] = useState<Comment[]>([]); // 댓글 목록
  const [isLoading, setIsLoading] = useState(false); // 댓글 목록 처음 불러오기 중인지 여부
  const [isCommenting, setIsCommenting] = useState(false); // 댓글 작성/수정/삭제 중인지 여부
  const [isUpdating, setIsUpdating] = useState(false); // 상태 업데이트 중인지 여부를 관리
  const [isEditModalOpen, setIsEditModalOpen] = useState(false); // 게스트 수정 모달 상태 관리
  const [isDeleting, setIsDeleting] = useState(false); // 삭제 중인지 여부를 관리
  const [status, setStatus] = useState(guestPost.status); // 게스트 상태를 로컬 상태로 관리하여 optimistic update 구현

  // # 검사 상세에 필요한 데이터 두가지
  // 1. 게스트 신청 상세 내용: 게스트 신청 상세 내용은 서버 사이드(getServerSideProps)에서 불러오기
  // 2. 게스트 신청 댓글 목록: 게스트 신청 댓글 목록은 클라이언트(axios) 사이드에서 불러오기

  // 댓글 목록 불러오기
  const fetchComments = useCallback(
    async (showLoading = true) => {
      if (!clubId || !guestId) return;

      if (showLoading) {
        setIsLoading(true);
      }

      try {
        const response = await axios.get(
          `/api/clubs/${clubId}/guests/${guestId}/comments`
        );
        setComments(response.data.comments);
      } catch (error) {
        console.error('댓글 목록 불러오기 실패:', error);
        if (showLoading) {
          toast.error('댓글을 불러오는데 실패했습니다');
        }
      } finally {
        if (showLoading) {
          setIsLoading(false);
        }
      }
    },
    [clubId, guestId]
  );
  useEffect(() => {
    if (!clubId || !guestId) return;
    fetchComments();
  }, [clubId, guestId, fetchComments]);

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

  // 게스트 신청 수정
  const onSubmitEditGuestApplication = async (formData: ClubJoinFormData) => {
    if (!clubId || !guestId) return;

    setIsUpdating(true);
    try {
      // API 연동 - 게스트 신청 수정 요청
      await axios.put(`/api/clubs/${clubId}/guests/${guestId}`, {
        ...formData,
      });

      toast.success('게스트 신청이 수정되었습니다');
      // 수정 모달 닫기
      setIsEditModalOpen(false);
      // 페이지 새로고침하여 최신 데이터로 업데이트
      router.reload();
    } catch (error: unknown) {
      toast.error('게스트 신청 수정 중 오류가 발생했습니다');
      console.error('게스트 신청 수정 중 오류 발생:', error);
    } finally {
      setIsUpdating(false);
    }
  };
  // 게스트 신청 삭제
  const confirm = useConfirm();
  const onClickDeleteGuest = async () => {
    if (!clubId || !guestId || isDeleting) return;

    // 확인 메시지
    if (
      !(await confirm({
        title: '정말로 이 게스트 신청을 삭제하시겠습니까?',
        message: '이 작업은 되돌릴 수 없습니다.',
        confirmLabel: '삭제',
        destructive: true,
      }))
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      await axios.delete(`/api/clubs/${clubId}/guests/${guestId}`);
      toast.success('게스트 신청이 삭제되었습니다');
      // 목록 페이지로 이동
      router.push(`/clubs/${clubId}/guest`);
    } catch (error) {
      console.error('게스트 신청 삭제 실패:', error);
      toast.error('게스트 신청 삭제에 실패했습니다');
      setIsDeleting(false);
    }
  };

  // 댓글 작성
  const handleCommentSubmit = async (content: string) => {
    if (!clubId || !guestId) return;

    setIsCommenting(true);
    try {
      const requestData: {
        content: string;
        userId?: number;
        clubMemberId?: number;
      } = {
        content,
      };

      // 사용자 유형에 따라 적절한 ID 설정
      if (user?.id) {
        requestData.userId = user.id;
      } else if (clubMember?.id) {
        requestData.clubMemberId = clubMember.id;
      }

      const response = await axios.post(
        `/api/clubs/${clubId}/guests/${guestId}/comments`,
        requestData
      );
      // 서버로부터 받은 새 댓글을 기존 댓글 배열에 추가 (낙관적 업데이트)
      const newComment = response.data.comment;
      setComments((prevComments) => [...prevComments, newComment]);
      toast.success('댓글이 작성되었습니다');

      // 백그라운드에서 모든 댓글 동기화 (다른 사용자의 댓글도 가져옴)
      setTimeout(() => fetchComments(false), 500);
    } catch (error) {
      console.error('댓글 작성 실패:', error);
      toast.error('댓글 작성에 실패했습니다');
    } finally {
      setIsCommenting(false);
    }
  };
  // 댓글 수정
  const handleCommentUpdate = async (commentId: string, content: string) => {
    if (!clubId || !guestId) return;

    setIsCommenting(true);
    try {
      const requestData: {
        content: string;
        userId?: number;
        clubMemberId?: number;
      } = {
        content,
      };

      // 사용자 유형에 따라 적절한 ID 설정
      if (user?.id) {
        requestData.userId = user.id;
      } else if (clubMember?.id) {
        requestData.clubMemberId = clubMember.id;
      }

      const response = await axios.put(
        `/api/clubs/${clubId}/guests/${guestId}/comments/${commentId}`,
        requestData
      );
      // 로컬에서 댓글 업데이트 (낙관적 업데이트)
      const updatedComment = response.data.comment;
      setComments((prevComments) =>
        prevComments.map((comment) =>
          comment.id === commentId ? updatedComment : comment
        )
      );
      toast.success('댓글이 수정되었습니다');

      // 백그라운드에서 모든 댓글 동기화
      setTimeout(() => fetchComments(false), 500);
    } catch (error) {
      console.error('댓글 수정 실패:', error);
      toast.error('댓글 수정에 실패했습니다');
    } finally {
      setIsCommenting(false);
    }
  };
  // 댓글 삭제 (soft delete)
  const handleCommentDelete = async (commentId: string) => {
    if (!clubId || !guestId) return;

    setIsCommenting(true);
    try {
      await axios.delete(
        `/api/clubs/${clubId}/guests/${guestId}/comments/${commentId}`
      );
      // 로컬에서 댓글 삭제 상태로 표시 (낙관적 업데이트)
      setComments((prevComments) =>
        prevComments.map((comment) =>
          comment.id === commentId ? { ...comment, isDeleted: true } : comment
        )
      );
      toast.success('댓글이 삭제되었습니다');

      // 백그라운드에서 모든 댓글 동기화
      setTimeout(() => fetchComments(false), 500);
    } catch (error) {
      console.error('댓글 삭제 실패:', error);
      toast.error('댓글 삭제에 실패했습니다');
    } finally {
      setIsCommenting(false);
    }
  };

  // 수정 모달 열기
  const onClickOpenEditModal = () => {
    setIsEditModalOpen(true);
  };
  // 수정 모달 닫기
  const onCloseEditModal = () => {
    setIsEditModalOpen(false);
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

  const hasActions = isAdmin || (isMyPost && isEditable);

  return (
    <div>
      <PageHeader
        title={strategy.getDetailPageTitle()}
        backHref={`/clubs/${clubId}/guest`}
        action={
          // 모르는 상태값은 지금까지처럼 검토중(주의)으로 보여 준다.
          <StatusChip
            tone={
              status === 'APPROVED'
                ? 'positive'
                : status === 'REJECTED'
                  ? 'negative'
                  : 'warning'
            }
          >
            {getStatusText(status)}
          </StatusChip>
        }
      />

      <div className="space-y-6">
        {hasActions && (
          <div className="flex flex-wrap gap-2">
            {isAdmin && (
              <>
                <Button
                  type="button"
                  className="flex-1"
                  onClick={handleApprove}
                  pending={isUpdating}
                >
                  승인
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={handleReject}
                  pending={isUpdating}
                >
                  거절
                </Button>
                {isDeletable && (
                  <Button
                    type="button"
                    variant="destructive"
                    className="flex-1"
                    onClick={onClickDeleteGuest}
                    pending={isDeleting}
                    disabled={isUpdating}
                  >
                    삭제
                  </Button>
                )}
              </>
            )}
            {isMyPost && isEditable && (
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={onClickOpenEditModal}
                disabled={isUpdating || isDeleting}
              >
                수정
              </Button>
            )}
          </div>
        )}

        {/* 작성자 */}
        <InfoSection title="작성자">
          <InfoItem label="이름">{guestPost.author?.name || '미지정'}</InfoItem>
        </InfoSection>

        {/* 기본 정보 섹션 */}
        <InfoSection title="기본 정보">
          <InfoItem label="이름">{guestPost.name}</InfoItem>
          <InfoItem label="생년월일">
            {formatDateSimple(guestPost.birthDate)}
          </InfoItem>
          <InfoItem label="성별">{guestPost.gender}</InfoItem>
          <InfoItem label={strategy.getPhoneLabel()}>
            <PhoneNumberText value={guestPost.phoneNumber} />
          </InfoItem>
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
            {guestPost.intendToJoin ? (
              <StatusChip tone="positive">있음</StatusChip>
            ) : (
              '없음'
            )}
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
        <InfoSection title={strategy.getDetailPageMessageTitle()} fullWidth>
          <p className="whitespace-pre-wrap break-words text-body text-primary">
            {guestPost.message || '작성된 메시지가 없습니다.'}
          </p>
        </InfoSection>

        {/* 댓글 섹션 */}
        <InfoSection title="댓글" fullWidth>
          <div className="space-y-4">
            {/* 댓글 목록 영역 */}
            {isLoading ? (
              <p className="text-callout text-secondary">
                댓글을 불러오는 중...
              </p>
            ) : (
              <div className="space-y-2">
                {comments
                  .filter((comment) => !comment.isDeleted && comment.author)
                  .sort(
                    (a, b) =>
                      new Date(a.createdAt).getTime() -
                      new Date(b.createdAt).getTime()
                  )
                  .map((comment) => (
                    <CommentItem
                      key={comment.id}
                      id={comment.id}
                      content={comment.content}
                      author={comment.author}
                      createdAt={comment.createdAt}
                      isEditable={user?.id === comment.author?.id}
                      onUpdate={handleCommentUpdate}
                      onDelete={handleCommentDelete}
                    />
                  ))}
              </div>
            )}
            {/* 댓글 입력 영역 */}
            <CommentInput
              onSubmit={handleCommentSubmit}
              isSubmitting={isCommenting}
            />
          </div>
        </InfoSection>
      </div>

      {/* 수정 모달 - 글의 종류에 따라 다른 모달 사용.
          비회원으로 가입 문의한 뒤 회원이 된 경우, 보는 사람 기준으로 고르면
          가입 문의 글에 게스트 신청 폼이 뜬다. */}
      {user && isMyPost && isGuestRequest && (
        <GuestApplicationModal
          user={user}
          clubId={clubId as string}
          isOpen={isEditModalOpen}
          onClose={onCloseEditModal}
          onSubmit={onSubmitEditGuestApplication}
          isSubmitting={isUpdating}
          initialValues={{
            name: guestPost.name,
            birthDate: guestPost.birthDate,
            phoneNumber: guestPost.phoneNumber,
            gender: guestPost.gender,
            localTournamentLevel: guestPost.localTournamentLevel,
            nationalTournamentLevel: guestPost.nationalTournamentLevel,
            lessonPeriod: guestPost.lessonPeriod,
            playingPeriod: guestPost.playingPeriod,
            intendToJoin: guestPost.intendToJoin,
            visitDate: guestPost.visitDate,
            message: guestPost.message,
          }}
        />
      )}
      {user && isMyPost && !isGuestRequest && (
        <GuestInquiryModal
          user={user}
          clubId={clubId as string}
          isOpen={isEditModalOpen}
          onClose={onCloseEditModal}
          onSubmit={onSubmitEditGuestApplication}
          isSubmitting={isUpdating}
          initialValues={{
            name: guestPost.name,
            birthDate: guestPost.birthDate,
            phoneNumber: guestPost.phoneNumber,
            gender: guestPost.gender,
            localTournamentLevel: guestPost.localTournamentLevel,
            nationalTournamentLevel: guestPost.nationalTournamentLevel,
            lessonPeriod: guestPost.lessonPeriod,
            playingPeriod: guestPost.playingPeriod,
            intendToJoin: guestPost.intendToJoin,
            visitDate: guestPost.visitDate,
            message: guestPost.message,
          }}
        />
      )}
    </div>
  );
}

type GuestDetailGateProps = Omit<GuestDetailPageProps, 'guestPost'> & {
  guestPost: GuestDetailPageProps['guestPost'] | null;
};

// 로그인하지 않은 요청에는 서버가 신청서를 내려주지 않는다.
// 그 사이 화면은 비워 두고, 로그인 이동은 withAuth가 맡는다.
function GuestDetailGate({ guestPost, ...rest }: GuestDetailGateProps) {
  if (!guestPost) return null;
  return <GuestDetailPage {...rest} guestPost={guestPost} />;
}

export default withAuth(GuestDetailGate);

export const getServerSideProps = async (context: any) => {
  const { id: clubId, guestId } = context.params;

  // 신청서에는 전화번호·생년월일이 있어 HTML에 실리기 전에 볼 권한을 확인한다.
  const authUser = await getAuthUser(context.req);
  if (!authUser) {
    return { props: { guestPost: null } };
  }

  try {
    const guestPost = await prisma.guestPost.findUnique({
      where: { id: guestId },
      select: {
        id: true,
        clubId: true,
        name: true,
        birthDate: true,
        phoneNumber: true,
        // 상세 화면 문구를 글의 종류로 가르기 위해 필요하다.
        postType: true,
        gender: true,
        localTournamentLevel: true,
        nationalTournamentLevel: true,
        lessonPeriod: true,
        playingPeriod: true,
        status: true,
        intendToJoin: true,
        visitDate: true,
        message: true,
        createdAt: true,
        userId: true,
        createdBy: true,
        clubMember: {
          select: { name: true },
        },
      },
    });
    // 다른 클럽 신청서이거나 작성자·임원이 아니면 있는지조차 알리지 않는다.
    if (
      !guestPost ||
      guestPost.clubId !== Number(clubId) ||
      !(await canViewGuestPost(authUser.id, guestPost))
    ) {
      return {
        notFound: true,
      };
    }

    return {
      props: {
        guestPost: JSON.parse(
          JSON.stringify({
            ...guestPost,
            author: guestPost.clubMember,
          })
        ),
      },
    };
  } catch (error) {
    console.error('Error fetching guest post:', error);
    return {
      notFound: true,
    };
  }
};
