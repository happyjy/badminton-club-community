import { ReactNode } from 'react';

import { describe, expect, it, jest } from '@jest/globals';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';

import { WorkoutDetailView } from '@/components/organisms/workout/WorkoutDetailView';

import {
  openPicker,
  pickerValue,
  pickOption,
} from '@/__tests__/helpers/optionPicker';
import { Guest, Workout, WorkoutParticipant } from '@/types';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const participant = (
  userId: number,
  name: string | null,
  extra: Partial<WorkoutParticipant> = {}
): WorkoutParticipant =>
  ({
    id: userId,
    workoutId: 3,
    userId,
    status: 'CONFIRMED',
    User: { id: userId, nickname: `닉${userId}`, thumbnailImageUrl: '' },
    clubMember:
      name === null ? undefined : { id: userId * 10, name, gender: 'MALE' },
    ...extra,
  }) as unknown as WorkoutParticipant;

const guest = (id: string, name: string, requester?: string) =>
  ({
    id,
    name,
    gender: 'FEMALE',
    intendToJoin: true,
    clubMember: requester ? { name: requester } : undefined,
  }) as unknown as Guest;

const people = [
  participant(1, '김민수'),
  participant(2, '이지은'),
  participant(3, '박준호'),
];

const workout = (patch: Partial<Workout> = {}): Workout => ({
  id: 3,
  clubId: 1,
  title: '토요 정기 운동',
  description: '',
  date: new Date('2026-10-03T00:00:00.000Z'),
  startTime: new Date('2026-10-03T19:00:00.000Z'),
  endTime: new Date('2026-10-03T22:00:00.000Z'),
  maxParticipants: 24,
  location: '당산초 체육관',
  createdAt: new Date('2026-10-01T00:00:00.000Z'),
  updatedAt: new Date('2026-10-01T00:00:00.000Z'),
  WorkoutParticipant: people,
  ...patch,
});

const base = {
  backHref: '/clubs/1/attendance',
  participants: people,
  sortOption: 'createdAt' as const,
  onChangeSort: () => {},
  participantIcons: {},
  getAttendanceCount: () => 0,
  getHelperCount: () => 0,
  isAdmin: false,
  onToggleHelper: () => {},
  onParkingCapacityChange: async () => {},
};

/** 참여자 행(버튼) */
const row = (name: string) =>
  screen.getByRole('button', { name: new RegExp(name) });

describe('WorkoutDetailView — 머리와 일정', () => {
  it('운동 제목이 화면 제목이고, 날짜가 부제, 뒤로 가기가 출석체크로 간다', () => {
    render(<WorkoutDetailView {...base} workout={workout()} />);

    expect(
      screen.getByRole('heading', { level: 1, name: '토요 정기 운동' })
    ).toBeTruthy();
    expect(screen.getByText('10월 3일 토요일')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: '뒤로' }).getAttribute('href')
    ).toBe('/clubs/1/attendance');
  });

  it('시간·장소·인원을 보여 준다', () => {
    render(<WorkoutDetailView {...base} workout={workout()} />);

    expect(screen.getByText('오후 07:00 – 오후 10:00')).toBeTruthy();
    expect(screen.getByText('당산초 체육관')).toBeTruthy();
    expect(screen.getByText('3명')).toBeTruthy();
  });

  it('설명이 있으면 일정에 전부 보여 준다 (카드에서는 두 줄로 잘리므로)', () => {
    const long =
      '운동 뒤에 환영 모임이 있어요.\n주차 공간이 좁으니 대중교통을 이용해 주세요.';
    render(
      <WorkoutDetailView {...base} workout={workout({ description: long })} />
    );

    const description = screen.getByText(/운동 뒤에 환영 모임이 있어요/);
    expect(description.textContent).toBe(long);
    expect(description.className).toContain('whitespace-pre-line');
    expect(description.className).not.toMatch(/truncate|line-clamp/);
  });

  it('설명이 없으면 설명 자리가 없다', () => {
    const { container } = render(
      <WorkoutDetailView {...base} workout={workout({ description: '' })} />
    );

    expect(container.querySelector('[data-workout-description]')).toBeNull();
  });

  it('긴 제목도 자르지 않고 줄바꿈해서 다 보여 준다', () => {
    render(
      <WorkoutDetailView
        {...base}
        workout={workout({ title: '아주 긴 운동 제목 '.repeat(8).trim() })}
      />
    );

    expect(
      screen.getByRole('heading', { level: 1 }).className.split(' ')
    ).not.toContain('truncate');
  });

  it('게스트가 있을 때만 인원에 게스트 수를 덧붙인다', () => {
    render(
      <WorkoutDetailView
        {...base}
        workout={workout({ guests: [guest('g1', '홍길동')] })}
      />
    );

    expect(screen.getByText('3명 + 게스트 1명')).toBeTruthy();
  });
});

describe('WorkoutDetailView — 방문 게스트', () => {
  it('게스트가 없으면 묶음이 없다', () => {
    const { rerender } = render(
      <WorkoutDetailView {...base} workout={workout()} />
    );
    expect(screen.queryByText(/방문 게스트/)).toBeNull();

    rerender(<WorkoutDetailView {...base} workout={workout({ guests: [] })} />);
    expect(screen.queryByText(/방문 게스트/)).toBeNull();
  });

  it('게스트의 이름과 신청한 회원을 보여 준다. 신청 회원이 없으면 "본인작성"', () => {
    render(
      <WorkoutDetailView
        {...base}
        workout={workout({
          guests: [guest('g1', '홍길동', '김민수'), guest('g2', '성춘향')],
        })}
      />
    );

    expect(screen.getByText('방문 게스트 2명')).toBeTruthy();
    expect(screen.getByText('홍길동')).toBeTruthy();
    expect(screen.getByText('신청자: 김민수')).toBeTruthy();
    expect(screen.getByText('신청자: 본인작성')).toBeTruthy();
    expect(screen.getAllByText('가입희망')).toHaveLength(2);
  });
});

describe('WorkoutDetailView — 참여자', () => {
  it('넘긴 순서대로 번호와 이름을 그린다', () => {
    render(<WorkoutDetailView {...base} workout={workout()} />);

    expect(screen.getByText('참여자 3명')).toBeTruthy();
    const order = screen
      .getAllByRole('button')
      .map((button) =>
        /\d+\. (?:김민수|이지은|박준호)/.exec(button.textContent ?? '')
      )
      .filter((match): match is RegExpExecArray => match !== null)
      .map((match) => match[0]);
    expect(order).toEqual(['1. 김민수', '2. 이지은', '3. 박준호']);
  });

  it('클럽 회원 정보가 없는 참여자는 그리지 않고, 번호는 전체에서의 순서를 따른다', () => {
    render(
      <WorkoutDetailView
        {...base}
        workout={workout()}
        participants={[
          participant(1, '김민수'),
          participant(9, null),
          participant(3, '박준호'),
        ]}
      />
    );

    expect(row('김민수').textContent).toContain('1.');
    expect(row('박준호').textContent).toContain('3.');
    expect(screen.queryByText(/닉9/)).toBeNull();
  });

  it('회원 이름이 비어 있으면 닉네임을 쓴다', () => {
    render(
      <WorkoutDetailView
        {...base}
        workout={workout()}
        participants={[participant(5, '')]}
      />
    );

    expect(row('닉5')).toBeTruthy();
  });

  it('출석·도움 횟수가 있을 때만 칩으로 보여 준다', () => {
    render(
      <WorkoutDetailView
        {...base}
        workout={workout()}
        getAttendanceCount={(id) => (id === 10 ? 12 : 0)}
        getHelperCount={(id) => (id === 10 ? 3 : 0)}
      />
    );

    expect(within(row('김민수')).getByText('출석 12')).toBeTruthy();
    expect(within(row('김민수')).getByText('도움 3')).toBeTruthy();
    expect(within(row('이지은')).queryByText(/출석|도움/)).toBeNull();
  });

  it('그 사람이 한 도움을 이름 옆에 그림으로 보여 준다', () => {
    render(
      <WorkoutDetailView
        {...base}
        workout={workout()}
        participantIcons={{ '1': ['net', 'key'] }}
      />
    );

    expect(
      within(row('김민수'))
        .getAllByRole('img')
        .map((img) => img.getAttribute('alt'))
        // 아바타(글자)는 alt가 없다. 도움 그림만 남긴다.
        .filter(Boolean)
    ).toEqual(['네트 설치', '열쇠']);
  });

  it('참여자가 없으면 빈 화면 안내를 보여 준다', () => {
    render(
      <WorkoutDetailView
        {...base}
        workout={workout({ WorkoutParticipant: [] })}
        participants={[]}
      />
    );

    expect(screen.getByText('아직 참여자가 없어요')).toBeTruthy();
    expect(screen.getByText('참여자 0명')).toBeTruthy();
  });

  it('행의 터치 영역은 44 이상이다', () => {
    render(<WorkoutDetailView {...base} workout={workout()} />);

    expect(row('김민수').className).toContain('min-h-11');
  });
});

describe('WorkoutDetailView — 정렬', () => {
  it('고른 정렬을 보여 주고, 바꾸면 알린다', async () => {
    const onChangeSort = jest.fn();
    render(
      <WorkoutDetailView
        {...base}
        workout={workout()}
        sortOption="name"
        onChangeSort={onChangeSort}
      />
    );

    expect(pickerValue('정렬')).toBe('이름순');

    await pickOption('정렬', '지역대회 급수');
    expect(onChangeSort).toHaveBeenCalledWith('localLevel');
  });

  it('정렬 항목이 지금과 같다', async () => {
    render(<WorkoutDetailView {...base} workout={workout()} />);

    expect(await openPicker('정렬')).toEqual([
      '참여순서',
      '이름순',
      '성별',
      '지역대회 급수',
      '전국대회 급수',
    ]);
  });
});

describe('WorkoutDetailView — 도움 기록', () => {
  it('참여자를 누르면 그 사람의 도움 기록 시트가 열린다', async () => {
    render(<WorkoutDetailView {...base} workout={workout()} />);
    expect(screen.queryByRole('dialog')).toBeNull();

    await act(async () => {
      fireEvent.click(row('이지은'));
    });

    expect(
      screen.getByRole('dialog', { name: '이지은님의 도움 기록' })
    ).toBeTruthy();
  });

  it('항목을 누르면 그 사람의 id들과 함께 알린다', async () => {
    const onToggleHelper = jest.fn();
    render(
      <WorkoutDetailView
        {...base}
        workout={workout()}
        onToggleHelper={onToggleHelper}
      />
    );

    await act(async () => {
      fireEvent.click(row('이지은'));
    });
    fireEvent.click(screen.getByRole('button', { name: '셔틀콕 정리' }));

    expect(onToggleHelper).toHaveBeenCalledWith(2, 20, 'shuttlecock');
  });

  it('그 사람이 이미 한 도움은 눌린 상태로 보인다', async () => {
    render(
      <WorkoutDetailView
        {...base}
        workout={workout()}
        participantIcons={{ '2': ['mop'] }}
      />
    );

    await act(async () => {
      fireEvent.click(row('이지은'));
    });

    expect(
      screen
        .getByRole('button', { name: '걸레질' })
        .getAttribute('aria-pressed')
    ).toBe('true');
    expect(
      screen.getByRole('button', { name: '열쇠' }).getAttribute('aria-pressed')
    ).toBe('false');
  });

  it('도움 기록 안내가 있으면 시트 안에 보여 준다', async () => {
    render(
      <WorkoutDetailView
        {...base}
        workout={workout()}
        helperMessage="도움 기록을 저장하지 못했어요. 잠시 후 다시 시도해 주세요."
      />
    );

    await act(async () => {
      fireEvent.click(row('이지은'));
    });

    expect(screen.getByRole('alert').textContent).toContain(
      '저장하지 못했어요'
    );
  });

  it('저장 중인 항목은 눌리지 않는다', async () => {
    const onToggleHelper = jest.fn();
    render(
      <WorkoutDetailView
        {...base}
        workout={workout()}
        onToggleHelper={onToggleHelper}
        isHelperPending={(userId, icon) => userId === 2 && icon === 'key'}
      />
    );

    await act(async () => {
      fireEvent.click(row('이지은'));
    });
    fireEvent.click(screen.getByRole('button', { name: '열쇠' }));

    expect(onToggleHelper).not.toHaveBeenCalled();
  });

  it('시트를 닫으면 페이지에 알린다 (안내를 지울 수 있게)', async () => {
    const onCloseHelper = jest.fn();
    render(
      <WorkoutDetailView
        {...base}
        workout={workout()}
        onCloseHelper={onCloseHelper}
      />
    );

    await act(async () => {
      fireEvent.click(row('이지은'));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '완료' }));
    });

    expect(onCloseHelper).toHaveBeenCalledTimes(1);
  });

  it('"완료"를 누르면 닫힌다', async () => {
    render(<WorkoutDetailView {...base} workout={workout()} />);

    await act(async () => {
      fireEvent.click(row('이지은'));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '완료' }));
    });

    // 닫히는 전환이 끝나야 사라진다.
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: '이지은님의 도움 기록' })
      ).toBeNull()
    );
  });
});

describe('WorkoutDetailView — 주차', () => {
  const parking = {
    enabled: true,
    capacity: 5,
    confirmedCount: 1,
    waitlistCount: 0,
    overrideCapacity: null,
    myStatus: 'NONE' as const,
    myWaitlistOrder: null,
  };

  it('주차가 꺼져 있으면 주차 명단이 없다', () => {
    const { rerender } = render(
      <WorkoutDetailView {...base} workout={workout()} />
    );
    expect(screen.queryByText('주차 명단')).toBeNull();

    rerender(
      <WorkoutDetailView
        {...base}
        workout={workout({ parking: { ...parking, enabled: false } })}
      />
    );
    expect(screen.queryByText('주차 명단')).toBeNull();
  });

  it('켜져 있으면 명단을 보여 주고, 대수 변경을 페이지로 넘긴다', async () => {
    const onParkingCapacityChange = jest.fn<
      (capacity: number | null) => Promise<void>
    >(async () => {});
    render(
      <WorkoutDetailView
        {...base}
        isAdmin
        workout={workout({
          parking,
          parkingRequests: [
            {
              id: 1,
              clubMemberId: 10,
              name: '김민수',
              status: 'CONFIRMED',
              position: 1,
            },
          ],
        })}
        onParkingCapacityChange={onParkingCapacityChange}
      />
    );

    expect(screen.getByText('확정 1/5')).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '대수 변경' }));
    });
    expect(onParkingCapacityChange).toHaveBeenCalledWith(null);
  });
});
