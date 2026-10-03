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
