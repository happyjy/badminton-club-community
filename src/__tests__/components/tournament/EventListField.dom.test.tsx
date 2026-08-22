import React from 'react';

import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';

import {
  createEmptyPlayer,
  type EntryFormValues,
} from '@/components/organisms/tournament/entry/entryFormTypes';
import EventListField from '@/components/organisms/tournament/entry/EventListField';

import type { TournamentEventType } from '@prisma/client';

const EVENT_TYPES = [
  {
    id: 'et-double',
    name: '남자복식',
    playerCount: 2,
    fee: 60000,
    isActive: true,
    order: 0,
    tournamentId: 't1',
  },
] as unknown as TournamentEventType[];

/** p1/p2의 소속 여부를 지정하고, 두 선수를 한 종목에 배정한 폼을 그린다. */
function renderEventListField(options: {
  memberFlags: boolean[];
  minClubMembersPerTeam?: number;
  memberLabel?: string | null;
}) {
  const players = options.memberFlags.map((isClubMember, index) => ({
    ...createEmptyPlayer(index),
    key: `p${index + 1}`,
    name: `선수${index + 1}`,
    isClubMember,
  }));

  function Wrapper() {
    const methods = useForm<EntryFormValues>({
      defaultValues: {
        depositorName: '',
        teamName: '',
        players,
        events: [
          {
            eventTypeId: 'et-double',
            ageGroup: '30대',
            level: 'A조',
            playerKeys: players.map((p) => p.key),
          },
        ],
        privacyAgreed: false,
      },
    });

    return (
      <FormProvider {...methods}>
        <EventListField
          eventTypes={EVENT_TYPES}
          ageGroups={['30대']}
          levels={['A조']}
          memberLabel={options.memberLabel ?? '당산클럽 소속'}
          minClubMembersPerTeam={options.minClubMembersPerTeam ?? 1}
        />
      </FormProvider>
    );
  }

  return render(<Wrapper />);
}

describe('EventListField - 팀당 최소 소속 인원 안내', () => {
  it('소속 회원이 있으면 경고를 띄우지 않는다', () => {
    renderEventListField({ memberFlags: [true, false] });

    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('전원 외부면 신청할 수 없다고 알려준다', () => {
    renderEventListField({ memberFlags: [false, false] });

    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('당산클럽 소속');
    expect(alert.textContent).toContain('1명');
  });

  it('제한이 0이면 전원 외부여도 경고하지 않는다', () => {
    renderEventListField({
      memberFlags: [false, false],
      minClubMembersPerTeam: 0,
    });

    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('대회가 정한 라벨을 그대로 보여준다', () => {
    renderEventListField({
      memberFlags: [false, false],
      memberLabel: '영등포구 회원',
    });

    expect(screen.getByRole('alert').textContent).toContain('영등포구 회원');
  });
});
