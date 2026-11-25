/**
 * 회원 상세 화면: 휴회의 이월 안내와 직접 추가한 납부 목록이 서로를 다시 읽는다.
 * 같은 납부가 두 곳에 나오므로, 한쪽에서 옮기거나 지우면 다른 쪽도 새로 읽어야 한다.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import axios from 'axios';

import { toast } from 'react-hot-toast';

import MemberDetailPage from '@/pages/clubs/[id]/members/[userId]';

jest.mock('next/router', () => ({
  useRouter: () => ({ query: { id: '1', userId: '1001' }, push: jest.fn() }),
}));
jest.mock('@/lib/withAuth', () => ({
  withAuth: (Component: unknown) => Component,
}));
jest.mock('@/utils/permissions', () => ({
  checkClubAdminPermission: jest.fn(),
}));
jest.mock('@/components/organisms/sheet/ConfirmProvider', () => ({
  useConfirm: () => async () => true,
}));
jest.mock('axios');
jest.mock('react-hot-toast', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const API = '/api/clubs/1/members/1001';

/** 9월에 직접 추가한 납부가 휴회로 의무가 없는 달이 된 회원 */
const MANUAL_SEP = {
  id: 'pay-9',
  year: 2026,
  month: 9,
  amount: 25000,
  reason: '다른 계좌로 보냄',
  confirmedAt: '2026-11-23T01:00:00.000Z',
  confirmedByName: '관리자',
};

const getCalls = (suffix: string) =>
  mockedAxios.get.mock.calls.filter(
    ([url]) => String(url) === `${API}${suffix}`
  ).length;

beforeEach(() => {
  jest.clearAllMocks();
  // 주소에 따라 응답을 고른다. axios의 제네릭 응답 타입까지 맞출 필요는 없다
  mockedAxios.get.mockImplementation((async (url: string) => {
    if (url === API) {
      return {
        data: {
          data: {
            clubMember: {
              id: 1,
              name: '가나다',
              status: 'APPROVED',
              createdAt: '2025-01-02T00:00:00.000Z',
              feeObligationStartAt: '2026-01-01T00:00:00.000Z',
              leftAt: null,
              feeExcluded: false,
            },
          },
        },
      };
    }
    if (url === `${API}/leaves`) {
      return {
        data: {
          data: {
            leaves: [],
            orphanPayments: [
              { id: 'pay-9', year: 2026, month: 9, amount: 25000 },
            ],
          },
        },
      };
    }
    if (url === `${API}/manual-payments`) {
      return { data: { data: { payments: [MANUAL_SEP] } } };
    }
    throw new Error(`예상하지 못한 요청: ${url}`);
  }) as unknown as typeof axios.get);
  mockedAxios.post.mockResolvedValue({
    data: {
      data: {
        results: { success: ['pay-9'], failed: [] },
        summary: { success: 1, failed: 0 },
      },
    },
  });
  mockedAxios.delete.mockResolvedValue({ data: { status: 200 } });
});

async function renderPage() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemberDetailPage />
    </QueryClientProvider>
  );
  await screen.findByText('2026.09 · 25,000원 · 다른 계좌로 보냄');
  await waitFor(() => expect(getCalls('/leaves')).toBe(1));
}

describe('회원 상세 — 이월 안내와 직접 추가한 납부', () => {
  it('이월하면 직접 추가한 납부 목록도 다시 읽는다', async () => {
    await renderPage();
    expect(getCalls('/manual-payments')).toBe(1);

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: '다음 의무월로 이월' })
      );
    });

    await waitFor(() => expect(getCalls('/manual-payments')).toBe(2));
  });

  it('직접 추가한 납부를 지우면 이월 안내도 다시 읽는다', async () => {
    await renderPage();

    await act(async () => {
      fireEvent.click(
        screen.getByText('2026.09 · 25,000원 · 다른 계좌로 보냄')
      );
    });
    await act(async () => {
      fireEvent.click(
        within(screen.getByRole('dialog')).getByRole('button', { name: '삭제' })
      );
    });

    expect(mockedAxios.delete).toHaveBeenCalledWith(
      `${API}/manual-payments/pay-9`
    );
    await waitFor(() => expect(getCalls('/leaves')).toBe(2));
  });
});

describe('회원 상세 — 탈퇴 정보 저장 실패', () => {
  it('서버가 준 사유를 토스트로 보인다', async () => {
    const answer = mockedAxios.get.getMockImplementation()!;
    mockedAxios.get.mockImplementation((async (url: string) =>
      url === API
        ? {
            data: {
              data: {
                clubMember: {
                  id: 1,
                  name: '가나다',
                  status: 'LEFT',
                  createdAt: '2025-01-02T00:00:00.000Z',
                  feeObligationStartAt: '2026-01-01T00:00:00.000Z',
                  leftAt: '2026-06-01T00:00:00.000Z',
                  feeExcluded: false,
                },
              },
            },
          }
        : answer(url)) as unknown as typeof axios.get);
    mockedAxios.patch.mockRejectedValue({
      response: { data: { error: '탈퇴월을 입력해주세요', status: 400 } },
    });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemberDetailPage />
      </QueryClientProvider>
    );

    fireEvent.change(await screen.findByLabelText('탈퇴일'), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByLabelText('마지막 월'), {
      target: { value: '' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: '저장' })[0]);

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('탈퇴월을 입력해주세요')
    );
  });
});
