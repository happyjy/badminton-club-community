/**
 * 납부현황 엑셀 내려받기(`useExportFeeStatus`) 명세.
 * 서버는 성공하면 파일을, 실패하면 `{ error, status }`를 보낸다.
 */
import { ReactNode } from 'react';

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import axios from 'axios';

import { useExportFeeStatus } from '@/hooks/membership-fee/usePaymentDashboard';

jest.mock('axios');

const mockGet = axios.get as jest.MockedFunction<typeof axios.get>;
const mockIsAxiosError = axios.isAxiosError as unknown as jest.Mock;

const FILE = new Blob(['xlsx'], {
  type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
});

/** 내려받기로 넘어간 파일 이름과 주소 */
let saved: { download: string; href: string }[];

function setup(clubId: string | undefined) {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useExportFeeStatus(clubId), { wrapper }).result;
}

beforeEach(() => {
  saved = [];
  mockGet.mockReset();
  mockIsAxiosError.mockReset();
  (URL as unknown as { createObjectURL: unknown }).createObjectURL = jest.fn(
    () => 'blob:fee-status'
  );
  (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = jest.fn();
  jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement
  ) {
    saved.push({ download: this.download, href: this.href });
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('useExportFeeStatus', () => {
  it('그 해의 납부현황을 파일로 받아 서버가 정한 이름으로 저장한다', async () => {
    mockGet.mockResolvedValue({
      data: FILE,
      headers: {
        'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent('회비납부현황_2026_20261010.xlsx')}`,
      },
    });
    const result = setup('1');

    let fileName = '';
    await act(async () => {
      fileName = await result.current.mutateAsync(2026);
    });

    expect(mockGet).toHaveBeenCalledWith(
      '/api/clubs/1/membership-fee/export?year=2026',
      { responseType: 'blob' }
    );
    expect(fileName).toBe('회비납부현황_2026_20261010.xlsx');
    expect(saved).toEqual([
      { download: '회비납부현황_2026_20261010.xlsx', href: 'blob:fee-status' },
    ]);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fee-status');
  });

  it('서버가 이름을 주지 않으면 연도로 이름을 짓는다', async () => {
    mockGet.mockResolvedValue({ data: FILE, headers: {} });
    const result = setup('1');

    await act(async () => {
      await result.current.mutateAsync(2025);
    });

    expect(saved[0].download).toBe('회비납부현황_2025.xlsx');
  });

  it('실패하면 서버가 알려 준 사유를 던지고 아무것도 저장하지 않는다', async () => {
    // 파일로 달라고 했으므로 실패 응답의 JSON도 Blob으로 온다
    const failure = {
      response: {
        data: new Blob([JSON.stringify({ error: '권한이 없습니다' })], {
          type: 'application/json',
        }),
      },
    };
    mockGet.mockRejectedValue(failure);
    mockIsAxiosError.mockReturnValue(true);
    const result = setup('1');

    await act(async () => {
      await expect(result.current.mutateAsync(2026)).rejects.toThrow(
        '권한이 없습니다'
      );
    });

    expect(saved).toHaveLength(0);
  });

  it('사유를 읽을 수 없으면 내보내지 못했다고만 알린다', async () => {
    mockGet.mockRejectedValue(new Error('Network Error'));
    mockIsAxiosError.mockReturnValue(false);
    const result = setup('1');

    await act(async () => {
      await expect(result.current.mutateAsync(2026)).rejects.toThrow(
        '내보내기에 실패했습니다.'
      );
    });
  });

  it('클럽을 모르면 요청하지 않는다', async () => {
    const result = setup(undefined);

    await act(async () => {
      await expect(result.current.mutateAsync(2026)).rejects.toThrow(
        '클럽 ID가 필요합니다'
      );
    });

    expect(mockGet).not.toHaveBeenCalled();
  });
});
