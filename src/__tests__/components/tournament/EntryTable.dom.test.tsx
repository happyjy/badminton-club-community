import React from 'react';

import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';

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
    isExternal?: boolean;
    clubMember?: { id: number; name: string } | null;
    contactName?: string | null;
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

  const clubMember =
    overrides.clubMember !== undefined
      ? overrides.clubMember
      : { id: 1, name: overrides.memberName ?? '홍길동' };

  return {
    id: overrides.id ?? 'e1',
    depositorName: '홍길동',
    teamName: null,
    paymentStatus: 'PENDING',
    totalFee: 60000,
    clubMember,
    isExternal: overrides.isExternal ?? false,
    contactName: overrides.contactName ?? null,
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

function renderTable(
  entries: EntryForAdmin[],
  onEditPlayers?: (entry: EntryForAdmin) => void
) {
  return render(
    <EntryTable
      entries={entries}
      onChangePaymentStatus={jest.fn()}
      onEditPlayers={onEditPlayers}
    />
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

describe('EntryTable - 외부 신청 구분 배지', () => {
  it('외부 신청은 모바일 카드와 PC 표 양쪽에 외부 신청 배지를 보여준다', () => {
    renderTable([
      makeEntry({ isExternal: true, clubMember: null, contactName: '김철수' }),
    ]);

    expect(screen.getAllByText('외부 신청')).toHaveLength(2);
  });

  it('회원 신청에는 외부 신청 배지를 붙이지 않는다', () => {
    renderTable([
      makeEntry({ isExternal: false, clubMember: { id: 1, name: '홍길동' } }),
    ]);

    expect(screen.queryByText('외부 신청')).toBeNull();
  });

  it('clubMember가 없으면 contactName으로 신청자명을 대신 보여준다', () => {
    renderTable([
      makeEntry({
        isExternal: true,
        clubMember: null,
        // 선수 명단에 없는 이름이어야 폴백이 유일한 출처가 된다
        contactName: '박신청',
        players: [
          { name: '홍길동', isClubMember: false },
          { name: '김철수', isClubMember: false },
        ],
      }),
    ]);

    expect(screen.getAllByText('박신청')).toHaveLength(2);
  });
});

describe('EntryTable - 선수 정보 수정 버튼', () => {
  it('외부 신청서에만 수정 버튼을 보여준다', () => {
    renderTable(
      [
        makeEntry({
          isExternal: true,
          clubMember: null,
          contactName: '박신청',
        }),
      ],
      jest.fn()
    );

    // 모바일 카드와 데스크탑 표 양쪽에 렌더된다
    expect(screen.getAllByText('선수 정보 수정')).toHaveLength(2);
  });

  it('회원 신청서에는 수정 버튼이 없다', () => {
    // 회원은 본인이 직접 고칠 수 있고, 기존 규칙상 임원은 수정할 수 없다
    renderTable([makeEntry({ isExternal: false })], jest.fn());

    expect(screen.queryByText('선수 정보 수정')).toBeNull();
  });

  it('콜백을 넘기지 않으면 버튼을 숨긴다', () => {
    renderTable([
      makeEntry({ isExternal: true, clubMember: null, contactName: '박신청' }),
    ]);

    expect(screen.queryByText('선수 정보 수정')).toBeNull();
  });

  it('버튼을 누르면 해당 신청서를 콜백으로 넘긴다', () => {
    const onEditPlayers = jest.fn();
    const entry = makeEntry({
      isExternal: true,
      clubMember: null,
      contactName: '박신청',
    });
    renderTable([entry], onEditPlayers);

    fireEvent.click(screen.getAllByText('선수 정보 수정')[0]);

    expect(onEditPlayers).toHaveBeenCalledWith(entry);
  });
});
