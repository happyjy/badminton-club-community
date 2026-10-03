import { describe, expect, it, jest } from '@jest/globals';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';

import singletonRouter from 'next/router';

import {
  ConfirmOptions,
  ConfirmProvider,
  useConfirm,
} from '@/components/organisms/sheet/ConfirmProvider';

/** 버튼을 누르면 confirm을 띄우고 결과를 onResult로 알리는 시험용 화면. */
function Trigger({
  options,
  onResult,
  label = '열기',
}: {
  options: ConfirmOptions;
  onResult: (result: boolean) => void;
  label?: string;
}) {
  const confirm = useConfirm();
  return (
    <button type="button" onClick={() => confirm(options).then(onResult)}>
      {label}
    </button>
  );
}

async function open(label = '열기') {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: label }));
  });
}

async function press(name: string) {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name }));
  });
}

/** 닫히는 전환이 끝나 대화상자가 사라질 때까지 기다린다. */
async function waitUntilClosed() {
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
}

describe('useConfirm', () => {
  it('제목과 설명을 보여 준다', async () => {
    render(
      <ConfirmProvider>
        <Trigger
          options={{ title: '삭제할까요?', message: '되돌릴 수 없어요' }}
          onResult={() => {}}
        />
      </ConfirmProvider>
    );

    await open();

    expect(screen.getByRole('dialog', { name: '삭제할까요?' })).toBeTruthy();
    expect(screen.getByText('되돌릴 수 없어요')).toBeTruthy();
  });

  it('확인을 누르면 true로 끝나고 닫힌다', async () => {
    const onResult = jest.fn();
    render(
      <ConfirmProvider>
        <Trigger options={{ title: '삭제할까요?' }} onResult={onResult} />
      </ConfirmProvider>
    );

    await open();
    await press('확인');

    expect(onResult).toHaveBeenCalledWith(true);
    await waitUntilClosed();
  });

  it('취소를 누르면 false로 끝난다', async () => {
    const onResult = jest.fn();
    render(
      <ConfirmProvider>
        <Trigger options={{ title: '삭제할까요?' }} onResult={onResult} />
      </ConfirmProvider>
    );

    await open();
    await press('취소');

    expect(onResult).toHaveBeenCalledWith(false);
  });

  it('ESC로 닫으면 false로 끝난다', async () => {
    const onResult = jest.fn();
    render(
      <ConfirmProvider>
        <Trigger options={{ title: '삭제할까요?' }} onResult={onResult} />
      </ConfirmProvider>
    );

    await open();
    await act(async () => {
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    });

    expect(onResult).toHaveBeenCalledWith(false);
  });

  it('버튼 글자를 바꿀 수 있고 destructive면 확인 버튼이 빨강 글자다', async () => {
    render(
      <ConfirmProvider>
        <Trigger
          options={{
            title: '삭제할까요?',
            confirmLabel: '삭제',
            cancelLabel: '그만두기',
            destructive: true,
          }}
          onResult={() => {}}
        />
      </ConfirmProvider>
    );

    await open();

    expect(screen.getByRole('button', { name: '그만두기' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '삭제' }).className).toContain(
      'text-negative'
    );
  });

  it('hideCancel이면 취소 버튼이 없다 (alert 대체)', async () => {
    const onResult = jest.fn();
    render(
      <ConfirmProvider>
        <Trigger
          options={{ title: '신청이 마감됐어요', hideCancel: true }}
          onResult={onResult}
        />
      </ConfirmProvider>
    );

    await open();

    expect(screen.queryByRole('button', { name: '취소' })).toBeNull();
    await press('확인');
    expect(onResult).toHaveBeenCalledWith(true);
  });

  it('떠 있는 동안 또 불리면 먼저 것은 false로 끝나고 새 것으로 바뀐다', async () => {
    const first = jest.fn();
    const second = jest.fn();

    function Double() {
      const confirm = useConfirm();
      return (
        <button
          type="button"
          onClick={() => {
            confirm({ title: '첫 번째' }).then(first);
            confirm({ title: '두 번째' }).then(second);
          }}
        >
          두 번 열기
        </button>
      );
    }

    render(
      <ConfirmProvider>
        <Double />
      </ConfirmProvider>
    );

    await open('두 번 열기');

    expect(first).toHaveBeenCalledWith(false);
    expect(screen.getByRole('dialog', { name: '두 번째' })).toBeTruthy();

    await press('확인');
    expect(second).toHaveBeenCalledWith(true);
  });

  it('떠 있는 동안 다른 화면으로 이동하면 false로 끝나고 닫힌다', async () => {
    // 뒤로 가기로 화면이 바뀌었는데 확인창이 남으면, 엉뚱한 화면 위에서
    // 이전 화면의 삭제가 실행될 수 있다.
    const onResult = jest.fn();
    render(
      <ConfirmProvider>
        <Trigger options={{ title: '삭제할까요?' }} onResult={onResult} />
      </ConfirmProvider>
    );

    await open();
    await act(async () => {
      singletonRouter.events.emit('routeChangeStart', '/clubs/1/board');
    });

    expect(onResult).toHaveBeenCalledWith(false);
    await waitUntilClosed();
  });

  it('닫은 뒤 다시 열 수 있다', async () => {
    const onResult = jest.fn();
    render(
      <ConfirmProvider>
        <Trigger options={{ title: '삭제할까요?' }} onResult={onResult} />
      </ConfirmProvider>
    );

    await open();
    await press('취소');
    await waitUntilClosed();
    await open();
    await press('확인');

    expect(onResult.mock.calls).toEqual([[false], [true]]);
  });

  it('Provider 밖에서 쓰면 무엇이 빠졌는지 알려 주는 오류를 던진다', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() =>
      render(<Trigger options={{ title: 'x' }} onResult={() => {}} />)
    ).toThrow('ConfirmProvider');

    errorSpy.mockRestore();
  });
});
