import { useEffect, useState } from 'react';

import { useRouter } from 'next/router';

import { Skeleton } from '@/components/atoms/Skeleton';
import { StatusFilter } from '@/components/molecules/StatusFilter';
import { MembersView } from '@/components/organisms/club/MembersView';
import { PageHeader } from '@/components/organisms/PageHeader';

import { useMemberActions } from '@/hooks/useMemberActions';

import {
  ParticipantSortProvider,
  useParticipantSortContext,
} from '@/contexts/ParticipantSortContext';
import {
  StatusFilterProvider,
  useStatusFilter,
} from '@/contexts/StatusFilterContext';
import { withAuth } from '@/lib/withAuth';
import { User } from '@/types';
import { Role, Status } from '@/types/enums';
import { checkClubAdminPermission } from '@/utils/permissions';

export interface ClubMemberWithUser extends User {
  clubMember: {
    id: number;
    name: string;
    status: string;
    role: string;
    clubId: number;
    birthDate?: string;
    gender?: string;
    localTournamentLevel?: string;
    nationalTournamentLevel?: string;
    playingPeriod?: number;
    lessonPeriod?: number;
    phoneNumber?: string;
    /** 해당 클럽에 가입한 시점 (User 계정 생성일과 다름) */
    createdAt: string;
    helperStatuses: any[]; // HelperStatus 타입이 필요하다면 import 해서 사용
  };
}

function UsersPageContent() {
  const { sortOption, participants, onChangeSort } =
    useParticipantSortContext();
  const { statusFilters } = useStatusFilter();
  const [search, setSearch] = useState('');
  const keyword = search.trim().toLowerCase();

  // 필터링된 참가자 목록 계산
  const filteredParticipants = participants.filter((user) => {
    const userStatus = (user as ClubMemberWithUser).clubMember.status as Status;

    // 포함 필터가 있고 해당 상태가 포함되지 않은 경우 제외
    if (
      statusFilters.included.length > 0 &&
      !statusFilters.included.includes(userStatus)
    ) {
      return false;
    }

    // 제외 필터에 해당 상태가 있는 경우 제외
    if (statusFilters.excluded.includes(userStatus)) {
      return false;
    }

    // 이름 검색
    if (
      keyword &&
      !((user as ClubMemberWithUser).clubMember.name || '')
        .toLowerCase()
        .includes(keyword)
    ) {
      return false;
    }

    return true;
  });

  const { approve, changeStatus, approvingUserId } = useMemberActions({
    participants: participants as ClubMemberWithUser[],
    // 정렬 옵션을 다시 적용하여 목록을 바꾼다.
    applyParticipants: (next) => onChangeSort(sortOption, next),
  });

  const isFiltered =
    keyword.length > 0 ||
    statusFilters.included.length > 0 ||
    statusFilters.excluded.length > 0;

  return (
    <>
      <PageHeader title="클럽 멤버 관리" />
      <MembersView
        members={filteredParticipants as ClubMemberWithUser[]}
        totalCount={participants.length}
        isFiltered={isFiltered}
        search={search}
        onChangeSearch={setSearch}
        sortOption={sortOption}
        onChangeSort={onChangeSort}
        filter={<StatusFilter />}
        allMembers={participants as ClubMemberWithUser[]}
        onApprove={approve}
        onStatusChange={changeStatus}
        approvingUserId={approvingUserId}
      />
    </>
  );
}

function UsersPage() {
  const router = useRouter();
  const { id: clubId } = router.query;
  const [users, setUsers] = useState<ClubMemberWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      <>
        <PageHeader title="클럽 멤버 관리" />
        <div aria-busy="true" className="space-y-2">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="클럽 멤버 관리" />
        <p
          role="alert"
          className="rounded-md bg-negative-soft px-4 py-3 text-callout text-negative"
        >
          {error}
        </p>
      </>
    );
  }

  return (
    <StatusFilterProvider>
      <ParticipantSortProvider
        initialParticipants={users}
        initialSortOption="name"
      >
        <UsersPageContent />
      </ParticipantSortProvider>
    </StatusFilterProvider>
  );
}

export default withAuth(UsersPage, {
  requireAuth: true,
  checkPermission: checkClubAdminPermission,
});
