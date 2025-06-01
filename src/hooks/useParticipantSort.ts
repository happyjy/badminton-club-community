import { useState, useCallback } from 'react';

import { SortOption } from '@/types/participantSort';
import { SortableItem } from '@/types/sortable';

interface UseParticipantSortProps {
  initialSortOption?: SortOption;
  initialParticipants?: SortableItem[];
}

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

      // 이름 정렬 함수 (공통으로 사용)
      const sortByName = (a: SortableItem, b: SortableItem) => {
        const nameA = a.clubMember?.name || a?.User?.nickname || '';
        const nameB = b.clubMember?.name || b?.User?.nickname || '';
        return nameA.localeCompare(nameB, 'ko-KR');
      };

      switch (option) {
        case 'name':
          return sorted.sort((a, b) => {
            const nameA = a.clubMember?.name || a?.User?.nickname || '';
            const nameB = b.clubMember?.name || b?.User?.nickname || '';
            return nameA.localeCompare(nameB, 'ko-KR');
          });
        case 'createdAt':
          return sorted.sort((a, b) => {
            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();
            return dateA === dateB ? sortByName(a, b) : dateA - dateB;
          });
        case 'localLevel':
          return sorted.sort((a, b) => {
            const levelA = a.clubMember?.localTournamentLevel || 'Z';
            const levelB = b.clubMember?.localTournamentLevel || 'Z';
            return levelA === levelB
              ? sortByName(a, b)
              : levelA.localeCompare(levelB);
          });
        case 'nationalLevel':
          return sorted.sort((a, b) => {
            const levelA = a.clubMember?.nationalTournamentLevel || 'Z';
            const levelB = b.clubMember?.nationalTournamentLevel || 'Z';
            return levelA === levelB
              ? sortByName(a, b)
              : levelA.localeCompare(levelB);
          });
        case 'birthDate':
          return sorted.sort((a, b) => {
            const dateA = a.clubMember?.birthDate || '';
            const dateB = b.clubMember?.birthDate || '';
            return dateA === dateB
              ? sortByName(a, b)
              : dateA.localeCompare(dateB);
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
