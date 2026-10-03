import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react';

import ClubDetailContent from '@/components/organisms/ClubDetailContent';

const SETTINGS = {
  clubDescription: '소개',
  clubOperatingTime: '평일 저녁',
  clubLocation: '체육관',
};
const RANKINGS = { attendance: [], helper: [] };

describe('ClubDetailContent 랭킹', () => {
  it('회원에게는 랭킹을 보여준다', () => {
    render(
      <ClubDetailContent
        clubHomeSettings={SETTINGS}
        rankings={RANKINGS}
        isRankingLoading={false}
        showRankings
      />
    );

    expect(screen.getByText('출석')).toBeTruthy();
  });

  it('회원이 아니면 랭킹 영역을 그리지 않는다', () => {
    render(
      <ClubDetailContent
        clubHomeSettings={SETTINGS}
        rankings={RANKINGS}
        isRankingLoading
        showRankings={false}
      />
    );

    expect(screen.queryByText('랭킹')).toBeNull();
    expect(screen.queryByText('출석')).toBeNull();
    // 클럽 소개는 그대로 보인다.
    expect(screen.getByText('소개')).toBeTruthy();
  });
});
