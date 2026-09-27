import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';

import { ClubNavigation } from '@/components/organisms/navigation/clubNavigation/ClubNavigation';

let mockClubMember: { role: string } | null = null;
let mockMenuSettings: { tournamentMenuEnabled?: boolean } | undefined;

jest.mock('next/router', () => ({
  useRouter: () => ({ asPath: '/clubs/1', push: jest.fn() }),
}));

jest.mock('react-redux', () => ({
  useDispatch: () => jest.fn(),
  useSelector: (
    selector: (state: {
      auth: { user: null; clubMember: typeof mockClubMember };
    }) => unknown
  ) => selector({ auth: { user: null, clubMember: mockClubMember } }),
}));

jest.mock('@/hooks/useClubMember', () => ({
  useClubMember: () => ({ data: undefined }),
}));

jest.mock('@/hooks/useCustomSettings', () => ({
  useMenuSettings: () => ({ data: mockMenuSettings }),
}));

describe('ClubNavigation 대회 신청 탭', () => {
  beforeEach(() => {
    mockClubMember = { role: 'USER' };
    mockMenuSettings = undefined;
  });

  it('설정을 불러오기 전에는 대회 신청 탭을 보여준다', () => {
    render(<ClubNavigation clubId="1" />);

    expect(screen.getByText('대회 신청')).toBeTruthy();
  });

  it('대회 신청 메뉴가 켜져 있으면 탭을 보여준다', () => {
    mockMenuSettings = { tournamentMenuEnabled: true };
    render(<ClubNavigation clubId="1" />);

    expect(screen.getByText('대회 신청')).toBeTruthy();
  });

  it('대회 신청 메뉴가 꺼져 있으면 탭을 숨긴다', () => {
    mockMenuSettings = { tournamentMenuEnabled: false };
    render(<ClubNavigation clubId="1" />);

    expect(screen.queryByText('대회 신청')).toBeNull();
    expect(screen.getByText('게시판')).toBeTruthy();
  });

  it('관리자에게도 꺼진 탭은 숨긴다', () => {
    mockClubMember = { role: 'ADMIN' };
    mockMenuSettings = { tournamentMenuEnabled: false };
    render(<ClubNavigation clubId="1" />);

    expect(screen.queryByText('대회 신청')).toBeNull();
    expect(screen.getByText('게스트 확인')).toBeTruthy();
  });

  it('멤버가 아니면 설정과 관계없이 탭이 없다', () => {
    mockClubMember = null;
    mockMenuSettings = { tournamentMenuEnabled: true };
    render(<ClubNavigation clubId="1" />);

    expect(screen.queryByText('대회 신청')).toBeNull();
  });
});
