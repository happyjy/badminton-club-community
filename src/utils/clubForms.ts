import { ClubJoinFormData } from '@/types/club.types';

export const TOURNAMENT_LEVELS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
export const DEFAULT_DATE = '1990-01-01';
export const DEFAULT_VISIT_DATE = new Date().toISOString().split('T')[0];

export const getVisitDate = (isClubMember: boolean) => {
  if (isClubMember) {
    // 게스트 신청: 오늘 날짜
    return new Date().toISOString().split('T')[0];
  } else {
    // 클럽 가입 문의: 내일 날짜
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }
};

export const createInitialFormData = ({
  name = '',
  isGuestApplication = false,
  isClubMember = false,
}: {
  name?: string;
  isGuestApplication?: boolean;
  isClubMember?: boolean;
}): ClubJoinFormData => {
  // postType에 따른 visitDate 설정

  return {
    // 기존 코드 (production용)
    name,
    birthDate: DEFAULT_DATE,
    phoneNumber: '',
    gender: '',
    localTournamentLevel: '',
    nationalTournamentLevel: '',
    lessonPeriod: '',
    playingPeriod: '',
    privacyAgreement: false,
    postType: isGuestApplication ? 'GUEST_REQUEST' : 'JOIN_INQUIRY_REQUEST',
    ...(isGuestApplication && {
      intendToJoin: false,
      visitDate: getVisitDate(isClubMember),
    }),

    // 테스트용 코드
    /* name: name || '홍길동',
    birthDate: '1995-03-15',
    phoneNumber: '010-6636-8962',
    gender: '남성',
    localTournamentLevel: 'C',
    nationalTournamentLevel: 'D',
    lessonPeriod: '2년',
    playingPeriod: '5년',
    privacyAgreement: true,
    postType: isGuestApplication ? 'GUEST_REQUEST' : 'JOIN_INQUIRY_REQUEST',
    ...(isGuestApplication && {
      intendToJoin: true,
      visitDate: getVisitDate(isClubMember),
    }), */
  };
};
