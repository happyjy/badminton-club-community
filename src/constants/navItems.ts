import {
  CalendarCheck,
  ClipboardCheck,
  Home,
  type LucideIcon,
  MessageSquare,
  Settings,
  Trophy,
  UserPlus,
  Users,
} from 'lucide-react';

import { getGuestPageStrategy } from '@/strategies/GuestPageStrategy';

/**
 * 앱의 메뉴 항목. 하단 탭바·PC 사이드바·더보기 시트가 모두 이 목록을 그린다.
 * "누가 무엇을 볼 수 있는가"는 여기에서만 정한다.
 */
export interface NavItem {
  key: string;
  label: string;
  /** 하단 탭에 쓰는 짧은 이름. 없으면 label */
  tabLabel?: string;
  href: string;
  icon: LucideIcon;
  /** admin은 운영진에게만 보이는 관리 구역 */
  section: 'main' | 'admin';
  /** 휴대폰 하단 탭에 올릴지. false면 '더보기' 안에 들어간다 */
  tab: boolean;
  /** 지금 주소가 이 항목에 속하는가 */
  isActive: (path: string) => boolean;
}

export interface NavContext {
  clubId: string;
  /** 이 클럽의 회원인가 */
  isMember: boolean;
  /** 이 클럽의 운영진(role === 'ADMIN')인가 */
  isAdmin: boolean;
  /** 클럽 설정에서 대회 메뉴를 켜 두었는가 */
  tournamentMenuEnabled: boolean;
}

/** 쿼리·해시·끝 슬래시를 뗀 경로 */
export function normalizePath(path: string): string {
  return path.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
}

/** prefix 자신이거나 그 아래 경로인가. '/board'가 '/boardgames'에 걸리지 않게 한다. */
function isUnder(path: string, prefix: string): boolean {
  const current = normalizePath(path);
  return current === prefix || current.startsWith(`${prefix}/`);
}

export function getNavItems({
  clubId,
  isMember,
  isAdmin,
  tournamentMenuEnabled,
}: NavContext): NavItem[] {
  const base = `/clubs/${clubId}`;
  const items: NavItem[] = [];

  items.push({
    key: 'home',
    label: '홈',
    href: base,
    icon: Home,
    section: 'main',
    tab: true,
    isActive: (path) => normalizePath(path) === base,
  });

  if (isMember) {
    items.push({
      key: 'attendance',
      label: '출석체크',
      tabLabel: '출석',
      href: `${base}/attendance`,
      icon: CalendarCheck,
      section: 'main',
      tab: true,
      // 운동 상세는 출석체크에서 들어가는 화면이다.
      isActive: (path) =>
        isUnder(path, `${base}/attendance`) ||
        isUnder(path, `${base}/workouts`),
    });
  }

  items.push({
    key: 'guest',
    // 회원에게는 '게스트', 비회원에게는 '가입 문의'
    label: getGuestPageStrategy(isMember).getNavMenuName(),
    href: `${base}/guest`,
    icon: UserPlus,
    section: 'main',
    tab: true,
    // 게스트 확인은 운영진용 별도 메뉴다.
    isActive: (path) =>
      isUnder(path, `${base}/guest`) && !isUnder(path, `${base}/guest/check`),
  });

  if (isMember) {
    items.push({
      key: 'board',
      label: '게시판',
      href: `${base}/board`,
      icon: MessageSquare,
      section: 'main',
      tab: true,
      isActive: (path) => isUnder(path, `${base}/board`),
    });

    if (tournamentMenuEnabled) {
      items.push({
        key: 'tournaments',
        label: '대회',
        href: `${base}/tournaments`,
        icon: Trophy,
        section: 'main',
        tab: false,
        isActive: (path) => isUnder(path, `${base}/tournaments`),
      });
    }
  }

  if (isAdmin) {
    items.push(
      {
        key: 'members',
        label: '회원',
        href: `${base}/members`,
        icon: Users,
        section: 'admin',
        tab: false,
        isActive: (path) => isUnder(path, `${base}/members`),
      },
      {
        key: 'guestCheck',
        label: '게스트 확인',
        href: `${base}/guest/check`,
        icon: ClipboardCheck,
        section: 'admin',
        tab: false,
        isActive: (path) => isUnder(path, `${base}/guest/check`),
      },
      {
        key: 'custom',
        label: '클럽 설정',
        href: `${base}/custom`,
        icon: Settings,
        section: 'admin',
        tab: false,
        isActive: (path) => isUnder(path, `${base}/custom`),
      }
    );
  }

  return items;
}
