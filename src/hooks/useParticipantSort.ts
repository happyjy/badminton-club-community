import { useState, useCallback } from 'react';

import { SortOption } from '@/types/participantSort';
import { SortableItem } from '@/types/sortable';

interface UseParticipantSortProps {
  initialSortOption?: SortOption;
  initialParticipants?: SortableItem[];
}

// 타입 가드 함수
function isWorkoutParticipant(
  item: SortableItem
): item is SortableItem & { clubMember: { name?: string } } {
  return 'clubMember' in item;
}

function isClubMemberWithUser(item: SortableItem): item is SortableItem & {
  clubMember: {
    name?: string;
    localTournamentLevel?: string;
    nationalTournamentLevel?: string;
    birthDate?: string;
  };
} {
  return 'clubMember' in item;
}

// 이름 가져오는 유틸리티 함수
const getName = (item: SortableItem): string => {
  if (isWorkoutParticipant(item) || isClubMemberWithUser(item)) {
    return item.clubMember.name || '';
  }
  return '';
};

export function useParticipantSort({
  initialParticipants = [],
  initialSortOption = 'createdAt',
}: UseParticipantSortProps = {}) {
  const [sortOption, setSortOption] = useState<SortOption>(initialSortOption);
  const [participants, setParticipants] =
    useState<SortableItem[]>(initialParticipants);

  const sortParticipants = useCallback(
    (option: SortOption, participantsToSort: SortableItem[] = participants) => {
      const sorted = [...participantsToSort];
      const collator = new Intl.Collator('ko-KR', { sensitivity: 'base' });

      // 이름 정렬 함수 (공통으로 사용)
      const sortByName = (a: SortableItem, b: SortableItem) => {
        const nameA = getName(a);
        const nameB = getName(b);
        return collator.compare(nameA, nameB);
      };

      switch (option) {
        case 'name':
          return sorted.sort(sortByName);
        case 'createdAt':
          return sorted.sort((a, b) => {
            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();
            return dateA === dateB ? sortByName(a, b) : dateA - dateB;
          });
        case 'localLevel':
          return sorted.sort((a, b) => {
            if (isClubMemberWithUser(a) && isClubMemberWithUser(b)) {
              const levelA = a.clubMember.localTournamentLevel || 'Z';
              const levelB = b.clubMember.localTournamentLevel || 'Z';
              return levelA === levelB
                ? sortByName(a, b)
                : levelA.localeCompare(levelB);
            }
            return 0;
          });
        case 'nationalLevel':
          return sorted.sort((a, b) => {
            if (isClubMemberWithUser(a) && isClubMemberWithUser(b)) {
              const levelA = a.clubMember.nationalTournamentLevel || 'Z';
              const levelB = b.clubMember.nationalTournamentLevel || 'Z';
              return levelA === levelB
                ? sortByName(a, b)
                : levelA.localeCompare(levelB);
            }
            return 0;
          });
        case 'birthDate':
          return sorted.sort((a, b) => {
            if (isClubMemberWithUser(a) && isClubMemberWithUser(b)) {
              const dateA = a.clubMember.birthDate || '';
              const dateB = b.clubMember.birthDate || '';
              return dateA === dateB
                ? sortByName(a, b)
                : dateA.localeCompare(dateB);
            }
            return 0;
          });
        default:
          return sorted;
      }
    },
    [participants]
  );

  const onChangeSort = useCallback(
    (option: SortOption, updatedParticipants?: SortableItem[]) => {
      setSortOption(option);
      if (updatedParticipants) {
        setParticipants(sortParticipants(option, updatedParticipants));
      } else {
        setParticipants(sortParticipants(option));
      }
    },
    [sortParticipants]
  );

  return {
    sortOption,
    participants,
    onChangeSort,
    setSortOption,
  };
}
