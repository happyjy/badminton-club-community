# 앱 뼈대 (3단계) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 상단 탭과 햄버거 메뉴를 없애고, 메뉴 목록 하나를 휴대폰에서는 하단 탭바로, PC에서는 왼쪽 사이드바로 보여 준다.

**Architecture:** 메뉴 항목은 순수 함수 `getNavItems()` 하나가 만든다(누가 무엇을 볼 수 있는지의 규칙이 여기에만 있다). 탭바·사이드바·더보기 시트는 그 목록과 현재 경로를 props로 받아 그리기만 하는 컴포넌트다. 폭에 따른 전환은 CSS(`lg:hidden` / `hidden lg:flex`)로만 한다. `Layout`이 데이터(로그인, 클럽, 회원 여부)를 읽어 `AppShell`에 넘긴다.

**Tech Stack:** Next.js 15 (pages router) · React 19 · Redux Toolkit · TanStack Query · Tailwind CSS 3.4 · lucide-react · Jest 30 + @testing-library/react 16

**Spec:** `docs/superpowers/specs/2026-10-03-design-system-design.md` (5장 앱 뼈대, 7장 3단계)
**앞 계획:** `2026-10-03-design-system-foundation.md`, `2026-10-03-design-system-adoption.md` (부품의 props)

## 범위

| 포함 | 제외 (어느 단계에서 하는지) |
| --- | --- |
| `getNavItems`, 하단 탭바, PC 사이드바, 더보기 시트, 휴대폰 상단 바 | 페이지마다 제각각인 안쪽 여백(`p-6` 등) 정리 → 4단계에서 화면을 옮길 때 함께 (같은 파일을 두 번 고치지 않기 위해) |
| `Layout`의 세 가지 모양(`member` · `admin` · `bare`) | 회원용 화면의 PC 폭을 `max-w-2xl`로 좁히기 → 4단계 (지금 화면들은 넓은 표가 있어 좁히면 깨진다) |
| `PageHeader` 부품 (만들기만. 각 화면에 넣는 것은 4단계) | 입력 중 탭바 숨기기, 태블릿 아이콘 레일 → 필요해지면 |
| 토스트 위치 고정 | 회비 메뉴 → 회비 기능을 만들 때 |
| `MainNavigation` · `SideMenu` · `ClubNavigation` 삭제 | `theme-color`, PWA 정리 → 설계 L4 |

## Global Constraints

- 부품에는 색 값과 Tailwind 기본 색 이름을 쓰지 않는다. 토큰 클래스만 쓴다. 토큰 색에 투명도 수식(`bg-surface/90`)을 쓰지 않는다.
- 폭에 따른 전환은 CSS로만 한다. 렌더 중에 `window.innerWidth`를 읽지 않는다.
- 메뉴는 모두 `<Link>`다. 버튼 + `router.push`를 쓰지 않는다.
- 누를 수 있는 요소의 터치 영역은 44 × 44 이상. 아이콘은 `lucide-react`.
- **지금 메뉴에서 갈 수 있던 곳은 모두 새 메뉴에서도 갈 수 있어야 한다:** 홈, 출석체크, 게스트(비회원은 "가입 문의"), 게시판, 대회, 게스트 확인, 회원 관리, 커스텀 설정, 프로필, 클럽 목록, 로그인, 로그아웃.
- **누가 무엇을 보는지는 지금과 같다:** 비회원은 홈·가입 문의만. 회원은 출석체크·게시판·대회(클럽 설정에서 끄면 숨김)가 더해진다. 운영진(`role === 'ADMIN'`)은 관리 메뉴가 더해진다.
- 테스트는 `@jest/globals`에서 가져오고 `@testing-library/jest-dom` 매처를 쓰지 않는다.
- 타입 검사: `npx tsc --noEmit` — `src/lib/sms-notification.test.ts`의 기존 오류 13건 외에 새 오류가 없어야 한다.
- 전체 테스트: `npx jest "$(pwd)/src"` — 같은 파일의 기존 실패 6건 외에 실패가 없어야 한다.
- `npm run build`는 마지막 과제에서만. 빌드가 바꾸는 `public/` 아래 파일은 커밋하지 않고 되돌린다.
- DB를 건드리지 않는다. `prisma` 명령을 실행하지 않는다.
- 커밋 메시지는 한국어 `feat(ui): …`. AI 도구 서명을 넣지 않는다. 브랜치는 `feat/design-system-foundation`에서 이어서.

## Review Focus

1. **회원 정보가 아직 안 온 순간** — 로그인한 회원도 첫 화면에서는 잠깐 비회원으로 보인다. 그 사이 탭이 2칸이었다가 5칸으로 바뀌는 것은 지금도 같지만, 탭바가 깨지거나 오류가 나면 안 된다. (Task 1, 3)
2. **주소에 쿼리·해시·끝 슬래시가 붙는다** — `/clubs/1/board?page=2`, `/clubs/1/` 에서도 맞는 탭이 켜져야 한다. `/clubs/1/guest/check`에서 "게스트" 탭이 켜지면 안 된다. `/clubs/10`에서 `/clubs/1`의 항목이 켜지면 안 된다. (Task 1)
3. **탭에 없는 화면에 있을 때** — 대회·회원 관리·클럽 설정 화면에서는 휴대폰의 "더보기"가 켜져야 한다. 어느 탭도 켜지지 않으면 어디 있는지 알 수 없다. (Task 3)
4. **클럽 밖의 화면** — `/clubs`(클럽 목록), `/profile`, `/`에는 클럽이 없다. 탭바 없이도 로그인·로그아웃·프로필·클럽 목록에 갈 수 있어야 한다. (Task 3, 4)
5. **클럽 이름이 아주 길다 / 아직 없다** — 상단 바와 사이드바에서 한 줄로 잘리고 레이아웃이 밀리지 않아야 한다. 이름을 못 받았으면 "배드민턴 클럽"이 보인다. (Task 3)

---

## File Structure

| 파일 | 하는 일 | 과제 |
| --- | --- | --- |
| `src/constants/navItems.ts` (신규) | 메뉴 항목과 "누가 무엇을 보는가" 규칙, 현재 위치 판정 | 1 |
| `src/constants/layoutVariant.ts` (신규) | 경로 → `member` · `admin` · `bare` | 1 |
| `src/hooks/useSyncClubMember.ts` (신규) | 현재 클럽의 회원 정보를 스토어에 넣는다 (`ClubNavigation`에 있던 것) | 2 |
| `src/hooks/useAuthActions.ts` (신규) | 로그인·로그아웃 (`SideMenu`에 있던 것) | 2 |
| `src/components/organisms/navigation/BottomTabBar.tsx` (신규) | 휴대폰 하단 탭바 | 3 |
| `src/components/organisms/navigation/Sidebar.tsx` (신규) | PC 왼쪽 사이드바 | 3 |
| `src/components/organisms/navigation/MoreSheet.tsx` (신규) | 더보기 시트 | 3 |
| `src/components/organisms/navigation/MobileHeader.tsx` (신규) | 휴대폰 상단 바 | 3 |
| `src/components/organisms/PageHeader.tsx` (신규) | 화면 제목 영역 | 3 |
| `src/components/templates/AppShell.tsx` (신규) | 위의 것들을 배치 | 4 |
| `src/components/templates/Layout.tsx` (수정) | 데이터를 읽어 `AppShell`에 넘김 | 4 |
| `src/pages/_app.tsx` (수정) | 토스트 위치 | 4 |
| `src/styles/globals.css`, `tailwind.config.ts` (수정) | `--tabbar-h`, `tabbar` 색 | 3 |
| `navigation/mainNavigation/*`, `navigation/clubNavigation/ClubNavigation.tsx`와 그 테스트 (삭제) | 옛 메뉴 | 4 |

---

### Task 1: 메뉴 항목 규칙과 화면 종류 판정

**Files:**
- Create: `src/constants/navItems.ts`
- Create: `src/constants/layoutVariant.ts`
- Test: `src/__tests__/constants/navItems.test.ts`
- Test: `src/__tests__/constants/layoutVariant.test.ts`

**Interfaces:**
- Produces:
  - `interface NavItem { key: string; label: string; tabLabel?: string; href: string; icon: LucideIcon; section: 'main' | 'admin'; tab: boolean; isActive: (path: string) => boolean }`
  - `interface NavContext { clubId: string; isMember: boolean; isAdmin: boolean; tournamentMenuEnabled: boolean }`
  - `getNavItems(context: NavContext): NavItem[]`
  - `normalizePath(path: string): string`
  - `type LayoutVariant = 'member' | 'admin' | 'bare'`
  - `getLayoutVariant(pathname: string): LayoutVariant` — `pathname`은 Next의 `router.pathname`(`/clubs/[id]/members` 꼴)

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// FILE: src/__tests__/constants/navItems.test.ts
import { describe, expect, it } from '@jest/globals';

import { getNavItems, NavContext, normalizePath } from '@/constants/navItems';

const member: NavContext = {
  clubId: '1',
  isMember: true,
  isAdmin: false,
  tournamentMenuEnabled: true,
};

const keys = (context: NavContext) =>
  getNavItems(context).map((item) => item.key);
const find = (context: NavContext, key: string) => {
  const item = getNavItems(context).find((candidate) => candidate.key === key);
  if (!item) throw new Error(`${key} 항목이 없다`);
  return item;
};

describe('getNavItems — 누가 무엇을 보는가', () => {
  it('비회원은 홈과 가입 문의만 본다', () => {
    const context = { ...member, isMember: false };

    expect(keys(context)).toEqual(['home', 'guest']);
    expect(find(context, 'guest').label).toBe('가입 문의');
  });

  it('회원은 홈·출석체크·게스트·게시판·대회를 이 순서로 본다', () => {
    expect(keys(member)).toEqual([
      'home',
      'attendance',
      'guest',
      'board',
      'tournaments',
    ]);
    expect(find(member, 'guest').label).toBe('게스트');
  });

  it('운영진은 관리 메뉴(회원·게스트 확인·클럽 설정)가 더해진다', () => {
    const admin = getNavItems({ ...member, isAdmin: true });

    expect(
      admin.filter((item) => item.section === 'admin').map((item) => item.key)
    ).toEqual(['members', 'guestCheck', 'custom']);
  });

  it('회원에게는 관리 메뉴가 없다', () => {
    expect(getNavItems(member).some((item) => item.section === 'admin')).toBe(
      false
    );
  });

  it('대회 메뉴를 끄면 회원에게도 운영진에게도 숨긴다', () => {
    expect(keys({ ...member, tournamentMenuEnabled: false })).not.toContain(
      'tournaments'
    );
    expect(
      keys({ ...member, isAdmin: true, tournamentMenuEnabled: false })
    ).not.toContain('tournaments');
  });

  it('비회원에게는 대회 메뉴 설정과 관계없이 대회가 없다', () => {
    expect(keys({ ...member, isMember: false })).not.toContain('tournaments');
  });

  it('휴대폰 탭은 홈·출석·게스트·게시판 네 개다', () => {
    const tabs = getNavItems({ ...member, isAdmin: true }).filter(
      (item) => item.tab
    );

    expect(tabs.map((item) => item.tabLabel ?? item.label)).toEqual([
      '홈',
      '출석',
      '게스트',
      '게시판',
    ]);
  });

  it('주소는 클럽 id를 따른다', () => {
    const items = getNavItems({ ...member, clubId: '42', isAdmin: true });

    expect(items.every((item) => item.href.startsWith('/clubs/42'))).toBe(true);
    expect(find({ ...member, clubId: '42' }, 'home').href).toBe('/clubs/42');
  });
});

describe('getNavItems — 현재 위치', () => {
  const admin = { ...member, isAdmin: true };
  const activeKeys = (path: string) =>
    getNavItems(admin)
      .filter((item) => item.isActive(path))
      .map((item) => item.key);

  it('홈은 클럽 첫 화면에서만 켜진다', () => {
    expect(activeKeys('/clubs/1')).toEqual(['home']);
    expect(activeKeys('/clubs/1/board')).not.toContain('home');
  });

  it('출석체크는 운동 상세에서도 켜진다', () => {
    expect(activeKeys('/clubs/1/attendance')).toEqual(['attendance']);
    expect(activeKeys('/clubs/1/workouts/37')).toEqual(['attendance']);
  });

  it('게시판·대회는 하위 화면에서도 켜진다', () => {
    expect(activeKeys('/clubs/1/board/12/edit')).toEqual(['board']);
    expect(activeKeys('/clubs/1/tournaments/abc/admin')).toEqual([
      'tournaments',
    ]);
  });

  it('게스트 상세에서는 게스트가, 게스트 확인에서는 게스트 확인만 켜진다', () => {
    expect(activeKeys('/clubs/1/guest/55')).toEqual(['guest']);
    expect(activeKeys('/clubs/1/guest/check')).toEqual(['guestCheck']);
  });

  it('쿼리·해시·끝 슬래시가 붙어도 같은 항목이 켜진다', () => {
    expect(activeKeys('/clubs/1/board?page=2')).toEqual(['board']);
    expect(activeKeys('/clubs/1/board#top')).toEqual(['board']);
    expect(activeKeys('/clubs/1/')).toEqual(['home']);
  });

  it('다른 클럽의 주소에서는 아무것도 켜지지 않는다', () => {
    expect(activeKeys('/clubs/10')).toEqual([]);
    expect(activeKeys('/clubs/10/board')).toEqual([]);
  });

  it('이름이 비슷한 다른 경로에서는 켜지지 않는다', () => {
    expect(activeKeys('/clubs/1/boardgames')).toEqual([]);
  });

  it('클럽 밖의 화면에서는 아무것도 켜지지 않는다', () => {
    expect(activeKeys('/profile')).toEqual([]);
    expect(activeKeys('/')).toEqual([]);
  });
});

describe('normalizePath', () => {
  it('쿼리·해시·끝 슬래시를 떼고, 뿌리는 /로 둔다', () => {
    expect(normalizePath('/clubs/1/?a=1#x')).toBe('/clubs/1');
    expect(normalizePath('/')).toBe('/');
    expect(normalizePath('')).toBe('/');
  });
});
```

```ts
// FILE: src/__tests__/constants/layoutVariant.test.ts
import { describe, expect, it } from '@jest/globals';

import { getLayoutVariant } from '@/constants/layoutVariant';

describe('getLayoutVariant', () => {
  it('로그인과 외부인용 화면은 메뉴 없는 bare다', () => {
    expect(getLayoutVariant('/auth/login')).toBe('bare');
    expect(
      getLayoutVariant('/clubs/[id]/tournaments/[tournamentId]/external-apply')
    ).toBe('bare');
    expect(
      getLayoutVariant('/clubs/[id]/tournaments/[tournamentId]/external-entry')
    ).toBe('bare');
  });

  it('운영진이 쓰는 관리 화면은 admin이다', () => {
    for (const pathname of [
      '/clubs/[id]/members',
      '/clubs/[id]/guest/check',
      '/clubs/[id]/custom',
      '/clubs/[id]/board/categories',
      '/clubs/[id]/tournaments/new',
      '/clubs/[id]/tournaments/[tournamentId]/admin',
      '/clubs/[id]/tournaments/[tournamentId]/edit',
    ]) {
      expect(getLayoutVariant(pathname)).toBe('admin');
    }
  });

  it('그 밖의 화면은 member다', () => {
    for (const pathname of [
      '/',
      '/clubs',
      '/profile',
      '/clubs/[id]',
      '/clubs/[id]/attendance',
      '/clubs/[id]/guest',
      '/clubs/[id]/guest/[guestId]',
      '/clubs/[id]/board/[postId]/edit',
      '/clubs/[id]/tournaments/[tournamentId]',
      '/clubs/[id]/tournaments/[tournamentId]/apply',
      '/dev/ui-kit',
    ]) {
      expect(getLayoutVariant(pathname)).toBe('member');
    }
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx jest "$(pwd)/src/__tests__/constants"`
Expected: FAIL — `Cannot find module '@/constants/navItems'`, `'@/constants/layoutVariant'`

- [ ] **Step 3: 구현**

```ts
// FILE: src/constants/navItems.ts
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
```

```ts
// FILE: src/constants/layoutVariant.ts
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
```

- [ ] **Step 4: 테스트가 통과하는지 확인**

Run: `npx jest "$(pwd)/src/__tests__/constants" && npx tsc --noEmit`
Expected: PASS. 타입 검사는 기준선 외 오류 없음.

- [ ] **Step 5: 커밋**

```bash
git add src/constants/navItems.ts src/constants/layoutVariant.ts src/__tests__/constants
git commit -m "feat(ui): 메뉴 항목 규칙(getNavItems)과 화면 종류 판정 추가"
```

---

### Task 2: 옛 메뉴에 섞여 있던 로직을 훅으로 꺼낸다

**Files:**
- Create: `src/hooks/useSyncClubMember.ts`
- Create: `src/hooks/useAuthActions.ts`
- Test: `src/__tests__/hooks/useSyncClubMember.dom.test.tsx`

**Interfaces:**
- Consumes: `useClubMember(clubId, userId)` (`@/hooks/useClubMember`), `setClubMember` · `setInitClubMember` · `logout` (`@/store/features/authSlice`), `KakaoAuth.login(router)` (`@/utils/auth`)
- Produces:
  - `useSyncClubMember(clubId: string | undefined): void`
  - `useAuthActions(): { login: () => void; logout: () => Promise<void> }`

**배경:** `ClubNavigation`은 메뉴를 그리면서 "현재 클럽의 내 회원 정보를 받아 스토어에 넣는" 일도 한다. 다른 화면들이 스토어의 `clubMember`에 기대므로, 메뉴를 지우기 전에 이 일을 훅으로 옮겨야 한다. 클럽을 벗어나거나 다른 클럽으로 가면 이전 클럽의 회원 정보가 남지 않게 비운다.

- [ ] **Step 1: 실패하는 테스트 작성**

```tsx
// FILE: src/__tests__/hooks/useSyncClubMember.dom.test.tsx
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render } from '@testing-library/react';

import { useSyncClubMember } from '@/hooks/useSyncClubMember';

const dispatched: Array<{ type: string; payload?: unknown }> = [];
let mockUser: { id: number } | null = { id: 7 };
let mockData: { id: number; role: string } | undefined;
const queried: Array<[string | undefined, number | undefined]> = [];

jest.mock('react-redux', () => ({
  useDispatch: () => (action: { type: string; payload?: unknown }) => {
    dispatched.push(action);
  },
  useSelector: (
    selector: (state: { auth: { user: typeof mockUser } }) => unknown
  ) => selector({ auth: { user: mockUser } }),
}));

jest.mock('@/hooks/useClubMember', () => ({
  useClubMember: (clubId: string | undefined, userId: number | undefined) => {
    queried.push([clubId, userId]);
    return { data: mockData };
  },
}));

function Probe({ clubId }: { clubId: string | undefined }) {
  useSyncClubMember(clubId);
  return null;
}

const types = () => dispatched.map((action) => action.type);

describe('useSyncClubMember', () => {
  beforeEach(() => {
    dispatched.length = 0;
    queried.length = 0;
    mockUser = { id: 7 };
    mockData = undefined;
  });

  it('회원 정보를 받으면 스토어에 넣는다', () => {
    mockData = { id: 3, role: 'ADMIN' };
    render(<Probe clubId="1" />);

    const set = dispatched.find(
      (action) => action.type === 'auth/setClubMember'
    );
    expect(set?.payload).toEqual({ id: 3, role: 'ADMIN' });
  });

  it('현재 클럽과 로그인한 사용자의 id로 조회한다', () => {
    render(<Probe clubId="1" />);

    expect(queried[0]).toEqual(['1', 7]);
  });

  it('아직 못 받았으면 비워 둔다', () => {
    render(<Probe clubId="1" />);

    expect(types()).toContain('auth/setInitClubMember');
    expect(types()).not.toContain('auth/setClubMember');
  });

  it('다른 클럽으로 가면 이전 클럽의 회원 정보를 비운다', () => {
    mockData = { id: 3, role: 'ADMIN' };
    const { rerender } = render(<Probe clubId="1" />);
    dispatched.length = 0;

    mockData = undefined;
    rerender(<Probe clubId="2" />);

    expect(types()).toEqual(['auth/setInitClubMember']);
  });

  it('클럽 밖으로 나가면 비운다', () => {
    mockData = { id: 3, role: 'ADMIN' };
    const { rerender } = render(<Probe clubId="1" />);
    dispatched.length = 0;

    mockData = undefined;
    rerender(<Probe clubId={undefined} />);

    expect(types()).toEqual(['auth/setInitClubMember']);
  });

  it('로그인하지 않았으면 사용자 id 없이 조회하고 비워 둔다', () => {
    mockUser = null;
    render(<Probe clubId="1" />);

    expect(queried[0]).toEqual(['1', undefined]);
    expect(types()).toEqual(['auth/setInitClubMember']);
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx jest "$(pwd)/src/__tests__/hooks"`
Expected: FAIL — `Cannot find module '@/hooks/useSyncClubMember'`

- [ ] **Step 3: 구현**

```ts
// FILE: src/hooks/useSyncClubMember.ts
import { useEffect } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import { useClubMember } from '@/hooks/useClubMember';

import { RootState } from '@/store';
import { setClubMember, setInitClubMember } from '@/store/features/authSlice';
import { ClubMember } from '@/types';

/**
 * 현재 클럽에서의 내 회원 정보를 받아 스토어(auth.clubMember)에 넣는다.
 * 메뉴와 여러 화면이 이 값으로 회원·운영진 여부를 판단한다.
 * 클럽을 벗어나거나 다른 클럽으로 가면 이전 정보가 남지 않게 비운다.
 */
export function useSyncClubMember(clubId: string | undefined): void {
  const dispatch = useDispatch();
  const userId = useSelector((state: RootState) => state.auth.user?.id);
  const { data } = useClubMember(clubId, userId);

  useEffect(() => {
    if (clubId && data) {
      dispatch(setClubMember(data as unknown as ClubMember));
    } else {
      dispatch(setInitClubMember());
    }
  }, [clubId, data, dispatch]);
}
```

```ts
// FILE: src/hooks/useAuthActions.ts
import { useRouter } from 'next/router';

import { useDispatch } from 'react-redux';

import { logout as logoutAction } from '@/store/features/authSlice';
import { KakaoAuth } from '@/utils/auth';

/** 로그인·로그아웃. 메뉴에서 쓴다. */
export function useAuthActions() {
  const router = useRouter();
  const dispatch = useDispatch();

  const login = () => {
    KakaoAuth.login(router);
  };

  const logout = async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });

      if (response.ok) {
        dispatch(logoutAction());
        router.push('/');
      }
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  return { login, logout };
}
```

- [ ] **Step 4: 테스트가 통과하는지 확인**

Run: `npx jest "$(pwd)/src/__tests__/hooks" && npx tsc --noEmit`
Expected: PASS (6개). 기준선 외 타입 오류 없음.

`setClubMember`·`setInitClubMember`의 액션 이름이 `auth/…`가 아니어서 실패하면 `src/store/features/authSlice.ts`의 slice `name`을 확인하고 테스트의 문자열을 그 이름에 맞춘다.

- [ ] **Step 5: 커밋**

```bash
git add src/hooks/useSyncClubMember.ts src/hooks/useAuthActions.ts src/__tests__/hooks
git commit -m "feat(ui): 회원 정보 동기화와 로그인·로그아웃을 훅으로 분리"
```

---

### Task 3: 탭바 · 사이드바 · 더보기 시트 · 상단 바 · PageHeader

**Files:**
- Modify: `src/styles/globals.css` (`:root`에 두 줄 추가)
- Modify: `tailwind.config.ts` (`colors`에 한 줄 추가)
- Create: `src/components/organisms/navigation/BottomTabBar.tsx`
- Create: `src/components/organisms/navigation/Sidebar.tsx`
- Create: `src/components/organisms/navigation/MoreSheet.tsx`
- Create: `src/components/organisms/navigation/MobileHeader.tsx`
- Create: `src/components/organisms/PageHeader.tsx`
- Test: `src/__tests__/components/navigation/AppNav.dom.test.tsx`

**Interfaces:**
- Consumes: `NavItem` (Task 1), `Sheet`, `ListGroup`, `ListRow`, `IconButton`, `cn`
- Produces (모두 props만 받는 그리기 전용 컴포넌트):
  - `BottomTabBar({ items: NavItem[]; currentPath: string; onOpenMore: () => void })`
  - `Sidebar({ items: NavItem[]; currentPath: string; clubId?: string; clubName?: string; isAuthenticated: boolean; onLogin: () => void; onLogout: () => void })`
  - `MoreSheet({ open: boolean; onClose: () => void; items: NavItem[]; currentPath: string; isAuthenticated: boolean; onLogin: () => void; onLogout: () => void })`
  - `MobileHeader({ clubId?: string; clubName?: string; showMenuButton: boolean; onOpenMore: () => void })`
  - `PageHeader({ title: string; subtitle?: string; backHref?: string; action?: ReactNode; className?: string })`
  - Tailwind: `bg-tabbar`, CSS 변수 `--tabbar-h`

- [ ] **Step 1: 토큰 두 개 추가**

`src/styles/globals.css`의 `:root` 안, `--color-scrim` 줄 바로 아래에 추가:

```css
    /* 탭바·상단 바의 반투명 바탕 (뒤가 비치는 유리 질감) */
    --color-tabbar: rgba(249, 249, 249, 0.94);
    /* 하단 탭바 높이. 화면 아래에 붙는 요소가 이 값만큼 위로 올라간다. */
    --tabbar-h: 56px;
```

`tailwind.config.ts`의 `colors`에서 `scrim` 줄 바로 아래에 추가:

```ts
        tabbar: 'var(--color-tabbar)',
```

- [ ] **Step 2: 실패하는 테스트 작성**

```tsx
// FILE: src/__tests__/components/navigation/AppNav.dom.test.tsx
import { ReactElement, ReactNode } from 'react';

import { describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen, within } from '@testing-library/react';

import { BottomTabBar } from '@/components/organisms/navigation/BottomTabBar';
import { MobileHeader } from '@/components/organisms/navigation/MobileHeader';
import { MoreSheet } from '@/components/organisms/navigation/MoreSheet';
import { Sidebar } from '@/components/organisms/navigation/Sidebar';
import { PageHeader } from '@/components/organisms/PageHeader';

import { getNavItems } from '@/constants/navItems';

// next/link는 라우터 없이 렌더링하면 환경에 따라 달라지므로 <a>로 바꿔 둔다.
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const adminItems = getNavItems({
  clubId: '1',
  isMember: true,
  isAdmin: true,
  tournamentMenuEnabled: true,
});
const guestItems = getNavItems({
  clubId: '1',
  isMember: false,
  isAdmin: false,
  tournamentMenuEnabled: true,
});

const hrefs = (root: HTMLElement) =>
  within(root)
    .getAllByRole('link')
    .map((link) => link.getAttribute('href'));

async function renderInAct(ui: ReactElement) {
  await act(async () => {
    render(ui);
  });
}

describe('BottomTabBar', () => {
  it('탭 네 개와 더보기를 그리고, 탭은 링크다', () => {
    render(
      <BottomTabBar
        items={adminItems}
        currentPath="/clubs/1"
        onOpenMore={() => {}}
      />
    );

    const nav = screen.getByRole('navigation', { name: '주 메뉴' });
    expect(hrefs(nav)).toEqual([
      '/clubs/1',
      '/clubs/1/attendance',
      '/clubs/1/guest',
      '/clubs/1/board',
    ]);
    expect(within(nav).getByText('출석')).toBeTruthy();
    expect(within(nav).getByRole('button', { name: '더보기' })).toBeTruthy();
  });

  it('지금 있는 탭만 현재 위치로 표시한다', () => {
    render(
      <BottomTabBar
        items={adminItems}
        currentPath="/clubs/1/workouts/3"
        onOpenMore={() => {}}
      />
    );

    const current = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page');
    expect(current).toHaveLength(1);
    expect(current[0].getAttribute('href')).toBe('/clubs/1/attendance');
  });

  it('탭에 없는 화면(대회·관리)에 있으면 더보기가 켜진다', () => {
    const { rerender } = render(
      <BottomTabBar
        items={adminItems}
        currentPath="/clubs/1/tournaments/abc"
        onOpenMore={() => {}}
      />
    );
    const more = () => screen.getByRole('button', { name: '더보기' });
    expect(more().getAttribute('aria-current')).toBe('page');

    rerender(
      <BottomTabBar
        items={adminItems}
        currentPath="/clubs/1/members"
        onOpenMore={() => {}}
      />
    );
    expect(more().getAttribute('aria-current')).toBe('page');

    rerender(
      <BottomTabBar
        items={adminItems}
        currentPath="/clubs/1/board"
        onOpenMore={() => {}}
      />
    );
    expect(more().hasAttribute('aria-current')).toBe(false);
  });

  it('더보기를 누르면 onOpenMore가 불린다', () => {
    const onOpenMore = jest.fn();
    render(
      <BottomTabBar
        items={adminItems}
        currentPath="/clubs/1"
        onOpenMore={onOpenMore}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '더보기' }));
    expect(onOpenMore).toHaveBeenCalledTimes(1);
  });

  it('비회원은 홈·가입 문의·더보기 세 칸이다', () => {
    render(
      <BottomTabBar
        items={guestItems}
        currentPath="/clubs/1"
        onOpenMore={() => {}}
      />
    );

    expect(screen.getAllByRole('link')).toHaveLength(2);
    expect(screen.getByText('가입 문의')).toBeTruthy();
    expect(screen.getByRole('button', { name: '더보기' })).toBeTruthy();
  });

  it('탭의 터치 영역은 탭바 높이를 꽉 채운다', () => {
    render(
      <BottomTabBar
        items={adminItems}
        currentPath="/clubs/1"
        onOpenMore={() => {}}
      />
    );

    expect(screen.getAllByRole('link')[0].className).toContain(
      'h-[var(--tabbar-h)]'
    );
  });
});

describe('MoreSheet', () => {
  const base = {
    open: true,
    onClose: () => {},
    currentPath: '/clubs/1',
    isAuthenticated: true,
    onLogin: () => {},
    onLogout: () => {},
  };

  it('탭에 없는 메뉴, 관리 메뉴, 계정 메뉴를 보여 준다', async () => {
    await renderInAct(<MoreSheet {...base} items={adminItems} />);

    const dialog = screen.getByRole('dialog', { name: '더보기' });
    expect(hrefs(dialog)).toEqual([
      '/clubs/1/tournaments',
      '/clubs/1/members',
      '/clubs/1/guest/check',
      '/clubs/1/custom',
      '/profile',
      '/clubs',
    ]);
    expect(within(dialog).getByText('관리')).toBeTruthy();
    expect(within(dialog).getByRole('button', { name: /로그아웃/ })).toBeTruthy();
  });

  it('탭에 있는 메뉴(홈·출석·게스트·게시판)는 되풀이하지 않는다', async () => {
    await renderInAct(<MoreSheet {...base} items={adminItems} />);

    expect(hrefs(screen.getByRole('dialog'))).not.toContain('/clubs/1/board');
  });

  it('운영진이 아니면 관리 구역이 없다', async () => {
    const memberItems = getNavItems({
      clubId: '1',
      isMember: true,
      isAdmin: false,
      tournamentMenuEnabled: true,
    });
    await renderInAct(<MoreSheet {...base} items={memberItems} />);

    expect(screen.queryByText('관리')).toBeNull();
    expect(hrefs(screen.getByRole('dialog'))).toEqual([
      '/clubs/1/tournaments',
      '/profile',
      '/clubs',
    ]);
  });

  it('로그인하지 않았으면 로그인만 보이고 프로필·로그아웃은 없다', async () => {
    const onLogin = jest.fn();
    await renderInAct(
      <MoreSheet
        {...base}
        items={guestItems}
        isAuthenticated={false}
        onLogin={onLogin}
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(hrefs(dialog)).toEqual(['/clubs']);
    expect(within(dialog).queryByRole('button', { name: /로그아웃/ })).toBeNull();

    fireEvent.click(within(dialog).getByRole('button', { name: /로그인/ }));
    expect(onLogin).toHaveBeenCalledTimes(1);
  });

  it('클럽 밖(메뉴 항목 없음)에서도 계정 메뉴는 쓸 수 있다', async () => {
    await renderInAct(<MoreSheet {...base} items={[]} currentPath="/profile" />);

    expect(hrefs(screen.getByRole('dialog'))).toEqual(['/profile', '/clubs']);
  });

  it('메뉴를 누르면 시트를 닫는다', async () => {
    const onClose = jest.fn();
    await renderInAct(
      <MoreSheet {...base} items={adminItems} onClose={onClose} />
    );

    fireEvent.click(screen.getByText('대회'));
    expect(onClose).toHaveBeenCalled();
  });

  it('로그아웃을 누르면 onLogout을 부르고 시트를 닫는다', async () => {
    const onLogout = jest.fn();
    const onClose = jest.fn();
    await renderInAct(
      <MoreSheet
        {...base}
        items={adminItems}
        onLogout={onLogout}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /로그아웃/ }));
    expect(onLogout).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalled();
  });

  it('지금 있는 화면의 메뉴를 현재 위치로 표시한다', async () => {
    await renderInAct(
      <MoreSheet {...base} items={adminItems} currentPath="/clubs/1/members" />
    );

    const current = within(screen.getByRole('dialog'))
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page');
    expect(current.map((link) => link.getAttribute('href'))).toEqual([
      '/clubs/1/members',
    ]);
  });
});

describe('Sidebar', () => {
  const base = {
    currentPath: '/clubs/1/members',
    clubId: '1',
    clubName: '당산 배드민턴 클럽',
    isAuthenticated: true,
    onLogin: () => {},
    onLogout: () => {},
  };

  it('모든 메뉴를 펼쳐서 보여 주고 관리 구역을 나눈다', () => {
    render(<Sidebar {...base} items={adminItems} />);

    const nav = screen.getByRole('navigation', { name: '사이드 메뉴' });
    expect(hrefs(nav)).toEqual([
      '/clubs/1',
      '/clubs/1',
      '/clubs/1/attendance',
      '/clubs/1/guest',
      '/clubs/1/board',
      '/clubs/1/tournaments',
      '/clubs/1/members',
      '/clubs/1/guest/check',
      '/clubs/1/custom',
      '/profile',
      '/clubs',
    ]);
    expect(within(nav).getByText('관리')).toBeTruthy();
    expect(within(nav).getByText('출석체크')).toBeTruthy();
  });

  it('지금 있는 메뉴만 현재 위치로 표시한다', () => {
    render(<Sidebar {...base} items={adminItems} />);

    const current = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page');
    expect(current.map((link) => link.getAttribute('href'))).toEqual([
      '/clubs/1/members',
    ]);
  });

  it('클럽 이름을 보여 주고, 길면 한 줄로 자른다', () => {
    render(
      <Sidebar
        {...base}
        items={adminItems}
        clubName="아주아주 이름이 긴 배드민턴 동호회 연합 클럽"
      />
    );

    const name = screen.getByText('아주아주 이름이 긴 배드민턴 동호회 연합 클럽');
    expect(name.className).toContain('truncate');
  });

  it('클럽 밖에서는 앱 이름을 보여 주고 클럽 목록으로 잇는다', () => {
    render(
      <Sidebar
        {...base}
        items={[]}
        clubId={undefined}
        clubName={undefined}
        currentPath="/profile"
      />
    );

    const nav = screen.getByRole('navigation', { name: '사이드 메뉴' });
    expect(within(nav).getByText('배드민턴 클럽')).toBeTruthy();
    expect(hrefs(nav)).toEqual(['/clubs', '/profile', '/clubs']);
    expect(within(nav).queryByText('관리')).toBeNull();
  });

  it('로그인하지 않았으면 로그인 버튼만 있다', () => {
    const onLogin = jest.fn();
    render(
      <Sidebar
        {...base}
        items={guestItems}
        isAuthenticated={false}
        onLogin={onLogin}
      />
    );

    expect(screen.queryByRole('button', { name: /로그아웃/ })).toBeNull();
    expect(
      screen.getAllByRole('link').map((link) => link.getAttribute('href'))
    ).not.toContain('/profile');

    fireEvent.click(screen.getByRole('button', { name: /로그인/ }));
    expect(onLogin).toHaveBeenCalledTimes(1);
  });
});

describe('MobileHeader', () => {
  it('클럽 이름을 보여 주고 클럽 홈으로 잇는다', () => {
    render(
      <MobileHeader
        clubId="1"
        clubName="당산 배드민턴 클럽"
        showMenuButton={false}
        onOpenMore={() => {}}
      />
    );

    const link = screen.getByRole('link', { name: '당산 배드민턴 클럽' });
    expect(link.getAttribute('href')).toBe('/clubs/1');
    expect(screen.queryByRole('button', { name: '메뉴' })).toBeNull();
  });

  it('클럽 이름을 아직 못 받았으면 앱 이름을 보여 준다', () => {
    render(
      <MobileHeader
        clubId="1"
        clubName={undefined}
        showMenuButton={false}
        onOpenMore={() => {}}
      />
    );

    expect(screen.getByRole('link', { name: '배드민턴 클럽' })).toBeTruthy();
  });

  it('클럽 밖에서는 클럽 목록으로 잇고, 탭바가 없으니 메뉴 버튼을 둔다', () => {
    const onOpenMore = jest.fn();
    render(
      <MobileHeader
        clubId={undefined}
        clubName={undefined}
        showMenuButton
        onOpenMore={onOpenMore}
      />
    );

    expect(
      screen.getByRole('link', { name: '배드민턴 클럽' }).getAttribute('href')
    ).toBe('/clubs');

    fireEvent.click(screen.getByRole('button', { name: '메뉴' }));
    expect(onOpenMore).toHaveBeenCalledTimes(1);
  });

  it('긴 클럽 이름은 한 줄로 자른다', () => {
    render(
      <MobileHeader
        clubId="1"
        clubName="아주아주 이름이 긴 배드민턴 동호회 연합 클럽"
        showMenuButton={false}
        onOpenMore={() => {}}
      />
    );

    expect(screen.getByRole('link').className).toContain('truncate');
  });
});

describe('PageHeader', () => {
  it('제목을 화면 제목(h1)으로 그린다', () => {
    render(<PageHeader title="출석체크" />);

    const heading = screen.getByRole('heading', { level: 1, name: '출석체크' });
    expect(heading.className).toContain('text-large-title');
  });

  it('부제, 뒤로 가기, 오른쪽 동작을 그린다', () => {
    render(
      <PageHeader
        title="운동 상세"
        subtitle="10월 4일 토요일"
        backHref="/clubs/1/attendance"
        action={<button type="button">수정</button>}
      />
    );

    expect(screen.getByText('10월 4일 토요일')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: '뒤로' }).getAttribute('href')
    ).toBe('/clubs/1/attendance');
    expect(screen.getByRole('button', { name: '수정' })).toBeTruthy();
  });

  it('제목만 주면 뒤로 가기와 부제가 없다', () => {
    const { container } = render(<PageHeader title="게시판" />);

    expect(screen.queryByRole('link')).toBeNull();
    expect(container.querySelector('p')).toBeNull();
  });
});
```

- [ ] **Step 3: 테스트가 실패하는지 확인**

Run: `npx jest "$(pwd)/src/__tests__/components/navigation"`
Expected: FAIL — `Cannot find module '@/components/organisms/navigation/BottomTabBar'`

- [ ] **Step 4: 구현**

```tsx
// FILE: src/components/organisms/navigation/BottomTabBar.tsx
import Link from 'next/link';

import { MoreHorizontal } from 'lucide-react';

import { NavItem } from '@/constants/navItems';
import { cn } from '@/lib/utils';

interface BottomTabBarProps {
  items: NavItem[];
  /** router.asPath */
  currentPath: string;
  onOpenMore: () => void;
}

const tabClass = (active: boolean) =>
  cn(
    'flex h-[var(--tabbar-h)] flex-1 flex-col items-center justify-center gap-0.5 text-caption',
    'transition-opacity duration-150 active:opacity-60',
    active ? 'font-semibold text-primary' : 'text-tertiary'
  );

/**
 * 휴대폰 하단 탭바. lg(1024px) 이상에서는 숨고 Sidebar가 대신한다.
 * tab이 true인 항목을 탭으로, 나머지는 '더보기' 뒤에 둔다.
 */
export function BottomTabBar({
  items,
  currentPath,
  onOpenMore,
}: BottomTabBarProps) {
  const tabs = items.filter((item) => item.tab);
  // 탭에 없는 화면(대회, 관리)에 있으면 더보기가 그 자리를 대신 표시한다.
  const isMoreActive = items.some(
    (item) => !item.tab && item.isActive(currentPath)
  );

  return (
    <nav
      aria-label="주 메뉴"
      className="fixed inset-x-0 bottom-0 z-tabbar flex border-t-[0.5px] border-separator bg-tabbar pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      {tabs.map((item) => {
        const active = item.isActive(currentPath);
        const Icon = item.icon;

        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={tabClass(active)}
          >
            <Icon
              aria-hidden
              className="h-[22px] w-[22px]"
              strokeWidth={active ? 2.4 : 2}
            />
            {item.tabLabel ?? item.label}
          </Link>
        );
      })}

      <button
        type="button"
        onClick={onOpenMore}
        aria-current={isMoreActive ? 'page' : undefined}
        className={tabClass(isMoreActive)}
      >
        <MoreHorizontal
          aria-hidden
          className="h-[22px] w-[22px]"
          strokeWidth={isMoreActive ? 2.4 : 2}
        />
        더보기
      </button>
    </nav>
  );
}

export default BottomTabBar;
```

```tsx
// FILE: src/components/organisms/navigation/MoreSheet.tsx
import { ArrowLeftRight, LogIn, LogOut, User } from 'lucide-react';

import { ListGroup } from '@/components/molecules/list/ListGroup';
import { ListRow } from '@/components/molecules/list/ListRow';
import { Sheet } from '@/components/organisms/sheet/Sheet';

import { NavItem } from '@/constants/navItems';

interface MoreSheetProps {
  open: boolean;
  onClose: () => void;
  items: NavItem[];
  /** router.asPath */
  currentPath: string;
  isAuthenticated: boolean;
  onLogin: () => void;
  onLogout: () => void;
}

const iconClass = 'h-5 w-5 text-secondary';

/**
 * 휴대폰의 '더보기'. 하단 탭에 올리지 않은 메뉴(대회, 관리)와 계정 메뉴를 담는다.
 * 클럽 밖의 화면에서는 계정 메뉴만 보인다.
 */
export function MoreSheet({
  open,
  onClose,
  items,
  currentPath,
  isAuthenticated,
  onLogin,
  onLogout,
}: MoreSheetProps) {
  const rest = items.filter((item) => !item.tab && item.section === 'main');
  const admin = items.filter((item) => item.section === 'admin');

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    return (
      <ListRow
        key={item.key}
        href={item.href}
        onClick={onClose}
        aria-current={item.isActive(currentPath) ? 'page' : undefined}
        leading={<Icon aria-hidden className={iconClass} />}
        title={item.label}
      />
    );
  };

  return (
    <Sheet open={open} onClose={onClose} title="더보기">
      {/* 흰 시트 위에서 묶음이 구분되도록 묶음마다 연회색 바탕을 준다. */}
      <div className="space-y-6 [&_section>div]:bg-bg">
        {rest.length > 0 && <ListGroup>{rest.map(renderItem)}</ListGroup>}

        {admin.length > 0 && (
          <ListGroup label="관리">{admin.map(renderItem)}</ListGroup>
        )}

        <ListGroup label="계정">
          {isAuthenticated && (
            <ListRow
              href="/profile"
              onClick={onClose}
              leading={<User aria-hidden className={iconClass} />}
              title="내 정보"
            />
          )}
          <ListRow
            href="/clubs"
            onClick={onClose}
            leading={<ArrowLeftRight aria-hidden className={iconClass} />}
            title="클럽 목록"
          />
          {isAuthenticated ? (
            <ListRow
              onClick={() => {
                onLogout();
                onClose();
              }}
              leading={<LogOut aria-hidden className={iconClass} />}
              title="로그아웃"
            />
          ) : (
            <ListRow
              onClick={() => {
                onLogin();
                onClose();
              }}
              leading={<LogIn aria-hidden className={iconClass} />}
              title="로그인"
            />
          )}
        </ListGroup>
      </div>
    </Sheet>
  );
}

export default MoreSheet;
```

`ListRow`는 지금 `aria-current`를 받지 않는다. `src/components/molecules/list/ListRow.tsx`에 선택 속성 하나를 더한다:

- `ListRowProps`에 `'aria-current'?: 'page';` 추가
- 구조 분해에 `'aria-current': ariaCurrent,` 추가
- `<Link …>`, `<button …>`, `<div …>` 세 곳에 `aria-current={ariaCurrent}` 추가

```tsx
// FILE: src/components/organisms/navigation/Sidebar.tsx
import Link from 'next/link';

import { ArrowLeftRight, LogIn, LogOut, type LucideIcon, User } from 'lucide-react';

import { NavItem } from '@/constants/navItems';
import { cn } from '@/lib/utils';

interface SidebarProps {
  items: NavItem[];
  /** router.asPath */
  currentPath: string;
  clubId?: string;
  clubName?: string;
  isAuthenticated: boolean;
  onLogin: () => void;
  onLogout: () => void;
}

const rowClass = (active = false) =>
  cn(
    'flex h-9 w-full items-center gap-2 rounded-sm px-2 text-left text-callout text-primary',
    'transition-colors duration-150 hover:bg-fill',
    active ? 'bg-fill font-semibold' : 'font-medium'
  );

function Row({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={rowClass(active)}
    >
      <Icon aria-hidden className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

/**
 * PC 왼쪽 사이드바. lg(1024px) 이상에서만 보인다.
 * 휴대폰의 탭바 + 더보기에 있는 메뉴를 모두 펼쳐서 보여 준다.
 */
export function Sidebar({
  items,
  currentPath,
  clubId,
  clubName,
  isAuthenticated,
  onLogin,
  onLogout,
}: SidebarProps) {
  const main = items.filter((item) => item.section === 'main');
  const admin = items.filter((item) => item.section === 'admin');

  return (
    <nav
      aria-label="사이드 메뉴"
      className="fixed inset-y-0 left-0 z-tabbar hidden w-60 flex-col border-r border-border bg-surface-muted px-3 py-4 lg:flex"
    >
      <Link
        href={clubId ? `/clubs/${clubId}` : '/clubs'}
        className="mb-3 block truncate px-2 text-headline text-primary"
      >
        {clubName || '배드민턴 클럽'}
      </Link>

      <div className="space-y-0.5">
        {main.map((item) => (
          <Row
            key={item.key}
            href={item.href}
            icon={item.icon}
            label={item.label}
            active={item.isActive(currentPath)}
          />
        ))}
      </div>

      {admin.length > 0 && (
        <>
          <p className="mb-1 mt-5 px-2 text-caption text-secondary">관리</p>
          <div className="space-y-0.5">
            {admin.map((item) => (
              <Row
                key={item.key}
                href={item.href}
                icon={item.icon}
                label={item.label}
                active={item.isActive(currentPath)}
              />
            ))}
          </div>
        </>
      )}

      <div className="mt-auto space-y-0.5 border-t border-border pt-3">
        {isAuthenticated && <Row href="/profile" icon={User} label="내 정보" />}
        <Row href="/clubs" icon={ArrowLeftRight} label="클럽 목록" />
        {isAuthenticated ? (
          <button type="button" onClick={onLogout} className={rowClass()}>
            <LogOut aria-hidden className="h-4 w-4 shrink-0" />
            로그아웃
          </button>
        ) : (
          <button type="button" onClick={onLogin} className={rowClass()}>
            <LogIn aria-hidden className="h-4 w-4 shrink-0" />
            로그인
          </button>
        )}
      </div>
    </nav>
  );
}

export default Sidebar;
```

```tsx
// FILE: src/components/organisms/navigation/MobileHeader.tsx
import Link from 'next/link';

import { Menu } from 'lucide-react';

import { IconButton } from '@/components/atoms/buttons/IconButton';

interface MobileHeaderProps {
  clubId?: string;
  clubName?: string;
  /** 탭바가 없는 화면(클럽 밖)에서는 메뉴 버튼으로 더보기를 연다 */
  showMenuButton: boolean;
  onOpenMore: () => void;
}

/**
 * 휴대폰 상단 바. 지금 어느 클럽에 있는지 보여 준다.
 * lg(1024px) 이상에서는 숨고 Sidebar가 클럽 이름을 보여 준다.
 */
export function MobileHeader({
  clubId,
  clubName,
  showMenuButton,
  onOpenMore,
}: MobileHeaderProps) {
  return (
    <header className="sticky top-0 z-tabbar border-b-[0.5px] border-separator bg-tabbar pt-[env(safe-area-inset-top)] backdrop-blur-md lg:hidden">
      <div className="flex h-12 items-center justify-between gap-2 pl-4 pr-1">
        <Link
          href={clubId ? `/clubs/${clubId}` : '/clubs'}
          className="min-w-0 truncate text-headline text-primary"
        >
          {clubName || '배드민턴 클럽'}
        </Link>
        {showMenuButton && (
          <IconButton aria-label="메뉴" onClick={onOpenMore}>
            <Menu aria-hidden className="h-5 w-5" />
          </IconButton>
        )}
      </div>
    </header>
  );
}

export default MobileHeader;
```

```tsx
// FILE: src/components/organisms/PageHeader.tsx
import { ReactNode } from 'react';

import Link from 'next/link';

import { ChevronLeft } from 'lucide-react';

import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** 있으면 제목 위에 '뒤로' 링크를 둔다 */
  backHref?: string;
  /** 오른쪽 동작. 보통 Button 하나 */
  action?: ReactNode;
  className?: string;
}

/** 화면 맨 위의 큰 제목 영역. 화면마다 하나만 쓴다 (h1). */
export function PageHeader({
  title,
  subtitle,
  backHref,
  action,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn('mb-4', className)}>
      {backHref && (
        <Link
          href={backHref}
          className="-ml-2 inline-flex h-11 items-center pr-3 text-callout text-secondary"
        >
          <ChevronLeft aria-hidden className="h-5 w-5" />
          뒤로
        </Link>
      )}
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-large-title text-primary">{title}</h1>
          {subtitle && (
            <p className="mt-0.5 text-footnote text-secondary">{subtitle}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
}

export default PageHeader;
```

- [ ] **Step 5: 테스트가 통과하는지 확인**

Run: `npx jest "$(pwd)/src/__tests__/components/navigation" "$(pwd)/src/__tests__/styles" "$(pwd)/src/__tests__/components/ui/List.dom.test.tsx" && npx tsc --noEmit`
Expected: PASS, `console.error` 없음. 기준선 외 타입 오류 없음.

- [ ] **Step 6: 커밋**

```bash
git add src/components/organisms/navigation/BottomTabBar.tsx src/components/organisms/navigation/Sidebar.tsx src/components/organisms/navigation/MoreSheet.tsx src/components/organisms/navigation/MobileHeader.tsx src/components/organisms/PageHeader.tsx src/components/molecules/list/ListRow.tsx src/styles/globals.css tailwind.config.ts src/__tests__/components/navigation
git commit -m "feat(ui): 하단 탭바·사이드바·더보기 시트·상단 바·PageHeader 추가"
```

---

### Task 4: AppShell로 조립하고 옛 메뉴를 지운다

**Files:**
- Create: `src/components/templates/AppShell.tsx`
- Modify: `src/components/templates/Layout.tsx`
- Modify: `src/pages/_app.tsx` (Toaster)
- Modify: `src/pages/dev/ui-kit.tsx` (`PageHeader` 미리보기)
- Modify: `src/__tests__/guards/noRawControls.test.ts` (`SideMenu` 항목을 미룬 목록에서 뺀다)
- Delete: `src/components/organisms/navigation/mainNavigation/MainNavigation.tsx`, `SideMenu.tsx`, `src/components/organisms/navigation/clubNavigation/ClubNavigation.tsx`, `clubNavigation/__tests__/ClubNavigation.dom.test.tsx`
- Test: `src/__tests__/components/navigation/AppShell.dom.test.tsx`

**Interfaces:**
- Consumes: Task 1–3의 전부
- Produces: `AppShell({ variant: LayoutVariant; clubId?: string; clubName?: string; items: NavItem[]; currentPath: string; isAuthenticated: boolean; onLogin: () => void; onLogout: () => void; children: ReactNode })`

**옛 테스트의 행방:** `ClubNavigation.dom.test.tsx`의 다섯 경우(대회 메뉴 켜짐·꺼짐·불러오기 전·운영진·비회원)는 Task 1의 `navItems.test.ts`가 모두 다룬다. "불러오기 전에는 보여 준다"는 `Layout`이 `tournamentMenuEnabled: menuSettings?.tournamentMenuEnabled ?? true`로 넘기는 것으로 지킨다.

- [ ] **Step 1: 실패하는 테스트 작성**

```tsx
// FILE: src/__tests__/components/navigation/AppShell.dom.test.tsx
import { ReactNode } from 'react';

import { describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { AppShell } from '@/components/templates/AppShell';

import { getNavItems } from '@/constants/navItems';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const items = getNavItems({
  clubId: '1',
  isMember: true,
  isAdmin: true,
  tournamentMenuEnabled: true,
});

const base = {
  clubId: '1',
  clubName: '당산 배드민턴 클럽',
  items,
  currentPath: '/clubs/1',
  isAuthenticated: true,
  onLogin: () => {},
  onLogout: () => {},
};

describe('AppShell', () => {
  it('member: 탭바·사이드바·상단 바와 본문을 그린다', () => {
    render(
      <AppShell {...base} variant="member">
        <p>본문</p>
      </AppShell>
    );

    expect(screen.getByRole('navigation', { name: '주 메뉴' })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: '사이드 메뉴' })).toBeTruthy();
    expect(screen.getByRole('banner')).toBeTruthy();
    expect(screen.getByRole('main').textContent).toBe('본문');
    expect(screen.getByRole('main').hasAttribute('data-density')).toBe(false);
  });

  it('admin: 본문에 compact 밀도를 건다', () => {
    render(
      <AppShell {...base} variant="admin" currentPath="/clubs/1/members">
        <p>회원 관리</p>
      </AppShell>
    );

    expect(screen.getByRole('main').getAttribute('data-density')).toBe(
      'compact'
    );
  });

  it('bare: 메뉴 없이 본문만 그린다', () => {
    render(
      <AppShell {...base} variant="bare" currentPath="/auth/login">
        <p>로그인</p>
      </AppShell>
    );

    expect(screen.queryByRole('navigation')).toBeNull();
    expect(screen.queryByRole('banner')).toBeNull();
    expect(screen.getByRole('main').textContent).toBe('로그인');
  });

  it('본문 아래에 탭바에 가리지 않을 여백을 둔다', () => {
    render(
      <AppShell {...base} variant="member">
        <p>본문</p>
      </AppShell>
    );

    expect(screen.getByRole('main').className).toContain('var(--tabbar-h)');
  });

  it('더보기를 누르면 더보기 시트가 열리고, 메뉴를 누르면 닫힌다', async () => {
    render(
      <AppShell {...base} variant="member">
        <p>본문</p>
      </AppShell>
    );
    expect(screen.queryByRole('dialog')).toBeNull();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '더보기' }));
    });
    const dialog = screen.getByRole('dialog', { name: '더보기' });
    expect(dialog).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    });
  });

  it('클럽 밖(메뉴 항목 없음): 탭바 대신 상단 바의 메뉴 버튼으로 더보기를 연다', async () => {
    render(
      <AppShell
        {...base}
        variant="member"
        clubId={undefined}
        clubName={undefined}
        items={[]}
        currentPath="/profile"
      >
        <p>내 정보</p>
      </AppShell>
    );

    expect(screen.queryByRole('navigation', { name: '주 메뉴' })).toBeNull();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '메뉴' }));
    });
    expect(screen.getByRole('dialog', { name: '더보기' })).toBeTruthy();
  });

  it('회원 정보가 아직 없어 메뉴가 두 개뿐이어도 탭바를 그린다', () => {
    render(
      <AppShell
        {...base}
        variant="member"
        items={getNavItems({
          clubId: '1',
          isMember: false,
          isAdmin: false,
          tournamentMenuEnabled: true,
        })}
      >
        <p>본문</p>
      </AppShell>
    );

    expect(screen.getByRole('navigation', { name: '주 메뉴' })).toBeTruthy();
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx jest "$(pwd)/src/__tests__/components/navigation/AppShell.dom.test.tsx"`
Expected: FAIL — `Cannot find module '@/components/templates/AppShell'`

- [ ] **Step 3: `AppShell.tsx` 구현**

```tsx
// FILE: src/components/templates/AppShell.tsx
import { ReactNode, useState } from 'react';

import { BottomTabBar } from '@/components/organisms/navigation/BottomTabBar';
import { MobileHeader } from '@/components/organisms/navigation/MobileHeader';
import { MoreSheet } from '@/components/organisms/navigation/MoreSheet';
import { Sidebar } from '@/components/organisms/navigation/Sidebar';

import { LayoutVariant } from '@/constants/layoutVariant';
import { NavItem } from '@/constants/navItems';
import { cn } from '@/lib/utils';

interface AppShellProps {
  variant: LayoutVariant;
  clubId?: string;
  clubName?: string;
  /** 클럽 밖의 화면에서는 빈 배열 */
  items: NavItem[];
  /** router.asPath */
  currentPath: string;
  isAuthenticated: boolean;
  onLogin: () => void;
  onLogout: () => void;
  children: ReactNode;
}

/**
 * 앱의 뼈대. 휴대폰은 상단 바 + 하단 탭바, PC(lg 이상)는 왼쪽 사이드바.
 * 폭에 따른 전환은 각 부품의 CSS(lg:hidden / hidden lg:flex)가 한다.
 * 좌우 여백과 탭바에 가리지 않을 아래 여백은 여기서만 준다.
 */
export function AppShell({
  variant,
  clubId,
  clubName,
  items,
  currentPath,
  isAuthenticated,
  onLogin,
  onLogout,
  children,
}: AppShellProps) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  // 로그인, 외부인용 화면: 메뉴 없이 본문만.
  if (variant === 'bare') {
    return <main className="mx-auto max-w-4xl px-4 py-4">{children}</main>;
  }

  // 클럽 밖에는 탭으로 갈 곳이 없다. 상단 바의 메뉴 버튼이 더보기를 연다.
  const hasTabBar = items.length > 0;

  return (
    <div className="lg:pl-60">
      <MobileHeader
        clubId={clubId}
        clubName={clubName}
        showMenuButton={!hasTabBar}
        onOpenMore={() => setIsMoreOpen(true)}
      />
      <Sidebar
        items={items}
        currentPath={currentPath}
        clubId={clubId}
        clubName={clubName}
        isAuthenticated={isAuthenticated}
        onLogin={onLogin}
        onLogout={onLogout}
      />

      <main
        data-density={variant === 'admin' ? 'compact' : undefined}
        className={cn(
          'mx-auto px-4 pt-3 lg:px-6 lg:pb-10 lg:pt-6',
          'pb-[calc(var(--tabbar-h)+env(safe-area-inset-bottom)+24px)]',
          variant === 'admin' ? 'max-w-6xl' : 'max-w-4xl'
        )}
      >
        {children}
      </main>

      {hasTabBar && (
        <BottomTabBar
          items={items}
          currentPath={currentPath}
          onOpenMore={() => setIsMoreOpen(true)}
        />
      )}
      <MoreSheet
        open={isMoreOpen}
        onClose={() => setIsMoreOpen(false)}
        items={items}
        currentPath={currentPath}
        isAuthenticated={isAuthenticated}
        onLogin={onLogin}
        onLogout={onLogout}
      />
    </div>
  );
}

export default AppShell;
```

- [ ] **Step 4: 테스트가 통과하는지 확인**

Run: `npx jest "$(pwd)/src/__tests__/components/navigation"`
Expected: PASS

- [ ] **Step 5: `Layout.tsx`를 `AppShell`에 잇는다**

`src/components/templates/Layout.tsx`에서:

1. import 두 줄(`ClubNavigation`, `MainNavigation`)을 지우고 아래를 더한다.

```tsx
import { Spinner } from '@/components/atoms/Spinner';
import { AppShell } from '@/components/templates/AppShell';

import { useAuthActions } from '@/hooks/useAuthActions';
import { useMenuSettings } from '@/hooks/useCustomSettings';
import { useSyncClubMember } from '@/hooks/useSyncClubMember';

import { getLayoutVariant } from '@/constants/layoutVariant';
import { getNavItems } from '@/constants/navItems';
```

2. `const isLoading = …;` 줄 **아래**, `return` **위**에 더한다.

```tsx
  // 클럽 화면에서만 클럽 id가 뜻이 있다.
  const activeClubId =
    isClubRoute && typeof clubId === 'string' ? clubId : undefined;

  // 현재 클럽에서의 내 회원 정보를 스토어에 넣는다 (옛 ClubNavigation이 하던 일).
  useSyncClubMember(activeClubId);
  const clubMember = useSelector((state: RootState) => state.auth.clubMember);

  // 커스텀 설정에서 끈 메뉴는 숨긴다. 설정을 불러오기 전에는 켜진 것으로 본다.
  const { data: menuSettings } = useMenuSettings(activeClubId ?? '');
  const { login, logout } = useAuthActions();

  const navItems = activeClubId
    ? getNavItems({
        clubId: activeClubId,
        isMember: !!clubMember,
        isAdmin: clubMember?.role === 'ADMIN',
        tournamentMenuEnabled: menuSettings?.tournamentMenuEnabled ?? true,
      })
    : [];

  const currentClub = useSelector((state: RootState) => state.club.currentClub);
```

훅은 조건문·`return`보다 위에 있어야 한다. 위 코드가 기존의 이른 `return`보다 아래에 놓이게 되면 그 `return`보다 위로 올린다.

3. `return ( … );` 전체를 아래로 바꾼다.

```tsx
  return (
    <AppShell
      variant={getLayoutVariant(router.pathname)}
      clubId={activeClubId}
      // 클럽 밖에서는 이전 클럽의 이름이 남아 있어도 보여 주지 않는다.
      clubName={activeClubId ? currentClub?.name : undefined}
      items={navItems}
      currentPath={router.asPath}
      isAuthenticated={!!currentUser}
      onLogin={login}
      onLogout={logout}
    >
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner size="lg" />
        </div>
      ) : (
        children
      )}
    </AppShell>
  );
```

기존 동작 두 가지를 그대로 지킨다: 클럽 화면에서 `clubId`가 아직 없으면(라우터 준비 전) 본문을 그리지 않았다 → `isClubRoute && !clubId`일 때 `children` 대신 `null`을 그린다. 즉 위의 `children` 자리를 `isClubRoute && !clubId ? null : children`으로 쓴다.

- [ ] **Step 6: 토스트 위치 고정**

`src/pages/_app.tsx`의 `<Toaster position={ … } />` 전체를 아래로 바꾼다. 렌더 중에 `window.innerWidth`를 읽던 것을 없앤다.

```tsx
        <Toaster
          position="top-center"
          containerStyle={{
            // 노치와 상단 바를 피한다.
            top: 'calc(env(safe-area-inset-top) + 56px)',
            zIndex: 60,
          }}
        />
```

- [ ] **Step 7: 옛 메뉴 삭제**

```bash
git rm src/components/organisms/navigation/mainNavigation/MainNavigation.tsx \
       src/components/organisms/navigation/mainNavigation/SideMenu.tsx \
       src/components/organisms/navigation/clubNavigation/ClubNavigation.tsx \
       src/components/organisms/navigation/clubNavigation/__tests__/ClubNavigation.dom.test.tsx
grep -rn "MainNavigation\|SideMenu\|ClubNavigation" src --include='*.tsx' --include='*.ts'
```

Expected: grep 결과는 `noRawControls.test.ts`의 미룬 목록 한 줄뿐. 그 줄(`'components/organisms/navigation/mainNavigation/SideMenu.tsx', // 3단계 앱 뼈대`)을 지운다.

- [ ] **Step 8: 미리보기 화면에 `PageHeader` 추가**

`src/pages/dev/ui-kit.tsx`에서 맨 위의 `<header> … </header>` 블록 안 `<h1>`과 설명 `<p>`를 `PageHeader`로 바꾼다 (체크박스 `<label>`은 그대로 둔다).

```tsx
        <PageHeader
          title="부품 미리보기"
          subtitle="개발 서버에서만 보이는 화면입니다."
        />
```

import: `import { PageHeader } from '@/components/organisms/PageHeader';`

- [ ] **Step 9: 전체 검증**

Run: `npx tsc --noEmit` / `npx jest "$(pwd)/src"` / `npm run build`
Expected: 타입·테스트는 기준선 외 오류·실패 없음. 빌드 성공. 빌드 뒤 `git checkout -- public/ && git clean -fq public/`.

- [ ] **Step 10: 브라우저에서 확인**

`npx next dev -p 3111`로 띄운다.

| 폭 | 화면 | 확인 |
| --- | --- | --- |
| 390 | `/clubs/1` (로그인 안 함) | 상단 바에 클럽 이름. 하단 탭 3칸(홈·가입 문의·더보기), 홈이 켜짐. 사이드바 없음. 가로 스크롤 없음 |
| 390 | 더보기 누르기 | 시트가 올라오고 "클럽 목록", "로그인"이 보임 |
| 390 | `/clubs/1` 맨 아래까지 스크롤 | 마지막 내용이 탭바에 가리지 않음 |
| 390 | `/clubs` | 탭바 없음. 상단 바 오른쪽 메뉴 버튼 → 더보기 시트 |
| 390 | `/auth/login` | 상단 바·탭바·사이드바 모두 없음 |
| 1280 | `/clubs/1` | 왼쪽 사이드바(폭 240)에 클럽 이름·홈·가입 문의·클럽 목록·로그인. 탭바와 상단 바 없음. 본문이 사이드바에 가리지 않음 |
| 1280 | `/dev/ui-kit` | 큰 제목이 `PageHeader`로 보임 |

- [ ] **Step 11: 커밋**

```bash
git add -A src
git commit -m "feat(ui): 앱 뼈대를 하단 탭바와 사이드바로 교체하고 옛 메뉴 삭제"
```

---

## 이 계획이 끝나면

| 상태 | 내용 |
| --- | --- |
| 바뀐 것 | 메뉴가 휴대폰 하단 탭바 + 더보기, PC 왼쪽 사이드바로. 상단 탭·햄버거 없음. 토스트는 늘 위 가운데 |
| 아직 그대로 | 각 화면의 안쪽 모양(카드, 표, 색). 화면 제목은 화면마다 제각각 |
| 다음 (4단계) | 화면을 하나씩 묶음 리스트 + `PageHeader`로: 출석체크 → 운동 상세 → 게스트 → 게시판 → 대회 → 내 정보 → 로그인 |
