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

type FetchArgs = [string, { method: string; body?: string }?];
type FetchResult = { ok: boolean; json?: () => Promise<unknown> };
const fetchMock = jest.fn<(...args: FetchArgs) => Promise<FetchResult>>();
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
    expect(init?.method).toBe('PUT');
    expect(init?.body).toBeUndefined();

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
    expect(init?.method).toBe('PUT');
    expect(JSON.parse(init?.body ?? '')).toEqual({
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

describe('useMemberActions — 탈퇴월·다시 시작하는 달', () => {
  it('고른 달을 상태와 함께 보낸다', async () => {
    fetchMock.mockResolvedValue({ ok: true });
    const { hook } = setup();

    await act(async () => {
      await hook.result.current.changeStatus(1, 1, Status.LEFT, {
        leftMonth: '2026-07',
      });
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init?.body ?? '')).toEqual({
      status: Status.LEFT,
      leftMonth: '2026-07',
    });
  });

  it('실패하면 서버가 준 사유를 보이고 목록을 되돌린다', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: '탈퇴월을 골라주세요', status: 400 }),
    });
    const { applyParticipants, hook } = setup();

    await act(async () => {
      await hook.result.current.changeStatus(1, 1, Status.LEFT, {});
    });

    expect(failure).toHaveBeenCalledWith('탈퇴월을 골라주세요');
    expect(statusOf(applyParticipants.mock.calls[1][0], 1)).toBe(
      Status.APPROVED
    );
  });
});

describe('useMemberActions — 달 시트의 기본값', () => {
  it('기본값 주소를 읽어 data를 돌려준다', async () => {
    const defaults = {
      lastPaidMonth: '2026-07',
      rejoinStartMonth: '2026-12',
      previousStartMonth: '2024-03',
    };
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: defaults, status: 200 }),
    });
    const { hook } = setup();

    let result: unknown;
    await act(async () => {
      result = await hook.result.current.loadStatusDefaults(1, 1);
    });

    expect(fetchMock.mock.calls[0][0]).toBe(
      '/api/clubs/1/members/1/status-defaults'
    );
    expect(result).toEqual(defaults);
  });

  it('읽지 못하면 null', async () => {
    fetchMock.mockResolvedValue({ ok: false });
    const { hook } = setup();

    let result: unknown = 'not-set';
    await act(async () => {
      result = await hook.result.current.loadStatusDefaults(1, 1);
    });

    expect(result).toBeNull();
  });
});

describe('useMemberActions — 서버에 닿지 못했을 때', () => {
  it('네트워크 오류의 영어 문장 대신 기본 문구를 보인다', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const { hook } = setup();

    await act(async () => {
      await hook.result.current.changeStatus(1, 1, Status.ON_LEAVE);
    });

    expect(failure).toHaveBeenCalledWith('상태 변경에 실패했습니다');
  });
});
