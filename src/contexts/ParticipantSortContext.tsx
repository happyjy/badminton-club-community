import { createContext, useContext, ReactNode } from 'react';

import { useParticipantSort, SortOption } from '@/hooks/useParticipantSort';
import { WorkoutParticipant } from '@/types';

interface ParticipantSortContextType {
  sortOption: SortOption;
  participants: WorkoutParticipant[];
  onChangeSort: (option: SortOption) => void;
}

const ParticipantSortContext = createContext<ParticipantSortContextType | null>(
  null
);

interface ParticipantSortProviderProps {
  children: ReactNode;
  initialParticipants: WorkoutParticipant[];
}

export const ParticipantSortProvider = ({
  children,
  initialParticipants,
}: ParticipantSortProviderProps) => {
  const sortState = useParticipantSort(initialParticipants);

  return (
    <ParticipantSortContext.Provider value={sortState}>
      {children}
    </ParticipantSortContext.Provider>
  );
};

export const useParticipantSortContext = () => {
  const context = useContext(ParticipantSortContext);
  console.log(`🚨 ~ useParticipantSortContext ~ context:`, context);
  if (!context) {
    throw new Error(
      'useParticipantSortContext must be used within ParticipantSortProvider'
    );
  }
  return context;
};
