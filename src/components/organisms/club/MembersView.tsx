import { ReactNode, useState } from 'react';

import { Avatar } from '@/components/atoms/Avatar';
import { Button } from '@/components/atoms/buttons/Button';
import { Select } from '@/components/atoms/inputs/Select';
import { StatusChip } from '@/components/atoms/StatusChip';
import { FormField } from '@/components/molecules/form/FormField';
import { ListGroup } from '@/components/molecules/list/ListGroup';
import { Sheet } from '@/components/organisms/sheet/Sheet';
import { Column, DataTable } from '@/components/organisms/table/DataTable';
import { Toolbar } from '@/components/organisms/table/Toolbar';

import {
  MEMBER_STATUS_LABEL,
  memberStatusLabel,
} from '@/constants/memberStatus';
import type { ClubMemberWithUser } from '@/pages/clubs/[id]/members';
import { Status } from '@/types/enums';
import { SortOption } from '@/types/participantSort';

interface MembersViewProps {
  /** 필터·정렬이 끝난 회원 */
  members: ClubMemberWithUser[];
  /**
   * 필터를 걸기 전의 전체 회원. 상세 시트는 여기서 회원을 찾는다
   * (상태를 바꿔 필터에서 빠져도 시트가 갑자기 닫히지 않게). 없으면 members에서 찾는다.
   */
  allMembers?: ClubMemberWithUser[];
  /** 필터를 걸기 전의 전체 회원 수 */
  totalCount: number;
  /** 상태 필터나 검색이 걸려 있는가 */
  isFiltered: boolean;
  search: string;
  onChangeSearch: (value: string) => void;
  sortOption: SortOption;
  onChangeSort: (option: SortOption) => void;
  /** 상태 필터. 도구줄 아래에 그린다 */
  filter?: ReactNode;
  onApprove: (userId: number, clubId: number) => void;
  onStatusChange: (userId: number, clubId: number, status: Status) => void;
  /** 승인 요청이 진행 중인 회원 */
  approvingUserId: number | null;
}

const EMPTY = '미입력';

const displayName = (user: ClubMemberWithUser) =>
  user.clubMember.name || '이름 없음';

const formatDay = (value?: string) =>
  value ? new Date(value).toLocaleDateString('ko-KR') : EMPTY;

/** 상세 시트의 항목 */
const details = (user: ClubMemberWithUser) => {
  const member = user.clubMember;
  return [
    { label: '생년월일', value: formatDay(member.birthDate) },
    { label: '전화번호', value: member.phoneNumber || EMPTY },
    { label: '구대회급수', value: member.localTournamentLevel || EMPTY },
    { label: '전국대회급수', value: member.nationalTournamentLevel || EMPTY },
    {
      label: '구력',
      value: member.playingPeriod ? `${member.playingPeriod}` : EMPTY,
    },
    {
      label: '레슨',
      value: member.lessonPeriod ? `${member.lessonPeriod}` : EMPTY,
    },
  ];
};

function MemberStatusChip({ status }: { status: string }) {
  return (
    <StatusChip domain="member" status={status}>
      {memberStatusLabel(status)}
    </StatusChip>
  );
}

/**
 * 회원 관리의 그리는 부분. PC에서는 표, 휴대폰에서는 리스트.
 * 행을 누르면 그 회원의 상세 시트가 열리고, 거기서 상태를 바꾸거나 승인한다.
 */
export function MembersView({
  members,
  allMembers,
  totalCount,
  isFiltered,
  search,
  onChangeSearch,
  sortOption,
  onChangeSort,
  filter,
  onApprove,
  onStatusChange,
  approvingUserId,
}: MembersViewProps) {
  // 닫히는 애니메이션 동안에도 내용이 남도록 "누구의 시트인가"와 "열려 있는가"를 따로 둔다.
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const selected = (allMembers ?? members).find(
    (user) => user.id === selectedUserId
  );

  const approveButton = (user: ClubMemberWithUser, size: 'sm' | 'lg') => (
    <Button
      type="button"
      size={size}
      className={size === 'lg' ? 'w-full' : undefined}
      pending={approvingUserId === user.id}
      onClick={() => onApprove(user.id, user.clubMember.clubId)}
    >
      승인하기
    </Button>
  );

  const columns: Column<ClubMemberWithUser>[] = [
    {
      key: 'name',
      header: '이름',
      cell: (user) => (
        <span className="flex items-center gap-2">
          <Avatar
            size={28}
            name={displayName(user)}
            src={user.thumbnailImageUrl}
            seed={String(user.id)}
          />
          <span className="min-w-0">
            <span className="block font-medium">{displayName(user)}</span>
            <span className="block text-footnote text-secondary">
              {user.email}
            </span>
          </span>
        </span>
      ),
    },
    {
      key: 'status',
      header: '상태',
      // 승인 버튼을 상태 옆에 둔다. 표가 좁아 가로로 밀려도 가려지지 않는다.
      cell: (user) => (
        <span className="flex items-center gap-2">
          <MemberStatusChip status={user.clubMember.status} />
          {user.clubMember.status === Status.PENDING &&
            approveButton(user, 'sm')}
        </span>
      ),
    },
    {
      key: 'birthDate',
      header: '생년월일',
      cell: (user) => formatDay(user.clubMember.birthDate),
      className: 'whitespace-nowrap text-secondary',
    },
    {
      key: 'phoneNumber',
      header: '전화번호',
      cell: (user) => user.clubMember.phoneNumber || EMPTY,
      className: 'whitespace-nowrap text-secondary',
    },
    {
      key: 'level',
      header: '전국 / 구대회',
      cell: (user) =>
        `${user.clubMember.nationalTournamentLevel || '-'} / ${user.clubMember.localTournamentLevel || '-'}`,
      className: 'whitespace-nowrap text-secondary',
    },
    {
      key: 'period',
      header: '구력 / 레슨',
      cell: (user) =>
        `${user.clubMember.playingPeriod || '-'} / ${user.clubMember.lessonPeriod || '-'}`,
      className: 'whitespace-nowrap text-secondary',
    },
    {
      key: 'createdAt',
      header: '가입일',
      cell: (user) => formatDay(user.clubMember.createdAt),
      className: 'whitespace-nowrap text-secondary',
    },
  ];

  return (
    <>
      <Toolbar
        search={{
          value: search,
          onChange: onChangeSearch,
          placeholder: '이름 검색',
        }}
        summary={`${isFiltered ? '표시 중' : '총 회원 수'} ${members.length}명`}
      >
        <Select
          placeholder={null}
          fullWidth={false}
          aria-label="정렬"
          value={sortOption}
          onChange={(e) => onChangeSort(e.target.value as SortOption)}
        >
          <option value="name">이름순</option>
          <option value="localLevel">지역대회 급수</option>
          <option value="nationalLevel">전국대회 급수</option>
          <option value="birthDate">생년월일</option>
          <option value="createdAt">가입순서</option>
        </Select>
      </Toolbar>

      {filter && <div className="mb-3">{filter}</div>}

      <DataTable
        aria-label="회원"
        rows={members}
        rowKey={(user) => user.id}
        columns={columns}
        list={{
          leading: (user) => (
            <Avatar
              size={36}
              name={displayName(user)}
              src={user.thumbnailImageUrl}
              seed={String(user.id)}
            />
          ),
          title: (user) => displayName(user),
          subtitle: (user) =>
            [
              user.clubMember.birthDate
                ? `${new Date(user.clubMember.birthDate).getFullYear()}년생`
                : null,
              user.clubMember.nationalTournamentLevel
                ? `전국 ${user.clubMember.nationalTournamentLevel}`
                : null,
              user.clubMember.localTournamentLevel
                ? `구 ${user.clubMember.localTournamentLevel}`
                : null,
            ]
              .filter(Boolean)
              .join(' · ') || user.email,
          trailing: (user) => (
            <MemberStatusChip status={user.clubMember.status} />
          ),
        }}
        onRowClick={(user) => {
          setSelectedUserId(user.id);
          setIsSheetOpen(true);
        }}
        empty={
          totalCount > 0
            ? '선택한 필터에 맞는 멤버가 없습니다.'
            : '등록된 멤버가 없습니다.'
        }
      />

      <Sheet
        open={isSheetOpen && !!selected}
        onClose={() => setIsSheetOpen(false)}
        title={selected ? displayName(selected) : ''}
        footer={
          selected?.clubMember.status === Status.PENDING
            ? approveButton(selected, 'lg')
            : undefined
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <MemberStatusChip status={selected.clubMember.status} />
              <span className="min-w-0 truncate text-footnote text-secondary">
                {selected.email}
              </span>
            </div>

            <ListGroup tone="inset">
              {[
                ...details(selected),
                {
                  label: '가입일',
                  value: formatDay(selected.clubMember.createdAt),
                },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="flex min-h-11 items-center justify-between gap-3 px-4 py-2.5"
                >
                  <span className="text-callout text-secondary">{label}</span>
                  <span className="text-callout text-primary">{value}</span>
                </div>
              ))}
            </ListGroup>

            {/* 대기 회원은 승인만 할 수 있다. 그 밖의 회원은 상태를 바꾼다. */}
            {selected.clubMember.status !== Status.PENDING && (
              <FormField label="상태">
                <Select
                  placeholder={null}
                  value={selected.clubMember.status}
                  onChange={(e) => {
                    const next = e.target.value as Status;
                    if (next !== selected.clubMember.status) {
                      onStatusChange(
                        selected.id,
                        selected.clubMember.clubId,
                        next
                      );
                    }
                  }}
                >
                  {Object.values(Status).map((status) => (
                    <option key={status} value={status}>
                      {MEMBER_STATUS_LABEL[status]}
                    </option>
                  ))}
                </Select>
              </FormField>
            )}
          </div>
        )}
      </Sheet>
    </>
  );
}

export default MembersView;
