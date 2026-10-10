import { useState } from 'react';

import { useRouter } from 'next/router';

import { toast } from 'react-hot-toast';

import { Button } from '@/components/atoms/buttons/Button';
import { StatusChip } from '@/components/atoms/StatusChip';
import { OptionPicker } from '@/components/molecules/OptionPicker';
import { StatusFilter } from '@/components/molecules/StatusFilter';
import { MembersView } from '@/components/organisms/club/MembersView';
import { GuestCheckView } from '@/components/organisms/guest/GuestCheckView';
import { BulkKindSheet } from '@/components/organisms/membership-fee/BulkKindSheet';
import {
  DashboardMemberFilter,
  FeeDashboardView,
} from '@/components/organisms/membership-fee/FeeDashboardView';
import {
  MemberFeeDetailView,
  MemberLeaveItem,
} from '@/components/organisms/membership-fee/MemberFeeDetailView';
import { PaymentRecordsView } from '@/components/organisms/membership-fee/PaymentRecordsView';
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
import type {
  MemberPaymentStatus,
  PaymentRecord,
} from '@/types/membership-fee.types';
import { SortOption } from '@/types/participantSort';

import type { GetServerSideProps } from 'next';

// 개발 서버에서만 연다. 운영에서는 404.
export const getServerSideProps: GetServerSideProps = async () => {
  if (process.env.NODE_ENV === 'production') {
    return { notFound: true };
  }
  return { props: {} };
};

const SCREENS = [
  { value: 'members', label: '회원 관리' },
  { value: 'guest-check', label: '게스트 확인' },
  { value: 'table', label: '표 부품' },
  { value: 'fee-process', label: '입금 내역 처리' },
  { value: 'fee-dashboard', label: '회비 대시보드' },
  { value: 'fee-member', label: '회원 상세 (회비)' },
] as const;

type Screen = (typeof SCREENS)[number]['value'];

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

const FEE_STATUSES = [
  'PENDING',
  'MATCHED',
  'CONFIRMED',
  'ERROR',
  'SKIPPED',
] as const;

const FEE_MEMBERS = NAMES.map((name, index) => ({
  id: (index + 1) * 10,
  name,
}));

const FEE_RECORDS = NAMES.map((name, index) => {
  const status = FEE_STATUSES[index % FEE_STATUSES.length];
  const hasMember = status !== 'PENDING' && status !== 'ERROR';
  return {
    id: `rec${index}`,
    batchId: 'b1',
    clubId: 1,
    transactionDate: new Date(2026, 8, 1 + index),
    depositorName: name,
    amount: index % 4 ? 30000 : 50000,
    memo: null,
    matchedMemberId: null,
    status,
    errorReason: status === 'ERROR' ? '금액 불일치' : null,
    kind: 'FEE',
    kindReason: '회비 단가의 배수',
    nonFeeAmount: 0,
    nonFeeKind: null,
    monthHints: null,
    needsReview: false,
    note: null,
    createdAt: new Date(2026, 8, 1),
    updatedAt: new Date(2026, 8, 1),
    matchedMembers: hasMember
      ? [
          {
            id: `mm${index}`,
            clubMemberId: (index + 1) * 10,
            clubMember: { id: (index + 1) * 10, name },
          },
        ]
      : [],
    lastPaidYearMonth: hasMember ? { year: 2026, month: 8 } : null,
    nextSuggestedYearMonth: hasMember
      ? { year: 2026, month: index % 3 ? 9 : 10 }
      : undefined,
    nextSuggestedReasons:
      hasMember && index % 3 === 0 ? ['2026년 9월 휴회'] : [],
    payments:
      status === 'CONFIRMED' ? [{ id: `p${index}`, year: 2026, month: 9 }] : [],
  } as unknown as PaymentRecord;
});

/** 분류·검토·금액 나누기의 모습을 보려고 덧붙이는 건 */
const FEE_RECORD_CASES = [
  {
    ...FEE_RECORDS[1],
    id: 'case-event',
    depositorName: '김가온단체티',
    amount: 20000,
    status: 'SKIPPED',
    kind: 'EVENT',
    kindReason: "'단체티' 표기",
    matchedMembers: [],
  },
  {
    ...FEE_RECORDS[1],
    id: 'case-review',
    depositorName: '박나래6,7월',
    amount: 25000,
    status: 'MATCHED',
    needsReview: true,
    reviewReasons: [
      '월 힌트(2026년 6월, 2026년 7월)가 입금 개월 수 1개월과 다름',
    ],
    monthHints: {
      source: 'depositorName',
      months: [
        { year: 2026, month: 6 },
        { year: 2026, month: 7 },
      ],
    },
    suggestedSelections: [{ year: 2026, month: 9 }],
    partialPaidMonth: { year: 2026, month: 8 },
    suggestedStartMonth: { year: 2026, month: 6 },
  },
  {
    ...FEE_RECORDS[1],
    id: 'case-split',
    depositorName: '이다온',
    amount: 125000,
    status: 'MATCHED',
    kindReason: '가입비 100,000원 + 회비 25,000원',
    nonFeeAmount: 100000,
    nonFeeKind: 'JOINING_FEE',
    suggestedSelections: [{ year: 2026, month: 9 }],
    note: '9월 가입',
  },
] as unknown as PaymentRecord[];

/** 입금 내역 처리: 표 + 상세 시트 + 일괄 동작. 다섯 상태가 모두 들어 있다. */
function FeeProcessPreview() {
  const [records, setRecords] = useState([...FEE_RECORD_CASES, ...FEE_RECORDS]);
  const [selected, setSelected] = useState<string[]>([]);
  const [isKindOpen, setIsKindOpen] = useState(false);

  const patch = (id: string, next: Partial<PaymentRecord>) =>
    setRecords((prev) =>
      prev.map((record) => (record.id === id ? { ...record, ...next } : record))
    );

  return (
    <>
      <PageHeader title="입금 내역 처리" />
      <PaymentRecordsView
        records={records}
        members={FEE_MEMBERS}
        year={2026}
        onUpdateMember={(id, memberIds) =>
          patch(id, {
            matchedMembers: memberIds.map((memberId) => ({
              id: `mm-${id}-${memberId}`,
              clubMemberId: memberId,
              clubMember: FEE_MEMBERS.find((m) => m.id === memberId),
            })),
            status: memberIds.length > 0 ? 'MATCHED' : 'PENDING',
          })
        }
        onUpdateRecord={(id, data) =>
          patch(id, {
            ...data,
            ...(data.kind && data.kind !== 'FEE'
              ? { status: 'SKIPPED' as const }
              : {}),
          } as Partial<PaymentRecord>)
        }
        onAdvanceStartMonth={(record) =>
          patch(record.id, { suggestedStartMonth: null })
        }
        onConfirm={(id, selections) =>
          patch(id, {
            status: 'CONFIRMED',
            payments: selections.flatMap((selection) =>
              selection.months.map((month) => ({
                id: `p-${id}-${selection.year}-${month}`,
                year: selection.year,
                month,
              }))
            ),
          })
        }
        onUnconfirm={(id) => patch(id, { status: 'MATCHED', payments: [] })}
        onSkip={(id) => patch(id, { status: 'SKIPPED' })}
        onUnskip={(id) => patch(id, { status: 'PENDING' })}
        selection={{ selected, onChange: setSelected }}
      />
      <BulkActionBar
        count={selected.length}
        unit="건"
        onClear={() => setSelected([])}
      >
        <Button size="sm">선택 항목 확정</Button>
        <Button size="sm" variant="secondary">
          선택 항목 건너뛰기
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setIsKindOpen(true)}
        >
          선택 항목 분류 변경
        </Button>
      </BulkActionBar>
      <BulkKindSheet
        open={isKindOpen}
        onClose={() => setIsKindOpen(false)}
        count={selected.length}
        onPick={(kind) => {
          setIsKindOpen(false);
          selected.forEach((id) =>
            patch(id, {
              kind,
              status: kind === 'FEE' ? 'PENDING' : 'SKIPPED',
            })
          );
          setSelected([]);
        }}
      />
    </>
  );
}

const PREVIEW_YEAR = new Date().getFullYear() - 1;

/** 칸 종류 여섯 가지(납부·미납·면제·휴회·의무 없음·탈퇴)가 모두 나오게 만든다. */
const DASHBOARD_MEMBERS = NAMES.map((name, index) => {
  const paidThrough = [12, 9, 12, 4, 12, 0][index % 6];
  const kind = index % 6;
  return {
    id: index + 1,
    userId: index + 1,
    name,
    type: kind === 2 ? 'exempt' : kind === 4 ? 'couple' : 'regular',
    couplePartnerName: kind === 4 ? NAMES[(index + 1) % NAMES.length] : null,
    payments: Object.fromEntries(
      Array.from({ length: 12 }, (_, month) => [month + 1, month < paidThrough])
    ),
    paidCount: paidThrough,
    totalMonths: kind === 3 ? 10 : 12,
    firstObligationMonth: kind === 1 ? 3 : 1,
    feeObligationStartMonth: kind === 1 ? `${PREVIEW_YEAR}.03` : null,
    obligationMonths:
      kind === 3 ? [1, 2, 3, 4, 7, 8, 9, 10, 11, 12] : undefined,
    leaveMonths: kind === 3 ? [5, 6] : [],
    isLeft: kind === 5,
    leftMonth: kind === 5 ? 6 : undefined,
    leftAtFormatted: kind === 5 ? `${PREVIEW_YEAR}.06` : null,
  } as unknown as MemberPaymentStatus;
});

function FeeDashboardPreview() {
  const [year, setYear] = useState(PREVIEW_YEAR);
  const [memberFilter, setMemberFilter] =
    useState<DashboardMemberFilter>('all');
  const [throughMonth, setThroughMonth] = useState(12);

  return (
    <>
      <PageHeader title="회비 관리" />
      <FeeDashboardView
        clubId="1"
        year={year}
        onYearChange={setYear}
        memberFilter={memberFilter}
        onMemberFilterChange={setMemberFilter}
        throughMonth={throughMonth}
        onThroughMonthChange={setThroughMonth}
        onExport={() => toast.success('회비납부현황_2026_20261010.xlsx 저장')}
        isExporting={false}
        dashboard={{
          year,
          members: DASHBOARD_MEMBERS,
          feeSettings:
            year === PREVIEW_YEAR
              ? { year, regularAmount: 30000, coupleAmount: 50000 }
              : null,
          latestUpload: {
            lastBatch: {
              id: 'b1',
              uploadedAt: '2026-09-20T09:00:00.000Z',
              fileName: '카카오뱅크_거래내역_9월.xlsx',
              recordCount: 42,
              uploadedByName: '김가온',
            },
            latestTransactionDate: '2026-09-19T21:30:00.000Z',
            pendingWork: { unconfirmed: 12, unmatched: 3, needsReview: 5 },
          },
          summary: {
            totalMembers: DASHBOARD_MEMBERS.length,
            exemptMembers: 2,
            coupleGroups: 1,
            yearTotal: 3240000,
            monthlyStats: Array.from({ length: 12 }, (_, month) => ({
              month: month + 1,
              paidCount: 10 - (month % 4),
              totalCount: 10,
              amount: (10 - (month % 4)) * 30000,
            })),
          },
        }}
      />
    </>
  );
}

const INITIAL_LEAVES: MemberLeaveItem[] = [
  {
    id: 1,
    clubMemberId: 10,
    startYear: 2026,
    startMonth: 3,
    endYear: 2026,
    endMonth: 5,
    reason: '부상',
    createdAt: '2026-03-01T00:00:00.000Z',
  },
  {
    id: 2,
    clubMemberId: 10,
    startYear: 2026,
    startMonth: 9,
    endYear: null,
    endMonth: null,
    reason: null,
    createdAt: '2026-09-01T00:00:00.000Z',
  },
];

/** 회원 상세: 탈퇴 회원으로 두어 탈퇴일·마지막 월 입력까지 보이게 한다. */
function MemberFeePreview() {
  const [leaves, setLeaves] = useState(INITIAL_LEAVES);
  const [feeStart, setFeeStart] = useState('2025-02');
  const [leftAt, setLeftAt] = useState('2026-06-15');
  const [feeEnd, setFeeEnd] = useState('2026-06');
  const [position, setPosition] = useState('총무');
  const [positionOrder, setPositionOrder] = useState('3');
  // 4월 회비를 낸 뒤 3~5월이 휴회가 된 경우
  const [orphanPayments, setOrphanPayments] = useState([
    { id: 'p4', year: 2026, month: 4, amount: 25000 },
  ]);

  return (
    <>
      <PageHeader title="김가온 회원 상세" backHref="/dev/admin-preview" />
      <MemberFeeDetailView
        member={{
          id: 10,
          name: '김가온',
          status: 'LEFT',
          createdAt: '2025-01-02T00:00:00.000Z',
          feeObligationStartAt: '2025-02-01T00:00:00.000Z',
          leftAt: '2026-06-15T00:00:00.000Z',
        }}
        leaves={leaves}
        saving={false}
        feeStartInput={feeStart}
        onChangeFeeStart={setFeeStart}
        onSaveFeeStart={() => {}}
        leftAtInput={leftAt}
        onChangeLeftAt={setLeftAt}
        feeEndInput={feeEnd}
        onChangeFeeEnd={setFeeEnd}
        onSaveLeftInfo={() => {}}
        onSubmitLeave={async (value) => {
          if (!value.start) return false;
          const [startYear, startMonth] = value.start.split('-').map(Number);
          const [endYear, endMonth] = value.end
            ? value.end.split('-').map(Number)
            : [null, null];
          const next = {
            startYear,
            startMonth,
            endYear,
            endMonth,
            reason: value.reason.trim() || null,
          };
          setLeaves((prev) =>
            value.editingId == null
              ? [
                  ...prev,
                  {
                    ...next,
                    id: Math.max(0, ...prev.map((leave) => leave.id)) + 1,
                    clubMemberId: 10,
                    createdAt: '2026-10-01T00:00:00.000Z',
                  },
                ]
              : prev.map((leave) =>
                  leave.id === value.editingId ? { ...leave, ...next } : leave
                )
          );
          return true;
        }}
        onDeleteLeave={(leaveId) =>
          setLeaves((prev) => prev.filter((leave) => leave.id !== leaveId))
        }
        positionInput={position}
        onChangePosition={setPosition}
        positionOrderInput={positionOrder}
        onChangePositionOrder={setPositionOrder}
        onSavePosition={() => {}}
        orphanPayments={orphanPayments}
        onShiftPayments={() => {
          setOrphanPayments([]);
          toast.success('1건 이월, 0건 실패');
        }}
      />
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
    SCREENS.find((option) => option.value === queryScreen)?.value ?? 'members';

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
        screen === 'guest-check'
          ? '/clubs/1/guest/check'
          : screen.startsWith('fee-')
            ? '/clubs/1/membership-fee'
            : '/clubs/1/members'
      }
      isAuthenticated
      onLogin={() => {}}
      onLogout={() => {}}
    >
      <div className="mb-4 space-y-2 rounded-md border border-dashed border-border p-3">
        <p className="text-footnote text-secondary">
          개발용 미리보기 — 가짜 데이터예요. 눌러도 서버에 보내지 않아요.
        </p>
        <OptionPicker<Screen>
          aria-label="미리 볼 화면"
          options={[...SCREENS]}
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
      ) : screen === 'fee-process' ? (
        <FeeProcessPreview />
      ) : screen === 'fee-dashboard' ? (
        <FeeDashboardPreview />
      ) : screen === 'fee-member' ? (
        <MemberFeePreview />
      ) : (
        <TablePreview />
      )}
    </AppShell>
  );
}
