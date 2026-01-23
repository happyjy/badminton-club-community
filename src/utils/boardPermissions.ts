import { ClubMember } from '@/types';

/**
 * 카테고리별 게시글 작성 권한을 확인하는 함수
 * @param allowedRoles 카테고리에서 허용된 역할 배열
 * @param userRole 사용자의 역할
 * @returns 작성 권한 여부 (boolean)
 */
export function canCreatePostInCategory(
  allowedRoles: string[],
  userRole: string
): boolean {
  if (!allowedRoles || allowedRoles.length === 0) {
    return false;
  }

  return allowedRoles.includes(userRole);
}

/**
 * 게시글 수정/삭제 권한을 확인하는 함수
 * @param postAuthorId 게시글 작성자 ID
 * @param currentUserId 현재 사용자 ID
 * @param clubMember 클럽 멤버 정보
 * @returns 수정/삭제 권한 여부 (boolean)
 */
export function canEditPost(
  postAuthorId: number,
  currentUserId: number | undefined,
  clubMember: ClubMember | null | undefined
): boolean {
  if (!clubMember || !currentUserId) {
    return false;
  }

  // 본인 글인 경우
  if (postAuthorId === clubMember.id) {
    return true;
  }

  // 관리자인 경우 모든 게시글 수정/삭제 가능
  if (clubMember.role === 'ADMIN') {
    return true;
  }

  return false;
}

/**
 * 게시글 고정 권한을 확인하는 함수
 * @param clubMember 클럽 멤버 정보
 * @returns 고정 권한 여부 (boolean)
 */
export function canPinPost(
  clubMember: ClubMember | null | undefined
): boolean {
  if (!clubMember) {
    return false;
  }

  return clubMember.role === 'ADMIN';
}

/**
 * 카테고리 관리 권한을 확인하는 함수
 * @param clubMember 클럽 멤버 정보
 * @returns 카테고리 관리 권한 여부 (boolean)
 */
export function canManageCategory(
  clubMember: ClubMember | null | undefined
): boolean {
  if (!clubMember) {
    return false;
  }

  return clubMember.role === 'ADMIN';
}
