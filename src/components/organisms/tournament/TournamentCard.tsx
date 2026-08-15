import type { TournamentListItem } from '@/hooks/useTournaments';

import { formatFee, getDaysUntil } from '@/lib/tournament/display';

import TournamentStatusBadge from './TournamentStatusBadge';

interface TournamentCardProps {
  tournament: TournamentListItem;
  onClick: () => void;
}

function TournamentCard({ tournament, onClick }: TournamentCardProps) {
  const daysLeft = getDaysUntil(new Date(tournament.applyDeadline), new Date());
  const fees = tournament.eventTypes.map((eventType) => eventType.fee);
  const minFee = fees.length > 0 ? Math.min(...fees) : 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg border border-gray-200 p-4 text-left hover:border-blue-300 hover:bg-blue-50/30"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 break-words font-semibold">
          {tournament.title}
        </h3>
        <TournamentStatusBadge status={tournament.effectiveStatus} />
      </div>

      {tournament.hostName && (
        <p className="mt-1 text-sm text-gray-500">{tournament.hostName}</p>
      )}

      <dl className="mt-3 space-y-1 text-sm text-gray-600">
        {tournament.tournamentDate && (
          <div className="flex gap-2">
            <dt className="text-gray-400">대회일</dt>
            <dd>{tournament.tournamentDate}</dd>
          </div>
        )}
        <div className="flex gap-2">
          <dt className="text-gray-400">마감</dt>
          <dd>
            {new Date(tournament.applyDeadline).toLocaleDateString('ko-KR')}
            {tournament.effectiveStatus === 'OPEN' && daysLeft >= 0 && (
              <span className="ml-1 font-medium text-red-500">
                D-{daysLeft}
              </span>
            )}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-gray-400">참가비</dt>
          <dd>{formatFee(minFee)}부터</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-gray-400">신청</dt>
          <dd>{tournament.entryCount}건</dd>
        </div>
      </dl>
    </button>
  );
}

export default TournamentCard;
