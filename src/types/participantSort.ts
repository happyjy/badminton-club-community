import { WorkoutParticipant } from './workout.types';

export type SortOption = 'createdAt' | 'localLevel' | 'nationalLevel' | 'name';

export interface ParticipantSortState {
  sortOption: SortOption;
  participants: WorkoutParticipant[];
  onChangeSort: (
    option: SortOption,
    updatedParticipants?: WorkoutParticipant[]
  ) => void;
}
