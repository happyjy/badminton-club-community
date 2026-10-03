import { Users } from 'lucide-react';

import { ListRow } from '@/components/molecules/list/ListRow';

import { Club } from '@/types';

interface ClubListItemProps {
  club: Club;
}

/** 클럽 목록의 한 줄. ListGroup 안에 넣어 쓴다. */
export function ClubListItem({ club }: ClubListItemProps) {
  return (
    <ListRow
      href={`/clubs/${club.id}`}
      title={club.name}
      trailing={
        <span className="flex items-center gap-1 text-callout tabular-nums text-secondary">
          <Users aria-hidden className="h-4 w-4" />
          {club.approvedMemberCount || 0}명
        </span>
      }
    />
  );
}
