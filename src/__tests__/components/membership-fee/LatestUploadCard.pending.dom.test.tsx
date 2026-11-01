import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react';

import LatestUploadCard from '@/components/organisms/membership-fee/LatestUploadCard';

import type { LatestUploadInfo } from '@/types/membership-fee.types';

const upload = (
  pendingWork?: LatestUploadInfo['pendingWork']
): LatestUploadInfo => ({
  lastBatch: {
    id: 'b1',
    uploadedAt: '2026-09-20T09:00:00.000Z',
    fileName: '거래내역.xlsx',
    recordCount: 42,
    uploadedByName: '가온',
  },
  latestTransactionDate: '2026-09-19T12:00:00.000Z',
  pendingWork,
});

const href = (name: RegExp) =>
  screen.getByRole('link', { name }).getAttribute('href');

describe('LatestUploadCard — 남은 일', () => {
  it('미확정·미매칭·검토 필요 건수를 보이고, 누르면 그 건들만 걸러진 처리 화면으로 간다', () => {
    render(
      <LatestUploadCard
        clubId="1"
        latestUpload={upload({ unconfirmed: 12, unmatched: 3, needsReview: 5 })}
      />
    );

    expect(href(/미확정 12건/)).toBe(
      '/clubs/1/membership-fee/process?status=MATCHED'
    );
    expect(href(/미매칭 3건/)).toBe(
      '/clubs/1/membership-fee/process?status=PENDING'
    );
    expect(href(/검토 필요 5건/)).toBe(
      '/clubs/1/membership-fee/process?review=1'
    );
  });

  it('0건인 항목은 보이지 않는다', () => {
    render(
      <LatestUploadCard
        clubId="1"
        latestUpload={upload({ unconfirmed: 0, unmatched: 2, needsReview: 0 })}
      />
    );

    expect(screen.getByRole('link', { name: /미매칭 2건/ })).toBeTruthy();
    expect(screen.queryByText(/미확정/)).toBeNull();
    expect(screen.queryByText(/검토 필요/)).toBeNull();
  });

  it('남은 일이 없으면 없다고 알린다', () => {
    render(
      <LatestUploadCard
        clubId="1"
        latestUpload={upload({ unconfirmed: 0, unmatched: 0, needsReview: 0 })}
      />
    );

    expect(screen.getByText('처리할 입금 내역이 없습니다')).toBeTruthy();
  });

  it('건수를 받지 못했으면 아무것도 보이지 않는다', () => {
    render(<LatestUploadCard clubId="1" latestUpload={upload()} />);

    expect(screen.queryByText(/미확정|미매칭|검토 필요/)).toBeNull();
    expect(screen.queryByText('처리할 입금 내역이 없습니다')).toBeNull();
  });
});
