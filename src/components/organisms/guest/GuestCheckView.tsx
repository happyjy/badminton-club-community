import { Select } from '@/components/atoms/inputs/Select';
import { StatusChip } from '@/components/atoms/StatusChip';
import { Column, DataTable } from '@/components/organisms/table/DataTable';
import { Toolbar } from '@/components/organisms/table/Toolbar';

import { formatDateSimple } from '@/lib/utils';
import {
  GuestPostForList,
  GuestPostTypeType,
  GuestStatusType,
} from '@/types/guest.types';

interface GuestCheckViewProps {
  items: GuestPostForList[];
  /** 1부터 센다 */
  page: number;
  totalPages: number;
  typeFilter: string;
  statusFilter: string;
  onChangeType: (value: string) => void;
  onChangeStatus: (value: string) => void;
  onChangePage: (page: number) => void;
  /** 신청 상세로 간다 */
  onOpen: (guestId: string) => void;
}

const statusText = (status: GuestStatusType) => {
  switch (status) {
    case 'APPROVED':
      return '승인됨';
    case 'REJECTED':
      return '거절됨';
    default:
      return '검토중';
  }
};

const typeText = (postType: GuestPostTypeType) => {
  switch (postType) {
    case 'GUEST_REQUEST':
      return '게스트 신청';
    case 'JOIN_INQUIRY_REQUEST':
      return '가입 문의';
    default:
      return '-';
  }
};

const visitDay = (guest: GuestPostForList) =>
  guest.visitDate ? formatDateSimple(guest.visitDate) : '-';

function GuestStatusChip({ guest }: { guest: GuestPostForList }) {
  return (
    <StatusChip domain="guest" status={guest.status}>
      {statusText(guest.status)}
    </StatusChip>
  );
}

const COLUMNS: Column<GuestPostForList>[] = [
  {
    key: 'type',
    header: '타입',
    cell: (guest) => typeText(guest.postType),
    className: 'whitespace-nowrap text-secondary',
  },
  {
    key: 'status',
    header: '상태',
    cell: (guest) => <GuestStatusChip guest={guest} />,
  },
  {
    key: 'visitDate',
    header: '방문희망일',
    cell: visitDay,
    className: 'whitespace-nowrap',
  },
  {
    key: 'writer',
    header: '작성자',
    cell: (guest) => guest.clubMember?.name || '-',
    className: 'whitespace-nowrap',
  },
  {
    key: 'name',
    header: '이름',
    cell: (guest) => (
      <span className="flex items-center gap-2">
        <span className="font-medium">{guest.name}</span>
        {guest.intendToJoin === true && (
          <StatusChip tone="neutral">가입 의향</StatusChip>
        )}
      </span>
    ),
  },
  {
    key: 'birthYear',
    header: '생년',
    cell: (guest) => guest.birthDate?.split('-')[0] || '-',
  },
  {
    key: 'level',
    header: '전국 / 구대회',
    cell: (guest) =>
      `${guest.nationalTournamentLevel || '-'} / ${guest.localTournamentLevel || '-'}`,
    className: 'whitespace-nowrap',
  },
];

/** 게스트 확인의 그리는 부분. PC에서는 표, 휴대폰에서는 리스트. */
export function GuestCheckView({
  items,
  page,
  totalPages,
  typeFilter,
  statusFilter,
  onChangeType,
  onChangeStatus,
  onChangePage,
  onOpen,
}: GuestCheckViewProps) {
  return (
    <>
      <Toolbar>
        <Select
          placeholder={null}
          fullWidth={false}
          aria-label="신청 종류"
          value={typeFilter}
          onChange={(e) => onChangeType(e.target.value)}
          className="min-w-0 flex-1 lg:w-44 lg:flex-none"
        >
          <option value="ALL">전체 타입</option>
          <option value="GUEST_REQUEST">게스트 신청</option>
          <option value="JOIN_INQUIRY_REQUEST">가입 문의</option>
        </Select>

        <Select
          placeholder={null}
          fullWidth={false}
          aria-label="처리 상태"
          value={statusFilter}
          onChange={(e) => onChangeStatus(e.target.value)}
          className="min-w-0 flex-1 lg:w-44 lg:flex-none"
        >
          <option value="ALL">전체 상태</option>
          <option value="PENDING">대기 중</option>
          <option value="APPROVED">승인됨</option>
          <option value="REJECTED">거절됨</option>
        </Select>
      </Toolbar>

      <DataTable
        aria-label="게스트 신청"
        rows={items}
        rowKey={(guest) => guest.id}
        columns={COLUMNS}
        list={{
          title: (guest) => guest.name,
          subtitle: (guest) =>
            [
              typeText(guest.postType),
              guest.visitDate ? `방문 ${visitDay(guest)}` : null,
              guest.clubMember?.name ? `작성 ${guest.clubMember.name}` : null,
              guest.birthDate ? `${guest.birthDate.split('-')[0]}년생` : null,
              `전국 ${guest.nationalTournamentLevel || '-'} · 구 ${guest.localTournamentLevel || '-'}`,
              guest.intendToJoin === true ? '가입 의향' : null,
            ]
              .filter(Boolean)
              .join(' · '),
          trailing: (guest) => <GuestStatusChip guest={guest} />,
        }}
        onRowClick={(guest) => onOpen(guest.id)}
        empty="신청 내역이 없습니다."
        pagination={{ page, totalPages, onChange: onChangePage }}
      />
    </>
  );
}

export default GuestCheckView;
