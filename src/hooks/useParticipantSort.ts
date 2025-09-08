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
    gender?: string;
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

// 성별 가져오는 유틸리티 함수
const getGender = (item: SortableItem): string => {
  if (isClubMemberWithUser(item)) {
    return item.clubMember.gender || '';
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

      // 성별 우선순위 정의 (남성 > 여성 > 기타)
      const getGenderPriority = (gender: string): number => {
        if (gender === '남성') return 1;
        if (gender === '여성') return 2;
        return 3;
      };

      // 성별로 정렬하는 공통 함수
      const sortByGender = (a: SortableItem, b: SortableItem): number => {
        const genderA = getGender(a);
        const genderB = getGender(b);
        const priorityA = getGenderPriority(genderA);
        const priorityB = getGenderPriority(genderB);
        return priorityA - priorityB;
      };

      // 이름 정렬 함수 (이름만으로 정렬)
      const sortByName = (a: SortableItem, b: SortableItem) => {
        const nameA = getName(a);
        const nameB = getName(b);
        return collator.compare(nameA, nameB);
      };

      // 레벨 정렬 공통 함수
      const sortByLevel = (
        a: SortableItem,
        b: SortableItem,
        levelField: 'localTournamentLevel' | 'nationalTournamentLevel',
        fallbackSort: (a: SortableItem, b: SortableItem) => number
      ): number => {
        if (isClubMemberWithUser(a) && isClubMemberWithUser(b)) {
          const levelA = a.clubMember[levelField] || 'Z';
          const levelB = b.clubMember[levelField] || 'Z';
          return levelA === levelB
            ? fallbackSort(a, b)
            : levelA.localeCompare(levelB);
        }
        return 0;
      };

      // 생년월일 정렬 함수
      const sortByBirthDate = (a: SortableItem, b: SortableItem) => {
        if (isClubMemberWithUser(a) && isClubMemberWithUser(b)) {
          const dateA = a.clubMember.birthDate || '';
          const dateB = b.clubMember.birthDate || '';
          return dateA === dateB
            ? sortByGenderAndName(a, b)
            : dateA.localeCompare(dateB);
        }
        return 0;
      };

      // 생성일 정렬 함수
      const sortByCreatedAt = (a: SortableItem, b: SortableItem) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateA === dateB ? sortByGenderAndName(a, b) : dateA - dateB;
      };

      // 성별 → 이름 순으로 정렬하는 함수
      const sortByGenderAndName = (a: SortableItem, b: SortableItem) => {
        const genderResult = sortByGender(a, b);
        return genderResult !== 0 ? genderResult : sortByName(a, b);
      };

      // 성별 → 전국대회 레벨 순으로 정렬하는 함수
      const sortByGenderAndNationalLevel = (
        a: SortableItem,
        b: SortableItem
      ) => {
        const genderResult = sortByGender(a, b);
        if (genderResult !== 0) return genderResult;

        // 성별이 같으면 전국대회 레벨로 정렬
        return sortByLevel(a, b, 'nationalTournamentLevel', sortByName);
      };

      switch (option) {
        case 'name':
          return sorted.sort(sortByName);
        case 'gender':
          return sorted.sort(sortByGenderAndNationalLevel);
        case 'localLevel':
          return sorted.sort((a, b) =>
            sortByLevel(a, b, 'localTournamentLevel', sortByGenderAndName)
          );
        case 'nationalLevel':
          return sorted.sort((a, b) =>
            sortByLevel(a, b, 'nationalTournamentLevel', sortByGenderAndName)
          );
        case 'birthDate':
          return sorted.sort(sortByBirthDate);
        case 'createdAt':
          return sorted.sort(sortByCreatedAt);
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
