/**
 * 업로드 이력·면제 관리 화면의 동작.
 * 디자인 시스템 전환 때 전후 대조에서 나온 차이를 잠근다.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';

import UploadBatchesPage from '@/pages/clubs/[id]/membership-fee/batches';
import ExemptionsSettingsPage from '@/pages/clubs/[id]/membership-fee/settings/exemptions';

const mockPush = jest.fn();
const mockConfirm = jest.fn<(options: any) => Promise<boolean>>();
const mockDelete = jest.fn<(input: any) => Promise<unknown>>();
let mockIsDeleting = false;

jest.mock('next/router', () => ({
  useRouter: () => ({ query: { id: '1' }, push: mockPush }),
}));
jest.mock('@/lib/withAuth', () => ({
  withAuth: (Component: unknown) => Component,
}));
jest.mock('@/utils/permissions', () => ({
  checkClubAdminPermission: jest.fn(),
}));
jest.mock('@/components/organisms/sheet/ConfirmProvider', () => ({
  useConfirm: () => mockConfirm,
}));
jest.mock('react-hot-toast', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));
jest.mock('@/hooks/membership-fee/useUploadBatches', () => ({
  useUploadBatches: () => ({
    isLoading: false,
    data: [
      {
        id: 'b1',
        uploadedAt: '2026-09-20T09:00:00.000Z',
        fileName: '9월.xlsx',
        uploadedByName: '김가온',
        recordCount: 42,
        minTransactionDate: null,
        maxTransactionDate: null,
        stats: { pending: 0, matched: 3, confirmed: 39, error: 0, skipped: 0 },
      },
    ],
  }),
}));
jest.mock('@/hooks/membership-fee/useExemptions', () => ({
  useExemptions: () => ({
    isLoading: false,
    data: [
      {
        id: 7,
        clubMemberId: 10,
        year: 2026,
        reason: '임원',
        clubMember: { id: 10, name: '가온' },
        createdBy: { id: 1, name: '나래' },
      },
      {
        id: 8,
        clubMemberId: 20,
        year: 2026,
        reason: '명예회원',
        clubMember: { id: 20, name: '다람' },
        createdBy: null,
      },
    ],
  }),
  useCreateExemption: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useDeleteExemption: () => ({
    mutateAsync: mockDelete,
    isPending: mockIsDeleting,
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockIsDeleting = false;
  mockConfirm.mockResolvedValue(true);
  global.fetch = jest.fn(async () => ({
    ok: true,
    json: async () => ({ data: { users: [] } }),
  })) as unknown as typeof fetch;
});

describe('업로드 이력', () => {
  it('휴대폰 리스트에서도 업로더를 보인다', () => {
    render(<UploadBatchesPage />);
    const list = within(screen.getByTestId('data-table-list'));
    expect(list.getByText(/김가온/)).toBeTruthy();
  });

  it('0건인 상태는 보이지 않는다', () => {
    render(<UploadBatchesPage />);
    const table = within(screen.getByTestId('data-table-table'));
    expect(table.getByText('확정 39')).toBeTruthy();
    expect(table.getByText('매칭 3')).toBeTruthy();
    expect(table.queryByText(/대기/)).toBeNull();
    expect(table.queryByText(/에러/)).toBeNull();
  });

  it('행을 누르면 그 배치의 처리 화면으로 간다', () => {
    render(<UploadBatchesPage />);
    fireEvent.click(
      within(screen.getByTestId('data-table-table')).getByText('9월.xlsx')
    );
    expect(mockPush).toHaveBeenCalledWith(
      '/clubs/1/membership-fee/process?batchId=b1'
    );
  });
});

describe('면제 관리', () => {
  const clickRow = async (name: string) => {
    const table = within(await screen.findByTestId('data-table-table'));
    await act(async () => {
      fireEvent.click(table.getByText(name));
    });
  };

  it('행을 누르면 누구의 면제인지 알리며 묻고, 확인하면 그 면제와 연도로 삭제한다', async () => {
    render(<ExemptionsSettingsPage />);
    await clickRow('가온');
    expect(mockConfirm).toHaveBeenCalledWith({
      title: '정말 이 면제를 삭제하시겠습니까?',
      message: '가온 · 임원',
      confirmLabel: '삭제',
      destructive: true,
    });
    await waitFor(() =>
      expect(mockDelete).toHaveBeenCalledWith({
        exemptionId: 7,
        year: new Date().getFullYear(),
      })
    );
  });

  it('확인창을 거절하면 삭제하지 않는다', async () => {
    mockConfirm.mockResolvedValue(false);
    render(<ExemptionsSettingsPage />);
    await clickRow('가온');
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('삭제하는 중에는 다른 면제를 눌러도 다시 묻지 않는다', async () => {
    mockIsDeleting = true;
    render(<ExemptionsSettingsPage />);
    await clickRow('다람');
    expect(mockConfirm).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
  });
});
