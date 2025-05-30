import { WorkoutParticipant } from './workout';

export type SortOption = 'createdAt' | 'localLevel' | 'nationalLevel' | 'name';

export interface ParticipantSortState {
  sortOption: SortOption;
  participants: WorkoutParticipant[];
  onChangeSort: (option: SortOption) => void;
}
