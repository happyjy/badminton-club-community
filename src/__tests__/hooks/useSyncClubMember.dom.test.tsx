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
