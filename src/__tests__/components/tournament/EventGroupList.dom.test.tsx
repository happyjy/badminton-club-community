import React from 'react';

import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react';

import EventGroupList from '@/components/organisms/tournament/admin/EventGroupList';

import type { EventGroup } from '@/lib/tournament/groupEntriesByEvent';

const 남자복식: EventGroup = {
  label: '남자복식 30대 A조',
  playerCount: 4,
  teams: [
    {
      entryId: 'e1',
      depositorName: '김철수',
      teamName: '무적클럽',
      paymentStatus: 'CONFIRMED',
      players: [
        {
          name: '김철수',
          birthDate: '1990-03-15',
          phoneNumber: '010-1111-1111',
          tshirtSize: 'L',
        },
        {
          name: '박영희',
          birthDate: '1992-07-01',
          phoneNumber: '010-2222-2222',
          tshirtSize: null,
        },
      ],
    },
    {
      entryId: 'e2',
      depositorName: '이민수',
      teamName: null,
      paymentStatus: 'PENDING',
      players: [
        {
          name: '이민수',
          birthDate: '1988-05-05',
          phoneNumber: '010-3333-3333',
          tshirtSize: 'M',
        },
        {
          name: '정다은',
          birthDate: '1995-12-25',
          phoneNumber: '010-4444-4444',
          tshirtSize: 'S',
        },
      ],
    },
  ],
};

describe('EventGroupList', () => {
  it('종목 제목에 팀 수와 인원 수를 함께 보여준다', () => {
    render(<EventGroupList groups={[남자복식]} useTeamName={false} />);

    expect(screen.getByText('남자복식 30대 A조')).toBeTruthy();
    expect(screen.getByText('2팀 / 4명')).toBeTruthy();
  });

  it('파트너 이름을 한 줄에 묶어 보여준다', () => {
    render(<EventGroupList groups={[남자복식]} useTeamName={false} />);

    // 평평한 목록이었다면 이름이 각각 흩어져 팀을 알 수 없었다.
    expect(screen.getByText('김철수 · 박영희')).toBeTruthy();
    expect(screen.getByText('이민수 · 정다은')).toBeTruthy();
  });

  it('팀마다 신청서의 입금 상태를 보여준다', () => {
    render(<EventGroupList groups={[남자복식]} useTeamName={false} />);

    expect(screen.getByText('입금확인')).toBeTruthy();
    expect(screen.getByText('입금대기')).toBeTruthy();
  });

  it('선수별 생년월일·연락처·티셔츠를 보여준다', () => {
    render(<EventGroupList groups={[남자복식]} useTeamName={false} />);

    // 연령부 자격 확인에 생년월일이 필요하다.
    expect(screen.getByText('1990-03-15')).toBeTruthy();
    expect(screen.getByText('1992-07-01')).toBeTruthy();
    expect(screen.getByText('010-1111-1111')).toBeTruthy();
    expect(screen.getByText('티셔츠 L')).toBeTruthy();
    // 티셔츠를 안 쓰는 대회는 값이 없으므로 '-'로 채운다.
    expect(screen.getByText('티셔츠 -')).toBeTruthy();
  });

  it('useTeamName이 켜져 있으면 팀명을 보여준다', () => {
    render(<EventGroupList groups={[남자복식]} useTeamName />);

    expect(screen.getByText('(무적클럽)')).toBeTruthy();
  });

  it('useTeamName이 꺼져 있으면 팀명을 숨긴다', () => {
    render(<EventGroupList groups={[남자복식]} useTeamName={false} />);

    expect(screen.queryByText('(무적클럽)')).toBeNull();
  });

  it('단식은 이름 하나만 보여준다', () => {
    const 단식: EventGroup = {
      label: '남자단식 30대 A조',
      playerCount: 1,
      teams: [
        {
          entryId: 'e1',
          depositorName: '김철수',
          teamName: null,
          paymentStatus: 'PENDING',
          players: [
            {
              name: '김철수',
              birthDate: '1990-03-15',
              phoneNumber: '010-1111-1111',
              tshirtSize: 'L',
            },
          ],
        },
      ],
    };

    render(<EventGroupList groups={[단식]} useTeamName={false} />);

    // 팀 이름 줄과 선수 상세 줄에 각각 한 번씩 나온다. 가운뎃점은 없어야 한다.
    expect(screen.getAllByText('김철수')).toHaveLength(2);
    expect(screen.queryByText(/·/)).toBeNull();
    expect(screen.getByText('1팀 / 1명')).toBeTruthy();
  });

  it('묶음이 없으면 안내 문구를 보여준다', () => {
    render(<EventGroupList groups={[]} useTeamName={false} />);

    expect(screen.getByText('신청 내역이 없습니다.')).toBeTruthy();
  });
});
