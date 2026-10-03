import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { act, renderHook } from '@testing-library/react';

import { HELPER_LIMIT, useHelperIcons } from '@/hooks/useHelperIcons';

type FetchArgs = [string, { method: string; body: string }];

let resolvers: Array<(ok: boolean) => void> = [];
const fetchMock = jest.fn((..._args: FetchArgs) => {
  return new Promise<{ ok: boolean }>((resolve) => {
    resolvers.push((ok) => resolve({ ok }));
  });
});

/** 가장 오래 기다린 요청을 끝낸다. */
async function finish(ok = true) {
  await act(async () => {
    resolvers.shift()?.(ok);
  });
}

const bodyOf = (call: number) =>
  JSON.parse((fetchMock.mock.calls[call] as FetchArgs)[1].body);

describe('useHelperIcons', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    resolvers = [];
    fetchMock.mockClear();
    global.fetch = fetchMock as unknown as typeof fetch;
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('고르면 서버에 저장하고, 성공하면 그 사람의 기록에 더한다', async () => {
    const { result } = renderHook(() => useHelperIcons('3'));

    act(() => {
      result.current.toggle(1, 10, 'net');
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((fetchMock.mock.calls[0] as FetchArgs)[0]).toBe(
      '/api/workouts/3/helper-status'
    );
    expect(bodyOf(0)).toEqual({
      iconType: 'net',
      isSelected: true,
      targetUserId: 1,
      clubMemberId: 10,
    });
    // 저장이 끝나기 전에는 화면을 바꾸지 않는다.
    expect(result.current.icons[1]).toBeUndefined();

    await finish();
    expect(result.current.icons[1]).toEqual(['net']);
  });

  it('이미 고른 것을 다시 누르면 해제를 저장하고 기록에서 뺀다', async () => {
    const { result } = renderHook(() => useHelperIcons('3'));
    act(() => result.current.setIcons({ 1: ['net', 'key'] }));

    act(() => {
      result.current.toggle(1, 10, 'net');
    });
    expect(bodyOf(0).isSelected).toBe(false);

    await finish();
    expect(result.current.icons[1]).toEqual(['key']);
  });

  it('같은 항목을 연달아 두 번 눌러도 요청은 한 번만 나간다', async () => {
    const { result } = renderHook(() => useHelperIcons('3'));

    act(() => {
      result.current.toggle(1, 10, 'net');
      result.current.toggle(1, 10, 'net');
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.isPending(1, 'net')).toBe(true);

    await finish();
    expect(result.current.icons[1]).toEqual(['net']);
    expect(result.current.isPending(1, 'net')).toBe(false);
  });

  it('저장이 끝난 뒤에는 다시 누를 수 있다', async () => {
    const { result } = renderHook(() => useHelperIcons('3'));

    act(() => {
      result.current.toggle(1, 10, 'net');
    });
    await finish();
    act(() => {
      result.current.toggle(1, 10, 'net');
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(bodyOf(1).isSelected).toBe(false);
  });

  it(`한 사람에 ${HELPER_LIMIT}개가 차면 더 고를 수 없고 이유를 알려 준다`, async () => {
    const { result } = renderHook(() => useHelperIcons('3'));
    act(() => result.current.setIcons({ 1: ['net', 'key', 'mop'] }));

    act(() => {
      result.current.toggle(1, 10, 'shuttlecock');
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.icons[1]).toEqual(['net', 'key', 'mop']);
    expect(result.current.message).toBe(
      '도움은 한 사람에 3개까지 기록할 수 있어요.'
    );
  });

  it('저장 중인 것까지 세어 한도를 넘기지 않는다', async () => {
    const { result } = renderHook(() => useHelperIcons('3'));
    act(() => result.current.setIcons({ 1: ['net', 'key'] }));

    act(() => {
      result.current.toggle(1, 10, 'mop');
      result.current.toggle(1, 10, 'shuttlecock');
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(bodyOf(0).iconType).toBe('mop');
    await finish();
  });

  it('한도가 찼어도 해제는 할 수 있다', async () => {
    const { result } = renderHook(() => useHelperIcons('3'));
    act(() => result.current.setIcons({ 1: ['net', 'key', 'mop'] }));

    act(() => {
      result.current.toggle(1, 10, 'key');
    });
    await finish();

    expect(result.current.icons[1]).toEqual(['net', 'mop']);
  });

  it('다른 사람의 기록은 한도에 세지 않는다', async () => {
    const { result } = renderHook(() => useHelperIcons('3'));
    act(() => result.current.setIcons({ 1: ['net', 'key', 'mop'] }));

    act(() => {
      result.current.toggle(2, 20, 'net');
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    await finish();
    expect(result.current.icons[2]).toEqual(['net']);
  });

  it('저장에 실패하면 기록을 바꾸지 않고 알려 준다', async () => {
    const { result } = renderHook(() => useHelperIcons('3'));

    act(() => {
      result.current.toggle(1, 10, 'net');
    });
    await finish(false);

    expect(result.current.icons[1]).toBeUndefined();
    expect(result.current.message).toBe(
      '도움 기록을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.'
    );
    expect(result.current.isPending(1, 'net')).toBe(false);
  });

  it('다시 시도해 성공하면 안내를 지운다', async () => {
    const { result } = renderHook(() => useHelperIcons('3'));

    act(() => {
      result.current.toggle(1, 10, 'net');
    });
    await finish(false);
    act(() => {
      result.current.toggle(1, 10, 'net');
    });
    await finish(true);

    expect(result.current.message).toBeNull();
    expect(result.current.icons[1]).toEqual(['net']);
  });

  it('clearMessage로 안내를 지운다', () => {
    const { result } = renderHook(() => useHelperIcons('3'));
    act(() => result.current.setIcons({ 1: ['net', 'key', 'mop'] }));
    act(() => {
      result.current.toggle(1, 10, 'shuttlecock');
    });

    act(() => result.current.clearMessage());
    expect(result.current.message).toBeNull();
  });

  it('클럽 회원 id가 없으면 아무것도 하지 않는다', () => {
    const { result } = renderHook(() => useHelperIcons('3'));

    act(() => {
      result.current.toggle(1, undefined, 'net');
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.message).toBeNull();
  });
});
