import { SortableItem } from './sortable';

export type SortOption =
  | 'createdAt'
  | 'localLevel'
  | 'nationalLevel'
  | 'name'
  | 'birthDate';

export interface ParticipantSortState {
  sortOption: SortOption;
  participants: SortableItem[];
  onChangeSort: (
    option: SortOption,
    updatedParticipants?: SortableItem[]
  ) => void;
  setSortOption: (option: SortOption) => void;
}
