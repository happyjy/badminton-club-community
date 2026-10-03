import { afterEach, describe, expect, it, jest } from '@jest/globals';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import axios from 'axios';

import ClubHomeSettingsForm from '@/components/organisms/forms/ClubHomeSettingsForm';
import ParkingSettingsForm from '@/components/organisms/forms/ParkingSettingsForm';
import WorkoutScheduleForm from '@/components/organisms/forms/WorkoutScheduleForm';

afterEach(() => {
  jest.restoreAllMocks();
});

const submit = async () => {
  await act(async () => {
    fireEvent.submit(document.querySelector('form') as HTMLFormElement);
  });
};

describe('클럽 홈 설정 폼', () => {
  const initialData = {
    clubOperatingTime: '평일 19-22',
    clubLocation: '체육관',
    clubDescription: '소개',
  };

  it('라벨이 입력칸과 이어져 있고 저장된 값이 채워져 있다', () => {
    render(<ClubHomeSettingsForm clubId="1" initialData={initialData} />);

    expect((screen.getByLabelText('장소') as HTMLInputElement).value).toBe(
      '체육관'
    );
    expect(
      (screen.getByLabelText('운영 시간') as HTMLTextAreaElement).value
    ).toBe('평일 19-22');
  });

  it('저장하면 입력한 값 그대로 PUT 한다', async () => {
    const put = jest
      .spyOn(axios, 'put')
      .mockResolvedValue({ data: {} } as never);
    render(<ClubHomeSettingsForm clubId="1" initialData={initialData} />);

    fireEvent.change(screen.getByLabelText('장소'), {
      target: { value: '새 체육관' },
    });
    await submit();

    await waitFor(() => expect(put).toHaveBeenCalledTimes(1));
    expect(put).toHaveBeenCalledWith('/api/clubs/1/custom/home', {
      clubOperatingTime: '평일 19-22',
      clubLocation: '새 체육관',
      clubDescription: '소개',
    });
  });

  it('빈 칸이 있으면 저장하지 않고, 그 칸의 오류를 알린다', async () => {
    const put = jest
      .spyOn(axios, 'put')
      .mockResolvedValue({ data: {} } as never);
    render(
      <ClubHomeSettingsForm
        clubId="1"
        initialData={{ ...initialData, clubLocation: '' }}
      />
    );

    await submit();

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe('장소를 입력해주세요');
    expect(screen.getByLabelText('장소').getAttribute('aria-invalid')).toBe(
      'true'
    );
    expect(put).not.toHaveBeenCalled();
  });
});

describe('주차 설정 폼', () => {
  const settings = {
    parkingEnabled: true,
    parkingWeekdayCapacity: 5,
    parkingWeekendCapacity: 8,
    parkingSmsEnabled: false,
  };

  it('저장하면 숫자로 바꾼 값을 넘긴다', async () => {
    const onSubmit = jest.fn<(values: unknown) => Promise<void>>(
      async () => {}
    );
    render(<ParkingSettingsForm settings={settings} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('평일 기본 주차 대수'), {
      target: { value: '7' },
    });
    await submit();

    expect(onSubmit).toHaveBeenCalledWith({
      parkingEnabled: true,
      parkingSmsEnabled: false,
      parkingWeekdayCapacity: 7,
      parkingWeekendCapacity: 8,
    });
    expect(await screen.findByText('저장했습니다.')).toBeTruthy();
  });

  it('대수를 비우면 저장 버튼이 잠기고 이유를 알린다', async () => {
    const onSubmit = jest.fn<(values: unknown) => Promise<void>>(
      async () => {}
    );
    render(<ParkingSettingsForm settings={settings} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('주말 기본 주차 대수'), {
      target: { value: '' },
    });

    expect(
      (screen.getByRole('button', { name: '저장' }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
    expect(screen.getByRole('alert').textContent).toBe(
      '주차 대수를 입력해야 저장할 수 있습니다.'
    );
    await submit();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('운동 일정 생성 폼', () => {
  it('값이 올바르면 그대로 POST 한다', async () => {
    const post = jest
      .spyOn(axios, 'post')
      .mockResolvedValue({ data: {} } as never);
    const initialData = {
      startDate: '2026-11-01',
      endDate: '2026-11-30',
      weekdayStartTime: '19:00',
      weekdayEndTime: '22:00',
      weekendStartTime: '10:00',
      weekendEndTime: '13:00',
      location: '체육관',
      maxParticipants: 20,
    };
    render(<WorkoutScheduleForm clubId="1" initialData={initialData} />);

    expect(
      (screen.getByLabelText('최대 참여 인원') as HTMLInputElement).value
    ).toBe('20');
    await submit();

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(post).toHaveBeenCalledWith(
      '/api/clubs/1/workouts/schedule',
      initialData
    );
  });

  it('종료 날짜가 시작 날짜보다 앞서면 보내지 않고 알린다', async () => {
    const post = jest
      .spyOn(axios, 'post')
      .mockResolvedValue({ data: {} } as never);
    render(
      <WorkoutScheduleForm
        clubId="1"
        initialData={{
          startDate: '2026-11-30',
          endDate: '2026-11-01',
          weekdayStartTime: '19:00',
          weekdayEndTime: '22:00',
          weekendStartTime: '10:00',
          weekendEndTime: '13:00',
          location: '체육관',
          maxParticipants: 20,
        }}
      />
    );

    await submit();

    expect((await screen.findByRole('alert')).textContent).toBe(
      '종료 날짜는 시작 날짜보다 이후여야 합니다'
    );
    expect(post).not.toHaveBeenCalled();
  });
});
