/**
 * 납부현황 이미지 만들기(`useBuildFeeStatusImages`) 명세.
 * 서버에서 표의 줄을 받아 장마다 PNG 파일로 만든다.
 */
import { ReactNode } from 'react';

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import axios from 'axios';

import { useBuildFeeStatusImages } from '@/hooks/membership-fee/usePaymentDashboard';

import { renderFeeStatusImages } from '@/lib/membership-fee/feeStatusImage';

jest.mock('axios');
jest.mock('@/lib/membership-fee/feeStatusImage', () => ({
  renderFeeStatusImages: jest.fn(),
}));

const mockGet = axios.get as jest.MockedFunction<typeof axios.get>;
const mockIsAxiosError = axios.isAxiosError as unknown as jest.Mock;
const mockRender = renderFeeStatusImages as jest.MockedFunction<
  typeof renderFeeStatusImages
>;

const SHEET = { year: 2026, asOf: '2026-11-26', stamp: '20261126', rows: [] };

function setup() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useBuildFeeStatusImages('1'), { wrapper }).result;
}

async function build(result: ReturnType<typeof setup>) {
  let outcome: { files?: File[]; error?: Error } = {};
  await act(async () => {
    try {
      outcome = { files: await result.current.mutateAsync(2026) };
    } catch (error) {
      outcome = { error: error as Error };
    }
  });
  return outcome;
}

beforeEach(() => {
  mockGet.mockReset();
  mockIsAxiosError.mockReset();
  mockRender.mockReset();
});

describe('useBuildFeeStatusImages', () => {
  it('표를 받아 장마다 PNG 파일로 만든다', async () => {
    mockGet.mockResolvedValue({ data: { data: { sheet: SHEET } } });
    mockRender.mockResolvedValue([
      new Blob(['1'], { type: 'image/png' }),
      new Blob(['2'], { type: 'image/png' }),
    ]);

    const { files } = await build(setup());

    expect(mockGet).toHaveBeenCalledWith(
      '/api/clubs/1/membership-fee/export-sheet?year=2026'
    );
    expect(mockRender).toHaveBeenCalledWith(SHEET);
    expect(files?.map((file) => [file.name, file.type])).toEqual([
      ['회비납부현황_2026_20261126_1.png', 'image/png'],
      ['회비납부현황_2026_20261126_2.png', 'image/png'],
    ]);
  });

  it('서버가 사유를 주면 그 사유로 실패한다', async () => {
    mockGet.mockRejectedValue({
      response: { data: { error: '권한이 없습니다' } },
    });
    mockIsAxiosError.mockReturnValue(true);

    const { error } = await build(setup());

    expect(error?.message).toBe('권한이 없습니다');
    expect(mockRender).not.toHaveBeenCalled();
  });

  it('네트워크 오류는 기본 문구로 실패한다', async () => {
    mockGet.mockRejectedValue(new TypeError('Failed to fetch'));
    mockIsAxiosError.mockReturnValue(false);

    const { error } = await build(setup());

    expect(error?.message).toBe('이미지를 만들지 못했습니다.');
  });

  it('그리다 실패하면 기본 문구로 실패한다', async () => {
    mockGet.mockResolvedValue({ data: { data: { sheet: SHEET } } });
    mockRender.mockRejectedValue(new Error('캔버스를 만들 수 없습니다'));

    const { error } = await build(setup());

    expect(error?.message).toBe('이미지를 만들지 못했습니다.');
  });
});
