import { ReactNode } from 'react';

import { describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { WorkoutDetailView } from '@/components/organisms/workout/WorkoutDetailView';

import { Workout, WorkoutParticipant } from '@/types';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

// 시트에 넘기는 값만 본다. 닫히는 애니메이션 동안에도 내용이 남아야 한다.
const sheetProps: Array<{ open: boolean; name: string; selected: string[] }> =
  [];
jest.mock('@/components/organisms/workout/HelperSheet', () => ({
  HELPER_OPTIONS: [],
  HelperIcons: () => null,
  HelperSheet: (props: {
    open: boolean;
    name: string;
    selected: string[];
    onClose: () => void;
  }) => {
    sheetProps.push({
      open: props.open,
      name: props.name,
      selected: props.selected,
    });
    return props.open ? (
      <button type="button" onClick={props.onClose}>
        시트 닫기
      </button>
    ) : null;
  },
}));

const participant = (userId: number, name: string) =>
  ({
    id: userId,
    workoutId: 3,
    userId,
    User: { id: userId, nickname: name, thumbnailImageUrl: '' },
    clubMember: { id: userId * 10, name },
  }) as unknown as WorkoutParticipant;

const people = [participant(1, '김민수'), participant(2, '이지은')];

const workout = {
  id: 3,
  title: '토요 정기 운동',
  description: '',
  date: '2026-10-03T00:00:00.000Z',
  startTime: '2026-10-03T19:00:00.000Z',
  endTime: '2026-10-03T22:00:00.000Z',
  maxParticipants: 24,
  location: '당산초 체육관',
  WorkoutParticipant: people,
} as unknown as Workout;

describe('WorkoutDetailView — 도움 기록 시트가 닫히는 동안', () => {
  it('누구의 기록인지와 고른 항목을 그대로 둔다 (닫히는 동안 내용이 비지 않게)', async () => {
    render(
      <WorkoutDetailView
        workout={workout}
        backHref="/clubs/1/attendance"
        participants={people}
        sortOption="createdAt"
        onChangeSort={() => {}}
        participantIcons={{ '2': ['mop'] }}
        getAttendanceCount={() => 0}
        getHelperCount={() => 0}
        isAdmin={false}
        onToggleHelper={() => {}}
        onParkingCapacityChange={async () => {}}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /이지은/ }));
    });
    expect(sheetProps.at(-1)).toEqual({
      open: true,
      name: '이지은',
      selected: ['mop'],
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '시트 닫기' }));
    });
    expect(sheetProps.at(-1)).toEqual({
      open: false,
      name: '이지은',
      selected: ['mop'],
    });
  });
});
