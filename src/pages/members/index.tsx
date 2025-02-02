import { useEffect, useState } from 'react';
import { ClubResponse, User } from '@/types';
import { useRouter } from 'next/router';
import { Role, Status } from '@/types/enums';
import { withAuth } from '@/lib/withAuth';
import Image from 'next/image';
import { ClubMemberCard } from '@/components/members/ClubMemberCard';

interface ClubMemberWithUser extends User {
  ClubMember: {
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

function UsersPage(/* { user }: { user: User } */) {
  const router = useRouter();
  const [users, setUsers] = useState<ClubMemberWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userClubs, setUserClubs] = useState<ClubResponse[]>([]); // 타입 수정

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
      if (userClubs.length === 0) return;

      try {
        const clubIds = userClubs.map((club) => club.clubId).join(',');
        const response = await fetch(`/api/clubs/members?clubIds=${clubIds}`);
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
  }, [userClubs]);

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

      // 사용자 목록 업데이트
      setUsers(
        users.map((user) => {
          if (user.id === userId) {
            return {
              ...user,
              ClubMember: user.ClubMember.map((member) =>
                member.clubId === clubId
                  ? { ...member, status: Status.APPROVED }
                  : member
              ),
            };
          }
          return user;
        })
      );
    } catch (err) {
      console.error('승인 처리 중 오류가 발생했습니다', err);
      setError(
        err instanceof Error ? err.message : '승인 처리 중 오류가 발생했습니다'
      );
    }
  };

  const renderUserCard = (user: ClubMemberWithUser) => (
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
          {user.nickname || '이름 없음'}
        </h2>
      </div>
      <p className="text-gray-600 text-sm mb-2">{user.email}</p>
      {user.ClubMember.map((member) => (
        <ClubMemberCard
          key={`${user.id}-${member.clubId}`}
          member={member}
          userId={user.id}
          userClubs={userClubs}
          onApprove={handleApprove}
        />
      ))}
      <p className="text-gray-500 text-xs mt-2">
        가입일: {new Date(user.createdAt).toLocaleDateString('ko-KR')}
      </p>
    </div>
  );

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
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">클럽 멤버 관리</h1>
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
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {users.length > 0 ? (
          users.map(renderUserCard)
        ) : (
          <p className="col-span-full text-center text-gray-500">
            등록된 멤버가 없습니다.
          </p>
        )}
      </div>
    </div>
  );
}

export default withAuth(UsersPage);
