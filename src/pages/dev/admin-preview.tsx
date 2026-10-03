import { useState } from 'react';

import { useRouter } from 'next/router';

import { Button } from '@/components/atoms/buttons/Button';
import { StatusChip } from '@/components/atoms/StatusChip';
import { SegmentedControl } from '@/components/molecules/SegmentedControl';
import { StatusFilter } from '@/components/molecules/StatusFilter';
import { MembersView } from '@/components/organisms/club/MembersView';
import { GuestCheckView } from '@/components/organisms/guest/GuestCheckView';
import { PageHeader } from '@/components/organisms/PageHeader';
import { BulkActionBar } from '@/components/organisms/table/BulkActionBar';
import { DataTable, RowKey } from '@/components/organisms/table/DataTable';
import { Toolbar } from '@/components/organisms/table/Toolbar';
import { AppShell } from '@/components/templates/AppShell';

import { getNavItems } from '@/constants/navItems';
import {
  StatusFilterProvider,
  useStatusFilter,
} from '@/contexts/StatusFilterContext';
import type { ClubMemberWithUser } from '@/pages/clubs/[id]/members';
import { Status } from '@/types/enums';
import { GuestPostForList } from '@/types/guest.types';
import { SortOption } from '@/types/participantSort';

import type { GetServerSideProps } from 'next';

// 개발 서버에서만 연다. 운영에서는 404.
export const getServerSideProps: GetServerSideProps = async () => {
  if (process.env.NODE_ENV === 'production') {
    return { notFound: true };
  }
  return { props: {} };
};

type Screen = 'members' | 'guest-check' | 'table';

const NAMES = [
  '김가온',
  '이나래',
  '박다람',
  '최라온',
  '정마루',
  '강바다',
  '조사랑',
  '윤아름',
  '장자람',
  '임차오',
  '한카이',
  '오타래',
];
const STATUSES = [
  Status.APPROVED,
  Status.PENDING,
  Status.APPROVED,
  Status.ON_LEAVE,
  Status.APPROVED,
  Status.LEFT,
];
const LEVELS = ['A', 'B', 'C', 'D', 'E'];

const INITIAL_MEMBERS = NAMES.map(
  (name, index) =>
    ({
      id: index + 1,
      nickname: name,
      email: `member${index + 1}@example.com`,
      thumbnailImageUrl: null,
      clubMember: {
        id: (index + 1) * 10,
        name,
        status: STATUSES[index % STATUSES.length],
        role: 'MEMBER',
        clubId: 1,
        birthDate: `19${88 + (index % 10)}-0${(index % 9) + 1}-15`,
        gender: index % 2 ? '여성' : '남성',
        localTournamentLevel: LEVELS[index % LEVELS.length],
        nationalTournamentLevel:
          index % 4 ? LEVELS[(index + 1) % 5] : undefined,
        playingPeriod: (index % 6) + 1,
        lessonPeriod: index % 3,
        phoneNumber: index % 5 ? `010-1234-56${10 + index}` : undefined,
        createdAt: `2025-0${(index % 9) + 1}-1${index % 9}T00:00:00.000Z`,
        helperStatuses: [],
      },
    }) as unknown as ClubMemberWithUser
);

const GUESTS = Array.from(
  { length: 10 },
  (_, index) =>
    ({
      id: `g${index}`,
      name: NAMES[index],
      postType: index % 3 ? 'GUEST_REQUEST' : 'JOIN_INQUIRY_REQUEST',
      status: (['PENDING', 'APPROVED', 'REJECTED'] as const)[index % 3],
      visitDate: index % 4 ? `2026-10-${10 + index}` : null,
      birthDate: `199${index}-03-01`,
      intendToJoin: index % 2 === 0,
      nationalTournamentLevel: index % 3 ? LEVELS[index % 5] : null,
      localTournamentLevel: LEVELS[(index + 2) % 5],
      clubMember: index % 2 ? { name: NAMES[11 - index] } : null,
    }) as unknown as GuestPostForList
);

function MembersPreview() {
  const { statusFilters } = useStatusFilter();
  const [members, setMembers] = useState(INITIAL_MEMBERS);
  const [search, setSearch] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('name');

  const setStatus = (userId: number, status: Status) =>
    setMembers((prev) =>
      prev.map((user) =>
        user.id === userId
          ? { ...user, clubMember: { ...user.clubMember, status } }
          : user
      )
    );

  const shown = members
    .filter((user) => {
      const status = user.clubMember.status as Status;
      if (
        statusFilters.included.length > 0 &&
        !statusFilters.included.includes(status)
      ) {
        return false;
      }
      if (statusFilters.excluded.includes(status)) return false;
      return user.clubMember.name.includes(search.trim());
    })
    .sort((a, b) =>
      sortOption === 'createdAt'
        ? a.clubMember.createdAt.localeCompare(b.clubMember.createdAt)
        : a.clubMember.name.localeCompare(b.clubMember.name, 'ko')
    );

  return (
    <>
      <PageHeader title="클럽 멤버 관리" />
      <MembersView
        members={shown}
        totalCount={members.length}
        isFiltered={
          search.trim().length > 0 ||
          statusFilters.included.length > 0 ||
          statusFilters.excluded.length > 0
        }
        search={search}
        onChangeSearch={setSearch}
        sortOption={sortOption}
        onChangeSort={setSortOption}
        filter={<StatusFilter />}
        onApprove={(userId) => setStatus(userId, Status.APPROVED)}
        onStatusChange={(userId, _clubId, status) => setStatus(userId, status)}
        approvingUserId={null}
      />
    </>
  );
}

function GuestCheckPreview() {
  const [page, setPage] = useState(3);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  return (
    <>
      <PageHeader title="게스트 신청 목록" />
      <GuestCheckView
        items={GUESTS.filter(
          (guest) =>
            (typeFilter === 'ALL' || guest.postType === typeFilter) &&
            (statusFilter === 'ALL' || guest.status === statusFilter)
        )}
        page={page}
        totalPages={12}
        typeFilter={typeFilter}
        statusFilter={statusFilter}
        onChangeType={setTypeFilter}
        onChangeStatus={setStatusFilter}
        onChangePage={setPage}
        onOpen={() => {}}
      />
    </>
  );
}

/** 회비 관리가 쓸 모양: 정렬 + 행 선택 + 일괄 동작 */
function TablePreview() {
  const [selected, setSelected] = useState<Set<RowKey>>(new Set());
  const [search, setSearch] = useState('');
  const rows = INITIAL_MEMBERS.filter((user) =>
    user.clubMember.name.includes(search.trim())
  );

  return (
    <>
      <PageHeader title="표 부품" subtitle="정렬 · 행 선택 · 일괄 동작" />
      <Toolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: '이름 검색',
        }}
        summary={`${rows.length}명`}
        actions={<Button size="sm">내보내기</Button>}
      />
      <DataTable
        aria-label="회비"
        rows={rows}
        rowKey={(user) => user.id}
        selection={{ selected, onChange: setSelected }}
        columns={[
          {
            key: 'name',
            header: '이름',
            cell: (user) => user.clubMember.name,
            sortValue: (user) => user.clubMember.name,
          },
          {
            key: 'period',
            header: '구력',
            cell: (user) => `${user.clubMember.playingPeriod}년`,
            sortValue: (user) => user.clubMember.playingPeriod,
            align: 'right',
          },
          {
            key: 'paid',
            header: '납부',
            cell: (user) =>
              user.id % 3 ? (
                <StatusChip tone="positive">완납</StatusChip>
              ) : (
                <StatusChip tone="warning">미납</StatusChip>
              ),
          },
        ]}
        list={{
          title: (user) => user.clubMember.name,
          subtitle: (user) => `구력 ${user.clubMember.playingPeriod}년`,
        }}
        empty="찾는 회원이 없어요"
      />
      <BulkActionBar
        count={selected.size}
        onClear={() => setSelected(new Set())}
      >
        <Button size="sm">납부 확인</Button>
      </BulkActionBar>
    </>
  );
}

/**
 * 로그인 없이 운영진 화면을 가짜 데이터로 보는 화면.
 * 눌러도 이 화면 안의 가짜 상태만 바뀐다. 서버에는 아무것도 보내지 않는다.
 */
export default function AdminPreviewPage() {
  const router = useRouter();
  const queryScreen = router.query.screen;
  const screen: Screen =
    queryScreen === 'guest-check' || queryScreen === 'table'
      ? queryScreen
      : 'members';

  return (
    <AppShell
      variant="admin"
      clubId="1"
      clubName="당산 배드민턴 클럽"
      items={getNavItems({
        clubId: '1',
        isMember: true,
        isAdmin: true,
        tournamentMenuEnabled: true,
      })}
      currentPath={
        screen === 'guest-check' ? '/clubs/1/guest/check' : '/clubs/1/members'
      }
      isAuthenticated
      onLogin={() => {}}
      onLogout={() => {}}
    >
      <div className="mb-4 space-y-2 rounded-md border border-dashed border-border p-3">
        <p className="text-footnote text-secondary">
          개발용 미리보기 — 가짜 데이터예요. 눌러도 서버에 보내지 않아요.
        </p>
        <SegmentedControl<Screen>
          aria-label="미리 볼 화면"
          options={[
            { value: 'members', label: '회원 관리' },
            { value: 'guest-check', label: '게스트 확인' },
            { value: 'table', label: '표 부품' },
          ]}
          value={screen}
          onChange={(next) =>
            router.replace(`/dev/admin-preview?screen=${next}`)
          }
        />
      </div>

      {screen === 'members' ? (
        <StatusFilterProvider>
          <MembersPreview />
        </StatusFilterProvider>
      ) : screen === 'guest-check' ? (
        <GuestCheckPreview />
      ) : (
        <TablePreview />
      )}
    </AppShell>
  );
}
