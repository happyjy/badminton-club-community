import { ClubMember } from '@/types';

/**
 * 클럽 관리자 권한을 확인하는 함수
 * @param clubMember 클럽 멤버 정보
 * @returns 관리자 권한 여부 (boolean)
 */
export const checkClubAdminPermission = (clubMember: ClubMember) => {
  return clubMember?.role === 'ADMIN';
};

/**
 * 클럽 멤버 권한을 확인하는 함수
 * @param clubMember 클럽 멤버 정보
 * @returns 멤버 권한 여부 (boolean)
 */
export const checkClubMemberPermission = (clubMember: ClubMember) => {
  return clubMember?.role === 'MEMBER';
};
