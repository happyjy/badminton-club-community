import { STATUS_CLASS, STATUS_LABEL } from '@/lib/tournament/display';
import type { TournamentEffectiveStatus } from '@/types/tournament.types';

interface TournamentStatusBadgeProps {
  status: TournamentEffectiveStatus;
}

function TournamentStatusBadge({ status }: TournamentStatusBadgeProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export default TournamentStatusBadge;
