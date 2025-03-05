import { useState } from 'react';
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
      case 'APPROVED':
        return '승인됨';
      case 'REJECTED':
        return '거절됨';
      default:
        return '검토중';
    }
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
          <table className="min-w-full divide-y divide-gray-200 table-fixed">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[22%]">
                  신청일
                </th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[22%]">
                  방문희망일
                </th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[36%]">
                  가입의향
                </th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[20%]">
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
                  <td className="px-2 py-2 sm:px-4 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-500 truncate">
                    {formatDateSimple(guest.createdAt)}
                  </td>
                  <td className="px-2 py-2 sm:px-4 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-500 truncate">
                    {guest.visitDate || '-'}
                  </td>
                  <td className="px-2 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm text-gray-500 truncate">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={guest.intendToJoin === true}
                        readOnly
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-not-allowed"
                      />
                    </div>
                  </td>
                  <td className="px-2 py-2 sm:px-4 sm:py-3 whitespace-nowrap">
                    <span
                      className={`px-1 py-0.5 sm:px-2 sm:py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(
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
        <div className="mt-4 flex justify-center">
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
            {Array.from({
              length: Math.ceil(guestRequests.total / ITEMS_PER_PAGE),
            }).map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentPage(index + 1)}
                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                  currentPage === index + 1
                    ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}
