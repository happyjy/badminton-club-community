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

  it('운영진은 관리 메뉴(회원·게스트 확인·회비 관리·클럽 설정)가 더해진다', () => {
    const admin = getNavItems({ ...member, isAdmin: true });

    expect(
      admin.filter((item) => item.section === 'admin').map((item) => item.key)
    ).toEqual(['members', 'guestCheck', 'membershipFee', 'custom']);
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

  it('회비 관리 하위 화면에서도 회비 관리가 켜진다', () => {
    expect(activeKeys('/clubs/1/membership-fee/process')).toEqual([
      'membershipFee',
    ]);
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
