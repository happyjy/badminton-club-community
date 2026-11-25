/**
 * 만든 파일을 휴대폰은 공유 창으로, PC는 내려받기로 넘긴다.
 */
import { describe, expect, it, jest } from '@jest/globals';

import { deliverFiles } from './deliverFiles';

const FILES = [
  new File(['png'], '회비납부현황_2026_20261126_1.png', { type: 'image/png' }),
  new File(['png'], '회비납부현황_2026_20261126_2.png', { type: 'image/png' }),
];
const TITLE = '2026년 월회비 납부현황';

function setup({
  coarse = true,
  canShare = true,
  noCanShare = false,
  share = jest.fn<Share>(async () => {}),
  confirmed = true,
} = {}) {
  const download = jest.fn<(file: File) => void>();
  const confirmShare = jest.fn(async () => confirmed);
  const navigator = {
    share,
    ...(noCanShare ? {} : { canShare: jest.fn(() => canShare) }),
  } as unknown as Navigator;
  const matchMedia = (query: string) =>
    ({ matches: query === '(pointer: coarse)' && coarse }) as MediaQueryList;
  const run = () =>
    deliverFiles(FILES, {
      title: TITLE,
      confirmShare,
      env: { navigator, matchMedia, download },
    });
  return { run, download, confirmShare, share };
}

type Share = (data: { files: File[]; title: string }) => Promise<void>;

const domError = (name: string) => Object.assign(new Error(name), { name });

describe('deliverFiles', () => {
  it('터치 기기에서 공유할 수 있으면 확인 뒤 공유한다', async () => {
    const { run, share, confirmShare, download } = setup();

    await expect(run()).resolves.toBe('shared');

    expect(confirmShare).toHaveBeenCalledTimes(1);
    expect(share).toHaveBeenCalledWith({ files: FILES, title: TITLE });
    expect(download).not.toHaveBeenCalled();
  });

  it('확인 창을 닫으면 공유하지 않는다', async () => {
    const { run, share, download } = setup({ confirmed: false });

    await expect(run()).resolves.toBe('cancelled');

    expect(share).not.toHaveBeenCalled();
    expect(download).not.toHaveBeenCalled();
  });

  it('공유 창을 닫으면(AbortError) 조용히 끝난다', async () => {
    const share = jest.fn<Share>(async () => {
      throw domError('AbortError');
    });
    const { run, download } = setup({ share });

    await expect(run()).resolves.toBe('cancelled');
    expect(download).not.toHaveBeenCalled();
  });

  it('공유가 막히면(NotAllowedError) 내려받는다', async () => {
    const share = jest.fn<Share>(async () => {
      throw domError('NotAllowedError');
    });
    const { run, download } = setup({ share });

    await expect(run()).resolves.toBe('downloaded');
    expect(download.mock.calls.map(([file]) => file.name)).toEqual([
      '회비납부현황_2026_20261126_1.png',
      '회비납부현황_2026_20261126_2.png',
    ]);
  });

  it('PC(pointer: fine)는 확인 없이 내려받는다', async () => {
    const { run, confirmShare, share, download } = setup({ coarse: false });

    await expect(run()).resolves.toBe('downloaded');
    expect(confirmShare).not.toHaveBeenCalled();
    expect(share).not.toHaveBeenCalled();
    expect(download).toHaveBeenCalledTimes(2);
  });

  it('파일 공유를 지원하지 않으면 내려받는다', async () => {
    const { run, confirmShare, download } = setup({ canShare: false });

    await expect(run()).resolves.toBe('downloaded');
    expect(confirmShare).not.toHaveBeenCalled();
    expect(download).toHaveBeenCalledTimes(2);
  });

  it('canShare가 없는 브라우저는 내려받는다', async () => {
    const { run, download } = setup({ noCanShare: true });

    await expect(run()).resolves.toBe('downloaded');
    expect(download).toHaveBeenCalledTimes(2);
  });

  it('기본 내려받기는 파일 이름으로 링크를 누른다', async () => {
    const names: string[] = [];
    (URL as unknown as { createObjectURL: unknown }).createObjectURL = jest.fn(
      () => 'blob:image'
    );
    (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL =
      jest.fn();
    const click = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        names.push(this.download);
      });

    await deliverFiles(FILES, {
      title: TITLE,
      confirmShare: async () => true,
      env: {
        navigator: {} as Navigator,
        matchMedia: () => ({ matches: false }) as MediaQueryList,
      },
    });

    expect(names).toEqual([
      '회비납부현황_2026_20261126_1.png',
      '회비납부현황_2026_20261126_2.png',
    ]);
    click.mockRestore();
  });

  it('기본 내려받기는 파일 주소를 바로 지우지 않고 잠시 뒤에 지운다 (사파리가 받기 전에 지우면 실패한다)', async () => {
    jest.useFakeTimers();
    const revoke = jest.fn();
    (URL as unknown as { createObjectURL: unknown }).createObjectURL = jest.fn(
      () => 'blob:image'
    );
    (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = revoke;
    const click = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    await deliverFiles(FILES, {
      title: TITLE,
      confirmShare: async () => true,
      env: {
        navigator: {} as Navigator,
        matchMedia: () => ({ matches: false }) as MediaQueryList,
      },
    });

    expect(click).toHaveBeenCalledTimes(2);
    expect(revoke).not.toHaveBeenCalled();
    jest.advanceTimersByTime(40_000);
    expect(revoke).toHaveBeenCalledTimes(2);

    click.mockRestore();
    jest.useRealTimers();
  });
});
