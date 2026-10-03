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
    <section>
      <h2 className="px-4 pb-2 text-footnote text-secondary">
        {currentDate}월 랭킹
      </h2>
      <div className="overflow-hidden rounded-md bg-surface">
        <table className="w-full text-callout text-primary">
          <thead>
            <tr className="border-b border-border text-left text-footnote text-secondary">
              <th className="w-12 px-4 py-2 font-medium">#</th>
              <th className="px-2 py-2 font-medium">출석</th>
              <th className="px-4 py-2 font-medium">도우미</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maxRows }).map((_, index) => (
              <tr key={index} className="border-t border-border first:border-0">
                <td className="px-4 py-2.5 font-semibold tabular-nums">
                  {index + 1}
                </td>
                <td className="px-2 py-2.5">
                  {paddedAttendance[index] ? (
                    <div className="flex justify-between gap-2">
                      <span>{paddedAttendance[index].name}</span>
                      <span className="shrink-0 tabular-nums text-secondary">
                        {paddedAttendance[index].count}회
                      </span>
                    </div>
                  ) : (
                    '-'
                  )}
                </td>
                <td className="px-4 py-2.5">
                  {paddedHelper[index] ? (
                    <div className="flex justify-between gap-2">
                      <span>{paddedHelper[index].name}</span>
                      <span className="shrink-0 tabular-nums text-secondary">
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
          <button
            type="button"
            onClick={toggleExpanded}
            className="flex min-h-11 w-full items-center justify-center border-t border-border text-callout text-secondary transition-colors duration-150 active:bg-fill"
          >
            {expanded ? '접기' : '더보기'}
            {expanded ? (
              <ChevronUp aria-hidden className="ml-1 h-4 w-4" />
            ) : (
              <ChevronDown aria-hidden className="ml-1 h-4 w-4" />
            )}
          </button>
        )}
      </div>
    </section>
  );
};

export default RankingTable;
