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
  // 기존 코드 (production용)
  // name,
  // birthDate: DEFAULT_DATE,
  // phoneNumber: '',
  // gender: '',
  // localTournamentLevel: '',
  // nationalTournamentLevel: '',
  // lessonPeriod: '',
  // playingPeriod: '',
  // privacyAgreement: false,
  // postType: isGuestApplication ? 'GUEST_REQUEST' : 'JOIN_INQUIRY_REQUEST',
  // ...(isGuestApplication && {
  //   intendToJoin: false,
  //   visitDate: DEFAULT_VISIT_DATE,
  // }),

  // 테스트용 초기화 데이터
  name: name || '홍길동',
  birthDate: '1995-03-15',
  phoneNumber: '010-1234-5678',
  gender: '남성',
  localTournamentLevel: 'C',
  nationalTournamentLevel: 'D',
  lessonPeriod: '2년',
  playingPeriod: '5년',
  privacyAgreement: true,
  postType: isGuestApplication ? 'GUEST_REQUEST' : 'JOIN_INQUIRY_REQUEST',
  ...(isGuestApplication && {
    intendToJoin: true,
    visitDate: DEFAULT_VISIT_DATE,
  }),
});
