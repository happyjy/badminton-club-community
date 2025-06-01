import { useEffect, useState } from 'react';

import Image from 'next/image';
import { useRouter } from 'next/router';

import { ClubMemberCard } from '@/components/organisms/club/ClubMemberCard';
import {
  ParticipantSortProvider,
  useParticipantSortContext,
} from '@/contexts/ParticipantSortContext';
import { withAuth } from '@/lib/withAuth';
import { ClubResponse, User } from '@/types';
import { Role, Status } from '@/types/enums';
import { SortOption } from '@/types/participantSort';
import { checkClubAdminPermission } from '@/utils/permissions';

interface ClubMemberWithUser extends User {
  clubMember: {
    status: string;
    role: string;
    clubId: number;
    birthDate?: string;
    localTournamentLevel?: string;
    nationalTournamentLevel?: string;
    playingPeriod?: number;
    lessonPeriod?: number;
  }[];
}

interface UsersPageContentProps {
  userClubs: ClubResponse[];
}

function UsersPageContent({ userClubs }: UsersPageContentProps) {
  const { sortOption, participants, onChangeSort } =
    useParticipantSortContext();

  const handleApprove = async (userId: number, clubId: number) => {
    try {
      const response = await fetch(
        `/api/clubs/${clubId}/members/${userId}/approve`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('승인 처리에 실패했습니다');
      }

      // 승인된 사용자의 상태를 업데이트
      const updatedParticipants = participants.map((user) => {
        if (user.id === userId) {
          return {
            ...user,
            clubMember: user.clubMember.map((member) =>
              member.clubId === clubId
                ? { ...member, status: Status.APPROVED }
                : member
            ),
          };
        }
        return user;
      });

      // 정렬 옵션을 다시 적용하여 목록 업데이트
      onChangeSort(sortOption, updatedParticipants);
    } catch (err) {
      console.error('승인 처리 중 오류가 발생했습니다', err);
      throw err;
    }
  };

  const renderUserCard = (user: ClubMemberWithUser) => {
    return (
      <div
        key={user.id}
        className="p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow"
      >
        <div className="flex items-center gap-3 mb-2">
          {user.thumbnailImageUrl && (
            <Image
              src={user.thumbnailImageUrl}
              alt={user.nickname}
              className="w-10 h-10 rounded-full"
              width={40}
              height={40}
            />
          )}
          <h2 className="font-semibold text-lg">
            {user.clubMember.name || '이름 없음'}
          </h2>
        </div>
        <p className="text-gray-600 text-sm mb-2">{user.email}</p>
        <ClubMemberCard
          key={user.id}
          member={user.clubMember}
          userId={user.id}
          userClubs={userClubs}
          onApprove={handleApprove}
        />
        <p className="text-gray-500 text-xs mt-2">
          가입일: {new Date(user.createdAt).toLocaleDateString('ko-KR')}
        </p>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">클럽 멤버 관리</h1>
      <div className="flex items-center justify-between mb-6">
        <div className="flex mb-2">
          <h2 className="text-lg font-semibold mr-2">관리중인 클럽:</h2>
          <div className="flex flex-wrap gap-2">
            {userClubs.map((club) => (
              <span
                key={club.clubId}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
              >
                {club.club?.name || `클럽 ${club.clubId}`}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-gray-600">
            총 회원 수:{' '}
            <span className="font-semibold text-gray-900">
              {participants.length}명
            </span>
          </div>
          <div className="relative">
            <select
              value={sortOption}
              onChange={(e) => onChangeSort(e.target.value as SortOption)}
              className="appearance-none bg-white border border-gray-300 rounded-md pl-3 pr-8 py-1.5 text-sm text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
            >
              <option value="name">이름순</option>
              <option value="localLevel">지역대회 급수</option>
              <option value="nationalLevel">전국대회 급수</option>
              <option value="birthDate">생년월일</option>
              <option value="createdAt">가입순서</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <svg
                className="w-4 h-4 fill-current"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {participants.length > 0 ? (
          participants.map(renderUserCard)
        ) : (
          <p className="col-span-full text-center text-gray-500">
            등록된 멤버가 없습니다.
          </p>
        )}
      </div>
    </div>
  );
}

function UsersPage() {
  const router = useRouter();
  const { id: clubId } = router.query;
  const [users, setUsers] = useState<ClubMemberWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userClubs, setUserClubs] = useState<ClubResponse[]>([]);

  // 사용자가 admin권한을 가졌는지 확인
  useEffect(() => {
    const fetchUserClubs = async () => {
      try {
        const response = await fetch('/api/users/me/clubs');
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);

        const clubs = result.data.clubs;
        const adminClubs = clubs.filter(
          (club: { role: string }) => club.role === Role.ADMIN
        );
        setUserClubs(adminClubs);

        // ADMIN 권한이 없는 경우
        if (adminClubs.length === 0) {
          router.push('/');
          return;
        }
      } catch (err) {
        console.error('클럽 정보를 불러오는데 실패했습니다', err);
        setError('클럽 정보를 불러오는데 실패했습니다');
      }
    };

    fetchUserClubs();
  }, [router]);

  // 로그인 사용자가 속한 유저 조회
  useEffect(() => {
    const fetchUsers = async () => {
      if (!clubId) return;

      try {
        const response = await fetch(`/api/clubs/members?clubId=${clubId}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);

        setUsers(result.data.users);
      } catch (err) {
        console.error('사용자 데이터를 불러오는데 실패했습니다', err);
        setError(
          err instanceof Error
            ? err.message
            : '사용자 데이터를 불러오는데 실패했습니다'
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [clubId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-500 bg-red-50 p-4 rounded-lg">{error}</div>
      </div>
    );
  }

  return (
    <ParticipantSortProvider
      initialParticipants={users}
      initialSortOption="name"
    >
      <UsersPageContent userClubs={userClubs} />
    </ParticipantSortProvider>
  );
}

export default withAuth(UsersPage, {
  requireAuth: true,
  checkPermission: checkClubAdminPermission,
});
