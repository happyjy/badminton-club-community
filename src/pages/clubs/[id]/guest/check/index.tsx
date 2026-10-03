import { useRouter } from 'next/router';

import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

import { Skeleton } from '@/components/atoms/Skeleton';
import { GuestCheckView } from '@/components/organisms/guest/GuestCheckView';
import { PageHeader } from '@/components/organisms/PageHeader';

import {
  buildGuestListQuery,
  parseGuestListQuery,
  type GuestListQuery,
} from '@/lib/guestListQuery';

const ITEMS_PER_PAGE = 10;

export default function GuestCheckPage() {
  const router = useRouter();
  const { id: clubId } = router.query;

  // 페이지/필터는 useState가 아니라 URL이 들고 있다.
  // 상세 화면에서 뒤로가기로 돌아오면 브라우저가 URL을 되돌려 주므로
  // 보고 있던 페이지와 필터가 자연스럽게 복원된다.
  const {
    page: currentPage,
    typeFilter,
    statusFilter,
  } = parseGuestListQuery(router.query);

  const updateListQuery = (next: GuestListQuery) => {
    if (!clubId) return;

    router.push(
      {
        pathname: `/clubs/${clubId}/guest/check`,
        query: buildGuestListQuery(next),
      },
      undefined,
      { shallow: true }
    );
  };

  const setCurrentPage = (page: number) => {
    updateListQuery({ page, typeFilter, statusFilter });
  };

  const { data: response, isLoading } = useQuery({
    queryKey: ['guestRequests', clubId, currentPage, typeFilter, statusFilter],
    queryFn: async () => {
      const response = await axios.get(`/api/clubs/${clubId}/guests`, {
        params: {
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          postType: typeFilter !== 'ALL' ? typeFilter : undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
        },
      });
      return response.data;
    },
    enabled: !!clubId,
  });

  const guestRequests = response?.data;

  // 게시글 타입 변경 (필터가 바뀌면 첫 페이지로)
  const handleTypeChange = (value: string) => {
    updateListQuery({ page: 1, typeFilter: value, statusFilter });
  };

  // 신청 상태 변경 (필터가 바뀌면 첫 페이지로)
  const handleStatusChange = (value: string) => {
    updateListQuery({ page: 1, typeFilter, statusFilter: value });
  };

  // 게스트 신청 상세 페이지로 이동
  const handleRowClick = (guestId: string) => {
    router.push(`/clubs/${clubId}/guest/${guestId}`);
  };

  return (
    <>
      <PageHeader title="게스트 신청 목록" />
      {isLoading ? (
        <div aria-busy="true" className="space-y-2">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <GuestCheckView
          items={guestRequests?.items ?? []}
          page={currentPage}
          totalPages={Math.ceil((guestRequests?.total ?? 0) / ITEMS_PER_PAGE)}
          typeFilter={typeFilter}
          statusFilter={statusFilter}
          onChangeType={handleTypeChange}
          onChangeStatus={handleStatusChange}
          onChangePage={setCurrentPage}
          onOpen={handleRowClick}
        />
      )}
    </>
  );
}
