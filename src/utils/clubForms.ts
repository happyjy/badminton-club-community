import { ClubJoinFormData } from '@/types/club.types';

export const TOURNAMENT_LEVELS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
export const DEFAULT_DATE = '1990-01-01';
export const DEFAULT_VISIT_DATE = new Date().toISOString().split('T')[0];

export const createInitialFormData = ({
  name = '',
  isGuestApplication = false,
}: {
  name?: string;
  isGuestApplication?: boolean;
}): ClubJoinFormData => ({
  name,
  birthDate: DEFAULT_DATE,
  phoneNumber: '',
  localTournamentLevel: '',
  nationalTournamentLevel: '',
  lessonPeriod: '',
  playingPeriod: '',
  privacyAgreement: false,
  ...(isGuestApplication && {
    intendToJoin: false,
    visitDate: DEFAULT_VISIT_DATE,
  }),
});
