import React from 'react';

import { describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';

import EntryTable from '@/components/organisms/tournament/admin/EntryTable';

import type { EntryForAdmin } from '@/types/tournament.types';

/**
 * EntryForAdmin은 Prisma 전체 타입이라 필드가 많다.
 * 화면이 실제로 읽는 값만 채우고 나머지는 단언으로 넘긴다.
 */
function makeEntry(
  overrides: {
    id?: string;
    memberName?: string;
    players?: Array<{ name: string; isClubMember: boolean }>;
  } = {}
): EntryForAdmin {
  const players = (
    overrides.players ?? [
      { name: '홍길동', isClubMember: true },
      { name: '김철수', isClubMember: true },
    ]
  ).map((player, index) => ({
    id: `p-${index}`,
    name: player.name,
    isClubMember: player.isClubMember,
  }));

  return {
    id: overrides.id ?? 'e1',
    depositorName: '홍길동',
    teamName: null,
    paymentStatus: 'PENDING',
    totalFee: 60000,
    clubMember: { id: 1, name: overrides.memberName ?? '홍길동' },
    players,
    entryEvents: [
      {
        id: 'ev-1',
        status: 'ACTIVE',
        ageGroup: '30대',
        level: 'A조',
        eventType: { name: '남자복식' },
      },
    ],
  } as unknown as EntryForAdmin;
}

function renderTable(entries: EntryForAdmin[]) {
  return render(
    <EntryTable entries={entries} onChangePaymentStatus={jest.fn()} />
  );
}

describe('EntryTable - 외부 선수 표시', () => {
  it('전원이 클럽 소속이면 외부 표시를 붙이지 않는다', () => {
    renderTable([makeEntry()]);

    expect(screen.queryByText(/외부/)).toBeNull();
  });

  it('외부 선수가 있으면 인원수를 보여준다', () => {
    renderTable([
      makeEntry({
        players: [
          { name: '홍길동', isClubMember: true },
          { name: '김철수', isClubMember: false },
        ],
      }),
    ]);

    // 모바일 카드와 PC 표 양쪽에 나오므로 2개다.
    expect(screen.getAllByText('외부 1명')).toHaveLength(2);
  });

  it('외부 선수가 2명이면 2명으로 센다', () => {
    renderTable([
      makeEntry({
        players: [
          { name: '홍길동', isClubMember: false },
          { name: '김철수', isClubMember: false },
        ],
      }),
    ]);

    expect(screen.getAllByText('외부 2명')).toHaveLength(2);
  });

  it('외부 선수의 이름을 함께 보여준다', () => {
    renderTable([
      makeEntry({
        players: [
          { name: '홍길동', isClubMember: true },
          { name: '김철수', isClubMember: false },
        ],
      }),
    ]);

    // 누가 외부인지 알아야 주최측 제출 명단을 만들 수 있다.
    expect(screen.getAllByText('김철수').length).toBeGreaterThan(0);
  });

  it('신청서마다 따로 계산한다', () => {
    renderTable([
      makeEntry({ id: 'e1', memberName: '홍길동' }),
      makeEntry({
        id: 'e2',
        memberName: '이영희',
        players: [
          { name: '이영희', isClubMember: true },
          { name: '박민수', isClubMember: false },
        ],
      }),
    ]);

    // 두 번째 신청서에만 외부가 있다.
    expect(screen.getAllByText('외부 1명')).toHaveLength(2);
  });
});
