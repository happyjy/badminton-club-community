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
): item is SortableItem & { User: { nickname?: string } } {
  return 'User' in item;
}

function isClubMemberWithUser(item: SortableItem): item is SortableItem & {
  nickname: string;
  clubMember: {
    localTournamentLevel?: string;
    nationalTournamentLevel?: string;
    birthDate?: string;
  };
} {
  return 'nickname' in item && 'clubMember' in item;
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
        const collator = new Intl.Collator('ko-KR', { sensitivity: 'base' });

        // WorkoutParticipant인 경우
        if (isWorkoutParticipant(a) && isWorkoutParticipant(b)) {
          const nameA = a.clubMember.name || '';
          const nameB = b.clubMember.name || '';
          return collator.compare(nameA, nameB);
        }
        // ClubMemberWithUser인 경우
        if (isClubMemberWithUser(a) && isClubMemberWithUser(b)) {
          const nameA = a.clubMember.name || '';
          const nameB = b.clubMember.name || '';
          return collator.compare(nameA, nameB);
        }
        return 0; // 타입이 일치하지 않는 경우
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
            // WorkoutParticipant인 경우
            if (isWorkoutParticipant(a) && isWorkoutParticipant(b)) {
              const levelA = a.clubMember?.localTournamentLevel || 'Z';
              const levelB = b.clubMember?.localTournamentLevel || 'Z';
              return levelA === levelB
                ? sortByName(a, b)
                : levelA.localeCompare(levelB);
            }
            // ClubMemberWithUser인 경우
            if (isClubMemberWithUser(a) && isClubMemberWithUser(b)) {
              const levelA = a.clubMember.localTournamentLevel || 'Z';
              const levelB = b.clubMember.localTournamentLevel || 'Z';
              return levelA === levelB
                ? sortByName(a, b)
                : levelA.localeCompare(levelB);
            }
            return 0; // 타입이 일치하지 않는 경우
          });
        case 'nationalLevel':
          return sorted.sort((a, b) => {
            // WorkoutParticipant인 경우
            if (isWorkoutParticipant(a) && isWorkoutParticipant(b)) {
              const levelA = a.clubMember?.nationalTournamentLevel || 'Z';
              const levelB = b.clubMember?.nationalTournamentLevel || 'Z';
              return levelA === levelB
                ? sortByName(a, b)
                : levelA.localeCompare(levelB);
            }
            // ClubMemberWithUser인 경우
            if (isClubMemberWithUser(a) && isClubMemberWithUser(b)) {
              const levelA = a.clubMember.nationalTournamentLevel || 'Z';
              const levelB = b.clubMember.nationalTournamentLevel || 'Z';
              return levelA === levelB
                ? sortByName(a, b)
                : levelA.localeCompare(levelB);
            }
            return 0; // 타입이 일치하지 않는 경우
          });
        case 'birthDate':
          return sorted.sort((a, b) => {
            // WorkoutParticipant인 경우
            if (isWorkoutParticipant(a) && isWorkoutParticipant(b)) {
              const dateA = a.clubMember?.birthDate || '';
              const dateB = b.clubMember?.birthDate || '';
              return dateA === dateB
                ? sortByName(a, b)
                : dateA.localeCompare(dateB);
            }
            // ClubMemberWithUser인 경우
            if (isClubMemberWithUser(a) && isClubMemberWithUser(b)) {
              const dateA = a.clubMember.birthDate || '';
              const dateB = b.clubMember.birthDate || '';
              return dateA === dateB
                ? sortByName(a, b)
                : dateA.localeCompare(dateB);
            }
            return 0; // 타입이 일치하지 않는 경우
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
