import { useState, useCallback } from 'react';

import { WorkoutParticipant } from '@/types';
import { ParticipantSortState, SortOption } from '@/types/participantSort';

export const useParticipantSort = (
  initialParticipants: WorkoutParticipant[]
): ParticipantSortState => {
  const [sortOption, setSortOption] = useState<SortOption>('createdAt');
  const [participants, setParticipants] =
    useState<WorkoutParticipant[]>(initialParticipants);

  const sortParticipants = useCallback(
    (
      option: SortOption,
      participantsToSort: WorkoutParticipant[] = participants
    ) => {
      const sorted = [...participantsToSort];

      switch (option) {
        case 'createdAt':
          return sorted.sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        case 'localLevel':
          return sorted.sort((a, b) => {
            const levelA = a.clubMember?.localTournamentLevel || 'Z';
            const levelB = b.clubMember?.localTournamentLevel || 'Z';
            return levelA.localeCompare(levelB);
          });
        case 'nationalLevel':
          return sorted.sort((a, b) => {
            const levelA = a.clubMember?.nationalTournamentLevel || 'Z';
            const levelB = b.clubMember?.nationalTournamentLevel || 'Z';
            return levelA.localeCompare(levelB);
          });
        case 'name':
          return sorted.sort((a, b) => {
            const nameA = a.clubMember?.name || a.User.nickname;
            const nameB = b.clubMember?.name || b.User.nickname;
            const surnameA = nameA.charAt(0);
            const surnameB = nameB.charAt(0);

            if (surnameA !== surnameB) {
              return surnameA.localeCompare(surnameB);
            }

            const levelA = a.clubMember?.nationalTournamentLevel || 'Z';
            const levelB = b.clubMember?.nationalTournamentLevel || 'Z';
            return levelA.localeCompare(levelB);
          });
        default:
          return sorted;
      }
    },
    [participants]
  );

  const onChangeSort = useCallback(
    (option: SortOption, updatedParticipants?: WorkoutParticipant[]) => {
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
  };
};
