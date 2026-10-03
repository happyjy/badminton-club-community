import { describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { WorkoutParkingSection } from '@/components/organisms/workout/WorkoutParkingSection';

import { ParkingRequestListItem } from '@/types/parking.types';

const request = (
  id: number,
  name: string,
  status: 'CONFIRMED' | 'WAITLIST'
): ParkingRequestListItem => ({
  id,
  clubMemberId: id,
  name,
  status,
  position: id,
});

const base = {
  capacity: 5,
  overrideCapacity: null as number | null,
  requests: [
    request(1, '김민수', 'CONFIRMED'),
    request(2, '이지은', 'CONFIRMED'),
    request(3, '박준호', 'WAITLIST'),
  ],
  isAdmin: false,
  onCapacityChange: async () => {},
};

const saveButton = () =>
  screen.getByRole('button', {
    name: /대수 변경|저장 중/,
  }) as HTMLButtonElement;
const capacityInput = () =>
  screen.getByRole('spinbutton', { name: '주차 대수' }) as HTMLInputElement;
const useDefaultBox = () =>
  screen.getByRole('checkbox', {
    name: /클럽 기본값 사용/,
  }) as HTMLInputElement;

describe('WorkoutParkingSection — 명단', () => {
  it('확정 인원과 정원, 이름을 순서대로 보여 준다', () => {
    render(<WorkoutParkingSection {...base} />);

    expect(screen.getByRole('heading', { name: '주차 명단' })).toBeTruthy();
    expect(screen.getByText('확정 2/5')).toBeTruthy();
    expect(screen.getByText('1. 김민수')).toBeTruthy();
    expect(screen.getByText('2. 이지은')).toBeTruthy();
  });

  it('대기가 있을 때만 대기 목록을 보여 준다', () => {
    const { rerender } = render(<WorkoutParkingSection {...base} />);
    expect(screen.getByText('대기 1명')).toBeTruthy();
    expect(screen.getByText('대기 1번. 박준호')).toBeTruthy();

    rerender(
      <WorkoutParkingSection {...base} requests={base.requests.slice(0, 2)} />
    );
    expect(screen.queryByText(/대기 \d+명/)).toBeNull();
  });

  it('신청자가 없으면 안내를 보여 준다', () => {
    render(<WorkoutParkingSection {...base} requests={[]} />);

    expect(screen.getByText('확정 0/5')).toBeTruthy();
    expect(screen.getByText('아직 신청자가 없습니다.')).toBeTruthy();
  });

  it('운영진이 아니면 대수 변경 칸이 없다', () => {
    render(<WorkoutParkingSection {...base} />);

    expect(screen.queryByRole('spinbutton')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('WorkoutParkingSection — 운영진의 대수 변경', () => {
  it('클럽 기본값을 따르는 중이면 체크가 켜져 있고 입력칸이 잠겨 있다', () => {
    render(<WorkoutParkingSection {...base} isAdmin />);

    expect(useDefaultBox().checked).toBe(true);
    expect(capacityInput().disabled).toBe(true);
    expect(capacityInput().value).toBe('5');
  });

  it('그날 지정한 값이 있으면 체크가 꺼져 있고 그 값이 들어 있다', () => {
    render(<WorkoutParkingSection {...base} isAdmin overrideCapacity={8} />);

    expect(useDefaultBox().checked).toBe(false);
    expect(capacityInput().disabled).toBe(false);
    expect(capacityInput().value).toBe('8');
  });

  it('기본값 사용으로 저장하면 null을 넘긴다', async () => {
    const onCapacityChange = jest.fn<
      (capacity: number | null) => Promise<void>
    >(async () => {});
    render(
      <WorkoutParkingSection
        {...base}
        isAdmin
        onCapacityChange={onCapacityChange}
      />
    );

    await act(async () => {
      fireEvent.click(saveButton());
    });
    expect(onCapacityChange).toHaveBeenCalledWith(null);
  });

  it('숫자를 넣어 저장하면 그 숫자를(소수는 내려서) 넘긴다', async () => {
    const onCapacityChange = jest.fn<
      (capacity: number | null) => Promise<void>
    >(async () => {});
    render(
      <WorkoutParkingSection
        {...base}
        isAdmin
        overrideCapacity={8}
        onCapacityChange={onCapacityChange}
      />
    );

    fireEvent.change(capacityInput(), { target: { value: '6.9' } });
    await act(async () => {
      fireEvent.click(saveButton());
    });
    expect(onCapacityChange).toHaveBeenCalledWith(6);
  });

  it('0은 저장할 수 있다 (오늘은 주차 불가)', async () => {
    const onCapacityChange = jest.fn<
      (capacity: number | null) => Promise<void>
    >(async () => {});
    render(
      <WorkoutParkingSection
        {...base}
        isAdmin
        overrideCapacity={8}
        onCapacityChange={onCapacityChange}
      />
    );

    fireEvent.change(capacityInput(), { target: { value: '0' } });
    await act(async () => {
      fireEvent.click(saveButton());
    });
    expect(onCapacityChange).toHaveBeenCalledWith(0);
  });

  it('값을 비우면 저장할 수 없고 이유를 알려 준다 (실수로 0대가 되지 않게)', () => {
    const onCapacityChange = jest.fn<
      (capacity: number | null) => Promise<void>
    >(async () => {});
    render(
      <WorkoutParkingSection
        {...base}
        isAdmin
        overrideCapacity={8}
        onCapacityChange={onCapacityChange}
      />
    );

    fireEvent.change(capacityInput(), { target: { value: '' } });

    expect(saveButton().disabled).toBe(true);
    expect(
      screen.getByText('주차 대수를 입력해야 저장할 수 있습니다.')
    ).toBeTruthy();
    fireEvent.click(saveButton());
    expect(onCapacityChange).not.toHaveBeenCalled();
  });

  it('음수면 저장할 수 없고 이유를 알려 준다', () => {
    render(<WorkoutParkingSection {...base} isAdmin overrideCapacity={8} />);

    fireEvent.change(capacityInput(), { target: { value: '-1' } });

    expect(saveButton().disabled).toBe(true);
    expect(
      screen.getByText('주차 대수는 0 이상의 숫자여야 합니다.')
    ).toBeTruthy();
  });

  it('저장 중에는 다시 눌리지 않는다', async () => {
    let finish: () => void = () => {};
    const onCapacityChange = jest.fn(
      () => new Promise<void>((resolve) => (finish = resolve))
    );
    render(
      <WorkoutParkingSection
        {...base}
        isAdmin
        onCapacityChange={onCapacityChange}
      />
    );

    await act(async () => {
      fireEvent.click(saveButton());
    });
    expect(saveButton().disabled).toBe(true);
    fireEvent.click(saveButton());
    expect(onCapacityChange).toHaveBeenCalledTimes(1);

    await act(async () => {
      finish();
    });
    expect(saveButton().disabled).toBe(false);
  });
});
