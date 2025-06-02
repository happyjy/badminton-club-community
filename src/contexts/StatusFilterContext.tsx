import { createContext, useContext, useState, ReactNode } from 'react';

import { Status } from '@/types/enums';

interface StatusFilter {
  included: Status[];
  excluded: Status[];
}

interface StatusFilterContextType {
  statusFilters: StatusFilter;
  toggleStatusFilter: (status: Status, type: 'included' | 'excluded') => void;
  clearStatusFilters: () => void;
}

const StatusFilterContext = createContext<StatusFilterContextType | undefined>(
  undefined
);

export function StatusFilterProvider({ children }: { children: ReactNode }) {
  const [statusFilters, setStatusFilters] = useState<StatusFilter>({
    included: [],
    excluded: [],
  });

  const toggleStatusFilter = (
    status: Status,
    type: 'included' | 'excluded'
  ) => {
    setStatusFilters((prev) => {
      const newFilters = { ...prev };
      const targetArray = newFilters[type];
      const otherArray =
        newFilters[type === 'included' ? 'excluded' : 'included'];

      // 이미 선택된 상태인 경우 제거
      if (targetArray.includes(status)) {
        newFilters[type] = targetArray.filter((s) => s !== status);
      } else {
        // 다른 배열에서 제거하고 현재 배열에 추가
        newFilters[type] = [...targetArray, status];
        newFilters[type === 'included' ? 'excluded' : 'included'] =
          otherArray.filter((s) => s !== status);
      }

      return newFilters;
    });
  };

  const clearStatusFilters = () => {
    setStatusFilters({
      included: [],
      excluded: [],
    });
  };

  return (
    <StatusFilterContext.Provider
      value={{ statusFilters, toggleStatusFilter, clearStatusFilters }}
    >
      {children}
    </StatusFilterContext.Provider>
  );
}

export function useStatusFilter() {
  const context = useContext(StatusFilterContext);
  if (context === undefined) {
    throw new Error(
      'useStatusFilter must be used within a StatusFilterProvider'
    );
  }
  return context;
}
