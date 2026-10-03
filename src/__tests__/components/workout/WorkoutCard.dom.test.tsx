import { ReactNode } from 'react';

import { describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { WorkoutCard } from '@/components/organisms/workout/WorkoutCard';

import { User, Workout, WorkoutParticipant } from '@/types';
import { WorkoutParkingStatus } from '@/types/parking.types';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    href,
    children,
    onClick,
    ...rest
  }: {
    href: string;
    children: ReactNode;
    onClick?: () => void;
  }) => (
    <a
      href={href}
      onClick={(event) => {
        event.preventDefault();
        onClick?.();
      }}
      {...rest}
    >
      {children}
    </a>
  ),
}));

const me = { id: 7, nickname: '나' } as User;

const participant = (userId: number) =>
  ({ id: userId, workoutId: 3, userId }) as unknown as WorkoutParticipant;

const parking = (
  patch: Partial<WorkoutParkingStatus> = {}
): WorkoutParkingStatus => ({
  enabled: true,
  capacity: 5,
  confirmedCount: 3,
  waitlistCount: 0,
  overrideCapacity: null,
  myStatus: 'NONE',
  myWaitlistOrder: null,
  ...patch,
});

const workout = (patch: Partial<Workout> = {}): Workout => ({
  id: 3,
  title: '토요 정기 운동',
  description: '셔틀콕 제공',
  date: new Date('2026-10-03T00:00:00.000Z'),
  startTime: new Date('2026-10-03T19:00:00.000Z'),
  endTime: new Date('2026-10-03T22:00:00.000Z'),
  maxParticipants: 24,
  location: '당산초 체육관',
  createdAt: new Date('2026-10-01T00:00:00.000Z'),
  updatedAt: new Date('2026-10-01T00:00:00.000Z'),
  WorkoutParticipant: [participant(1), participant(2)],
  ...patch,
});

const base = {
  user: me,
  isLoggedIn: true,
  membershipStatus: { isMember: true, isPending: false },
  onParticipate: () => {},
  detailHref: '/clubs/1/workouts/3',
};

const button = (name: string | RegExp) =>
  screen.getByRole('button', { name }) as HTMLButtonElement;
const full = { maxParticipants: 2 };
const joined = { WorkoutParticipant: [participant(1), participant(7)] };

describe('WorkoutCard — 내용', () => {
  it('날짜·제목·설명·시간·장소를 보여 준다', () => {
    render(<WorkoutCard {...base} workout={workout()} />);

    expect(screen.getByText('10월 3일 토요일')).toBeTruthy();
    expect(screen.getByText('토요 정기 운동')).toBeTruthy();
    expect(screen.getByText('셔틀콕 제공')).toBeTruthy();
    expect(screen.getByText('오후 07:00 – 오후 10:00')).toBeTruthy();
    expect(screen.getByText('당산초 체육관')).toBeTruthy();
  });

  it('설명이 없으면 설명 줄이 없다', () => {
    render(<WorkoutCard {...base} workout={workout({ description: '' })} />);

    expect(screen.queryByText('셔틀콕 제공')).toBeNull();
  });

  it('참여 인원을 보여 주고, 게스트가 있을 때만 게스트 수를 덧붙인다', () => {
    const { rerender } = render(<WorkoutCard {...base} workout={workout()} />);
    expect(screen.getByText('2명')).toBeTruthy();

    rerender(<WorkoutCard {...base} workout={workout({ guestCount: 3 })} />);
    expect(screen.getByText('2명 + 게스트 3명')).toBeTruthy();
  });

  it('참여자 목록이 없어도 0명으로 그린다', () => {
    render(
      <WorkoutCard
        {...base}
        workout={workout({ WorkoutParticipant: undefined })}
      />
    );

    expect(screen.getByText('0명')).toBeTruthy();
  });

  it('주차가 켜져 있을 때만 주차 현황을, 대기가 있을 때만 대기 수를 보여 준다', () => {
    const { rerender } = render(<WorkoutCard {...base} workout={workout()} />);
    expect(screen.queryByText(/주차 \d/)).toBeNull();

    rerender(
      <WorkoutCard {...base} workout={workout({ parking: parking() })} />
    );
    expect(screen.getByText('주차 3/5')).toBeTruthy();

    rerender(
      <WorkoutCard
        {...base}
        workout={workout({ parking: parking({ waitlistCount: 2 }) })}
      />
    );
    expect(screen.getByText('주차 3/5 (대기 2명)')).toBeTruthy();

    rerender(
      <WorkoutCard
        {...base}
        workout={workout({ parking: parking({ enabled: false }) })}
      />
    );
    expect(screen.queryByText(/주차 \d/)).toBeNull();
  });

  it('카드 윗부분은 상세로 가는 링크다', () => {
    render(<WorkoutCard {...base} workout={workout()} />);

    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/clubs/1/workouts/3');
    expect(link.textContent).toContain('토요 정기 운동');
  });

  it('긴 제목은 한 줄, 긴 설명은 두 줄에서 자른다', () => {
    render(
      <WorkoutCard
        {...base}
        workout={workout({
          title: '아주 긴 운동 제목 '.repeat(10).trim(),
          description: '아주 긴 설명 '.repeat(30).trim(),
        })}
      />
    );

    expect(
      screen.getByText('아주 긴 운동 제목 '.repeat(10).trim()).className
    ).toContain('truncate');
    expect(
      screen.getByText('아주 긴 설명 '.repeat(30).trim()).className
    ).toContain('line-clamp-2');
  });
});

describe('WorkoutCard — 내 상태 칩', () => {
  it('참여 중이면 "참석"', () => {
    render(<WorkoutCard {...base} workout={workout(joined)} />);

    expect(screen.getByText('참석').className).toContain('bg-positive-soft');
  });

  it('정원이 찼고 참여하지 않았으면 "마감"', () => {
    render(<WorkoutCard {...base} workout={workout(full)} />);

    expect(screen.getByText('마감').className).toContain('bg-neutral-soft');
  });

  it('그 밖에는 칩이 없다', () => {
    render(<WorkoutCard {...base} workout={workout()} />);

    expect(screen.queryByText('참석')).toBeNull();
    expect(screen.queryByText('마감')).toBeNull();
  });
});

describe('WorkoutCard — 참여 버튼', () => {
  it('참여하지 않았으면 "참여하기", 누르면 참여를 요청한다', () => {
    const onParticipate = jest.fn();
    render(
      <WorkoutCard
        {...base}
        workout={workout()}
        onParticipate={onParticipate}
      />
    );

    expect(button('참여하기').className).toContain('bg-accent');
    fireEvent.click(button('참여하기'));
    expect(onParticipate).toHaveBeenCalledWith(3, false);
  });

  it('참여 중이면 "참여 취소", 누르면 취소를 요청한다', () => {
    const onParticipate = jest.fn();
    render(
      <WorkoutCard
        {...base}
        workout={workout(joined)}
        onParticipate={onParticipate}
      />
    );

    expect(button('참여 취소').className).toContain('bg-fill');
    fireEvent.click(button('참여 취소'));
    expect(onParticipate).toHaveBeenCalledWith(3, true);
  });

  it('정원이 찼고 참여하지 않았으면 "인원 마감"이고 눌리지 않는다', () => {
    const onParticipate = jest.fn();
    render(
      <WorkoutCard
        {...base}
        workout={workout(full)}
        onParticipate={onParticipate}
      />
    );

    expect(button('인원 마감').disabled).toBe(true);
    fireEvent.click(button('인원 마감'));
    expect(onParticipate).not.toHaveBeenCalled();
  });

  it('정원이 찼어도 참여 중이면 취소할 수 있다', () => {
    render(<WorkoutCard {...base} workout={workout({ ...joined, ...full })} />);

    expect(button('참여 취소').disabled).toBe(false);
  });

  it('처리 중이면 눌리지 않고 요청이 다시 나가지 않는다', () => {
    const onParticipate = jest.fn();
    render(
      <WorkoutCard
        {...base}
        workout={workout()}
        onParticipate={onParticipate}
        isParticipatePending
      />
    );

    const pending = screen
      .getAllByRole('button')
      .find((el) => el.className.includes('bg-accent')) as HTMLButtonElement;
    expect(pending.disabled).toBe(true);
    fireEvent.click(pending);
    expect(onParticipate).not.toHaveBeenCalled();
  });

  it('상세로 이동하지 않고 버튼만 동작한다 (버튼은 링크 밖에 있다)', () => {
    render(<WorkoutCard {...base} workout={workout()} />);

    expect(button('참여하기').closest('a')).toBeNull();
  });
});

describe('WorkoutCard — 주차 버튼', () => {
  const withParking = (
    patch: Partial<WorkoutParkingStatus> = {},
    extra: Partial<Workout> = joined
  ) => workout({ ...extra, parking: parking(patch) });

  it('주차가 꺼져 있으면 버튼이 없다', () => {
    render(<WorkoutCard {...base} workout={workout(joined)} />);

    expect(screen.queryByRole('button', { name: /주차/ })).toBeNull();
  });

  it('운동에 참여하지 않았으면 눌리지 않고 이유를 알려 준다', () => {
    const onParkingRequest = jest.fn();
    render(
      <WorkoutCard
        {...base}
        workout={withParking({}, {})}
        onParkingRequest={onParkingRequest}
      />
    );

    const parkingButton = button(/운동 참여 후 신청 가능/);
    expect(parkingButton.disabled).toBe(true);
    fireEvent.click(parkingButton);
    expect(onParkingRequest).not.toHaveBeenCalled();
  });

  it('자리가 있으면 "주차 신청", 누르면 신청을 요청한다', () => {
    const onParkingRequest = jest.fn();
    render(
      <WorkoutCard
        {...base}
        workout={withParking()}
        onParkingRequest={onParkingRequest}
      />
    );

    fireEvent.click(button('주차 신청'));
    expect(onParkingRequest).toHaveBeenCalledWith(3, false);
  });

  it('자리가 없으면 "주차 대기 신청"', () => {
    render(
      <WorkoutCard {...base} workout={withParking({ confirmedCount: 5 })} />
    );

    expect(button('주차 대기 신청')).toBeTruthy();
  });

  it('확정이면 "주차 확정 · 취소하기", 누르면 취소를 요청한다', () => {
    const onParkingRequest = jest.fn();
    render(
      <WorkoutCard
        {...base}
        workout={withParking({ myStatus: 'CONFIRMED' })}
        onParkingRequest={onParkingRequest}
      />
    );

    fireEvent.click(button('주차 확정 · 취소하기'));
    expect(onParkingRequest).toHaveBeenCalledWith(3, true);
  });

  it('대기 중이면 몇 번째인지 보여 준다', () => {
    render(
      <WorkoutCard
        {...base}
        workout={withParking({ myStatus: 'WAITLIST', myWaitlistOrder: 2 })}
      />
    );

    expect(button('주차 대기 2번 · 취소하기')).toBeTruthy();
  });

  it('처리 중이면 눌리지 않는다', () => {
    const onParkingRequest = jest.fn();
    render(
      <WorkoutCard
        {...base}
        workout={withParking()}
        onParkingRequest={onParkingRequest}
        isParkingPending
      />
    );

    const buttons = screen.getAllByRole('button') as HTMLButtonElement[];
    const pending = buttons[buttons.length - 1];
    expect(pending.disabled).toBe(true);
    fireEvent.click(pending);
    expect(onParkingRequest).not.toHaveBeenCalled();
  });
});

describe('WorkoutCard — 회원 여부', () => {
  it('로그인하지 않았으면 버튼 영역이 없다', () => {
    render(<WorkoutCard {...base} workout={workout()} isLoggedIn={false} />);

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('승인 대기 중이면 비활성 "승인 대기중"', () => {
    render(
      <WorkoutCard
        {...base}
        workout={workout()}
        membershipStatus={{ isMember: false, isPending: true }}
      />
    );

    expect(button('승인 대기중').disabled).toBe(true);
    expect(screen.queryByRole('button', { name: '참여하기' })).toBeNull();
  });

  it('회원이 아니면 비활성 "클럽 가입 필요"', () => {
    render(
      <WorkoutCard
        {...base}
        workout={workout()}
        membershipStatus={{ isMember: false, isPending: false }}
      />
    );

    expect(button('클럽 가입 필요').disabled).toBe(true);
  });
});

describe('WorkoutCard — 운영진 메뉴', () => {
  it('운영진이 아니면 메뉴 버튼이 없다', () => {
    render(<WorkoutCard {...base} workout={workout()} />);

    expect(screen.queryByRole('button', { name: '운동 일정 관리' })).toBeNull();
  });

  it('메뉴 버튼은 상세 링크 밖에 있어, 눌러도 상세로 이동하지 않는다', () => {
    render(<WorkoutCard {...base} workout={workout()} isAdmin />);

    expect(button('운동 일정 관리').closest('a')).toBeNull();
  });

  it('메뉴를 열어 "수정"을 누르면 그 운동으로 onEdit이 불리고 시트가 닫힌다', async () => {
    const onEdit = jest.fn();
    const target = workout();
    render(<WorkoutCard {...base} workout={target} isAdmin onEdit={onEdit} />);

    await act(async () => {
      fireEvent.click(button('운동 일정 관리'));
    });
    expect(screen.getByRole('dialog', { name: '운동 일정 관리' })).toBeTruthy();

    await act(async () => {
      fireEvent.click(button(/수정/));
    });
    expect(onEdit).toHaveBeenCalledWith(target);
  });

  it('"삭제"를 누르면 그 운동으로 onDelete가 불린다', async () => {
    const onDelete = jest.fn();
    const target = workout();
    render(
      <WorkoutCard {...base} workout={target} isAdmin onDelete={onDelete} />
    );

    await act(async () => {
      fireEvent.click(button('운동 일정 관리'));
    });
    await act(async () => {
      fireEvent.click(button(/삭제/));
    });
    expect(onDelete).toHaveBeenCalledWith(target);
  });
});
