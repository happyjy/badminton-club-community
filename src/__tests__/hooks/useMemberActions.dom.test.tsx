import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { act, renderHook } from '@testing-library/react';
import { toast } from 'react-hot-toast';

import { useMemberActions } from '@/hooks/useMemberActions';

import type { ClubMemberWithUser } from '@/pages/clubs/[id]/members';
import { Status } from '@/types/enums';

const member = (id: number, status: Status) =>
  ({
    id,
    clubMember: { id: id * 10, status, clubId: 1 },
  }) as ClubMemberWithUser;

const MEMBERS = [member(1, Status.APPROVED), member(2, Status.PENDING)];

type FetchArgs = [string, { method: string; body?: string }];
const fetchMock = jest.fn<(...args: FetchArgs) => Promise<{ ok: boolean }>>();
const statusOf = (list: ClubMemberWithUser[], id: number) =>
  list.find((user) => user.id === id)?.clubMember.status;

let success: ReturnType<typeof jest.spyOn>;
let failure: ReturnType<typeof jest.spyOn>;

beforeEach(() => {
  fetchMock.mockReset();
  (globalThis as { fetch: unknown }).fetch = fetchMock;
  success = jest.spyOn(toast, 'success').mockImplementation(() => '');
  failure = jest.spyOn(toast, 'error').mockImplementation(() => '');
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

function setup() {
  const applyParticipants = jest.fn<(list: ClubMemberWithUser[]) => void>();
  const hook = renderHook(() =>
    useMemberActions({ participants: MEMBERS, applyParticipants })
  );
  return { applyParticipants, hook };
}

describe('useMemberActions — 승인', () => {
  it('승인 주소로 PUT 하고, 성공하면 그 회원만 승인됨으로 바꾼다', async () => {
    fetchMock.mockResolvedValue({ ok: true });
    const { applyParticipants, hook } = setup();

    await act(async () => {
      await hook.result.current.approve(2, 1);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/clubs/1/members/2/approve');
    expect(init.method).toBe('PUT');
    expect(init.body).toBeUndefined();

    expect(applyParticipants).toHaveBeenCalledTimes(1);
    const next = applyParticipants.mock.calls[0][0];
    expect(statusOf(next, 2)).toBe(Status.APPROVED);
    expect(statusOf(next, 1)).toBe(Status.APPROVED);
    expect(success).toHaveBeenCalledWith('승인했어요');
  });

  it('실패하면 목록을 바꾸지 않고 안내한다', async () => {
    fetchMock.mockResolvedValue({ ok: false });
    const { applyParticipants, hook } = setup();

    await act(async () => {
      await hook.result.current.approve(2, 1);
    });

    expect(applyParticipants).not.toHaveBeenCalled();
    expect(failure).toHaveBeenCalledWith('승인 처리에 실패했습니다');
    expect(hook.result.current.approvingUserId).toBeNull();
  });

  it('요청이 끝날 때까지 그 회원이 승인 중이다', async () => {
    let finish: (value: { ok: boolean }) => void = () => {};
    fetchMock.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      })
    );
    const { hook } = setup();

    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = hook.result.current.approve(2, 1);
    });
    expect(hook.result.current.approvingUserId).toBe(2);

    await act(async () => {
      finish({ ok: true });
      await pending;
    });
    expect(hook.result.current.approvingUserId).toBeNull();
  });
});

describe('useMemberActions — 상태 변경', () => {
  it('먼저 화면을 바꾸고, 상태 주소로 새 상태를 PUT 한다', async () => {
    fetchMock.mockResolvedValue({ ok: true });
    const { applyParticipants, hook } = setup();

    await act(async () => {
      await hook.result.current.changeStatus(1, 1, Status.ON_LEAVE);
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/clubs/1/members/1/status');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body ?? '')).toEqual({
      status: Status.ON_LEAVE,
    });

    expect(applyParticipants).toHaveBeenCalledTimes(1);
    expect(statusOf(applyParticipants.mock.calls[0][0], 1)).toBe(
      Status.ON_LEAVE
    );
    expect(failure).not.toHaveBeenCalled();
  });

  it('실패하면 원래 목록으로 되돌리고 안내한다', async () => {
    fetchMock.mockResolvedValue({ ok: false });
    const { applyParticipants, hook } = setup();

    await act(async () => {
      await hook.result.current.changeStatus(1, 1, Status.LEFT);
    });

    expect(applyParticipants).toHaveBeenCalledTimes(2);
    expect(statusOf(applyParticipants.mock.calls[0][0], 1)).toBe(Status.LEFT);
    expect(statusOf(applyParticipants.mock.calls[1][0], 1)).toBe(
      Status.APPROVED
    );
    expect(failure).toHaveBeenCalledWith('상태 변경에 실패했습니다');
  });
});
