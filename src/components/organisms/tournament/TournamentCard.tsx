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
      className="w-full rounded-md bg-surface p-4 text-left transition-colors duration-150 active:bg-fill"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 break-words text-headline text-primary">
          {tournament.title}
        </h3>
        <TournamentStatusBadge status={tournament.effectiveStatus} />
      </div>

      {tournament.hostName && (
        <p className="mt-0.5 text-footnote text-secondary">
          {tournament.hostName}
        </p>
      )}

      <dl className="mt-3 space-y-1 text-callout text-primary">
        {tournament.tournamentDate && (
          <div className="flex gap-2">
            <dt className="w-12 shrink-0 text-secondary">대회일</dt>
            <dd>{tournament.tournamentDate}</dd>
          </div>
        )}
        <div className="flex gap-2">
          <dt className="w-12 shrink-0 text-secondary">마감</dt>
          <dd>
            {new Date(tournament.applyDeadline).toLocaleDateString('ko-KR')}
            {tournament.effectiveStatus === 'OPEN' && daysLeft >= 0 && (
              <span className="ml-1 font-semibold text-negative">
                D-{daysLeft}
              </span>
            )}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-12 shrink-0 text-secondary">참가비</dt>
          <dd>{formatFee(minFee)}부터</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-12 shrink-0 text-secondary">신청</dt>
          <dd>{tournament.entryCount}건</dd>
        </div>
      </dl>
    </button>
  );
}

export default TournamentCard;
