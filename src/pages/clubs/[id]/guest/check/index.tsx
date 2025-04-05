import { useState, useRef, useLayoutEffect } from 'react';

import { useRouter } from 'next/router';

import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

import { formatDateSimple } from '@/lib/utils';

type GuestRequest = {
  id: string;
  guestName: string;
  phoneNumber: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
  visitDate?: string;
  intendToJoin?: boolean;
  birthYear?: string;
  nationalRank?: string;
  districtRank?: string;
};

const ITEMS_PER_PAGE = 10;

export default function GuestCheckPage() {
  const router = useRouter();
  const { id: clubId } = router.query;
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const { data: response, isLoading } = useQuery({
    queryKey: ['guestRequests', clubId, currentPage, statusFilter],
    queryFn: async () => {
      const response = await axios.get(`/api/clubs/${clubId}/guests`, {
        params: {
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
        },
      });
      return response.data;
    },
    enabled: !!clubId,
  });

  const guestRequests = response?.data;

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleRowClick = (guestId: string) => {
    router.push(`/clubs/${clubId}/guest/${guestId}`);
  };

  // 신청 상태에 따른 배지 색상
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      // todo: 매직 스트링 처리
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  // 신청 상태 한글 표시
  const getStatusText = (status: string) => {
    switch (status) {
      // todo: 매직 스트링 처리
      case 'APPROVED':
        return '승인됨';
      case 'REJECTED':
        return '거절됨';
      default:
        return '검토중';
    }
  };

  const paginationRef = useRef<HTMLDivElement>(null);
  const paginationBtnRef = useRef<HTMLButtonElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [paginationBtnWidth, setPaginationBtnWidth] = useState(0);

  // 페이지네이션 container 너비 계산(페이지네이션 버튼 개수 조절)
  useLayoutEffect(() => {
    const updateWidth = () => {
      if (paginationRef.current) {
        setContainerWidth(paginationRef.current.offsetWidth);
      }
      if (paginationBtnRef.current) {
        setPaginationBtnWidth(paginationBtnRef.current.offsetWidth);
      }
    };

    // 초기 너비 설정
    updateWidth();

    // ResizeObserver를 사용하여 컨테이너 크기 변경 감지
    const observer = new ResizeObserver(updateWidth);
    if (paginationRef.current) {
      observer.observe(paginationRef.current);
    }

    return () => observer.disconnect();
  }, [guestRequests]);

  // getPageNumbers 함수 수정
  const getPageNumbers = (currentPage: number, totalPages: number) => {
    // 이전/다음 버튼의 너비
    const navButtonWidth = containerWidth < 640 ? 36 : 44;

    // 페이지네이션 버튼 사이의 간격 (-space-x-px로 인한 -1px)
    const buttonGap = -1;

    // 실제 사용 가능한 너비 계산 (전체 너비 - 네비게이션 버튼 너비)
    const availableWidth = containerWidth - navButtonWidth * 2;

    // 한 줄에 표시 가능한 버튼 개수 계산
    const possibleButtons = Math.floor(
      (availableWidth + Math.abs(buttonGap)) / (paginationBtnWidth + buttonGap)
    );

    // 최소 3개, 최대 9개로 제한
    const maxButtons = Math.min(Math.max(possibleButtons, 3), 9);

    if (totalPages <= maxButtons) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages = [];
    const sideCount = Math.floor((maxButtons - 3) / 2); // 첫 페이지, 마지막 페이지, 현재 페이지를 제외한 양쪽 버튼 수

    // 1. 첫 페이지 추가
    pages.push(1);

    // 2. 현재 페이지 위치에 따른 표시 범위 계산
    let start = Math.max(2, currentPage - sideCount);
    let end = Math.min(totalPages - 1, currentPage + sideCount);

    // 3. 범위 조정하여 maxButtons 개수 맞추기
    if (currentPage <= sideCount + 2) {
      // 현재 페이지가 앞쪽에 있는 경우
      end = Math.min(maxButtons - 1, totalPages - 1);
      start = 2;
    } else if (currentPage >= totalPages - sideCount - 1) {
      // 현재 페이지가 뒤쪽에 있는 경우
      start = Math.max(2, totalPages - (maxButtons - 2));
      end = totalPages - 1;
    } else {
      // 현재 페이지가 중간에 있는 경우
      const halfWidth = Math.floor((maxButtons - 4) / 2);
      start = currentPage - halfWidth;
      end = currentPage + halfWidth;
    }

    // 4. 첫 페이지와 시작 페이지 사이 ... 추가
    if (start > 2) {
      pages.push('...');
    }

    // 5. 중간 페이지들 추가
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    // 6. 끝 페이지와 마지막 페이지 사이 ... 추가
    if (end < totalPages - 1) {
      pages.push('...');
    }

    // 7. 마지막 페이지 추가
    pages.push(totalPages);

    return pages;
  };

  if (isLoading) {
    return <div>로딩 중...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h1 className="text-2xl font-bold mb-6">게스트 신청 목록</h1>

      <div className="mb-4">
        <select
          value={statusFilter}
          onChange={handleStatusChange}
          className="w-[180px] px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="ALL">전체</option>
          <option value="PENDING">대기 중</option>
          <option value="APPROVED">승인됨</option>
          <option value="REJECTED">거절됨</option>
        </select>
      </div>

      {guestRequests?.items.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 table-auto">
            <thead className="bg-gray-50">
              {/* todo: th에 반복되는 className 처리 */}
              {/* todo: 테이블 컴포넌트 형식으로 변경하기 */}
              <tr>
                <th className="px-2 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  방문희망일
                </th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  신청자 정보
                  <br />
                  <label className="text-xs font-normal whitespace-nowrap text-gray-500">
                    가입의향|이름|생년월일|전국/구대회
                  </label>
                </th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {guestRequests.items.map((guest: GuestRequest) => (
                <tr
                  key={guest.id}
                  onClick={() => handleRowClick(guest.id)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-1 py-2 sm:px-4 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-500 truncate">
                    {guest.visitDate ? formatDateSimple(guest.visitDate) : '-'}
                  </td>
                  <td className="px-1 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm text-gray-500">
                    <div className="flex flex-col">
                      <div className="flex flex-wrap items-center gap-1">
                        <input
                          type="checkbox"
                          checked={guest.intendToJoin === true}
                          readOnly
                          className="h-3 w-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-not-allowed"
                        />
                        {' | '}
                        <span className="font-medium">{guest.name}</span>
                        {' | '}
                        {guest.birthDate?.split('-')[0] || '-'}
                        {' | '}
                        {guest.nationalTournamentLevel
                          ? `${guest.nationalTournamentLevel}`
                          : '-'}
                        {' / '}
                        {guest.localTournamentLevel
                          ? `${guest.localTournamentLevel}`
                          : '-'}
                      </div>
                    </div>
                  </td>
                  <td className="px-1 py-2 sm:px-4 sm:py-3 whitespace-nowrap">
                    <span
                      className={`px-1 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(
                        guest.status
                      )}`}
                    >
                      {getStatusText(guest.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-500">신청 내역이 없습니다.</p>
      )}

      {guestRequests?.total > ITEMS_PER_PAGE && (
        <div ref={paginationRef} className="mt-4 flex justify-center">
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
            {/* 이전 페이지 버튼 */}
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className={`relative inline-flex items-center px-2 py-2 rounded-l-md border text-sm font-medium ${
                currentPage === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              <span className="sr-only">이전</span>
              <svg
                className="h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {/* 페이지 번호 */}
            {getPageNumbers(
              currentPage,
              Math.ceil(guestRequests.total / ITEMS_PER_PAGE)
            ).map((pageNum, index) => (
              <button
                ref={paginationBtnRef}
                key={index}
                onClick={() =>
                  typeof pageNum === 'number' && setCurrentPage(pageNum)
                }
                disabled={pageNum === '...'}
                className={`relative inline-flex items-center border text-sm font-medium
                  ${
                    pageNum === currentPage
                      ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                      : pageNum === '...'
                        ? 'bg-white text-gray-700 cursor-default'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                  } 
                  ${containerWidth < 640 ? 'px-2 py-1 text-xs' : 'px-4 py-2'}1
                  flex-1 justify-center min-w-[32px]`}
              >
                {pageNum}
              </button>
            ))}

            {/* 다음 페이지 버튼 */}
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={
                currentPage === Math.ceil(guestRequests.total / ITEMS_PER_PAGE)
              }
              className={`relative inline-flex items-center px-2 py-2 rounded-r-md border text-sm font-medium ${
                currentPage === Math.ceil(guestRequests.total / ITEMS_PER_PAGE)
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              <span className="sr-only">다음</span>
              <svg
                className="h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}
