/**
 * 만든 파일을 사용자에게 넘긴다.
 * 휴대폰처럼 터치하는 기기에서 파일 공유를 지원하면 공유 창(카톡 등)으로, 아니면 내려받기로.
 */

export type DeliverResult = 'shared' | 'cancelled' | 'downloaded';

interface DeliverEnv {
  navigator?: Navigator;
  matchMedia?: (query: string) => MediaQueryList;
  download?: (file: File) => void;
}

function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.click();
  URL.revokeObjectURL(url);
}

export async function deliverFiles(
  files: File[],
  options: {
    title: string;
    /**
     * 공유 창을 열기 직전에 묻는다. 브라우저는 누른 직후에만 공유 창을 열게 해 주는데,
     * 파일을 만드는 사이 그 시간이 지나므로 이 확인의 누름으로 공유 창을 연다.
     */
    confirmShare: () => Promise<boolean>;
    env?: DeliverEnv;
  }
): Promise<DeliverResult> {
  const nav = options.env?.navigator ?? window.navigator;
  const matchMedia =
    options.env?.matchMedia ?? ((query: string) => window.matchMedia(query));
  const download = options.env?.download ?? downloadFile;

  const downloadAll = (): DeliverResult => {
    files.forEach(download);
    return 'downloaded';
  };

  const isTouch = matchMedia('(pointer: coarse)').matches;
  const canShare =
    typeof nav.canShare === 'function' && nav.canShare({ files });
  if (!isTouch || !canShare) return downloadAll();

  if (!(await options.confirmShare())) return 'cancelled';
  try {
    await nav.share({ files, title: options.title });
    return 'shared';
  } catch (error) {
    // 사용자가 공유 창을 닫았다
    if (error instanceof Error && error.name === 'AbortError') {
      return 'cancelled';
    }
    // 브라우저가 공유를 막으면 내려받는다
    return downloadAll();
  }
}
