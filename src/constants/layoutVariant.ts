/**
 * 화면의 뼈대 종류.
 * - member: 회원이 쓰는 화면. 기본.
 * - admin: 운영진이 쓰는 관리 화면. PC에서 넓고 글자가 한 단계 작다.
 * - bare: 메뉴가 없는 화면. 로그인, 계정 없는 외부인이 쓰는 대회 신청.
 */
export type LayoutVariant = 'member' | 'admin' | 'bare';

// Next의 router.pathname 꼴 ('/clubs/[id]/members')
const BARE = new Set([
  '/auth/login',
  '/clubs/[id]/tournaments/[tournamentId]/external-apply',
  '/clubs/[id]/tournaments/[tournamentId]/external-entry',
]);

const ADMIN = new Set([
  '/clubs/[id]/members',
  '/clubs/[id]/guest/check',
  '/clubs/[id]/custom',
  '/clubs/[id]/board/categories',
  '/clubs/[id]/tournaments/new',
  '/clubs/[id]/tournaments/[tournamentId]/admin',
  '/clubs/[id]/tournaments/[tournamentId]/edit',
]);

export function getLayoutVariant(pathname: string): LayoutVariant {
  if (BARE.has(pathname)) return 'bare';
  if (ADMIN.has(pathname)) return 'admin';
  return 'member';
}
