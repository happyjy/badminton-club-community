/**
 * 내 회비: 로그인한 회원 자기 userId로 납부 이력을 읽어 보인다.
 */
import { ComponentType } from 'react';

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import axios from 'axios';

import { PREVIEW_FEE_HISTORY } from '@/components/organisms/membership-fee/previewFeeHistory';

import type { AuthProps } from '@/lib/withAuth';
import MyFeePage from '@/pages/clubs/[id]/my-fee';

jest.mock('next/router', () => ({
  useRouter: () => ({ query: { id: '1' }, push: jest.fn() }),
}));
jest.mock('@/lib/withAuth', () => ({
  withAuth: (Component: unknown) => Component,
}));
jest.mock('axios', () => {
  const actual = jest.requireActual<typeof import('axios')>('axios');
  return {
    __esModule: true,
    default: { get: jest.fn(), isAxiosError: actual.default.isAxiosError },
  };
});

const mockedGet = axios.get as jest.MockedFunction<typeof axios.get>;
const Page = MyFeePage as unknown as ComponentType<AuthProps>;
const USER = { id: 1001 } as AuthProps['user'];

const renderPage = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <Page user={USER} isLoggedIn />
    </QueryClientProvider>
  );

beforeEach(() => {
  jest.clearAllMocks();
});

describe('내 회비', () => {
  it('내 userId로 납부 이력을 읽어 제목·요약·휴회를 보인다', async () => {
    mockedGet.mockResolvedValue({ data: { data: PREVIEW_FEE_HISTORY } });
    renderPage();

    expect(screen.getByRole('heading', { name: '내 회비' })).toBeTruthy();
    expect(await screen.findByText('2026년 미납 1달 · 22,500원')).toBeTruthy();
    expect(screen.getByText('2026.03 ~ 2026.04 · 병가')).toBeTruthy();
    expect(mockedGet).toHaveBeenCalledWith(
      '/api/clubs/1/members/1001/fee-history',
      { params: {} }
    );
  });

  it('서버가 거절하면 그 사유를 보인다', async () => {
    const error = Object.assign(new Error('403'), {
      isAxiosError: true,
      response: {
        status: 403,
        data: { error: '권한이 없습니다', status: 403 },
      },
    });
    mockedGet.mockRejectedValue(error);
    renderPage();

    expect(await screen.findByText('권한이 없습니다')).toBeTruthy();
  });
});
