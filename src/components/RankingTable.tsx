import { useState } from 'react';

import { ChevronDown, ChevronUp } from 'lucide-react';

export interface RankingMember {
  id: number;
  name: string;
  count: number;
}

interface RankingTableProps {
  attendanceRanking: RankingMember[];
  helperRanking: RankingMember[];
}

const RankingTable: React.FC<RankingTableProps> = ({
  attendanceRanking,
  helperRanking,
}) => {
  const [expanded, setExpanded] = useState(false);
  const initialDisplayCount = 10;

  // 표시할 아이템 수 결정
  const displayCount = expanded
    ? Math.max(attendanceRanking.length, helperRanking.length)
    : initialDisplayCount;

  // 빈 배열로 채워 동일한 길이로 만들기
  const paddedAttendance = [...attendanceRanking];
  const paddedHelper = [...helperRanking];

  // 최대 행 수 계산
  const maxRows = Math.max(
    Math.min(displayCount, attendanceRanking.length),
    Math.min(displayCount, helperRanking.length)
  );

  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  const currentDate = new Date().getMonth() + 1;
  return (
    <div className="mt-8">
      <h3 className="font-bold mb-4">{currentDate}월 랭킹</h3>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 text-left w-16">#</th>
              <th className="px-4 py-2 text-left">출석</th>
              <th className="px-4 py-2 text-left">도우미</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maxRows }).map((_, index) => (
              <tr key={index} className="border-t">
                <td className="px-4 py-2 font-medium">{index + 1}</td>
                <td className="px-4 py-2">
                  {paddedAttendance[index] ? (
                    <div className="flex justify-between">
                      <span>{paddedAttendance[index].name}</span>
                      <span className="text-gray-500">
                        {paddedAttendance[index].count}회
                      </span>
                    </div>
                  ) : (
                    '-'
                  )}
                </td>
                <td className="px-4 py-2">
                  {paddedHelper[index] ? (
                    <div className="flex justify-between">
                      <span>{paddedHelper[index].name}</span>
                      <span className="text-gray-500">
                        {paddedHelper[index].count}회
                      </span>
                    </div>
                  ) : (
                    '-'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {(attendanceRanking.length > initialDisplayCount ||
          helperRanking.length > initialDisplayCount) && (
          <div
            className="text-center py-2 border-t cursor-pointer hover:bg-gray-50"
            onClick={toggleExpanded}
          >
            {expanded ? (
              <div className="flex items-center justify-center text-gray-500">
                <span>접기</span>
                <ChevronUp size={16} className="ml-1" />
              </div>
            ) : (
              <div className="flex items-center justify-center text-gray-500">
                <span>더보기</span>
                <ChevronDown size={16} className="ml-1" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RankingTable;
