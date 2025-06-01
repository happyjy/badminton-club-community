import { createContext, useContext, ReactNode } from 'react';

import { useParticipantSort } from '@/hooks/useParticipantSort';
import { ParticipantSortState, SortOption } from '@/types/participantSort';
import { SortableItem } from '@/types/sortable';

const ParticipantSortContext = createContext<ParticipantSortState | null>(null);

interface ParticipantSortProviderProps {
  children: ReactNode;
  initialParticipants: SortableItem[];
  initialSortOption?: SortOption;
}

export const ParticipantSortProvider = ({
  children,
  initialParticipants,
  initialSortOption,
}: ParticipantSortProviderProps) => {
  const sortState = useParticipantSort({
    initialParticipants,
    initialSortOption,
  });

  return (
    <ParticipantSortContext.Provider value={sortState}>
      {children}
    </ParticipantSortContext.Provider>
  );
};

export const useParticipantSortContext = () => {
  const context = useContext(ParticipantSortContext);
  if (!context) {
    throw new Error(
      'useParticipantSortContext must be used within ParticipantSortProvider'
    );
  }
  return context;
};
