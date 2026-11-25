/**
 * 면제를 등록·수정·삭제하면 면제 목록뿐 아니라 납부 현황과 미납 목록도 새로 받는다.
 * 면제 기간이 바뀌면 그 회원의 칸·납부 수·월별 통계가 바뀐다.
 */
import { ReactNode } from 'react';

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import axios from 'axios';

import {
  useCreateExemption,
  useDeleteExemption,
  useUpdateExemption,
} from '@/hooks/membership-fee/useExemptions';

jest.mock('axios');

const mockPost = axios.post as jest.MockedFunction<typeof axios.post>;
const mockPatch = axios.patch as jest.MockedFunction<typeof axios.patch>;
const mockDelete = axios.delete as jest.MockedFunction<typeof axios.delete>;

function setup<T>(useHook: (clubId: string) => T) {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  const invalidate = jest.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useHook('1'), { wrapper });
  const invalidatedKeys = () =>
    invalidate.mock.calls.map(([filters]) => filters?.queryKey);
  return { result, invalidatedKeys };
}

const EXEMPTION = { id: 7, clubMemberId: 10, year: 2026 };

beforeEach(() => {
  mockPost.mockReset();
  mockPatch.mockReset();
  mockDelete.mockReset();
});

describe('면제 변경 뒤 새로 받는 것', () => {
  const expected = [
    ['feeExemptions', '1', 2026],
    ['paymentDashboard', '1'],
    ['unpaidMembers', '1'],
  ];

  it('등록', async () => {
    mockPost.mockResolvedValue({
      data: { status: 201, data: { exemption: EXEMPTION } },
    });
    const { result, invalidatedKeys } = setup(useCreateExemption);

    await act(async () => {
      await result.current.mutateAsync({
        clubMemberId: 10,
        year: 2026,
        startMonth: 4,
        endMonth: 12,
        reason: '임원',
      });
    });

    expect(invalidatedKeys()).toEqual(expected);
  });

  it('수정', async () => {
    mockPatch.mockResolvedValue({
      data: { status: 200, data: { exemption: EXEMPTION } },
    });
    const { result, invalidatedKeys } = setup(useUpdateExemption);

    await act(async () => {
      await result.current.mutateAsync({
        exemptionId: 7,
        year: 2026,
        input: { startMonth: 4, endMonth: 12, reason: '임원' },
      });
    });

    expect(mockPatch).toHaveBeenCalledWith(
      '/api/clubs/1/membership-fee/exemptions/7',
      { startMonth: 4, endMonth: 12, reason: '임원' }
    );
    expect(invalidatedKeys()).toEqual(expected);
  });

  it('삭제', async () => {
    mockDelete.mockResolvedValue({ data: { status: 200, data: null } });
    const { result, invalidatedKeys } = setup(useDeleteExemption);

    await act(async () => {
      await result.current.mutateAsync({ exemptionId: 7, year: 2026 });
    });

    expect(invalidatedKeys()).toEqual(expected);
  });
});
